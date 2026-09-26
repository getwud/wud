import Dockerode from 'dockerode';
import { Logger } from 'pino';

/**
 * Outcome of a health evaluation.
 *
 * - `healthy` / `unhealthy` / `timeout` apply to containers declaring a HEALTHCHECK.
 * - `no-healthcheck` is a first-class verdict returned immediately when the
 *   replacement exposes no `State.Health`; the caller resolves it with `smokeTest`.
 * - `crashed` is an observed exit (or, for the smoke test, persistent
 *   uninspectability across the whole grace period).
 */
export type HealthVerdict =
    | 'healthy'
    | 'unhealthy'
    | 'timeout'
    | 'crashed'
    | 'no-healthcheck';

export interface HealthWaitOptions {
    window: number;
    interval: number;
}

export interface SmokeTestOptions {
    grace: number;
    interval: number;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

/**
 * Build the deterministic smoke-test sampling schedule.
 *
 * An immediate first sample at `t0`, a sample every `interval` while the
 * scheduled time is strictly before the deadline `T`, plus one mandatory
 * closing sample exactly at `T`. At the default `grace = interval` the schedule
 * is exactly `{t0, T}`.
 */
export function buildSampleSchedule(
    grace: number,
    interval: number,
    t0: number = Date.now(),
): number[] {
    const deadline = t0 + grace;
    const schedule = [t0];
    for (let t = t0 + interval; t < deadline; t += interval) {
        schedule.push(t);
    }
    schedule.push(deadline);
    return schedule;
}

/**
 * Wait for a container to prove healthy.
 *
 * Polls `State.Health.Status` every `interval` ms until `healthy`/`unhealthy`,
 * until the container exits (`crashed`), or until `window` elapses (`timeout`).
 * Returns `no-healthcheck` immediately on the first successful inspect reporting
 * no `State.Health`. Transient inspect errors are retried, never treated as a
 * verdict on their own.
 */
export async function waitForHealthy(
    container: Dockerode.Container,
    opts: HealthWaitOptions,
    log: Logger,
): Promise<HealthVerdict> {
    const deadline = Date.now() + opts.window;

    while (true) {
        let inspect: Dockerode.ContainerInspectInfo;
        try {
            inspect = await container.inspect();
        } catch (e) {
            log.warn(`Unable to inspect the new container (${e})`);
            if (Date.now() >= deadline) {
                log.warn(
                    'Timed out waiting for the new container to become healthy',
                );
                return 'timeout';
            }
            await sleep(
                Math.min(opts.interval, Math.max(0, deadline - Date.now())),
            );
            continue;
        }

        if (!inspect.State.Running) {
            log.warn('The new container is not running');
            return 'crashed';
        }

        const health = inspect.State.Health;
        if (!health) {
            return 'no-healthcheck';
        }

        if (health.Status === 'healthy') {
            return 'healthy';
        }
        if (health.Status === 'unhealthy') {
            log.warn('The new container reported itself unhealthy');
            return 'unhealthy';
        }

        if (Date.now() >= deadline) {
            log.warn(
                'Timed out waiting for the new container to become healthy',
            );
            return 'timeout';
        }
        await sleep(
            Math.min(opts.interval, Math.max(0, deadline - Date.now())),
        );
    }
}

/**
 * Grace-period smoke test for containers without a HEALTHCHECK.
 *
 * Samples container liveness over `grace`, retrying transient inspect errors.
 * Exactly one of three rules fires:
 *  - R1: any successful observation reports `Running === false` -> `crashed`.
 *  - R2: `grace` elapses with at least one successful observation and no
 *    observed exit -> `healthy`.
 *  - R3: `grace` elapses with zero successful observations -> `crashed`
 *    (`never-inspectable`).
 */
export async function smokeTest(
    container: Dockerode.Container,
    opts: SmokeTestOptions,
    log: Logger,
): Promise<'healthy' | 'crashed'> {
    let everInspected = false;
    const schedule = buildSampleSchedule(opts.grace, opts.interval);

    for (const sampleTime of schedule) {
        const wait = sampleTime - Date.now();
        if (wait > 0) {
            await sleep(wait);
        }
        try {
            const inspect = await container.inspect();
            everInspected = true;
            if (inspect.State.Running === false) {
                return 'crashed';
            }
        } catch (err) {
            log.warn({ err }, 'smokeTest inspect failed (transient); retrying');
        }
    }

    if (!everInspected) {
        return 'crashed';
    }
    return 'healthy';
}
