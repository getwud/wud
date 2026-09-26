// @ts-nocheck
import { ValidationError } from 'joi';
import Docker, {
    reconcileEnv,
    reconcileLabels,
    reconcileCmd,
    reconcileEntrypoint,
} from './Docker';
import { HookManager } from '../../hooks/HookManager';
import log from '../../../log';

const configurationValid = {
    prune: false,
    dryrun: false,
    multinetworkfallback: true,
    threshold: 'all',
    mode: 'simple',
    once: true,
    auto: true,
    autoremovetimeout: 10000,
    selfupdate: false,
    selfupdatetimeout: 120000,
    rollback: false,
    rollbackwindow: 300000,
    rollbackinterval: 10000,
    rollbackgrace: 10000,
    simpletitle:
        'New ${container.updateKind.kind} found for container ${container.name}',
    simplebody:
        'Container ${container.name} running with ${container.updateKind.kind} ${container.updateKind.localValue} can be updated to ${container.updateKind.kind} ${container.updateKind.remoteValue}${container.result && container.result.link ? "\\n" + container.result.link : ""}',
    batchtitle: '${containers.length} updates available',
};

const docker = new Docker();
docker.configuration = configurationValid;
docker.log = log;

jest.mock('../../../registry', () => ({
    getState() {
        return {
            watcher: {
                'docker.test': {
                    getId: () => 'docker.test',
                    watch: () => Promise.resolve(),
                    dockerApi: {
                        getContainer: (id) => {
                            if (id === '123456789') {
                                return Promise.resolve({
                                    inspect: () =>
                                        Promise.resolve({
                                            Name: '/container-name',
                                            Id: '123456798',
                                            State: {
                                                Running: true,
                                            },
                                            NetworkSettings: {
                                                Networks: {
                                                    test: {
                                                        Aliases: [
                                                            '9708fc7b44f2',
                                                            'test',
                                                        ],
                                                    },
                                                },
                                            },
                                        }),
                                    stop: () => Promise.resolve(),
                                    remove: () => Promise.resolve(),
                                    start: () => Promise.resolve(),
                                });
                            }
                            return Promise.reject(
                                new Error('Error when getting container'),
                            );
                        },
                        createContainer: (container) => {
                            if (container.name === 'container-name') {
                                return Promise.resolve({
                                    id: 'new-container-id',
                                    start: () => Promise.resolve(),
                                });
                            }
                            return Promise.reject(
                                new Error('Error when creating container'),
                            );
                        },
                        pull: (image) => {
                            if (
                                image === 'test/test:1.2.3' ||
                                image === 'my-registry/test/test:4.5.6'
                            ) {
                                return Promise.resolve();
                            }
                            return Promise.reject(
                                new Error('Error when pulling image'),
                            );
                        },
                        getImage: (image) =>
                            Promise.resolve({
                                remove: () => {
                                    if (image === 'test/test:1.2.3') {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(
                                        new Error('Error when removing image'),
                                    );
                                },
                            }),
                        modem: {
                            followProgress: (pullStream, res) => res(),
                        },
                        getNetwork: () => ({
                            connect: () => Promise.resolve(),
                        }),
                    },
                },
            },
            registry: {
                hub: {
                    getAuthPull: async () => undefined,
                    getImageFullName: (image, tagOrDigest) =>
                        `${image.registry.url}/${image.name}:${tagOrDigest}`,
                },
            },
        };
    },
}));

beforeEach(async () => {
    jest.resetAllMocks();
});

test('validateConfiguration should return validated configuration when valid', async () => {
    const validatedConfiguration =
        docker.validateConfiguration(configurationValid);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should throw error when invalid', async () => {
    const configuration = {
        url: 'git://xxx.com',
    };
    expect(() => {
        docker.validateConfiguration(configuration);
    }).toThrowError(ValidationError);
});

test('getWatcher should return watcher responsible for a container', async () => {
    expect(
        docker
            .getWatcher({
                watcher: 'test',
            })
            .getId(),
    ).toEqual('docker.test');
});

test('getCurrentContainer should return container from dockerApi', async () => {
    await expect(
        docker.getCurrentContainer(
            docker.getWatcher({ watcher: 'test' }).dockerApi,
            {
                id: '123456789',
            },
        ),
    ).resolves.not.toBeUndefined();
});

test('getCurrentContainer should throw error when error occurs', async () => {
    await expect(
        docker.getCurrentContainer(
            docker.getWatcher({ watcher: 'test' }).dockerApi,
            {
                id: 'unknown',
            },
        ),
    ).rejects.toThrowError('Error when getting container');
});

test('inspectContainer should return container details from dockerApi', async () => {
    await expect(
        docker.inspectContainer(
            {
                inspect: () => Promise.resolve({}),
            },
            log,
        ),
    ).resolves.toEqual({});
});

test('inspectContainer should throw error when error occurs', async () => {
    await expect(
        docker.inspectContainer(
            {
                inspect: () => Promise.reject(new Error('No container')),
            },
            log,
        ),
    ).rejects.toThrowError('No container');
});

test('stopContainer should stop container from dockerApi', async () => {
    await expect(
        docker.stopContainer(
            {
                stop: () => Promise.resolve(),
            },
            'name',
            'id',
            log,
        ),
    ).resolves.toBeUndefined();
});

test('stopContainer should throw error when error occurs', async () => {
    await expect(
        docker.stopContainer(
            {
                stop: () => Promise.reject(new Error('No container')),
            },
            'name',
            'id',
            log,
        ),
    ).rejects.toThrowError('No container');
});

test('removeContainer should stop container from dockerApi', async () => {
    await expect(
        docker.removeContainer(
            {
                remove: () => Promise.resolve(),
            },
            'name',
            'id',
            log,
        ),
    ).resolves.toBeUndefined();
});

test('removeContainer should throw error when error occurs', async () => {
    await expect(
        docker.removeContainer(
            {
                remove: () => Promise.reject(new Error('No container')),
            },
            'name',
            'id',
            log,
        ),
    ).rejects.toThrowError('No container');
});

test('waitContainerRemoved should wait for the container to be removed from dockerApi', async () => {
    await expect(
        docker.waitContainerRemoved(
            {
                wait: () => Promise.resolve(),
            },
            'name',
            'id',
            log,
        ),
    ).resolves.toBeUndefined();
});

test('waitContainerRemoved should throw error when error occurs', async () => {
    await expect(
        docker.waitContainerRemoved(
            {
                wait: () => Promise.reject(new Error('No container')),
            },
            'name',
            'id',
            log,
        ),
    ).rejects.toThrowError('No container');
});

test('startContainer should stop container from dockerApi', async () => {
    await expect(
        docker.startContainer(
            {
                start: () => Promise.resolve(),
            },
            'name',
            log,
        ),
    ).resolves.toBeUndefined();
});

test('startContainer should throw error when error occurs', async () => {
    await expect(
        docker.startContainer(
            {
                start: () => Promise.reject(new Error('No container')),
            },
            'name',
            log,
        ),
    ).rejects.toThrowError('No container');
});

test('createContainer should stop container from dockerApi', async () => {
    await expect(
        docker.createContainer(
            docker.getWatcher({ watcher: 'test' }).dockerApi,
            {
                name: 'container-name',
            },
            'name',
            log,
        ),
    ).resolves.not.toBeUndefined();
});

test('createContainer should throw error when error occurs', async () => {
    await expect(
        docker.createContainer(
            docker.getWatcher({ watcher: 'test' }).dockerApi,
            {
                name: 'ko',
            },
            'name',
            log,
        ),
    ).rejects.toThrowError('Error when creating container');
});

test('pull should pull image from dockerApi', async () => {
    await expect(
        docker.pullImage(
            docker.getWatcher({ watcher: 'test' }).dockerApi,
            undefined,
            'test/test:1.2.3',
            log,
        ),
    ).resolves.toBeUndefined();
});

test('pull should throw error when error occurs', async () => {
    await expect(
        docker.pullImage(
            docker.getWatcher({ watcher: 'test' }).dockerApi,
            undefined,
            'test/test:unknown',
            log,
        ),
    ).rejects.toThrowError('Error when pulling image');
});

test('removeImage should pull image from dockerApi', async () => {
    await expect(
        docker.removeImage(
            docker.getWatcher({ watcher: 'test' }).dockerApi,
            'test/test:1.2.3',
            log,
        ),
    ).resolves.toBeUndefined();
});

test('removeImage should throw error when error occurs', async () => {
    await expect(
        docker.removeImage(
            docker.getWatcher({ watcher: 'test' }).dockerApi,
            'test/test:unknown',
            log,
        ),
    ).rejects.toThrowError('Error when removing image');
});

test('clone should clone an existing container spec', async () => {
    const clone = docker.cloneContainer(
        {
            Name: '/test',
            Id: '123456789',
            HostConfig: {
                a: 'a',
                b: 'b',
            },
            Config: {
                configA: 'a',
                configB: 'b',
            },
            NetworkSettings: {
                Networks: {
                    test: {
                        Aliases: ['9708fc7b44f2', 'test'],
                    },
                },
            },
        },
        'test/test:2.0.0',
    );
    expect(clone).toEqual({
        HostConfig: {
            a: 'a',
            b: 'b',
        },
        Image: 'test/test:2.0.0',
        configA: 'a',
        configB: 'b',
        name: 'test',
        NetworkingConfig: {
            EndpointsConfig: {
                test: {
                    Aliases: ['9708fc7b44f2', 'test'],
                },
            },
        },
    });
});

test('clone should remove hostname and exposed ports when network mode is container:*', async () => {
    const clone = docker.cloneContainer(
        {
            Name: '/test',
            Id: '123456789',
            HostConfig: {
                NetworkMode: 'container:sidecar',
            },
            Config: {
                Hostname: 'test-host',
                ExposedPorts: {
                    '8080/tcp': {},
                },
                configA: 'a',
            },
            NetworkSettings: {
                Networks: {
                    default: {},
                },
            },
        },
        'test/test:2.0.0',
    );
    expect(clone.Hostname).toBeUndefined();
    expect(clone.ExposedPorts).toBeUndefined();
    expect(clone.HostConfig.NetworkMode).toEqual('container:sidecar');
});

describe('reconcileEnv', () => {
    test('should adopt new image default when container matches old image default (#1201)', () => {
        const containerEnv = [
            'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
            'NODE_VERSION=18.16.0',
            'YARN_VERSION=1.22.19',
        ];
        const oldImageEnv = [
            'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
            'NODE_VERSION=18.16.0',
            'YARN_VERSION=1.22.19',
        ];
        const newImageEnv = [
            'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
            'NODE_VERSION=20.9.0',
            'YARN_VERSION=1.22.19',
            'NEW_FEATURE_ENABLED=true',
        ];

        const reconciled = reconcileEnv(containerEnv, oldImageEnv, newImageEnv);
        expect(reconciled).toEqual([
            'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
            'NODE_VERSION=20.9.0',
            'YARN_VERSION=1.22.19',
            'NEW_FEATURE_ENABLED=true',
        ]);
    });

    test('should preserve user custom env overrides and container-only envs', () => {
        const containerEnv = [
            'PATH=/usr/local/bin:/bin',
            'PORT=8080',
            'USER_CUSTOM=my-value',
        ];
        const oldImageEnv = ['PATH=/usr/local/bin:/bin', 'PORT=3000'];
        const newImageEnv = [
            'PATH=/usr/local/bin:/bin:/new/bin',
            'PORT=3000',
            'VERSION=2.0.0',
        ];

        const reconciled = reconcileEnv(containerEnv, oldImageEnv, newImageEnv);
        expect(reconciled).toEqual([
            'PATH=/usr/local/bin:/bin:/new/bin',
            'PORT=8080',
            'VERSION=2.0.0',
            'USER_CUSTOM=my-value',
        ]);
    });

    test('should handle empty or undefined inputs gracefully', () => {
        expect(reconcileEnv(undefined, undefined, ['A=1'])).toEqual(['A=1']);
        expect(reconcileEnv(['A=2'], undefined, undefined)).toEqual(['A=2']);
        expect(reconcileEnv(undefined, undefined, undefined)).toEqual([]);
    });
});

describe('reconcileLabels', () => {
    test('should adopt new image default labels when container matches old image defaults', () => {
        const containerLabels = {
            'org.opencontainers.image.version': '1.0.0',
            maintainer: 'alice',
            'wud.tag.include': '^\\d+',
        };
        const oldImageLabels = {
            'org.opencontainers.image.version': '1.0.0',
            maintainer: 'alice',
        };
        const newImageLabels = {
            'org.opencontainers.image.version': '2.0.0',
            maintainer: 'bob',
            'fresh.label': 'yes',
        };

        const reconciled = reconcileLabels(
            containerLabels,
            oldImageLabels,
            newImageLabels,
        );
        expect(reconciled).toEqual({
            'org.opencontainers.image.version': '2.0.0',
            maintainer: 'bob',
            'fresh.label': 'yes',
            'wud.tag.include': '^\\d+',
        });
    });

    test('should preserve user overridden labels', () => {
        const containerLabels = {
            maintainer: 'custom-maintainer',
        };
        const oldImageLabels = {
            maintainer: 'alice',
        };
        const newImageLabels = {
            maintainer: 'bob',
            other: 'val',
        };

        const reconciled = reconcileLabels(
            containerLabels,
            oldImageLabels,
            newImageLabels,
        );
        expect(reconciled).toEqual({
            maintainer: 'custom-maintainer',
            other: 'val',
        });
    });

    test('should handle empty or undefined labels gracefully', () => {
        expect(reconcileLabels(undefined, undefined, { a: '1' })).toEqual({
            a: '1',
        });
        expect(reconcileLabels({ a: '2' }, undefined, undefined)).toEqual({
            a: '2',
        });
        expect(reconcileLabels(undefined, undefined, undefined)).toEqual({});
    });
});

describe('reconcileCmd & reconcileEntrypoint', () => {
    test('reconcileCmd should adopt new image Cmd when container Cmd equals old image Cmd', () => {
        const containerCmd = ['npm', 'start'];
        const oldImageCmd = ['npm', 'start'];
        const newImageCmd = ['node', 'server.js'];

        expect(reconcileCmd(containerCmd, oldImageCmd, newImageCmd)).toEqual([
            'node',
            'server.js',
        ]);
    });

    test('reconcileCmd should preserve container Cmd when user customized it', () => {
        const containerCmd = ['npm', 'run', 'custom'];
        const oldImageCmd = ['npm', 'start'];
        const newImageCmd = ['node', 'server.js'];

        expect(reconcileCmd(containerCmd, oldImageCmd, newImageCmd)).toEqual([
            'npm',
            'run',
            'custom',
        ]);
    });

    test('reconcileCmd should return undefined when new image has no Cmd and user did not customize', () => {
        const containerCmd = ['npm', 'start'];
        const oldImageCmd = ['npm', 'start'];
        const newImageCmd = undefined;

        expect(
            reconcileCmd(containerCmd, oldImageCmd, newImageCmd),
        ).toBeUndefined();
    });

    test('reconcileEntrypoint should adopt new image Entrypoint when container equals old image', () => {
        const containerEntrypoint = ['/entrypoint.sh'];
        const oldImageEntrypoint = ['/entrypoint.sh'];
        const newImageEntrypoint = ['/docker-entrypoint.sh'];

        expect(
            reconcileEntrypoint(
                containerEntrypoint,
                oldImageEntrypoint,
                newImageEntrypoint,
            ),
        ).toEqual(['/docker-entrypoint.sh']);
    });

    test('reconcileEntrypoint should preserve container Entrypoint when user customized it', () => {
        const containerEntrypoint = ['/my-custom-entrypoint.sh'];
        const oldImageEntrypoint = ['/entrypoint.sh'];
        const newImageEntrypoint = ['/docker-entrypoint.sh'];

        expect(
            reconcileEntrypoint(
                containerEntrypoint,
                oldImageEntrypoint,
                newImageEntrypoint,
            ),
        ).toEqual(['/my-custom-entrypoint.sh']);
    });
});

describe('inspectImage', () => {
    test('should return undefined when imageRef is undefined', async () => {
        const result = await docker.inspectImage({}, undefined, log);
        expect(result).toBeUndefined();
    });

    test('should return undefined when dockerApi.getImage is not a function', async () => {
        const result = await docker.inspectImage({}, 'test:1.0.0', log);
        expect(result).toBeUndefined();
    });

    test('should return image inspect result when available', async () => {
        const mockInspectData = {
            Id: 'sha256:1234',
            Config: { Env: ['FOO=BAR'] },
        };
        const mockDockerApi = {
            getImage: jest.fn(() => ({
                inspect: jest.fn(() => Promise.resolve(mockInspectData)),
            })),
        };

        const result = await docker.inspectImage(
            mockDockerApi,
            'test:1.0.0',
            log,
        );
        expect(result).toEqual(mockInspectData);
        expect(mockDockerApi.getImage).toHaveBeenCalledWith('test:1.0.0');
    });

    test('should return undefined and log warn when inspect throws', async () => {
        const mockDockerApi = {
            getImage: jest.fn(() => ({
                inspect: jest.fn(() =>
                    Promise.reject(new Error('Image not found')),
                ),
            })),
        };
        const warnSpy = jest.spyOn(log, 'warn');

        const result = await docker.inspectImage(
            mockDockerApi,
            'test:notfound',
            log,
        );
        expect(result).toBeUndefined();
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('Unable to inspect image test:notfound'),
        );
    });
});

