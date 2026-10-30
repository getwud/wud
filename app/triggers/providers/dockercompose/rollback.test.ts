// @ts-nocheck
import * as event from '../../../event';
import { performProjectTransaction } from './rollback';

const log = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
};

const buildArchive = (name) => ({
    id: `${name}-archive-id`,
    rename: jest.fn(() => Promise.resolve()),
    start: jest.fn(() => Promise.resolve()),
    remove: jest.fn(() => Promise.resolve()),
    inspect: jest.fn(() =>
        Promise.resolve({
            Id: `${name}-archive-id`,
        }),
    ),
});

const buildNewContainer = (name, healthStatus) => ({
    id: `${name}-new-id`,
    inspect: jest.fn(() =>
        Promise.resolve({
            Id: `${name}-new-id`,
            State: {
                Running: true,
                Health: { Status: healthStatus },
            },
        }),
    ),
    stop: jest.fn(() => Promise.resolve()),
    remove: jest.fn(() => Promise.resolve()),
});

const buildTrigger = ({
    services,
    backupFails = false,
    newRemoveFailsFor = null,
    rewriteFails = false,
    snapshotFailsFor = null,
    restoreBackupFails = false,
    gateThrowsFor = null,
    stopNotRunningFor = null,
    pruneDisabled = false,
    archiveMissingFor = null,
    archiveRemoveFailsFor = null,
    pruneFails = false,
    performUpdateFailsFor = null,
    performUpdateRolledBackFor = null,
} = {}) => {
    const archives = {};
    const newContainers = {};
    services.forEach((s) => {
        archives[s.container.name] = buildArchive(s.container.name);
        newContainers[s.container.name] = buildNewContainer(
            s.container.name,
            s.health,
        );
    });

    const dockerApi = {
        getContainer: jest.fn((name) => {
            if (archives[name]) {
                return Promise.resolve(archives[name]);
            }
            throw new Error(`No such container: ${name}`);
        }),
    };

    const mockWatcher = {
        dockerApi,
        reconcileContainer: jest.fn(() => Promise.resolve()),
    };

    const trigger = {
        log,
        configuration: { prune: !pruneDisabled },
        resolveRollback: jest.fn((container) => ({
            enabled: container.rollbackEnabled === true,
            window: 10,
            interval: 5,
            grace: 5,
        })),
        getWatcher: jest.fn(() => mockWatcher),
        getCurrentContainer: jest.fn((api, container) =>
            Promise.resolve(container.name === snapshotFailsFor ? null : {}),
        ),
        inspectContainer: jest.fn(() =>
            Promise.resolve({ State: { Running: true } }),
        ),
        performUpdate: jest.fn((container) => {
            if (container.name === performUpdateFailsFor) {
                return Promise.reject(
                    new Error(`Update failed for ${container.name}`),
                );
            }
            if (container.name === performUpdateRolledBackFor) {
                return Promise.resolve({
                    rolledBack: true,
                    durationMs: 1,
                    status: 'succeeded',
                    reason: 'crashed',
                    archiveName: `${container.name}-archive-id`,
                });
            }
            return Promise.resolve({
                rolledBack: false,
                durationMs: 1,
                status: 'succeeded',
                archiveName:
                    container.name === archiveMissingFor
                        ? undefined
                        : `${container.name}-archive-id`,
            });
        }),
        pruneImages: jest.fn(() =>
            pruneFails
                ? Promise.reject(new Error('cannot prune'))
                : Promise.resolve(),
        ),
        removePreviousImage: jest.fn(() => Promise.resolve()),
        resolveRegistry: jest.fn(() => ({})),
        ensureComposeBackup: jest.fn(() =>
            backupFails
                ? Promise.reject(new Error('read-only mount'))
                : Promise.resolve(),
        ),
        rewriteComposeFile: jest.fn(() =>
            rewriteFails
                ? Promise.reject(new Error('read-only compose file'))
                : Promise.resolve(),
        ),
        restoreComposeFileFromBackup: jest.fn(() =>
            restoreBackupFails
                ? Promise.reject(new Error('cannot restore backup'))
                : Promise.resolve(),
        ),
    };

    let pendingGateThrow = gateThrowsFor;

    // The transaction resolves the new container by its original name, while
    // archives are addressed by their archive id/name. Route accordingly.
    dockerApi.getContainer = jest.fn((name) => {
        const service = services.find((s) => s.container.name === name);
        if (service) {
            return Promise.resolve(newContainers[name]);
        }
        const archived = Object.values(archives).find(
            (a) => a.id === name || `${name}`.endsWith('archive-id'),
        );
        if (archived) {
            return Promise.resolve(archived);
        }
        throw new Error(`No such container: ${name}`);
    });

    // Revert addresses the archive by its archive id.
    dockerApi.getContainer = jest.fn((name) => {
        if (name === pendingGateThrow) {
            pendingGateThrow = null;
            return Promise.reject(new Error('gate inspection failed'));
        }
        const service = services.find((s) => s.container.name === name);
        if (service) {
            return Promise.resolve(newContainers[name]);
        }
        for (const s of services) {
            if (
                archives[s.container.name].id === name ||
                name === `${s.container.name}-archive-id`
            ) {
                return Promise.resolve(archives[s.container.name]);
            }
        }
        throw new Error(`No such container: ${name}`);
    });

    if (newRemoveFailsFor) {
        newContainers[newRemoveFailsFor].remove = jest.fn(() =>
            Promise.reject(new Error('cannot remove new')),
        );
    }

    if (stopNotRunningFor) {
        newContainers[stopNotRunningFor].stop = jest.fn(() =>
            Promise.reject(new Error('container is not running')),
        );
    }

    if (archiveRemoveFailsFor) {
        archives[archiveRemoveFailsFor].remove = jest.fn(() =>
            Promise.reject(new Error('cannot remove archive')),
        );
    }

    return { trigger, archives, newContainers, dockerApi, mockWatcher };
};

