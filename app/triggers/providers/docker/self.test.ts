// @ts-nocheck
import {
    SELF_CONTAINER_ID_ENV,
    SELF_UPDATE_PAYLOAD_ENV,
    buildTemporaryName,
    getSelfContainerId,
    isSelfContainer,
    readSelfUpdatePayload,
    runSelfUpdate,
    waitForHealthy,
} from './self';

const log = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
};

const FULL_ID =
    'd0478132ffc6a663a7e239467824ab14606cbd09039dbfed2403030187433c4d';
const SHORT_ID = FULL_ID.substring(0, 12);

const mountInfoWithId = (id) =>
    `571 covered /etc/hostname rw - ext4 /dev/sdc rw
572 covered /var/lib/docker/containers/${id}/hostname /etc/hostname rw - ext4 /dev/sdc rw`;

const dockerApiWithContainers = (containersById) => ({
    getContainer: (id) => {
        const container = containersById[id];
        if (!container) {
            return {
                inspect: () =>
                    Promise.reject(new Error(`No such container: ${id}`)),
            };
        }
        return container;
    },
});

describe('getSelfContainerId', () => {
    test('should return the explicitly declared container id', async () => {
        const id = await getSelfContainerId(
            dockerApiWithContainers({}),
            log,
            { [SELF_CONTAINER_ID_ENV]: FULL_ID },
            () => {
                throw new Error('mountinfo should not be read');
            },
        );
        expect(id).toEqual(FULL_ID);
    });

    test('should accept a short declared container id', async () => {
        const id = await getSelfContainerId(
            dockerApiWithContainers({}),
            log,
            { [SELF_CONTAINER_ID_ENV]: SHORT_ID },
            () => '',
        );
        expect(id).toEqual(SHORT_ID);
    });

    test('should ignore a malformed declared container id and fall back to mountinfo', async () => {
        const id = await getSelfContainerId(
            dockerApiWithContainers({}),
            log,
            { [SELF_CONTAINER_ID_ENV]: 'not-a-container-id' },
            () => mountInfoWithId(FULL_ID),
        );
        expect(id).toEqual(FULL_ID);
    });

    test('should resolve the container id from mountinfo', async () => {
        const id = await getSelfContainerId(
            dockerApiWithContainers({}),
            log,
            {},
            () => mountInfoWithId(FULL_ID),
        );
        expect(id).toEqual(FULL_ID);
    });

    test('should resolve the container id from mountinfo with a custom data-root', async () => {
        const id = await getSelfContainerId(
            dockerApiWithContainers({}),
            log,
            {},
            () =>
                `572 covered /data/docker/containers/${FULL_ID}/hosts /etc/hosts rw - ext4 /dev/sdc rw`,
        );
        expect(id).toEqual(FULL_ID);
    });

    test('should fall back to a hostname that resolves to a live container', async () => {
        const id = await getSelfContainerId(
            dockerApiWithContainers({
                [SHORT_ID]: {
                    inspect: () => Promise.resolve({ Id: FULL_ID }),
                },
            }),
            log,
            { HOSTNAME: SHORT_ID },
            () => 'no container id here',
        );
        expect(id).toEqual(FULL_ID);
    });

    test('should reject a stale hostname pointing at a removed container', async () => {
        // The docker trigger clones Config.Hostname onto replacements, so a
        // container WUD already recreated carries the previous container's id.
        const id = await getSelfContainerId(
            dockerApiWithContainers({}),
            log,
            { HOSTNAME: 'edbd3f68039d' },
            () => 'no container id here',
        );
        expect(id).toBeUndefined();
    });

    test('should reject a hostname resolving to a different container', async () => {
        const id = await getSelfContainerId(
            dockerApiWithContainers({
                abcdefabcdef: {
                    inspect: () =>
                        Promise.resolve({ Id: `999${FULL_ID.substring(3)}` }),
                },
            }),
            log,
            { HOSTNAME: 'abcdefabcdef' },
            () => 'no container id here',
        );
        expect(id).toBeUndefined();
    });

    test('should ignore a non hex hostname', async () => {
        const id = await getSelfContainerId(
            dockerApiWithContainers({
                plexserver: {
                    inspect: () => Promise.resolve({ Id: FULL_ID }),
                },
            }),
            log,
            { HOSTNAME: 'plexserver' },
            () => 'no container id here',
        );
        expect(id).toBeUndefined();
    });

    test('should return undefined when not running in a container', async () => {
        const id = await getSelfContainerId(
            dockerApiWithContainers({}),
            log,
            {},
            () => {
                throw new Error('ENOENT');
            },
        );
        expect(id).toBeUndefined();
    });
});