describe('cloneContainer with image reconciliation', () => {
    const baseContainer = {
        Name: '/my-app',
        Id: '123456789',
        HostConfig: { RestartPolicy: { Name: 'always' } },
        Config: {
            Env: ['PATH=/bin', 'VERSION=1.0.0', 'USER_VAR=123'],
            Labels: { 'version.label': '1.0.0', 'user.label': 'custom' },
            Cmd: ['npm', 'start'],
            Entrypoint: ['/entrypoint.sh'],
        },
        NetworkSettings: {
            Networks: {
                default: {},
            },
        },
    };

    test('should reconcile configuration when both image specs are provided', () => {
        const oldImageSpec = {
            Config: {
                Env: ['PATH=/bin', 'VERSION=1.0.0'],
                Labels: { 'version.label': '1.0.0' },
                Cmd: ['npm', 'start'],
                Entrypoint: ['/entrypoint.sh'],
            },
        };
        const newImageSpec = {
            Config: {
                Env: [
                    'PATH=/usr/local/bin:/bin',
                    'VERSION=2.0.0',
                    'NEW_IMAGE_VAR=yes',
                ],
                Labels: { 'version.label': '2.0.0', 'image.new': 'true' },
                Cmd: ['node', 'server.js'],
                Entrypoint: ['/docker-entrypoint.sh'],
            },
        };

        const clone = docker.cloneContainer(
            baseContainer,
            'my-app:2.0.0',
            oldImageSpec,
            newImageSpec,
        );

        expect(clone.name).toEqual('my-app');
        expect(clone.Image).toEqual('my-app:2.0.0');
        expect(clone.Env).toEqual([
            'PATH=/usr/local/bin:/bin',
            'VERSION=2.0.0',
            'NEW_IMAGE_VAR=yes',
            'USER_VAR=123',
        ]);
        expect(clone.Labels).toEqual({
            'version.label': '2.0.0',
            'image.new': 'true',
            'user.label': 'custom',
        });
        expect(clone.Cmd).toEqual(['node', 'server.js']);
        expect(clone.Entrypoint).toEqual(['/docker-entrypoint.sh']);
    });

    test('should fall back to container config when oldImageSpec is missing', () => {
        const newImageSpec = {
            Config: {
                Env: ['VERSION=2.0.0'],
            },
        };

        const clone = docker.cloneContainer(
            baseContainer,
            'my-app:2.0.0',
            undefined,
            newImageSpec,
        );

        expect(clone.Env).toEqual(baseContainer.Config.Env);
        expect(clone.Labels).toEqual(baseContainer.Config.Labels);
        expect(clone.Cmd).toEqual(baseContainer.Config.Cmd);
        expect(clone.Entrypoint).toEqual(baseContainer.Config.Entrypoint);
    });

    test('should fall back to container config when newImageSpec is missing', () => {
        const oldImageSpec = {
            Config: {
                Env: ['VERSION=1.0.0'],
            },
        };

        const clone = docker.cloneContainer(
            baseContainer,
            'my-app:2.0.0',
            oldImageSpec,
            undefined,
        );

        expect(clone.Env).toEqual(baseContainer.Config.Env);
        expect(clone.Labels).toEqual(baseContainer.Config.Labels);
        expect(clone.Cmd).toEqual(baseContainer.Config.Cmd);
        expect(clone.Entrypoint).toEqual(baseContainer.Config.Entrypoint);
    });
});