const composeFile = '/tmp/docker-compose.yml';

beforeEach(() => {
    jest.restoreAllMocks();
});

test('should commit when all opted-in services are healthy', async () => {
    const { trigger, archives, mockWatcher } = buildTrigger({
        services: [
            {
                container: {
                    name: 'web',
                    rollbackEnabled: true,
                    id: 'web-old-id',
                },
                health: 'healthy',
            },
            {
                container: {
                    name: 'db',
                    rollbackEnabled: false,
                    id: 'db-old-id',
                },
                health: 'healthy',
            },
        ],
    });
    const emitSpy = jest.spyOn(event, 'emitContainerRollback');

    await performProjectTransaction(
        trigger,
        composeFile,
        [
            { name: 'web', rollbackEnabled: true, id: 'web-old-id' },
            { name: 'db', id: 'db-old-id' },
        ],
        [{ current: 'app:1', update: 'app:2' }],
    );

    // Implicit backup + rewrite happened.
    expect(trigger.ensureComposeBackup).toHaveBeenCalledWith(composeFile);
    expect(trigger.rewriteComposeFile).toHaveBeenCalled();
    // Archives removed + prune executed.
    expect(archives.web.remove).toHaveBeenCalled();
    expect(trigger.pruneImages).toHaveBeenCalled();
    // Reconciled containers
    expect(mockWatcher.reconcileContainer).toHaveBeenCalledWith('web-new-id', {
        oldContainerId: 'web-old-id',
        forceRefresh: true,
    });
    expect(mockWatcher.reconcileContainer).toHaveBeenCalledWith('db-new-id', {
        oldContainerId: 'db-old-id',
        forceRefresh: true,
    });
    // No revert.
    expect(trigger.restoreComposeFileFromBackup).not.toHaveBeenCalled();
    expect(emitSpy).not.toHaveBeenCalled();
    expect(trigger.performUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
            emitEvents: false,
            runHooks: false,
        }),
    );
});

