import joi from 'joi';

/**
 * WUD run modes.
 */
export type RunMode = 'server' | 'oneshot';

export const RUN_MODE_SERVER: RunMode = 'server';
export const RUN_MODE_ONESHOT: RunMode = 'oneshot';

export const runModeSchema = joi
    .string()
    .valid(RUN_MODE_SERVER, RUN_MODE_ONESHOT)
    .default(RUN_MODE_SERVER);

/**
 * Return the current run mode.
 * The default mode is "server". The one-shot headless mode is selected with
 * the WUD_RUN_MODE=oneshot environment variable.
 */
export function getRunMode(): RunMode {
    const raw =
        process.env.WUD_RUN_MODE !== undefined &&
        process.env.WUD_RUN_MODE.trim() !== ''
            ? process.env.WUD_RUN_MODE.trim().toLowerCase()
            : undefined;
    const { error, value } = runModeSchema.validate(raw);
    if (error) {
        throw new Error(
            `Invalid WUD_RUN_MODE "${process.env.WUD_RUN_MODE}": ${error.message}`,
        );
    }
    return value as RunMode;
}

/**
 * Return true when running in one-shot headless mode.
 */
export function isOneshot(): boolean {
    return getRunMode() === RUN_MODE_ONESHOT;
}