test('trigger should not throw when all is ok', async () => {
    await expect(
        docker.trigger({
            updateAvailable: true,
            watcher: 'test',
            id: '123456789',
            Name: '/container-name',
            image: {
                name: 'test/test',
                registry: {
                    name: 'hub',
                    url: 'my-registry',
                },
            },
            updateKind: {
                remoteValue: '4.5.6',
            },
        }),
    ).resolves.toBeUndefined();
});

test('trigger should not use fallback when multi-network create succeeds', async () => {
    const createContainer = jest.fn(() =>
        Promise.resolve({
            id: 'created-id',
            start: () => Promise.resolve(),
        }),
    );
    const getNetwork = jest.fn(() => ({
        connect: jest.fn(() => Promise.resolve()),
    }));
    const dockerApi = {
        createContainer,
        getNetwork,
        pull: () => Promise.resolve(),
        modem: {
            followProgress: (pullStream, res) => res(),
        },
        getContainer: () =>
            Promise.resolve({
                inspect: () =>
                    Promise.resolve({
                        Name: '/container-name',
                        Id: '123456798',
                        State: {
                            Running: false,
                        },
                        HostConfig: {
                            NetworkMode: 'postgres_default',
                        },
                        NetworkSettings: {
                            Networks: {
                                cloud_default: {
                                    Aliases: ['cloud'],
                                },
                                postgres_default: {
                                    Aliases: ['postgres'],
                                },
                            },
                        },
                    }),
                stop: () => Promise.resolve(),
                remove: () => Promise.resolve(),
                start: () => Promise.resolve(),
            }),
    };
    const watcherSpy = jest.spyOn(docker, 'getWatcher').mockReturnValue({
        dockerApi,
    });

    await expect(
        docker.trigger({
            updateAvailable: true,
            watcher: 'test',
            id: '123456789',
            name: 'container-name',
            image: {
                name: 'test/test',
                registry: {
                    name: 'hub',
                    url: 'my-registry',
                },
            },
            updateKind: {
                remoteValue: '4.5.6',
            },
        }),
    ).resolves.toBeUndefined();

    watcherSpy.mockRestore();

    expect(createContainer).toHaveBeenCalledTimes(1);
    expect(getNetwork).not.toHaveBeenCalled();
});

