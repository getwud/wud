import Dockerode from 'dockerode';
import { Logger } from 'pino';
import { Container } from '../../../model/container';
import {
    wudRollbackEnable,
    wudRollbackGrace,
    wudRollbackInterval,
    wudRollbackWindow,
} from '../../../watchers/providers/docker/label';
import { HealthVerdict, smokeTest, waitForHealthy } from './health';

/**
 * Resolved rollback configuration for a single container.
 */
export interface RollbackConfig {
    enabled: boolean;
    window: number;
    interval: number;
    grace: number;
}

/**
 * Trigger-level rollback defaults (Joi-validated trigger configuration).
 */
export interface RollbackTriggerDefaults {
    rollback: boolean;
    rollbackwindow: number;
    rollbackinterval: number;
    rollbackgrace: number;
}

/**
 * Details about a failed rollback step.
 */
export interface RollbackError {
    step?: string;
    message?: string;
    code?: string;
}

/**
 * Outcome of a rename-first swap, optionally health-gated.
 */
export interface SwapOutcome {
    rolledBack: boolean;
    reason?: HealthVerdict | string;
    durationMs: number;
    archiveName?: string;
    status: 'succeeded' | 'failed';
    error?: RollbackError;
}

/**
 * Parse a `"true" | "false"` label value (case-insensitive).
 */
export function parseRollbackBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true') {
            return true;
        }
        if (normalized === 'false') {
            return false;
        }
    }
    return undefined;
}

/**
 * Parse a finite strictly-positive integer label value.
 */
export function parseRollbackInteger(value: unknown): number | undefined {
    if (typeof value === 'number') {
        return Number.isInteger(value) && value > 0 ? value : undefined;
    }
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
    }
    return undefined;
}

/**
 * Resolve the effective rollback configuration: per-container label wins over
 * the trigger-level default.
 */
export function resolveRollbackConfig(
    container: Container,
    triggerDefaults: RollbackTriggerDefaults,
): RollbackConfig {
    const labels = container.labels || {};
    return {
        enabled:
            parseRollbackBoolean(labels[wudRollbackEnable]) ??
            triggerDefaults.rollback === true,
        window:
            parseRollbackInteger(labels[wudRollbackWindow]) ??
            triggerDefaults.rollbackwindow,
        interval:
            parseRollbackInteger(labels[wudRollbackInterval]) ??
            triggerDefaults.rollbackinterval,
        grace:
            parseRollbackInteger(labels[wudRollbackGrace]) ??
            triggerDefaults.rollbackgrace,
    };
}

/**
 * Build the archive name keeping the old container as the rollback source.
 */
export function buildArchiveName(containerName: string): string {
    return `${containerName}-wud-old-${Date.now()}`;
}

export interface ReplaceContainerOptions {
    /** The container currently running (the rollback source when archiving). */
    currentContainer: Dockerode.Container;
    /** Its inspected spec (used for the original name). */
    currentContainerSpec: Dockerode.ContainerInspectInfo;
    /** Create options for the replacement (already pointing at the new image). */
    createOptions: Dockerode.ContainerCreateOptions;
    /** Original container name. */
    containerName: string;
    /** Whether the container was running before the swap. */
    wasRunning: boolean;
    /** Resolved gate configuration (window/interval/grace). */
    gate: RollbackConfig;
    /** Keep the old container as `<name>-wud-old-<ts>` instead of removing it. */
    archive?: boolean;
    /** Keep the archive after a healthy verdict (caller commits/reverts later). */
    keepArchive?: boolean;
    /** Gate the replacement health; defaults to true. */
    gateHealth?: boolean;
    /** Create the replacement container (provider helper, incl. multi-network fallback). */
    createNewContainer: (
        options: Dockerode.ContainerCreateOptions,
    ) => Promise<Dockerode.Container>;
    /** Archive name builder (injectable for tests). */
    buildArchiveName?: (containerName: string) => string;
    log: Logger;
}

interface RollbackStepOptions {
    opts: ReplaceContainerOptions;
    newContainer: Dockerode.Container;
    archiveName: string;
    verdict: HealthVerdict | string;
    startTime: number;
}

/**
 * Restore the archived container under its original name.
 *
 * Strictly ordered (S1 stop new, S2 remove new, S3 rename archive back,
 * S4 start restored) so the rollback source is consumed only as the last
 * renaming step: a failure aborts before the next step, leaving the
 * container/archive state unchanged (no half-revert).
 */
