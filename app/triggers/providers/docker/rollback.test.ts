// @ts-nocheck
import {
    RollbackConfig,
    buildArchiveName,
    parseRollbackBoolean,
    parseRollbackInteger,
    replaceContainerWithHealthGate,
    resolveRollbackConfig,
} from './rollback';

const log = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
};

const gate: RollbackConfig = {
    enabled: true,
    window: 5000,
    interval: 10,
    grace: 20,
};

const triggerDefaults = {
    rollback: false,
    rollbackwindow: 300000,
    rollbackinterval: 10000,
    rollbackgrace: 10000,
};

describe('resolveRollbackConfig', () => {
    test('should fall back to the trigger defaults when no label is set', () => {
        expect(
            resolveRollbackConfig(
                { labels: {} },
                { ...triggerDefaults, rollback: true },
            ),
        ).toEqual({
            enabled: true,
            window: 300000,
            interval: 10000,
            grace: 10000,
        });
    });

    test('should let labels win over the trigger defaults', () => {
        expect(
            resolveRollbackConfig(
                {
                    labels: {
                        'wud.rollback.enable': 'true',
                        'wud.rollback.window': '600000',
                        'wud.rollback.interval': '5000',
                        'wud.rollback.grace': '2000',
                    },
                },
                triggerDefaults,
            ),
        ).toEqual({
            enabled: true,
            window: 600000,
            interval: 5000,
            grace: 2000,
        });
    });

    test('should parse an explicit false label over an enabled trigger default', () => {
        expect(
            resolveRollbackConfig(
                { labels: { 'wud.rollback.enable': 'false' } },
                { ...triggerDefaults, rollback: true },
            ).enabled,
        ).toBe(false);
    });

    test('should ignore invalid labels and fall back to the defaults', () => {
        expect(
            resolveRollbackConfig(
                {
                    labels: {
                        'wud.rollback.enable': 'maybe',
                        'wud.rollback.window': '-5',
                        'wud.rollback.interval': 'abc',
                        'wud.rollback.grace': '0',
                    },
                },
                { ...triggerDefaults, rollback: true },
            ),
        ).toEqual({
            enabled: true,
            window: 300000,
            interval: 10000,
            grace: 10000,
        });
    });
});

describe('parseRollbackBoolean / parseRollbackInteger', () => {
    test('should parse booleans and case-insensitive strings', () => {
        expect(parseRollbackBoolean(true)).toBe(true);
        expect(parseRollbackBoolean('TRUE')).toBe(true);
        expect(parseRollbackBoolean('False')).toBe(false);
        expect(parseRollbackBoolean('nope')).toBeUndefined();
    });

    test('should parse strictly positive integers only', () => {
        expect(parseRollbackInteger(600000)).toBe(600000);
        expect(parseRollbackInteger('600000')).toBe(600000);
        expect(parseRollbackInteger(0)).toBeUndefined();
        expect(parseRollbackInteger(-1)).toBeUndefined();
        expect(parseRollbackInteger('1.5')).toBeUndefined();
        expect(parseRollbackInteger('')).toBeUndefined();
    });
});

describe('buildArchiveName', () => {
    test('should keep the original name as a prefix', () => {
        expect(buildArchiveName('web')).toMatch(/^web-wud-old-\d+$/);
    });
});

const buildMocks = ({
    newInspect,
    newStartFails = false,
    newStopFails = false,
    newRemoveFails = false,
    renameErrors = [],
    createFails = false,
    currentStartFails = false,
} = {}) => {
    let renameCall = 0;
    const currentContainer = {
        rename: jest.fn(() => {
            const error = renameErrors[renameCall];
            renameCall += 1;
            return error ? Promise.reject(error) : Promise.resolve();
        }),
        remove: jest.fn(() => Promise.resolve()),
        stop: jest.fn(() => Promise.resolve()),
        start: jest.fn(() =>
            currentStartFails
                ? Promise.reject(new Error('cannot start old'))
                : Promise.resolve(),
        ),
    };
    const newContainer = {
        inspect: jest.fn(
            newInspect || (() => Promise.resolve({ State: { Running: true } })),
        ),
        start: jest.fn(() =>
            newStartFails
                ? Promise.reject(new Error('cannot start new'))
                : Promise.resolve(),
        ),
        stop: jest.fn(() =>
            newStopFails
                ? Promise.reject(new Error('engine unreachable'))
                : Promise.resolve(),
        ),
        remove: jest.fn(() =>
            newRemoveFails
                ? Promise.reject(new Error('cannot remove new'))
                : Promise.resolve(),
        ),
    };
    const createNewContainer = jest.fn(() =>
        createFails
            ? Promise.reject(new Error('cannot create'))
            : Promise.resolve(newContainer),
    );
    return { currentContainer, newContainer, createNewContainer };
};