test('trigger should fallback to primary then connect secondary networks', async () => {
    const createContainer = jest
        .fn()
        .mockRejectedValueOnce(
            new Error(
                'Container cannot be connected to network endpoints: cloud_default, postgres_default, valkey_default',
            ),
        )
        .mockResolvedValueOnce({
            id: 'created-id',
            start: () => Promise.resolve(),
        });
    const connectCalls = [];
    const getNetwork = jest.fn((networkName) => ({
        connect: (payload) => {
            connectCalls.push({
                networkName,
                payload,
            });
            return Promise.resolve();
        },
    }));
    const dockerApi = {
        createContainer,
        getNetwork,
        pull: () => Promise.resolve(),
        modem: {
            followProgress: (pullStream, res) => res(),
        },
        getContainer: () =>
            Promise.resolve({
                inspect: () =>
                    Promise.resolve({
                        Name: '/container-name',
                        Id: '123456798',
                        State: {
                            Running: false,
                        },
                        HostConfig: {
                            NetworkMode: 'postgres_default',
                        },
                        NetworkSettings: {
                            Networks: {
                                cloud_default: {
                                    Aliases: ['123456798abc', 'cloud'],
                                },
                                postgres_default: {
                                    Aliases: ['postgres'],
                                },
                                valkey_default: {
                                    Aliases: ['valkey'],
                                },
                            },
                        },
                    }),
                stop: () => Promise.resolve(),
                remove: () => Promise.resolve(),
                start: () => Promise.resolve(),
            }),
    };
    const watcherSpy = jest.spyOn(docker, 'getWatcher').mockReturnValue({
        dockerApi,
    });

    await expect(
        docker.trigger({
            updateAvailable: true,
            watcher: 'test',
            id: '123456789',
            name: 'container-name',
            image: {
                name: 'test/test',
                registry: {
                    name: 'hub',
                    url: 'my-registry',
                },
            },
            updateKind: {
                remoteValue: '4.5.6',
            },
        }),
    ).resolves.toBeUndefined();

    watcherSpy.mockRestore();

    expect(createContainer).toHaveBeenCalledTimes(2);
    expect(
        Object.keys(
            createContainer.mock.calls[1][0].NetworkingConfig.EndpointsConfig,
        ),
    ).toEqual(['postgres_default']);
    expect(getNetwork).toHaveBeenCalledTimes(2);
    expect(connectCalls.map((call) => call.networkName)).toEqual([
        'cloud_default',
        'valkey_default',
    ]);
    expect(connectCalls[0].payload.EndpointConfig.Aliases).toEqual(['cloud']);
});