describe('isSelfContainer', () => {
    test('should match identical ids', () => {
        expect(isSelfContainer(FULL_ID, FULL_ID)).toBe(true);
    });

    test('should match a full id against a short id', () => {
        expect(isSelfContainer(FULL_ID, SHORT_ID)).toBe(true);
    });

    test('should match a short id against a full id', () => {
        expect(isSelfContainer(SHORT_ID, FULL_ID)).toBe(true);
    });

    test('should not match different ids', () => {
        expect(isSelfContainer(FULL_ID, `999${FULL_ID.substring(3)}`)).toBe(
            false,
        );
    });

    test('should not match when the self id is unknown', () => {
        expect(isSelfContainer(FULL_ID, undefined)).toBe(false);
    });
});

describe('buildTemporaryName', () => {
    test('should keep the original name as a prefix', () => {
        expect(buildTemporaryName('wud')).toMatch(/^wud-wud-self-update-\d+$/);
    });
});

describe('waitForHealthy', () => {
    test('should return true when the container reports healthy', async () => {
        const container = {
            inspect: () =>
                Promise.resolve({
                    State: { Running: true, Health: { Status: 'healthy' } },
                }),
        };
        expect(await waitForHealthy(container, 5000, log)).toBe(true);
    });

    test('should return false when the container reports unhealthy', async () => {
        const container = {
            inspect: () =>
                Promise.resolve({
                    State: { Running: true, Health: { Status: 'unhealthy' } },
                }),
        };
        expect(await waitForHealthy(container, 5000, log)).toBe(false);
    });

    test('should return false when the container is not running', async () => {
        const container = {
            inspect: () => Promise.resolve({ State: { Running: false } }),
        };
        expect(await waitForHealthy(container, 5000, log)).toBe(false);
    });

    test('should return true when there is no healthcheck and the container stays up', async () => {
        const container = {
            inspect: () => Promise.resolve({ State: { Running: true } }),
        };
        expect(await waitForHealthy(container, 50, log)).toBe(true);
    });

    test('should return false when there is no healthcheck and the container died', async () => {
        let call = 0;
        const container = {
            inspect: () => {
                call += 1;
                return Promise.resolve({ State: { Running: call === 1 } });
            },
        };
        expect(await waitForHealthy(container, 50, log)).toBe(false);
    });

    test('should return false when inspect fails', async () => {
        const container = {
            inspect: () => Promise.reject(new Error('gone')),
        };
        expect(await waitForHealthy(container, 50, log)).toBe(false);
    });

    test('should return false when the container never becomes healthy', async () => {
        const container = {
            inspect: () =>
                Promise.resolve({
                    State: { Running: true, Health: { Status: 'starting' } },
                }),
        };
        expect(await waitForHealthy(container, 1, log)).toBe(false);
    });
});

const buildSelfUpdateMocks = ({
    newContainerHealth = 'healthy',
    startFails = false,
    stopFails = false,
    renameFails = false,
} = {}) => {
    const calls = [];

    const oldContainer = {
        inspect: jest.fn(() =>
            Promise.resolve({
                Id: FULL_ID,
                Name: '/wud',
                State: { Running: true },
            }),
        ),
        stop: jest.fn(() => {
            calls.push('stop-old');
            return stopFails
                ? Promise.reject(new Error('cannot stop'))
                : Promise.resolve();
        }),
        remove: jest.fn(() => {
            calls.push('remove-old');
            return Promise.resolve();
        }),
        start: jest.fn(() => {
            calls.push('start-old');
            return Promise.resolve();
        }),
    };

    const newContainer = {
        inspect: jest.fn(() =>
            Promise.resolve({
                State: {
                    Running: true,
                    Health: { Status: newContainerHealth },
                },
            }),
        ),
        start: jest.fn(() => {
            calls.push('start-new');
            return startFails
                ? Promise.reject(new Error('cannot start'))
                : Promise.resolve();
        }),
        remove: jest.fn(() => {
            calls.push('remove-new');
            return Promise.resolve();
        }),
        rename: jest.fn(() => {
            calls.push('rename-new');
            return renameFails
                ? Promise.reject(new Error('cannot rename'))
                : Promise.resolve();
        }),
    };

    const dockerApi = {
        getContainer: jest.fn(() => oldContainer),
        createContainer: jest.fn((options) => {
            calls.push('create-new');
            newContainer.createOptions = options;
            return Promise.resolve(newContainer);
        }),
    };

    return { dockerApi, oldContainer, newContainer, calls };
};

