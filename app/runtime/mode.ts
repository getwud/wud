/**
 * WUD run modes.
 */
export type RunMode = 'server' | 'oneshot';

export const RUN_MODE_SERVER: RunMode = 'server';
export const RUN_MODE_ONESHOT: RunMode = 'oneshot';

/**
 * Return the current run mode.
 * The default mode is "server". The one-shot headless mode is selected with
 * the WUD_RUN_MODE=oneshot environment variable.
 */
export function getRunMode(): RunMode {
    return process.env.WUD_RUN_MODE?.trim().toLowerCase() === RUN_MODE_ONESHOT
        ? RUN_MODE_ONESHOT
        : RUN_MODE_SERVER;
}

/**
 * Return true when running in one-shot headless mode.
 */
export function isOneshot(): boolean {
    return getRunMode() === RUN_MODE_ONESHOT;
}