test('trigger should throw when fallback cannot connect a secondary network', async () => {
    const createContainer = jest
        .fn()
        .mockRejectedValueOnce(
            new Error(
                'Container cannot be connected to network endpoints: cloud_default, postgres_default, valkey_default',
            ),
        )
        .mockResolvedValueOnce({
            id: 'created-id',
            start: () => Promise.resolve(),
        });
    const getNetwork = jest.fn((networkName) => ({
        connect: () =>
            networkName === 'valkey_default'
                ? Promise.reject(new Error('connect failed'))
                : Promise.resolve(),
    }));
    const dockerApi = {
        createContainer,
        getNetwork,
        pull: () => Promise.resolve(),
        modem: {
            followProgress: (pullStream, res) => res(),
        },
        getContainer: () =>
            Promise.resolve({
                inspect: () =>
                    Promise.resolve({
                        Name: '/container-name',
                        Id: '123456798',
                        State: {
                            Running: false,
                        },
                        HostConfig: {
                            NetworkMode: 'postgres_default',
                        },
                        NetworkSettings: {
                            Networks: {
                                cloud_default: {
                                    Aliases: ['cloud'],
                                },
                                postgres_default: {
                                    Aliases: ['postgres'],
                                },
                                valkey_default: {
                                    Aliases: ['valkey'],
                                },
                            },
                        },
                    }),
                stop: () => Promise.resolve(),
                remove: () => Promise.resolve(),
                start: () => Promise.resolve(),
            }),
    };
    const watcherSpy = jest.spyOn(docker, 'getWatcher').mockReturnValue({
        dockerApi,
    });

    await expect(
        docker.trigger({
            updateAvailable: true,
            watcher: 'test',
            id: '123456789',
            name: 'container-name',
            image: {
                name: 'test/test',
                registry: {
                    name: 'hub',
                    url: 'my-registry',
                },
            },
            updateKind: {
                remoteValue: '4.5.6',
            },
        }),
    ).rejects.toThrow('connect failed');

    watcherSpy.mockRestore();
});

test('trigger should skip and return without error when updateAvailable is false', async () => {
    const watcherSpy = jest.spyOn(docker, 'getWatcher');
    await expect(
        docker.trigger({
            updateAvailable: false,
            watcher: 'test',
            id: '123456789',
            name: 'container-name',
            image: {
                name: 'test/test',
                tag: { value: '1.0.0' },
                registry: {
                    name: 'hub',
                    url: 'my-registry',
                },
            },
            updateKind: {
                kind: 'unknown',
            },
        }),
    ).resolves.toBeUndefined();

    expect(watcherSpy).not.toHaveBeenCalled();
    watcherSpy.mockRestore();
});

test('trigger should throw when watcher is not found', async () => {
    const watcherSpy = jest
        .spyOn(docker, 'getWatcher')
        .mockReturnValue(undefined);
    await expect(
        docker.trigger({
            updateAvailable: true,
            watcher: 'test-watcher',
            id: '123456789',
            name: 'container-name',
            image: {
                name: 'test/test',
                tag: { value: '1.0.0', semver: true },
                registry: {
                    name: 'hub',
                    url: 'my-registry',
                },
            },
            updateKind: {
                kind: 'tag',
                remoteValue: '2.0.0',
            },
        }),
    ).rejects.toThrow(
        'Watcher test-watcher not found for container test-watcher_container-name',
    );

    watcherSpy.mockRestore();
});