test('should revert the whole project when an opted-in service fails', async () => {
    const { trigger, archives, newContainers, mockWatcher } = buildTrigger({
        services: [
            {
                container: {
                    name: 'web',
                    rollbackEnabled: true,
                    id: 'web-old-id',
                },
                health: 'unhealthy',
            },
            {
                container: {
                    name: 'db',
                    rollbackEnabled: false,
                    id: 'db-old-id',
                },
                health: 'healthy',
            },
        ],
    });
    const emitSpy = jest.spyOn(event, 'emitContainerRollback');

    await performProjectTransaction(
        trigger,
        composeFile,
        [
            { name: 'web', rollbackEnabled: true, id: 'web-old-id' },
            { name: 'db', id: 'db-old-id' },
        ],
        [{ current: 'app:1', update: 'app:2' }],
    );

    // The failing service and the healthy non-opted-in service are both reverted.
    expect(newContainers.web.remove).toHaveBeenCalled();
    expect(newContainers.db.remove).toHaveBeenCalled();
    expect(archives.web.rename).toHaveBeenCalled();
    expect(archives.db.rename).toHaveBeenCalled();
    // Reconciled containers on revert
    expect(mockWatcher.reconcileContainer).toHaveBeenCalledWith(
        'web-archive-id',
        {
            forceRefresh: true,
        },
    );
    expect(mockWatcher.reconcileContainer).toHaveBeenCalledWith(
        'db-archive-id',
        {
            forceRefresh: true,
        },
    );
    // .back copied back only after every service is restored.
    expect(trigger.restoreComposeFileFromBackup).toHaveBeenCalledWith(
        composeFile,
    );
    expect(trigger.pruneImages).not.toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalledTimes(1);

    const report = emitSpy.mock.calls[0][0];
    expect(report.scope).toEqual('project');
    expect(report.status).toEqual('succeeded');
    const healthyReverted = report.services.find((s) => s.service === 'db');
    expect(healthyReverted.reason).toEqual('project-revert');
    expect(healthyReverted.verdict).toEqual('project-revert');
    const failed = report.services.find((s) => s.service === 'web');
    expect(failed.reason).toEqual('unhealthy');
});

test('should short-circuit the gates after the first failure', async () => {
    const { trigger, newContainers } = buildTrigger({
        services: [
            {
                container: { name: 'web', rollbackEnabled: true },
                health: 'unhealthy',
            },
            {
                container: { name: 'api', rollbackEnabled: true },
                health: 'healthy',
            },
        ],
    });

    await performProjectTransaction(
        trigger,
        composeFile,
        [
            { name: 'web', rollbackEnabled: true },
            { name: 'api', rollbackEnabled: true },
        ],
        [{ current: 'app:1', update: 'app:2' }],
    );

    // The second gate is abandoned: its new container is never inspected.
    expect(newContainers.web.inspect).toHaveBeenCalled();
    expect(newContainers.api.inspect).not.toHaveBeenCalled();
});

test('should abort before mutating anything when the backup fails', async () => {
    const { trigger } = buildTrigger({
        services: [
            {
                container: { name: 'web', rollbackEnabled: true },
                health: 'healthy',
            },
        ],
        backupFails: true,
    });

    await performProjectTransaction(
        trigger,
        composeFile,
        [{ name: 'web', rollbackEnabled: true }],
        [{ current: 'app:1', update: 'app:2' }],
    );

    expect(trigger.rewriteComposeFile).not.toHaveBeenCalled();
    expect(trigger.performUpdate).not.toHaveBeenCalled();
});

test('should report a failed status when a service cannot be restored', async () => {
    const { trigger } = buildTrigger({
        services: [
            {
                container: { name: 'web', rollbackEnabled: true },
                health: 'unhealthy',
            },
        ],
        newRemoveFailsFor: 'web',
    });
    const emitSpy = jest.spyOn(event, 'emitContainerRollback');

    await performProjectTransaction(
        trigger,
        composeFile,
        [{ name: 'web', rollbackEnabled: true }],
        [{ current: 'app:1', update: 'app:2' }],
    );

    expect(trigger.restoreComposeFileFromBackup).not.toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy.mock.calls[0][0].status).toEqual('failed');
});