async function rollbackToArchive({
    opts,
    newContainer,
    archiveName,
    verdict,
    startTime,
}: RollbackStepOptions): Promise<SwapOutcome> {
    const { log, containerName } = opts;
    const durationMs = () => Date.now() - startTime;

    const fail = (step: string, err: unknown): SwapOutcome => {
        const error: RollbackError = {
            step,
            message: err instanceof Error ? err.message : String(err),
            code: (err as { code?: string })?.code,
        };
        log.error(
            {
                event: 'rollback-failed',
                containerName,
                archiveName,
                step,
                error,
            },
            `Rollback failed at ${step} (${error.message}); ` +
                `container/archive state left unchanged. ` +
                `Archive kept as ${archiveName} for manual recovery.`,
        );
        return {
            rolledBack: true,
            reason: verdict,
            durationMs: durationMs(),
            status: 'failed',
            error,
            archiveName,
        };
    };

    // S1 - stop the broken replacement.
    try {
        await newContainer.stop();
    } catch (e) {
        const message = String(
            e instanceof Error ? e.message : e,
        ).toLowerCase();
        if (message.includes('not running')) {
            log.warn('Replacement was already stopped before rollback');
        } else {
            return fail('S1', e);
        }
    }

    // S2 - remove it to free the original name.
    try {
        await newContainer.remove({ force: true });
    } catch (e) {
        return fail('S2', e);
    }

    // S3 - restore the archive under the original name (consumes the source).
    try {
        await opts.currentContainer.rename({ name: containerName });
    } catch (e) {
        return fail('S3', e);
    }

    // S4 - restore liveness when it was running before the swap.
    if (opts.wasRunning) {
        try {
            await opts.currentContainer.start();
        } catch (e) {
            return fail('S4', e);
        }
    }

    log.warn(
        `Rollback succeeded: ${containerName} restored (reason: ${verdict})`,
    );
    return {
        rolledBack: true,
        reason: verdict,
        durationMs: durationMs(),
        status: 'succeeded',
        archiveName,
    };
}

/**
 * Replace a container, optionally gating the replacement on its health and
 * rolling back to the previous container when it does not prove healthy.
 *
 * With `archive` (rename-first), the old container is renamed
 * `<name>-wud-old-<ts>` before the replacement is created under the original
 * name, so it stays available as the rollback source until the verdict.
 */
export async function replaceContainerWithHealthGate(
    opts: ReplaceContainerOptions,
): Promise<SwapOutcome> {
    const { log, containerName } = opts;
    const startTime = Date.now();
    const gateHealth = opts.gateHealth !== false && opts.wasRunning;
    const verdictOptions = {
        window: opts.gate.window,
        interval: opts.gate.interval,
    };

    // No archive: plain replacement (no rollback source available).
    if (opts.archive !== true) {
        if (opts.wasRunning) {
            await opts.currentContainer.stop();
        }
        await opts.currentContainer.remove({ force: true });
        const newContainer = await opts.createNewContainer(opts.createOptions);
        if (opts.wasRunning) {
            await newContainer.start();
        }
        return {
            rolledBack: false,
            durationMs: Date.now() - startTime,
            status: 'succeeded',
        };
    }

    const archiveName = (opts.buildArchiveName || buildArchiveName)(
        containerName,
    );

    // Rename the old container out of the way first; the archive is the
    // rollback source for the whole gate.
    await opts.currentContainer.rename({ name: archiveName });

    let newContainer: Dockerode.Container;
    try {
        newContainer = await opts.createNewContainer(opts.createOptions);
    } catch (e) {
        // Nothing started yet: restore the archive name and rethrow.
        log.warn(
            `Unable to create the replacement for ${containerName}; restoring the previous container`,
        );
        try {
            await opts.currentContainer.rename({ name: containerName });
        } catch (renameError) {
            log.error(
                { err: renameError },
                `Unable to restore the original name ${containerName} (still archived as ${archiveName})`,
            );
        }
        throw e;
    }

    if (opts.wasRunning) {
        try {
            await newContainer.start();
        } catch (e) {
            return rollbackToArchive({
                opts,
                newContainer,
                archiveName,
                verdict: 'crashed',
                startTime,
            });
        }
    }

    let verdict: HealthVerdict = 'healthy';
    if (gateHealth) {
        verdict = await waitForHealthy(newContainer, verdictOptions, log);
        if (verdict === 'no-healthcheck') {
            verdict = await smokeTest(
                newContainer,
                { grace: opts.gate.grace, interval: opts.gate.interval },
                log,
            );
        }
    }

    if (verdict === 'healthy') {
        if (opts.keepArchive !== true) {
            try {
                await opts.currentContainer.remove({ force: true });
            } catch (e) {
                log.warn(
                    `Unable to remove the archived container ${archiveName} (${e})`,
                );
            }
        }
        return {
            rolledBack: false,
            durationMs: Date.now() - startTime,
            status: 'succeeded',
            archiveName: opts.keepArchive === true ? archiveName : undefined,
        };
    }

    return rollbackToArchive({
        opts,
        newContainer,
        archiveName,
        verdict,
        startTime,
    });
}