test('trigger should throw when watcher dockerApi is missing', async () => {
    const watcherSpy = jest
        .spyOn(docker, 'getWatcher')
        .mockReturnValue({} as any);
    await expect(
        docker.trigger({
            updateAvailable: true,
            watcher: 'test-watcher',
            id: '123456789',
            name: 'container-name',
            image: {
                name: 'test/test',
                tag: { value: '1.0.0', semver: true },
                registry: {
                    name: 'hub',
                    url: 'my-registry',
                },
            },
            updateKind: {
                kind: 'tag',
                remoteValue: '2.0.0',
            },
        }),
    ).rejects.toThrow(
        'Watcher test-watcher not found for container test-watcher_container-name',
    );

    watcherSpy.mockRestore();
});

test('getNewImageFullName should gracefully handle undefined remoteValue', () => {
    const mockRegistry = {
        getImageFullName: jest.fn(
            (image, tagOrDigest) => `${image.name}:${tagOrDigest}`,
        ),
    };
    const containerWithoutRemoteValue = {
        name: 'test-container',
        image: {
            name: 'test/test',
            tag: { value: '1.2.3' },
            registry: { name: 'hub', url: 'my-registry' },
        },
        updateKind: {
            kind: 'unknown',
            remoteValue: undefined,
        },
    };

    const fullName = docker.getNewImageFullName(
        mockRegistry,
        containerWithoutRemoteValue,
    );
    expect(fullName).toEqual('test/test:1.2.3');
    expect(mockRegistry.getImageFullName).toHaveBeenCalledWith(
        containerWithoutRemoteValue.image,
        '1.2.3',
    );
});

const buildSelfUpdateDockerApi = () => {
    const stop = jest.fn(() => Promise.resolve());
    const remove = jest.fn(() => Promise.resolve());
    const createContainer = jest.fn(() =>
        Promise.resolve({
            id: 'helper-id',
            start: jest.fn(() => Promise.resolve()),
        }),
    );
    const dockerApi = {
        createContainer,
        pull: () => Promise.resolve(),
        modem: {
            followProgress: (pullStream, res) => res(),
        },
        getContainer: () =>
            Promise.resolve({
                inspect: () =>
                    Promise.resolve({
                        Name: '/wud',
                        Id: '123456798',
                        Image: 'sha256:currentimage',
                        State: { Running: true },
                        Config: { Hostname: '123456798' },
                        HostConfig: {},
                        NetworkSettings: { Networks: {} },
                    }),
                stop,
                remove,
                start: () => Promise.resolve(),
            }),
    };
    return { dockerApi, stop, remove, createContainer };
};

const selfContainer = {
    updateAvailable: true,
    watcher: 'test',
    id: '123456789',
    name: 'wud',
    image: {
        name: 'getwud/wud',
        registry: { name: 'hub', url: 'my-registry' },
    },
    updateKind: { remoteValue: '9.0.3' },
};

test('trigger should refuse to replace the container WUD runs in by default', async () => {
    const { dockerApi, stop, remove } = buildSelfUpdateDockerApi();
    const watcherSpy = jest.spyOn(docker, 'getWatcher').mockReturnValue({
        dockerApi,
        configuration: { socket: '/var/run/docker.sock' },
    });
    const selfSpy = jest
        .spyOn(docker, 'resolveSelfContainerId')
        .mockResolvedValue('123456798');

    await expect(docker.trigger(selfContainer)).rejects.toThrow(
        /Refusing to update the container WUD runs in/,
    );

    // The whole point: the container must not be touched.
    expect(stop).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();

    watcherSpy.mockRestore();
    selfSpy.mockRestore();
});

test('trigger should delegate to a helper container when selfupdate is enabled', async () => {
    const { dockerApi, stop, remove, createContainer } =
        buildSelfUpdateDockerApi();
    const watcherSpy = jest.spyOn(docker, 'getWatcher').mockReturnValue({
        dockerApi,
        configuration: { socket: '/var/run/docker.sock' },
    });
    const selfSpy = jest
        .spyOn(docker, 'resolveSelfContainerId')
        .mockResolvedValue('123456798');
    docker.configuration = { ...configurationValid, selfupdate: true };

    await expect(docker.trigger(selfContainer)).resolves.toBeUndefined();

    // The swap is delegated, so this process must not stop or remove anything.
    expect(stop).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();

    expect(createContainer).toHaveBeenCalledTimes(1);
    const helperSpec = createContainer.mock.calls[0][0];
    expect(helperSpec.name).toEqual('wud-self-update');
    // The helper runs the image WUD runs right now, not the one being installed.
    expect(helperSpec.Image).toEqual('sha256:currentimage');
    // Kept after the run: its logs are the only record if the swap fails.
    expect(helperSpec.HostConfig.AutoRemove).toBe(false);
    expect(helperSpec.Healthcheck).toEqual({ Test: ['NONE'] });
    expect(helperSpec.HostConfig.Binds).toEqual([
        '/var/run/docker.sock:/var/run/docker.sock',
    ]);

    const payload = JSON.parse(
        helperSpec.Env[0].replace('WUD_SELF_UPDATE_PAYLOAD=', ''),
    );
    expect(payload.containerId).toEqual('123456798');
    expect(payload.createOptions.Image).toEqual('my-registry/getwud/wud:9.0.3');
    // The replacement must not inherit this container's id as its hostname.
    expect(payload.createOptions.Hostname).toBeUndefined();

    docker.configuration = configurationValid;
    watcherSpy.mockRestore();
    selfSpy.mockRestore();
});

test('trigger should refuse to self-update over a remote docker host', async () => {
    const { dockerApi } = buildSelfUpdateDockerApi();
    const watcherSpy = jest.spyOn(docker, 'getWatcher').mockReturnValue({
        dockerApi,
        configuration: { socket: '/var/run/docker.sock', host: 'remote-host' },
    });
    const selfSpy = jest
        .spyOn(docker, 'resolveSelfContainerId')
        .mockResolvedValue('123456798');
    docker.configuration = { ...configurationValid, selfupdate: true };

    await expect(docker.trigger(selfContainer)).rejects.toThrow(
        /only supported when the watcher talks to Docker over a socket/,
    );

    docker.configuration = configurationValid;
    watcherSpy.mockRestore();
    selfSpy.mockRestore();
});