test('should abort before swapping when the compose rewrite fails', async () => {
    const { trigger } = buildTrigger({
        services: [
            {
                container: { name: 'web', rollbackEnabled: true },
                health: 'healthy',
            },
        ],
        rewriteFails: true,
    });

    const result = await performProjectTransaction(
        trigger,
        composeFile,
        [{ name: 'web', rollbackEnabled: true }],
        [{ current: 'app:1', update: 'app:2' }],
    );

    expect(result).toBe(false);
    expect(trigger.performUpdate).not.toHaveBeenCalled();
});

test('should revert the project when a service cannot be snapshotted', async () => {
    const { trigger } = buildTrigger({
        services: [
            {
                container: { name: 'web', rollbackEnabled: true },
                health: 'healthy',
            },
        ],
        snapshotFailsFor: 'web',
    });
    const emitSpy = jest.spyOn(event, 'emitContainerRollback');

    const result = await performProjectTransaction(
        trigger,
        composeFile,
        [{ name: 'web', rollbackEnabled: true }],
        [{ current: 'app:1', update: 'app:2' }],
    );

    expect(result).toBe(false);
    expect(trigger.performUpdate).not.toHaveBeenCalled();
    expect(trigger.restoreComposeFileFromBackup).toHaveBeenCalledWith(
        composeFile,
    );
    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy.mock.calls[0][0].status).toEqual('succeeded');
});

test('should treat a gate error as a crash and revert', async () => {
    const { trigger, archives } = buildTrigger({
        services: [
            {
                container: { name: 'web', rollbackEnabled: true },
                health: 'healthy',
            },
        ],
        gateThrowsFor: 'web',
    });
    const emitSpy = jest.spyOn(event, 'emitContainerRollback');

    const result = await performProjectTransaction(
        trigger,
        composeFile,
        [{ name: 'web', rollbackEnabled: true }],
        [{ current: 'app:1', update: 'app:2' }],
    );

    expect(result).toBe(false);
    expect(emitSpy.mock.calls[0][0].status).toEqual('succeeded');
    const web = emitSpy.mock.calls[0][0].services.find(
        (s) => s.service === 'web',
    );
    expect(web.reason).toEqual('crashed');
    expect(archives.web.rename).toHaveBeenCalled();
});

test('should fall back to the smoke test when the new image has no healthcheck', async () => {
    const { trigger, newContainers } = buildTrigger({
        services: [
            {
                container: { name: 'web', rollbackEnabled: true },
                health: 'healthy',
            },
        ],
    });
    newContainers.web.inspect = jest.fn(() =>
        Promise.resolve({ State: { Running: true } }),
    );

    const result = await performProjectTransaction(
        trigger,
        composeFile,
        [{ name: 'web', rollbackEnabled: true }],
        [{ current: 'app:1', update: 'app:2' }],
    );

    expect(result).toBe(true);
    expect(newContainers.web.inspect).toHaveBeenCalled();
});

test('should skip the prune when pruning is disabled', async () => {
    const { trigger } = buildTrigger({
        services: [
            {
                container: { name: 'web', rollbackEnabled: true },
                health: 'healthy',
            },
        ],
        pruneDisabled: true,
    });

    const result = await performProjectTransaction(
        trigger,
        composeFile,
        [{ name: 'web', rollbackEnabled: true }],
        [{ current: 'app:1', update: 'app:2' }],
    );

    expect(result).toBe(true);
    expect(trigger.pruneImages).not.toHaveBeenCalled();
});

test('should report a failure when the compose backup cannot be restored', async () => {
    const { trigger } = buildTrigger({
        services: [
            {
                container: { name: 'web', rollbackEnabled: true },
                health: 'unhealthy',
            },
        ],
        restoreBackupFails: true,
    });
    const emitSpy = jest.spyOn(event, 'emitContainerRollback');

    const result = await performProjectTransaction(
        trigger,
        composeFile,
        [{ name: 'web', rollbackEnabled: true }],
        [{ current: 'app:1', update: 'app:2' }],
    );

    expect(result).toBe(false);
    expect(emitSpy.mock.calls[0][0].status).toEqual('failed');
});

