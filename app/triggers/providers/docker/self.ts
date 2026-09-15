import fs from 'fs';
import Dockerode from 'dockerode';
import { Logger } from 'pino';

/**
 * Environment variable carrying the self-update payload.
 * When set, WUD boots as a one-shot self-update helper instead of as a server.
 */
export const SELF_UPDATE_PAYLOAD_ENV = 'WUD_SELF_UPDATE_PAYLOAD';

/**
 * Environment variable allowing the user to declare the id of the container
 * WUD itself runs in. Only needed when auto-detection fails (exotic runtimes,
 * non-default data-root, ...).
 */
export const SELF_CONTAINER_ID_ENV = 'WUD_CONTAINER_ID';

/**
 * Name of the container that performs the swap. Fixed rather than unique, so
 * at most one is ever left behind; the docker trigger removes the previous one
 * before starting a new swap.
 */
export const SELF_UPDATE_HELPER_NAME = 'wud-self-update';

/** Matches a full container id inside a `/containers/<id>/` mountinfo path. */
const MOUNTINFO_CONTAINER_ID_REGEX = /\/containers\/([0-9a-f]{64})\//;

/** Matches a short or full container id. */
const CONTAINER_ID_REGEX = /^[0-9a-f]{12,64}$/;

/** Everything the helper needs to swap the WUD container. */
export interface SelfUpdatePayload {
    /** Id of the WUD container to replace. */
    containerId: string;
    /** Create options for the replacement, already pointing at the new image. */
    createOptions: Dockerode.ContainerCreateOptions;
    /** Docker socket to talk to. */
    socketPath: string;
    /** How long to wait for the replacement to become healthy. */
    healthTimeoutMs: number;
}

/**
 * Resolve the id of the container WUD is running in.
 *
 * Three strategies, most reliable first:
 *  1. `WUD_CONTAINER_ID`, when the user declared it explicitly.
 *  2. `/proc/self/mountinfo`. Docker bind-mounts /etc/hostname, /etc/hosts and
 *     /etc/resolv.conf from `<data-root>/containers/<id>/`, so the id is there.
 *  3. `HOSTNAME`, but only when it still resolves to a live container whose id
 *     it actually prefixes.
 *
 * Strategy 3 is deliberately verified rather than trusted: the docker trigger
 * clones `Config.Hostname` onto replacement containers, so a container WUD has
 * already recreated keeps the *previous* container's id as its hostname. Taking
 * that at face value would mean mistaking another container for ourselves.
 *
 * @returns the container id, or undefined when WUD is not running in a container
 *          (or the runtime does not expose it).
 */
export async function getSelfContainerId(
    dockerApi: Dockerode,
    log: Logger,
    env: NodeJS.ProcessEnv = process.env,
    readMountInfo: () => string = () =>
        fs.readFileSync('/proc/self/mountinfo', 'utf-8'),
): Promise<string | undefined> {
    const declared = env[SELF_CONTAINER_ID_ENV];
    if (declared) {
        if (CONTAINER_ID_REGEX.test(declared)) {
            log.debug(`Self container id declared as ${declared}`);
            return declared;
        }
        log.warn(
            `${SELF_CONTAINER_ID_ENV} is not a valid container id (${declared}); ignoring it`,
        );
    }

    try {
        const mountInfo = readMountInfo();
        const match = mountInfo.match(MOUNTINFO_CONTAINER_ID_REGEX);
        if (match) {
            log.debug(
                `Self container id resolved from mountinfo (${match[1]})`,
            );
            return match[1];
        }
    } catch {
        // Not running in a container, or /proc is not available.
    }

    const hostname = env.HOSTNAME;
    if (hostname && CONTAINER_ID_REGEX.test(hostname)) {
        try {
            const inspect = await dockerApi.getContainer(hostname).inspect();
            if (inspect.Id.startsWith(hostname)) {
                log.debug(
                    `Self container id resolved from hostname (${hostname})`,
                );
                return inspect.Id;
            }
        } catch {
            // Stale hostname (cloned from a container that no longer exists).
        }
    }

    log.debug('Unable to resolve the id of the container WUD runs in');
    return undefined;
}

/**
 * Whether the given container is the one WUD itself runs in.
 */
export function isSelfContainer(
    containerId: string,
    selfContainerId: string | undefined,
): boolean {
    if (!selfContainerId) {
        return false;
    }
    return (
        containerId === selfContainerId ||
        containerId.startsWith(selfContainerId) ||
        selfContainerId.startsWith(containerId)
    );
}

/**
 * Name given to the replacement container while the swap is in flight.
 */