test('trigger should update normally when the container is not WUD itself', async () => {
    const { dockerApi, stop, remove } = buildSelfUpdateDockerApi();
    const watcherSpy = jest.spyOn(docker, 'getWatcher').mockReturnValue({
        dockerApi,
        configuration: { socket: '/var/run/docker.sock' },
    });
    const selfSpy = jest
        .spyOn(docker, 'resolveSelfContainerId')
        .mockResolvedValue('someothercontainerid');

    await expect(docker.trigger(selfContainer)).resolves.toBeUndefined();

    expect(stop).toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();

    watcherSpy.mockRestore();
    selfSpy.mockRestore();
});

test('trigger should reconcile container configuration with old and new image specs', async () => {
    const oldImageInspect = {
        Id: 'sha256:oldimage123',
        Config: {
            Env: ['PATH=/bin', 'APP_VERSION=1.0.0'],
            Labels: { 'com.example.version': '1.0.0' },
            Cmd: ['npm', 'start'],
            Entrypoint: ['/entrypoint.sh'],
        },
    };
    const newImageInspect = {
        Id: 'sha256:newimage456',
        Config: {
            Env: [
                'PATH=/usr/local/bin:/bin',
                'APP_VERSION=2.0.0',
                'FRESH_ENV=active',
            ],
            Labels: {
                'com.example.version': '2.0.0',
                'com.example.new': 'yes',
            },
            Cmd: ['node', 'index.js'],
            Entrypoint: ['/docker-entrypoint.sh'],
        },
    };

    let createdOptions: any;
    const createContainer = jest.fn((opts) => {
        createdOptions = opts;
        return Promise.resolve({
            id: 'recreated-id',
            start: () => Promise.resolve(),
        });
    });

    const dockerApi = {
        createContainer,
        pull: () => Promise.resolve(),
        modem: {
            followProgress: (pullStream, res) => res(),
        },
        getImage: jest.fn((imageRef) => ({
            inspect: () => {
                if (imageRef === 'sha256:oldimage123') {
                    return Promise.resolve(oldImageInspect);
                }
                return Promise.resolve(newImageInspect);
            },
        })),
        getContainer: () =>
            Promise.resolve({
                inspect: () =>
                    Promise.resolve({
                        Name: '/my-service',
                        Id: 'container-12345',
                        Image: 'sha256:oldimage123',
                        State: {
                            Running: true,
                        },
                        Config: {
                            Env: [
                                'PATH=/bin',
                                'APP_VERSION=1.0.0',
                                'USER_CUSTOM=override',
                            ],
                            Labels: {
                                'com.example.version': '1.0.0',
                                'user.custom.label': 'stay',
                            },
                            Cmd: ['npm', 'start'],
                            Entrypoint: ['/entrypoint.sh'],
                        },
                        HostConfig: {
                            RestartPolicy: { Name: 'always' },
                        },
                        NetworkSettings: {
                            Networks: {
                                default: {},
                            },
                        },
                    }),
                stop: () => Promise.resolve(),
                remove: () => Promise.resolve(),
            }),
    };

    const watcherSpy = jest.spyOn(docker, 'getWatcher').mockReturnValue({
        dockerApi,
    });

    await expect(
        docker.trigger({
            updateAvailable: true,
            watcher: 'test',
            id: 'container-12345',
            name: 'my-service',
            image: {
                name: 'test/service',
                registry: {
                    name: 'hub',
                    url: 'my-registry',
                },
            },
            updateKind: {
                kind: 'tag',
                remoteValue: '2.0.0',
            },
        }),
    ).resolves.toBeUndefined();

    expect(dockerApi.getImage).toHaveBeenCalledWith('sha256:oldimage123');
    expect(dockerApi.getImage).toHaveBeenCalledWith(
        'my-registry/test/service:2.0.0',
    );

    expect(createdOptions.Env).toEqual([
        'PATH=/usr/local/bin:/bin',
        'APP_VERSION=2.0.0',
        'FRESH_ENV=active',
        'USER_CUSTOM=override',
    ]);
    expect(createdOptions.Labels).toEqual({
        'com.example.version': '2.0.0',
        'com.example.new': 'yes',
        'user.custom.label': 'stay',
    });
    expect(createdOptions.Cmd).toEqual(['node', 'index.js']);
    expect(createdOptions.Entrypoint).toEqual(['/docker-entrypoint.sh']);

    watcherSpy.mockRestore();
});

test('validateConfiguration should accept valid hooks in configuration', async () => {
    const configWithHooks = {
        ...configurationValid,
        hooks: [
            {
                type: 'exec',
                phase: 'pre',
                command: 'echo "hello"',
            },
            {
                type: 'trigger',
                phase: 'post',
                trigger: 'slack',
            },
        ],
    };
    const validated = docker.validateConfiguration(configWithHooks);
    expect(validated.hooks).toHaveLength(2);
});