test('should commit when a service has no archive to clean up', async () => {
    const { trigger } = buildTrigger({
        services: [
            {
                container: { name: 'web', rollbackEnabled: true },
                health: 'healthy',
            },
        ],
        archiveMissingFor: 'web',
    });

    const result = await performProjectTransaction(
        trigger,
        composeFile,
        [{ name: 'web', rollbackEnabled: true }],
        [{ current: 'app:1', update: 'app:2' }],
    );

    expect(result).toBe(true);
});

test('should fail to revert a service that has no archive', async () => {
    const { trigger } = buildTrigger({
        services: [
            {
                container: { name: 'web', rollbackEnabled: true },
                health: 'unhealthy',
            },
        ],
        archiveMissingFor: 'web',
    });
    const emitSpy = jest.spyOn(event, 'emitContainerRollback');

    const result = await performProjectTransaction(
        trigger,
        composeFile,
        [{ name: 'web', rollbackEnabled: true }],
        [{ current: 'app:1', update: 'app:2' }],
    );

    expect(result).toBe(false);
    expect(trigger.restoreComposeFileFromBackup).not.toHaveBeenCalled();
    expect(emitSpy.mock.calls[0][0].status).toEqual('failed');
});

test('should tolerate an already-stopped new container during the revert', async () => {
    const { trigger, archives } = buildTrigger({
        services: [
            {
                container: { name: 'web', rollbackEnabled: true },
                health: 'unhealthy',
            },
        ],
        stopNotRunningFor: 'web',
    });
    const emitSpy = jest.spyOn(event, 'emitContainerRollback');

    const result = await performProjectTransaction(
        trigger,
        composeFile,
        [{ name: 'web', rollbackEnabled: true }],
        [{ current: 'app:1', update: 'app:2' }],
    );

    expect(result).toBe(false);
    expect(archives.web.rename).toHaveBeenCalled();
    expect(emitSpy.mock.calls[0][0].status).toEqual('succeeded');
});

test('should not fail the commit when an archive removal fails', async () => {
    const { trigger } = buildTrigger({
        services: [
            {
                container: { name: 'web', rollbackEnabled: true },
                health: 'healthy',
            },
        ],
        archiveRemoveFailsFor: 'web',
    });

    const result = await performProjectTransaction(
        trigger,
        composeFile,
        [{ name: 'web', rollbackEnabled: true }],
        [{ current: 'app:1', update: 'app:2' }],
    );

    expect(result).toBe(true);
});

test('should not fail the commit when the prune fails', async () => {
    const { trigger } = buildTrigger({
        services: [
            {
                container: { name: 'web', rollbackEnabled: true },
                health: 'healthy',
            },
        ],
        pruneFails: true,
    });

    const result = await performProjectTransaction(
        trigger,
        composeFile,
        [{ name: 'web', rollbackEnabled: true }],
        [{ current: 'app:1', update: 'app:2' }],
    );

    expect(result).toBe(true);
});

test('should start the restored archive container using its inspected container ID after rename', async () => {
    const { trigger, archives, newContainers, dockerApi } = buildTrigger({
        services: [
            {
                container: {
                    name: 'web',
                    rollbackEnabled: true,
                    id: 'web-old-id',
                },
                health: 'unhealthy',
            },
        ],
    });

    const archive = archives.web;
    archive.inspect = jest.fn(() =>
        Promise.resolve({
            Id: 'web-inspected-id',
        }),
    );
    const restoredContainer = {
        id: 'web-inspected-id',
        start: jest.fn(() => Promise.resolve()),
    };

    dockerApi.getContainer.mockImplementation((nameOrId) => {
        if (nameOrId === 'web') {
            return Promise.resolve(newContainers.web);
        }
        if (nameOrId === 'web-inspected-id') {
            return Promise.resolve(restoredContainer);
        }
        if (nameOrId === 'web-archive-id') {
            return Promise.resolve(archive);
        }
        throw new Error(`No such container: ${nameOrId}`);
    });

    await performProjectTransaction(
        trigger,
        composeFile,
        [{ name: 'web', rollbackEnabled: true, id: 'web-old-id' }],
        [{ current: 'app:1', update: 'app:2' }],
    );

    expect(archive.rename).toHaveBeenCalledWith({ name: 'web' });
    expect(restoredContainer.start).toHaveBeenCalledTimes(1);
});