const payload = {
    containerId: FULL_ID,
    createOptions: { name: 'wud', Image: 'getwud/wud:latest' },
    socketPath: '/var/run/docker.sock',
    healthTimeoutMs: 5000,
};

describe('runSelfUpdate', () => {
    test('should create the replacement before stopping the old container', async () => {
        const { dockerApi, calls } = buildSelfUpdateMocks();
        await runSelfUpdate(payload, dockerApi, log);
        expect(calls.indexOf('create-new')).toBeLessThan(
            calls.indexOf('stop-old'),
        );
    });

    test('should swap the containers in order on the happy path', async () => {
        const { dockerApi, calls } = buildSelfUpdateMocks();
        await runSelfUpdate(payload, dockerApi, log);
        expect(calls).toEqual([
            'create-new',
            'stop-old',
            'start-new',
            'remove-old',
            'rename-new',
        ]);
    });

    test('should create the replacement under a temporary name', async () => {
        const { dockerApi, newContainer } = buildSelfUpdateMocks();
        await runSelfUpdate(payload, dockerApi, log);
        expect(newContainer.createOptions.name).toMatch(
            /^wud-wud-self-update-\d+$/,
        );
        expect(newContainer.createOptions.Image).toEqual('getwud/wud:latest');
    });

    test('should rename the replacement to the original name', async () => {
        const { dockerApi, newContainer } = buildSelfUpdateMocks();
        await runSelfUpdate(payload, dockerApi, log);
        expect(newContainer.rename).toHaveBeenCalledWith({ name: 'wud' });
    });

    test('should roll back when the replacement cannot start', async () => {
        const { dockerApi, calls } = buildSelfUpdateMocks({ startFails: true });
        await expect(runSelfUpdate(payload, dockerApi, log)).rejects.toThrow(
            /Self-update failed/,
        );
        expect(calls).toEqual([
            'create-new',
            'stop-old',
            'start-new',
            'remove-new',
            'start-old',
        ]);
    });

    test('should roll back when the replacement never becomes healthy', async () => {
        const { dockerApi, calls } = buildSelfUpdateMocks({
            newContainerHealth: 'unhealthy',
        });
        await expect(runSelfUpdate(payload, dockerApi, log)).rejects.toThrow(
            /did not become healthy/,
        );
        expect(calls).toEqual([
            'create-new',
            'stop-old',
            'start-new',
            'remove-new',
            'start-old',
        ]);
    });

    test('should roll back without destroying anything when the old container cannot be stopped', async () => {
        const { dockerApi, calls, oldContainer } = buildSelfUpdateMocks({
            stopFails: true,
        });
        await expect(runSelfUpdate(payload, dockerApi, log)).rejects.toThrow(
            /unable to stop/,
        );
        // The old container never stopped, so it must not be started again and
        // must not be removed; only the unused replacement is cleaned up.
        expect(calls).toEqual(['create-new', 'stop-old', 'remove-new']);
        expect(oldContainer.start).not.toHaveBeenCalled();
        expect(oldContainer.remove).not.toHaveBeenCalled();
    });

    test('should not fail the update when the rename fails', async () => {
        const { dockerApi, calls } = buildSelfUpdateMocks({
            renameFails: true,
        });
        await expect(
            runSelfUpdate(payload, dockerApi, log),
        ).resolves.toBeUndefined();
        expect(calls).toContain('remove-old');
    });
});

describe('readSelfUpdatePayload', () => {
    test('should return undefined when no payload is set', () => {
        expect(readSelfUpdatePayload({})).toBeUndefined();
    });

    test('should parse the payload', () => {
        expect(
            readSelfUpdatePayload({
                [SELF_UPDATE_PAYLOAD_ENV]: JSON.stringify(payload),
            }),
        ).toEqual(payload);
    });
});