test('trigger should execute pre-hooks and post-hooks during update', async () => {
    const preSpy = jest
        .spyOn(HookManager, 'runPreHooks')
        .mockResolvedValue(undefined);
    const postSpy = jest
        .spyOn(HookManager, 'runPostHooks')
        .mockResolvedValue(undefined);

    await expect(
        docker.trigger({
            updateAvailable: true,
            watcher: 'test',
            id: '123456789',
            name: 'container-name',
            image: {
                name: 'test/test',
                registry: {
                    name: 'hub',
                    url: 'my-registry',
                },
            },
            updateKind: {
                remoteValue: '4.5.6',
            },
        }),
    ).resolves.toBeUndefined();

    expect(preSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledTimes(1);
    preSpy.mockRestore();
    postSpy.mockRestore();
});

test('trigger should abort and NOT stop container if pre-hook fails (Quality Gate)', async () => {
    const preSpy = jest
        .spyOn(HookManager, 'runPreHooks')
        .mockRejectedValue(new Error('Pre-hook backup failed'));
    const stopSpy = jest.spyOn(docker, 'stopContainer');

    await expect(
        docker.trigger({
            updateAvailable: true,
            watcher: 'test',
            id: '123456789',
            name: 'container-name',
            image: {
                name: 'test/test',
                registry: {
                    name: 'hub',
                    url: 'my-registry',
                },
            },
            updateKind: {
                remoteValue: '4.5.6',
            },
        }),
    ).rejects.toThrow('Pre-hook backup failed');

    expect(stopSpy).not.toHaveBeenCalled();
    preSpy.mockRestore();
    stopSpy.mockRestore();
});

describe('performUpdate rollback branch', () => {
    const buildGatedMocks = ({
        healthStatus = 'healthy',
        hasHealth = true,
        autoRemove = false,
    } = {}) => {
        const currentContainer = {
            inspect: () =>
                Promise.resolve({
                    Id: 'aaaaaaaaaaaa',
                    Name: '/container-name',
                    State: { Running: true },
                    HostConfig: { AutoRemove: autoRemove },
                    Config: {},
                    NetworkSettings: { Networks: {} },
                }),
            rename: jest.fn(() => Promise.resolve()),
            remove: jest.fn(() => Promise.resolve()),
            start: jest.fn(() => Promise.resolve()),
            stop: jest.fn(() => Promise.resolve()),
            wait: jest.fn(() => Promise.resolve()),
        };
        const newContainer = {
            inspect: () =>
                Promise.resolve({
                    State: {
                        Running: true,
                        ...(hasHealth
                            ? { Health: { Status: healthStatus } }
                            : {}),
                    },
                }),
            start: jest.fn(() => Promise.resolve()),
            stop: jest.fn(() => Promise.resolve()),
            remove: jest.fn(() => Promise.resolve()),
        };
        const dockerApi = {
            getContainer: jest.fn(() => Promise.resolve(currentContainer)),
            createContainer: jest.fn(() => Promise.resolve(newContainer)),
            pull: () => Promise.resolve(),
            listImages: jest.fn(() => Promise.resolve([])),
            getImage: jest.fn(() => ({
                remove: () => Promise.resolve(),
                inspect: () =>
                    Promise.resolve({
                        Config: {
                            Env: [],
                            Labels: [],
                            Cmd: [],
                            Entrypoint: [],
                        },
                    }),
            })),
            modem: { followProgress: (pullStream, res) => res() },
        };
        return { dockerApi, currentContainer, newContainer };
    };

    const gatedContainer = (labels = {}) => ({
        updateAvailable: true,
        watcher: 'test',
        id: '123456789',
        name: 'container-name',
        labels,
        image: {
            name: 'test/test',
            tag: { value: '1.2.3' },
            digest: { repo: 'test/test' },
            registry: { name: 'hub', url: 'my-registry' },
        },
        updateKind: { kind: 'tag', localValue: '1.2.3', remoteValue: '4.5.6' },
    });

    test('should use the gated path when rollback is enabled by label', async () => {
        const { dockerApi, currentContainer, newContainer } = buildGatedMocks();
        const watcherSpy = jest
            .spyOn(docker, 'getWatcher')
            .mockReturnValue({ dockerApi });

        await docker.trigger(gatedContainer({ 'wud.rollback.enable': 'true' }));

        watcherSpy.mockRestore();

        expect(currentContainer.rename).toHaveBeenCalledTimes(1);
        expect(String(currentContainer.rename.mock.calls[0][0].name)).toMatch(
            /-wud-old-\d+$/,
        );
        expect(newContainer.start).toHaveBeenCalled();
        // Healthy verdict => archive removed.
        expect(currentContainer.remove).toHaveBeenCalled();
    });

    test('should use the gated path when rollback is enabled at trigger level', async () => {
        docker.configuration = { ...configurationValid, rollback: true };
        const { dockerApi, currentContainer } = buildGatedMocks();
        const watcherSpy = jest
            .spyOn(docker, 'getWatcher')
            .mockReturnValue({ dockerApi });

        await docker.trigger(gatedContainer());

        watcherSpy.mockRestore();
        docker.configuration = configurationValid;

        expect(currentContainer.rename).toHaveBeenCalledTimes(1);
    });

    test('should fall back to the plain path when AutoRemove is enabled', async () => {
        const { dockerApi, currentContainer } = buildGatedMocks({
            autoRemove: true,
        });
        const watcherSpy = jest
            .spyOn(docker, 'getWatcher')
            .mockReturnValue({ dockerApi });

        await docker.trigger(gatedContainer({ 'wud.rollback.enable': 'true' }));

        watcherSpy.mockRestore();

        expect(currentContainer.rename).not.toHaveBeenCalled();
        expect(currentContainer.wait).toHaveBeenCalled();
    });

    test('should not replace anything in dry-run mode', async () => {
        docker.configuration = {
            ...configurationValid,
            rollback: true,
            dryrun: true,
        };
        const { dockerApi, currentContainer } = buildGatedMocks();
        const watcherSpy = jest
            .spyOn(docker, 'getWatcher')
            .mockReturnValue({ dockerApi });

        await docker.trigger(gatedContainer());

        watcherSpy.mockRestore();
        docker.configuration = configurationValid;

        expect(currentContainer.rename).not.toHaveBeenCalled();
        expect(dockerApi.createContainer).not.toHaveBeenCalled();
    });

    test('should defer the old-image prune until after a healthy verdict', async () => {
        docker.configuration = {
            ...configurationValid,
            rollback: true,
            prune: true,
        };
        const { dockerApi, currentContainer } = buildGatedMocks();
        const watcherSpy = jest
            .spyOn(docker, 'getWatcher')
            .mockReturnValue({ dockerApi });

        await docker.trigger(gatedContainer());

        watcherSpy.mockRestore();
        docker.configuration = configurationValid;

        expect(dockerApi.getImage).toHaveBeenCalledWith(
            'my-registry/test/test:1.2.3',
        );
        expect(currentContainer.remove).toHaveBeenCalled();
    });
});
