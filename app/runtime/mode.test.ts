// @ts-nocheck
import {
    getRunMode,
    isOneshot,
    runModeSchema,
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

    test('should validate with Joi schema', () => {
        expect(runModeSchema.validate(undefined).value).toBe(RUN_MODE_SERVER);
        expect(runModeSchema.validate('server').value).toBe(RUN_MODE_SERVER);
        expect(runModeSchema.validate('oneshot').value).toBe(RUN_MODE_ONESHOT);
        expect(runModeSchema.validate('foobar').error).toBeDefined();
    });

    test('should default to server when WUD_RUN_MODE is unset', () => {
        delete process.env.WUD_RUN_MODE;
        expect(getRunMode()).toBe(RUN_MODE_SERVER);
        expect(isOneshot()).toBe(false);
    });

    test('should default to server when WUD_RUN_MODE is empty', () => {
        process.env.WUD_RUN_MODE = '';
        expect(getRunMode()).toBe(RUN_MODE_SERVER);
        expect(isOneshot()).toBe(false);
    });

    test('should return server when WUD_RUN_MODE=server', () => {
        process.env.WUD_RUN_MODE = 'server';
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

        process.env.WUD_RUN_MODE = 'Server';
        expect(getRunMode()).toBe(RUN_MODE_SERVER);
    });

    test('should ignore surrounding whitespace', () => {
        process.env.WUD_RUN_MODE = ' oneshot ';
        expect(getRunMode()).toBe(RUN_MODE_ONESHOT);
    });

    test('should throw a descriptive error when an invalid value is provided', () => {
        process.env.WUD_RUN_MODE = 'foobar';
        expect(() => getRunMode()).toThrow(
            'Invalid WUD_RUN_MODE "foobar": "value" must be one of [server, oneshot]',
        );
        expect(() => isOneshot()).toThrow(
            'Invalid WUD_RUN_MODE "foobar": "value" must be one of [server, oneshot]',
        );
    });
});