export function buildTemporaryName(containerName: string): string {
    return `${containerName}-wud-self-update-${Date.now()}`;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

/**
 * Wait until the replacement looks good.
 *
 * With a healthcheck, wait for `healthy`. Without one, the best available
 * signal is that the container is still running after a short settle time.
 */
export async function waitForHealthy(
    container: Dockerode.Container,
    healthTimeoutMs: number,
    log: Logger,
): Promise<boolean> {
    const deadline = Date.now() + healthTimeoutMs;
    let hasHealthcheck: boolean | undefined;

    while (Date.now() < deadline) {
        let inspect: Dockerode.ContainerInspectInfo;
        try {
            inspect = await container.inspect();
        } catch (e) {
            log.warn(`Unable to inspect the new container (${e})`);
            return false;
        }

        if (!inspect.State.Running) {
            log.warn('The new container is not running');
            return false;
        }

        if (hasHealthcheck === undefined) {
            hasHealthcheck = Boolean(inspect.State.Health);
        }

        if (!hasHealthcheck) {
            // No healthcheck to rely on; give it a moment and confirm it stayed up.
            await sleep(Math.min(5000, Math.max(0, deadline - Date.now())));
            try {
                const settled = await container.inspect();
                return settled.State.Running;
            } catch (e) {
                log.warn(`Unable to inspect the new container (${e})`);
                return false;
            }
        }

        const status = inspect.State.Health?.Status;
        if (status === 'healthy') {
            return true;
        }
        if (status === 'unhealthy') {
            log.warn('The new container reported itself unhealthy');
            return false;
        }

        await sleep(1000);
    }

    log.warn('Timed out waiting for the new container to become healthy');
    return false;
}

/**
 * Replace the WUD container with a new one.
 *
 * Runs inside a short-lived helper container, because the process performing
 * the swap cannot be the process being stopped. Modelled on the sequence
 * Portainer uses in portainer-updater: build the replacement first, stop the
 * old one, start the replacement, gate on health, and roll back to the old
 * container if anything fails.
 */
export async function runSelfUpdate(
    payload: SelfUpdatePayload,
    dockerApi: Dockerode,
    log: Logger,
): Promise<void> {
    const oldContainer = dockerApi.getContainer(payload.containerId);
    const oldInspect = await oldContainer.inspect();
    const containerName = oldInspect.Name.replace('/', '');
    const wasRunning = oldInspect.State.Running;

    const temporaryName = buildTemporaryName(containerName);
    log.info(
        `Self-update: replacing container ${containerName} (${payload.containerId})`,
    );

    // 1. Create the replacement under a temporary name, before touching the old
    //    container, so a failure here costs nothing.
    const newContainer = await dockerApi.createContainer({
        ...payload.createOptions,
        name: temporaryName,
    });
    log.info(`Self-update: created replacement container ${temporaryName}`);

    // Tracks whether the old container still needs to be brought back up if we
    // have to roll back. Stopping is the only thing that makes it true.
    let oldContainerStopped = false;

    const rollback = async (reason: string): Promise<never> => {
        log.warn(`Self-update failed (${reason}); rolling back`);
        try {
            await newContainer.remove({ force: true });
        } catch (e) {
            log.warn(`Self-update: unable to remove the replacement (${e})`);
        }
        if (oldContainerStopped) {
            try {
                await oldContainer.start();
                log.info(`Self-update: restarted ${containerName}`);
            } catch (e) {
                log.error(
                    `Self-update: unable to restart ${containerName} (${e}). Manual intervention required`,
                );
            }
        }
        throw new Error(`Self-update failed: ${reason}`);
    };

    // 2. Stop the old container. This is the step that kills WUD when the swap
    //    is attempted in-process; here it only stops our parent.
    if (wasRunning) {
        try {
            await oldContainer.stop();
            oldContainerStopped = true;
            log.info(`Self-update: stopped ${containerName}`);
        } catch (e) {
            return rollback(`unable to stop ${containerName} (${e})`);
        }
    }

    // 3. Start the replacement.
    try {
        await newContainer.start();
        log.info(`Self-update: started ${temporaryName}`);
    } catch (e) {
        return rollback(`unable to start the replacement (${e})`);
    }

    // 4. Gate on health before destroying the old container.
    const healthy = await waitForHealthy(
        newContainer,
        payload.healthTimeoutMs,
        log,
    );
    if (!healthy) {
        return rollback('the replacement did not become healthy');
    }

    // 5. The replacement is good: drop the old container and claim its name.
    try {
        await oldContainer.remove({ force: true });
        log.info(`Self-update: removed the previous ${containerName}`);
    } catch (e) {
        log.warn(`Self-update: unable to remove the previous container (${e})`);
    }

    try {
        await newContainer.rename({ name: containerName });
        log.info(`Self-update: renamed the replacement to ${containerName}`);
    } catch (e) {
        log.warn(
            `Self-update: unable to rename the replacement to ${containerName} (${e}). ` +
                `It is running as ${temporaryName}`,
        );
    }

    log.info(`Self-update: ${containerName} updated successfully`);
}

/**
 * Read the payload injected into the helper container, if any.
 */
export function readSelfUpdatePayload(
    env: NodeJS.ProcessEnv = process.env,
): SelfUpdatePayload | undefined {
    const raw = env[SELF_UPDATE_PAYLOAD_ENV];
    if (!raw) {
        return undefined;
    }
    return JSON.parse(raw) as SelfUpdatePayload;
}
