// @ts-nocheck
import {
    getRunMode,
    isOneshot,
    RUN_MODE_ONESHOT,
    RUN_MODE_SERVER,
} from './mode';

describe('run mode', () => {
    const originalRunMode = process.env.WUD_RUN_MODE;

    afterEach(() => {
        if (originalRunMode === undefined) {
            delete process.env.WUD_RUN_MODE;
        } else {
            process.env.WUD_RUN_MODE = originalRunMode;
        }
    });

    test('should default to server when WUD_RUN_MODE is unset', () => {
        delete process.env.WUD_RUN_MODE;
        expect(getRunMode()).toBe(RUN_MODE_SERVER);
        expect(isOneshot()).toBe(false);
    });

    test('should return oneshot when WUD_RUN_MODE=oneshot', () => {
        process.env.WUD_RUN_MODE = 'oneshot';
        expect(getRunMode()).toBe(RUN_MODE_ONESHOT);
        expect(isOneshot()).toBe(true);
    });

    test('should be case insensitive', () => {
        process.env.WUD_RUN_MODE = 'ONESHOT';
        expect(getRunMode()).toBe(RUN_MODE_ONESHOT);
    });

    test('should ignore surrounding whitespace', () => {
        process.env.WUD_RUN_MODE = ' oneshot ';
        expect(getRunMode()).toBe(RUN_MODE_ONESHOT);
    });

    test('should treat any other value as server', () => {
        process.env.WUD_RUN_MODE = 'tui';
        expect(getRunMode()).toBe(RUN_MODE_SERVER);
        expect(isOneshot()).toBe(false);
    });
});