test('should restore compose file from backup when swap phase fails with an exception', async () => {
    const { trigger } = buildTrigger({
        services: [
            {
                container: { name: 'app', rollbackEnabled: true },
                health: 'healthy',
            },
        ],
        performUpdateFailsFor: 'app',
    });
    const emitSpy = jest.spyOn(event, 'emitContainerRollback');

    const result = await performProjectTransaction(
        trigger,
        composeFile,
        [{ name: 'app', rollbackEnabled: true }],
        [{ current: 'app:1.0.0', update: 'app:1.0.1' }],
    );

    expect(result).toBe(false);
    expect(trigger.ensureComposeBackup).toHaveBeenCalledWith(composeFile);
    expect(trigger.rewriteComposeFile).toHaveBeenCalledTimes(1);
    expect(trigger.restoreComposeFileFromBackup).toHaveBeenCalledWith(
        composeFile,
    );
    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy.mock.calls[0][0].status).toEqual('succeeded');
});

test('should revert already-swapped services and restore compose file when swap phase fails on a later service', async () => {
    const { trigger, archives } = buildTrigger({
        services: [
            {
                container: { name: 'web', rollbackEnabled: true },
                health: 'healthy',
            },
            {
                container: { name: 'api', rollbackEnabled: true },
                health: 'healthy',
            },
        ],
        performUpdateFailsFor: 'api',
    });
    const emitSpy = jest.spyOn(event, 'emitContainerRollback');

    const result = await performProjectTransaction(
        trigger,
        composeFile,
        [
            { name: 'web', rollbackEnabled: true },
            { name: 'api', rollbackEnabled: true },
        ],
        [
            { current: 'web:1', update: 'web:2' },
            { current: 'api:1', update: 'api:2' },
        ],
    );

    expect(result).toBe(false);
    expect(archives.web.rename).toHaveBeenCalledWith({ name: 'web' });
    expect(trigger.restoreComposeFileFromBackup).toHaveBeenCalledWith(
        composeFile,
    );
    expect(emitSpy).toHaveBeenCalledTimes(1);
    const report = emitSpy.mock.calls[0][0];
    expect(report.status).toEqual('succeeded');
    const webOutcome = report.services.find((s) => s.service === 'web');
    expect(webOutcome.verdict).toEqual('project-revert');
    expect(webOutcome.reason).toEqual('project-revert');
    const apiOutcome = report.services.find((s) => s.service === 'api');
    expect(apiOutcome.verdict).toEqual('project-revert');
    expect(apiOutcome.reason).toEqual('swap-failed');
});

test('should abort restoring the compose file when reverting an already-swapped service fails during swap phase failure', async () => {
    const { trigger } = buildTrigger({
        services: [
            {
                container: { name: 'web', rollbackEnabled: true },
                health: 'healthy',
            },
            {
                container: { name: 'api', rollbackEnabled: true },
                health: 'healthy',
            },
        ],
        performUpdateFailsFor: 'api',
        newRemoveFailsFor: 'web',
    });
    const emitSpy = jest.spyOn(event, 'emitContainerRollback');

    const result = await performProjectTransaction(
        trigger,
        composeFile,
        [
            { name: 'web', rollbackEnabled: true },
            { name: 'api', rollbackEnabled: true },
        ],
        [
            { current: 'web:1', update: 'web:2' },
            { current: 'api:1', update: 'api:2' },
        ],
    );

    expect(result).toBe(false);
    expect(trigger.restoreComposeFileFromBackup).not.toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalledTimes(1);
    const report = emitSpy.mock.calls[0][0];
    expect(report.status).toEqual('failed');
    expect(report.error.step).toEqual('swap-failed');
});

