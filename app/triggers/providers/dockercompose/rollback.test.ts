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
});

const buildNewContainer = (name, healthStatus) => ({
    id: `${name}-new-id`,
    inspect: jest.fn(() =>
        Promise.resolve({
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

    const trigger = {
        log,
        configuration: { prune: true },
        resolveRollback: jest.fn((container) => ({
            enabled: container.rollbackEnabled === true,
            window: 10,
            interval: 5,
            grace: 5,
        })),
        getWatcher: jest.fn(() => ({ dockerApi })),
        getCurrentContainer: jest.fn((api, container) => Promise.resolve({})),
        inspectContainer: jest.fn(() =>
            Promise.resolve({ State: { Running: true } }),
        ),
        performUpdate: jest.fn((container) =>
            Promise.resolve({
                rolledBack: false,
                durationMs: 1,
                status: 'succeeded',
                archiveName: `${container.name}-archive-id`,
            }),
        ),
        pruneImages: jest.fn(() => Promise.resolve()),
        removePreviousImage: jest.fn(() => Promise.resolve()),
        resolveRegistry: jest.fn(() => ({})),
        ensureComposeBackup: jest.fn(() =>
            backupFails
                ? Promise.reject(new Error('read-only mount'))
                : Promise.resolve(),
        ),
        rewriteComposeFile: jest.fn(() => Promise.resolve()),
        restoreComposeFileFromBackup: jest.fn(() => Promise.resolve()),
    };

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

    return { trigger, archives, newContainers, dockerApi };
};

const composeFile = '/tmp/docker-compose.yml';

beforeEach(() => {
    jest.restoreAllMocks();
});

test('should commit when all opted-in services are healthy', async () => {
    const { trigger, archives } = buildTrigger({
        services: [
            {
                container: { name: 'web', rollbackEnabled: true },
                health: 'healthy',
            },
            {
                container: { name: 'db', rollbackEnabled: false },
                health: 'healthy',
            },
        ],
    });
    const emitSpy = jest.spyOn(event, 'emitContainerRollback');

    await performProjectTransaction(
        trigger,
        composeFile,
        [{ name: 'web', rollbackEnabled: true }, { name: 'db' }],
        [{ current: 'app:1', update: 'app:2' }],
    );

    // Implicit backup + rewrite happened.
    expect(trigger.ensureComposeBackup).toHaveBeenCalledWith(composeFile);
    expect(trigger.rewriteComposeFile).toHaveBeenCalled();
    // Archives removed + prune executed.
    expect(archives.web.remove).toHaveBeenCalled();
    expect(trigger.pruneImages).toHaveBeenCalled();
    // No revert.
    expect(trigger.restoreComposeFileFromBackup).not.toHaveBeenCalled();
    expect(emitSpy).not.toHaveBeenCalled();
});

test('should revert the whole project when an opted-in service fails', async () => {
    const { trigger, archives, newContainers } = buildTrigger({
        services: [
            {
                container: { name: 'web', rollbackEnabled: true },
                health: 'unhealthy',
            },
            {
                container: { name: 'db', rollbackEnabled: false },
                health: 'healthy',
            },
        ],
    });
    const emitSpy = jest.spyOn(event, 'emitContainerRollback');

    await performProjectTransaction(
        trigger,
        composeFile,
        [{ name: 'web', rollbackEnabled: true }, { name: 'db' }],
        [{ current: 'app:1', update: 'app:2' }],
    );

    // The failing service and the healthy non-opted-in service are both reverted.
    expect(newContainers.web.remove).toHaveBeenCalled();
    expect(newContainers.db.remove).toHaveBeenCalled();
    expect(archives.web.rename).toHaveBeenCalled();
    expect(archives.db.rename).toHaveBeenCalled();
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