const baseOpts = (mocks, overrides = {}) => ({
    currentContainer: mocks.currentContainer,
    currentContainerSpec: { Name: '/web' },
    createOptions: { name: 'web', Image: 'test/web:2.0.0' },
    containerName: 'web',
    wasRunning: true,
    gate,
    archive: true,
    createNewContainer: mocks.createNewContainer,
    buildArchiveName: () => 'web-wud-old-123',
    log,
    ...overrides,
});

describe('replaceContainerWithHealthGate', () => {
    test('should remove the archive on a healthy verdict', async () => {
        const mocks = buildMocks({
            newInspect: () =>
                Promise.resolve({
                    State: { Running: true, Health: { Status: 'healthy' } },
                }),
        });
        const outcome = await replaceContainerWithHealthGate(baseOpts(mocks));
        expect(outcome.rolledBack).toBe(false);
        expect(outcome.status).toEqual('succeeded');
        expect(mocks.currentContainer.rename).toHaveBeenCalledWith({
            name: 'web-wud-old-123',
        });
        expect(mocks.currentContainer.remove).toHaveBeenCalled();
    });

    test('should let the smoke test decide when there is no healthcheck', async () => {
        let call = 0;
        const mocks = buildMocks({
            newInspect: () => {
                call += 1;
                // First (waitForHealthy) -> running without health;
                // then smoke test observes an exit.
                return Promise.resolve({ State: { Running: call < 2 } });
            },
        });
        const outcome = await replaceContainerWithHealthGate(baseOpts(mocks));
        expect(outcome.rolledBack).toBe(true);
        expect(outcome.reason).toEqual('crashed');
        expect(mocks.currentContainer.rename).toHaveBeenLastCalledWith({
            name: 'web',
        });
        expect(mocks.currentContainer.start).toHaveBeenCalled();
    });

    test('should roll back and restart the previous container on failure', async () => {
        const mocks = buildMocks({
            newInspect: () =>
                Promise.resolve({
                    State: { Running: true, Health: { Status: 'unhealthy' } },
                }),
        });
        const outcome = await replaceContainerWithHealthGate(baseOpts(mocks));
        expect(outcome.rolledBack).toBe(true);
        expect(outcome.reason).toEqual('unhealthy');
        expect(outcome.status).toEqual('succeeded');
        expect(mocks.newContainer.stop).toHaveBeenCalled();
        expect(mocks.newContainer.remove).toHaveBeenCalledWith({ force: true });
        expect(mocks.currentContainer.rename).toHaveBeenLastCalledWith({
            name: 'web',
        });
        expect(mocks.currentContainer.start).toHaveBeenCalled();
    });

    test('should keep the archive without gating when gateHealth is false', async () => {
        const mocks = buildMocks();
        const outcome = await replaceContainerWithHealthGate(
            baseOpts(mocks, { gateHealth: false, keepArchive: true }),
        );
        expect(outcome.rolledBack).toBe(false);
        expect(outcome.archiveName).toEqual('web-wud-old-123');
        expect(mocks.currentContainer.remove).not.toHaveBeenCalled();
        expect(mocks.newContainer.inspect).not.toHaveBeenCalled();
    });

    test('should not gate a container that was not running', async () => {
        const mocks = buildMocks({
            newInspect: () =>
                Promise.resolve({
                    State: { Running: true, Health: { Status: 'unhealthy' } },
                }),
        });
        const outcome = await replaceContainerWithHealthGate(
            baseOpts(mocks, { wasRunning: false }),
        );
        // A stopped container has no health signal to gate on: the swap
        // succeeds and the archive is removed without starting anything.
        expect(outcome.rolledBack).toBe(false);
        expect(mocks.currentContainer.start).not.toHaveBeenCalled();
        expect(mocks.newContainer.start).not.toHaveBeenCalled();
    });

    test('should roll back when the replacement cannot start', async () => {
        const mocks = buildMocks({ newStartFails: true });
        const outcome = await replaceContainerWithHealthGate(baseOpts(mocks));
        expect(outcome.rolledBack).toBe(true);
        expect(outcome.reason).toEqual('crashed');
        expect(mocks.currentContainer.rename).toHaveBeenLastCalledWith({
            name: 'web',
        });
    });

    test('should restore the previous name and rethrow when creation fails', async () => {
        const mocks = buildMocks({ createFails: true });
        await expect(
            replaceContainerWithHealthGate(baseOpts(mocks)),
        ).rejects.toThrow(/cannot create/);
        expect(mocks.currentContainer.rename).toHaveBeenLastCalledWith({
            name: 'web',
        });
    });

    // ---- rev. 3 no-half-revert ----
    test('S1 failure (engine unreachable) should abort and keep archive + new container', async () => {
        const mocks = buildMocks({
            newStopFails: true,
            newInspect: () =>
                Promise.resolve({
                    State: { Running: true, Health: { Status: 'unhealthy' } },
                }),
        });
        const outcome = await replaceContainerWithHealthGate(baseOpts(mocks));
        expect(outcome.status).toEqual('failed');
        expect(outcome.error.step).toEqual('S1');
        expect(outcome.archiveName).toEqual('web-wud-old-123');
        expect(mocks.newContainer.remove).not.toHaveBeenCalled();
        expect(mocks.currentContainer.rename).toHaveBeenCalledTimes(1);
    });

    test('S2 failure should abort and leave the archive intact', async () => {
        const mocks = buildMocks({
            newRemoveFails: true,
            newInspect: () =>
                Promise.resolve({
                    State: { Running: true, Health: { Status: 'unhealthy' } },
                }),
        });
        const outcome = await replaceContainerWithHealthGate(baseOpts(mocks));
        expect(outcome.status).toEqual('failed');
        expect(outcome.error.step).toEqual('S2');
        expect(mocks.currentContainer.rename).toHaveBeenCalledTimes(1);
    });

    test('S3 failure should keep the archive under its archive name', async () => {
        const mocks = buildMocks({
            renameErrors: [undefined, new Error('rename failed')],
            newInspect: () =>
                Promise.resolve({
                    State: { Running: true, Health: { Status: 'unhealthy' } },
                }),
        });
        const outcome = await replaceContainerWithHealthGate(baseOpts(mocks));
        expect(outcome.status).toEqual('failed');
        expect(outcome.error.step).toEqual('S3');
        expect(outcome.archiveName).toEqual('web-wud-old-123');
    });

    test('S4 failure should report the restored-but-stopped container', async () => {
        const mocks = buildMocks({
            currentStartFails: true,
            newInspect: () =>
                Promise.resolve({
                    State: { Running: true, Health: { Status: 'unhealthy' } },
                }),
        });
        const outcome = await replaceContainerWithHealthGate(baseOpts(mocks));
        expect(outcome.status).toEqual('failed');
        expect(outcome.error.step).toEqual('S4');
    });

    // ---- archive-less replacements ----
    test('should do a plain replacement when no archive is available', async () => {
        const mocks = buildMocks();
        const outcome = await replaceContainerWithHealthGate(
            baseOpts(mocks, { archive: false }),
        );
        expect(outcome.rolledBack).toBe(false);
        expect(outcome.status).toEqual('succeeded');
        expect(mocks.currentContainer.rename).not.toHaveBeenCalled();
        expect(mocks.currentContainer.stop).toHaveBeenCalled();
        expect(mocks.currentContainer.remove).toHaveBeenCalledWith({
            force: true,
        });
        expect(mocks.newContainer.start).toHaveBeenCalled();
    });

    test('should not start or stop a container that was not running without archive', async () => {
        const mocks = buildMocks();
        const outcome = await replaceContainerWithHealthGate(
            baseOpts(mocks, { archive: false, wasRunning: false }),
        );
        expect(outcome.rolledBack).toBe(false);
        expect(mocks.currentContainer.stop).not.toHaveBeenCalled();
        expect(mocks.newContainer.start).not.toHaveBeenCalled();
    });

    test('should tolerate an already-stopped replacement during S1', async () => {
        const mocks = buildMocks({
            newInspect: () =>
                Promise.resolve({
                    State: { Running: true, Health: { Status: 'unhealthy' } },
                }),
        });
        mocks.newContainer.stop = jest.fn(() =>
            Promise.reject(new Error('Container is not running')),
        );
        const outcome = await replaceContainerWithHealthGate(baseOpts(mocks));
        expect(outcome.rolledBack).toBe(true);
        expect(outcome.status).toEqual('succeeded');
        expect(mocks.currentContainer.rename).toHaveBeenLastCalledWith({
            name: 'web',
        });
    });

    test('should warn but still succeed when the archive cannot be removed', async () => {
        const mocks = buildMocks({
            newInspect: () =>
                Promise.resolve({
                    State: { Running: true, Health: { Status: 'healthy' } },
                }),
        });
        mocks.currentContainer.remove = jest.fn(() =>
            Promise.reject(new Error('cannot remove archive')),
        );
        const outcome = await replaceContainerWithHealthGate(baseOpts(mocks));
        expect(outcome.rolledBack).toBe(false);
        expect(outcome.status).toEqual('succeeded');
    });

    test('should report the archive as still archived when the name restore fails after a create failure', async () => {
        const mocks = buildMocks({
            createFails: true,
            renameErrors: [undefined, new Error('rename failed')],
        });
        await expect(
            replaceContainerWithHealthGate(baseOpts(mocks)),
        ).rejects.toThrow(/cannot create/);
        expect(mocks.currentContainer.rename).toHaveBeenCalledTimes(2);
    });
});