test('should report failed status when compose backup restoration fails after swap phase failure', async () => {
    const { trigger } = buildTrigger({
        services: [
            {
                container: { name: 'web', rollbackEnabled: true },
                health: 'healthy',
            },
        ],
        performUpdateFailsFor: 'web',
        restoreBackupFails: true,
    });
    const emitSpy = jest.spyOn(event, 'emitContainerRollback');

    const result = await performProjectTransaction(
        trigger,
        composeFile,
        [{ name: 'web', rollbackEnabled: true }],
        [{ current: 'app:1', update: 'app:2' }],
    );

    expect(result).toBe(false);
    expect(trigger.restoreComposeFileFromBackup).toHaveBeenCalledWith(
        composeFile,
    );
    expect(emitSpy).toHaveBeenCalledTimes(1);
    const report = emitSpy.mock.calls[0][0];
    expect(report.status).toEqual('failed');
    expect(report.error.step).toEqual('swap-failed');
});

test('should abort transaction and restore compose file from backup when performUpdate returns rolledBack: true', async () => {
    const { trigger } = buildTrigger({
        services: [
            {
                container: { name: 'app', rollbackEnabled: true },
                health: 'healthy',
            },
        ],
        performUpdateRolledBackFor: 'app',
    });
    const emitSpy = jest.spyOn(event, 'emitContainerRollback');

    const result = await performProjectTransaction(
        trigger,
        composeFile,
        [{ name: 'app', rollbackEnabled: true }],
        [{ current: 'app:1.0.0', update: 'app:1.0.1' }],
    );

    expect(result).toBe(false);
    expect(trigger.ensureComposeBackup).toHaveBeenCalledWith(composeFile);
    expect(trigger.rewriteComposeFile).toHaveBeenCalledTimes(1);
    expect(trigger.restoreComposeFileFromBackup).toHaveBeenCalledWith(
        composeFile,
    );
    expect(emitSpy).toHaveBeenCalledTimes(1);
    const report = emitSpy.mock.calls[0][0];
    expect(report.status).toEqual('succeeded');
    const appOutcome = report.services.find((s) => s.service === 'app');
    expect(appOutcome.verdict).toEqual('crashed');
    expect(appOutcome.reason).toEqual('crashed');
});

test('should revert previously swapped services and restore compose file when a subsequent service rolls back during swap', async () => {
    const { trigger, archives } = buildTrigger({
        services: [
            {
                container: { name: 'web', rollbackEnabled: true },
                health: 'healthy',
            },
            {
                container: { name: 'api', rollbackEnabled: true },
                health: 'healthy',
            },
        ],
        performUpdateRolledBackFor: 'api',
    });
    const emitSpy = jest.spyOn(event, 'emitContainerRollback');

    const result = await performProjectTransaction(
        trigger,
        composeFile,
        [
            { name: 'web', rollbackEnabled: true },
            { name: 'api', rollbackEnabled: true },
        ],
        [
            { current: 'web:1', update: 'web:2' },
            { current: 'api:1', update: 'api:2' },
        ],
    );

    expect(result).toBe(false);
    expect(archives.web.rename).toHaveBeenCalledWith({ name: 'web' });
    expect(trigger.restoreComposeFileFromBackup).toHaveBeenCalledWith(
        composeFile,
    );
    expect(emitSpy).toHaveBeenCalledTimes(1);
    const report = emitSpy.mock.calls[0][0];
    expect(report.status).toEqual('succeeded');
    const webOutcome = report.services.find((s) => s.service === 'web');
    expect(webOutcome.verdict).toEqual('project-revert');
    expect(webOutcome.reason).toEqual('project-revert');
    const apiOutcome = report.services.find((s) => s.service === 'api');
    expect(apiOutcome.verdict).toEqual('crashed');
    expect(apiOutcome.reason).toEqual('crashed');
});
