// @ts-nocheck
import Dockerode from 'dockerode';
import { Container } from '../../../model/container';
import * as event from '../../../event';
import { smokeTest, waitForHealthy } from '../docker/health';
import type Dockercompose from './Dockercompose';

/**
 * Per-service state kept for the duration of a project transaction.
 */
interface TransactionService {
    serviceKey: string;
    container: Container;
    config: {
        enabled: boolean;
        window: number;
        interval: number;
        grace: number;
    };
    wasRunning: boolean;
    oldImageRef?: string;
    newImageRef?: string;
    archiveName?: string;
    verdict?: string;
    reason?: string;
    reverted?: boolean;
}

function serviceName(container: Container): string {
    return container.name || container.id;
}

/**
 * Snapshot the current state of a service before it is swapped so the whole
 * project can be reverted later.
 */
async function snapshotService(
    trigger: Dockercompose,
    service: TransactionService,
): Promise<void> {
    const watcher = trigger.getWatcher(service.container);
    const { dockerApi } = watcher;
    const currentContainer = await trigger.getCurrentContainer(
        dockerApi,
        service.container,
    );
    if (!currentContainer) {
        throw new Error(
            `Unable to inspect service ${serviceName(service.container)}`,
        );
    }
    const spec = await trigger.inspectContainer(currentContainer, trigger.log);
    service.wasRunning = spec.State.Running;
    service.oldImageRef = spec.Image;
}

/**
 * Evaluate the health gate of one opted-in service after its swap.
 */
async function gateService(
    trigger: Dockercompose,
    service: TransactionService,
): Promise<string> {
    const watcher = trigger.getWatcher(service.container);
    const { dockerApi } = watcher;
    const newContainer = await dockerApi.getContainer(service.container.name);
    let verdict = await waitForHealthy(
        newContainer,
        { window: service.config.window, interval: service.config.interval },
        trigger.log,
    );
    if (verdict === 'no-healthcheck') {
        verdict = await smokeTest(
            newContainer,
            { grace: service.config.grace, interval: service.config.interval },
            trigger.log,
        );
    }
    return verdict;
}

/**
 * Stop+remove the new container, restore the archive under the original name
 * and start it again if it was running (ordered, no half-revert).
 */
async function revertService(
    trigger: Dockercompose,
    service: TransactionService,
): Promise<boolean> {
    const log = trigger.log;
    const name = service.container.name;
    if (!service.archiveName) {
        log.error(
            `Unable to revert service ${name}: no rollback archive is available`,
        );
        return false;
    }
    try {
        const watcher = trigger.getWatcher(service.container);
        const { dockerApi } = watcher;
        const newContainer = await dockerApi.getContainer(name);
        try {
            await newContainer.stop();
        } catch (e) {
            const message = String(e?.message || e).toLowerCase();
            if (!message.includes('not running')) {
                throw e;
            }
        }
        await newContainer.remove({ force: true });
        const archive = await dockerApi.getContainer(service.archiveName);
        await archive.rename({ name });
        if (service.wasRunning) {
            await archive.start();
        }
        service.reverted = true;
        return true;
    } catch (e) {
        log.error(
            `Failed to revert service ${name} (${e?.message || e}); remaining archives left unchanged`,
        );
        return false;
    }
}

/**
 * Remove the archive of a service after a successful commit.
 */
async function removeArchive(
    trigger: Dockercompose,
    service: TransactionService,
): Promise<void> {
    if (!service.archiveName) {
        return;
    }
    try {
        const watcher = trigger.getWatcher(service.container);
        const archive = await watcher.dockerApi.getContainer(
            service.archiveName,
        );
        await archive.remove({ force: true });
    } catch (e) {
        trigger.log.warn(
            `Unable to remove archive ${service.archiveName} (${e?.message || e})`,
        );
    }
}

/**
 * Prune the superseded image of a service after a successful commit.
 */
async function pruneService(
    trigger: Dockercompose,
    service: TransactionService,
): Promise<void> {
    if (!trigger.configuration.prune) {
        return;
    }
    try {
        const watcher = trigger.getWatcher(service.container);
        await trigger.pruneImages(
            watcher.dockerApi,
            trigger.resolveRegistry(service.container),
            service.container,
            trigger.log,
        );
        await trigger.removePreviousImage(
            watcher.dockerApi,
            trigger.resolveRegistry(service.container),
            service.container,
            trigger.log,
        );
    } catch (e) {
        trigger.log.warn(
            `Unable to prune the previous image of ${serviceName(service.container)} (${e?.message || e})`,
        );
    }
}

/**
 * CLI-free project transaction (blueprint §2.4).
 *
 * Phase 0: implicit `.back` before any mutation (abort on write failure).
 * Phase 1: swap every service with a rename-first archive (no gate yet).
 * Phase 2: gate only opted-in services, short-circuiting on the first failure.
 * Phase 3: commit (remove archives + deferred prune) or revert the whole
 * project (every recreated service, `.back` copied back only once all
 * services are restored).
 */
export async function performProjectTransaction(
    trigger: Dockercompose,
    composeFile: string,
    containersFiltered: Container[],
    mappings: { current: string; update: string }[],
): Promise<boolean> {
    const log = trigger.log;

    const services: TransactionService[] = containersFiltered.map(
        (container) => ({
            serviceKey: serviceName(container),
            container,
            config: trigger.resolveRollback(container),
            wasRunning: false,
        }),
    );

    // PHASE 0 - implicit backup before any mutation.
    try {
        await trigger.ensureComposeBackup(composeFile);
        log.info(
            `Rollback enabled: forced backup of ${composeFile} as ${composeFile}.back`,
        );
    } catch (e) {
        log.error(
            `Unable to backup ${composeFile} before the rollback transaction (${e?.message || e}); aborting without mutating anything`,
        );
        return false;
    }

    // PHASE 0 - rewrite the compose file with the new versions.
    try {
        await trigger.rewriteComposeFile(composeFile, mappings);
    } catch (e) {
        log.error(
            `Unable to rewrite ${composeFile} (${e?.message || e}); aborting before any container mutation`,
        );
        return false;
    }

    // PHASE 1 - snapshot + swap every service, keeping archives.
    try {
        for (const service of services) {
            await snapshotService(trigger, service);
            const outcome = await trigger.performUpdate(service.container, {
                archive: true,
                keepArchive: true,
                gateHealth: false,
                deferPrune: true,
                runHooks: false,
            });
            service.archiveName = outcome?.archiveName;
            service.newImageRef = outcome?.newImageRef;
        }
    } catch (e) {
        log.error(
            `Project transaction failed while swapping services (${e?.message || e}); reverting`,
        );
        await finalizeRevert(trigger, composeFile, services, 'swap-failed');
        return false;
    }

    // PHASE 2 - gate opted-in services only, short-circuit on first failure.
    const failures: TransactionService[] = [];
    for (const service of services.filter((s) => s.config.enabled)) {
        let verdict: string;
        try {
            verdict = await gateService(trigger, service);
        } catch (e) {
            verdict = 'crashed';
            log.warn(
                `Gate of ${service.serviceKey} errored (${e?.message || e}); treating as failed`,
            );
        }
        service.verdict = verdict;
        service.reason = verdict;
        if (verdict !== 'healthy') {
            failures.push(service);
            break;
        }
    }

    if (failures.length === 0) {
        // PHASE 3 - COMMIT.
        for (const service of services) {
            await removeArchive(trigger, service);
            await pruneService(trigger, service);
        }
        log.info(`Project ${composeFile} committed on the new versions`);
        return true;
    }

    // PHASE 3 - REVERT the whole project.
    await finalizeRevert(trigger, composeFile, services, undefined, failures);
    return false;
}

/**
 * Revert every recreated service and copy `.back` back only when all services
 * were restored. Emits a single project-scoped rollback event.
 */
async function finalizeRevert(
    trigger: Dockercompose,
    composeFile: string,
    services: TransactionService[],
    forcedError?: string,
    failures?: TransactionService[],
): Promise<void> {
    const log = trigger.log;
    const start = Date.now();
    let allReverted = forcedError === undefined;

    for (const service of services) {
        const restored =
            forcedError === undefined
                ? await revertService(trigger, service)
                : false;
        if (!restored) {
            allReverted = false;
        }
    }

    // Copy `.back` back only when the full revert succeeded.
    if (allReverted) {
        try {
            await trigger.restoreComposeFileFromBackup(composeFile);
            log.info(
                `Project ${composeFile} restored from ${composeFile}.back`,
            );
        } catch (e) {
            allReverted = false;
            log.error(
                `Unable to restore ${composeFile} from its backup (${e?.message || e})`,
            );
        }
    }

    const outcomeServices = services.map((service) => {
        if (failures && failures.includes(service)) {
            return {
                service: service.serviceKey,
                containerName: serviceName(service.container),
                verdict: service.verdict || 'crashed',
                reason: service.reason || 'unknown',
            };
        }
        if (service.reverted) {
            return {
                service: service.serviceKey,
                containerName: serviceName(service.container),
                verdict: 'project-revert',
                reason: 'project-revert',
            };
        }
        return {
            service: service.serviceKey,
            containerName: serviceName(service.container),
            verdict: service.verdict || 'project-revert',
            reason: forcedError || 'restore-failed',
        };
    });

    const report = {
        scope: 'project',
        composeFile,
        services: outcomeServices,
        durationMs: Date.now() - start,
        status: allReverted ? 'succeeded' : 'failed',
        error: allReverted
            ? undefined
            : {
                  step: forcedError || 'revert',
                  message: 'project revert incomplete',
              },
    };

    log.warn(
        `Project ${composeFile} rolled back (status: ${report.status}, ${outcomeServices.length} services)`,
    );
    event.emitContainerRollback(report);
}
