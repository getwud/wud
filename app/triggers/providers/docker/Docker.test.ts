// @ts-nocheck
import { ValidationError } from 'joi';
import Docker, {
    reconcileEnv,
    reconcileLabels,
    reconcileCmd,
    reconcileEntrypoint,
    createPullProgressLogger,
    isPullRateLimited,
    getPullRetryAfterMs,
    getEndpointIPv4Address,
    isDockerGeneratedMacAddress,
    shouldForwardMacAddress,
} from './Docker';
import { HookManager } from '../../hooks/HookManager';
import log from '../../../log';
import Trigger from '../Trigger';

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
                    withPullPermit: (pull) => pull(),
                    deferPulls: () => undefined,
                    getImageFullName: (image, tagOrDigest) =>
                        `${image.registry.url}/${image.name}${tagOrDigest && tagOrDigest.includes(':') ? '@' : ':'}${tagOrDigest}`,
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
    expect(validatedConfiguration).toStrictEqual({
        ...configurationValid,
        preload: false,
        rollbacktitle: Trigger.DEFAULT_ROLLBACK_TITLE,
        events: ['available'],
        successtitle: 'Update SUCCESS for ${container.name}',
        successbody:
            'Container ${container.name} has been successfully updated.',
        failuretitle: 'Update FAILED for ${container.name}',
        failurebody: 'Container ${container.name} update failed: ${error}',
        rollbackbody: Trigger.DEFAULT_ROLLBACK_BODY,
    });
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

test('pullImage should throw error when followProgress encounters a stream error', async () => {
    const streamError = new Error('Stream connection lost');
    const mockDockerApi = {
        pull: jest.fn().mockResolvedValue({}),
        modem: {
            followProgress: jest.fn((_stream, onFinished) => {
                onFinished(streamError);
            }),
        },
    };

    await expect(
        docker.pullImage(mockDockerApi, undefined, 'test/test:1.2.3', log),
    ).rejects.toThrowError('Stream connection lost');
});

test('pullImage should throw error when followProgress output contains error', async () => {
    const mockDockerApi = {
        pull: jest.fn().mockResolvedValue({}),
        modem: {
            followProgress: jest.fn((_stream, onFinished) => {
                onFinished(null, [
                    { status: 'Pulling fs layer' },
                    {
                        error: 'toomanyrequests: You have reached your pull rate limit.',
                    },
                ]);
            }),
        },
    };

    await expect(
        docker.pullImage(mockDockerApi, undefined, 'test/test:1.2.3', log),
    ).rejects.toThrowError(
        'toomanyrequests: You have reached your pull rate limit.',
    );
});

test('pullImage should throw error when followProgress output contains errorDetail', async () => {
    const mockDockerApi = {
        pull: jest.fn().mockResolvedValue({}),
        modem: {
            followProgress: jest.fn((_stream, onFinished) => {
                onFinished(null, [
                    { status: 'Pulling fs layer' },
                    {
                        errorDetail: {
                            message: 'failed to register layer: untar error',
                        },
                    },
                ]);
            }),
        },
    };

    await expect(
        docker.pullImage(mockDockerApi, undefined, 'test/test:1.2.3', log),
    ).rejects.toThrowError('failed to register layer: untar error');
});

test('pullImage should resolve when pull stream completes successfully without errors', async () => {
    const mockDockerApi = {
        pull: jest.fn().mockResolvedValue({}),
        modem: {
            followProgress: jest.fn((_stream, onFinished) => {
                onFinished(null, [
                    { status: 'Pulling fs layer' },
                    { status: 'Downloading' },
                    { status: 'Download complete' },
                ]);
            }),
        },
    };

    await expect(
        docker.pullImage(mockDockerApi, undefined, 'test/test:1.2.3', log),
    ).resolves.toBeUndefined();
});

test('pullImage should pass onProgress callback to followProgress and log progress', async () => {
    let capturedOnProgress;
    const mockDockerApi = {
        pull: jest.fn().mockResolvedValue({}),
        modem: {
            followProgress: jest.fn((_stream, onFinished, onProgress) => {
                capturedOnProgress = onProgress;
                if (onProgress) {
                    onProgress({
                        id: 'layer1',
                        status: 'Downloading',
                        progress: '[====> ] 20MB/50MB',
                    });
                    onProgress({
                        id: 'layer1',
                        status: 'Download complete',
                    });
                }
                onFinished(null, [{ status: 'Download complete' }]);
            }),
        },
    };

    const mockLog = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    };

    await docker.pullImage(
        mockDockerApi,
        undefined,
        'test/test:1.2.3',
        mockLog,
    );

    expect(capturedOnProgress).toBeDefined();
    expect(mockLog.info).toHaveBeenCalledWith('Pull image test/test:1.2.3');
    expect(mockLog.info).toHaveBeenCalledWith(
        'Layer layer1: Downloading [====> ] 20MB/50MB',
    );
    expect(mockLog.info).toHaveBeenCalledWith(
        'Layer layer1: Download complete',
    );
    expect(mockLog.info).toHaveBeenCalledWith(
        'Image test/test:1.2.3 pulled with success',
    );
});

describe('createPullProgressLogger', () => {
    let mockLogger;

    beforeEach(() => {
        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
        };
    });

    test('should ignore empty, null, or undefined events', () => {
        const logger = createPullProgressLogger(mockLogger);
        logger(null);
        logger(undefined);
        logger({});
        expect(mockLogger.info).not.toHaveBeenCalled();
    });

    test('should log layer status changes immediately', () => {
        const logger = createPullProgressLogger(mockLogger);
        logger({ id: 'layer1', status: 'Pulling fs layer' });
        logger({
            id: 'layer1',
            status: 'Downloading',
            progress: '[=> ] 10MB/50MB',
        });
        logger({ id: 'layer1', status: 'Download complete' });
        logger({
            id: 'layer1',
            status: 'Extracting',
            progress: '[==> ] 20MB/50MB',
        });
        logger({ id: 'layer1', status: 'Pull complete' });

        expect(mockLogger.info).toHaveBeenCalledTimes(5);
        expect(mockLogger.info).toHaveBeenNthCalledWith(
            1,
            'Layer layer1: Pulling fs layer',
        );
        expect(mockLogger.info).toHaveBeenNthCalledWith(
            2,
            'Layer layer1: Downloading [=> ] 10MB/50MB',
        );
        expect(mockLogger.info).toHaveBeenNthCalledWith(
            3,
            'Layer layer1: Download complete',
        );
        expect(mockLogger.info).toHaveBeenNthCalledWith(
            4,
            'Layer layer1: Extracting [==> ] 20MB/50MB',
        );
        expect(mockLogger.info).toHaveBeenNthCalledWith(
            5,
            'Layer layer1: Pull complete',
        );
    });

    test('should calculate percentage when progressDetail is provided without progress string', () => {
        const logger = createPullProgressLogger(mockLogger);
        logger({
            id: 'layer1',
            status: 'Downloading',
            progressDetail: { current: 250, total: 1000 },
        });

        expect(mockLogger.info).toHaveBeenCalledWith(
            'Layer layer1: Downloading [25%]',
        );
    });

    test('should handle layer event without status', () => {
        const logger = createPullProgressLogger(mockLogger);
        logger({ id: 'layer1', progress: '[===> ] 30MB/50MB' });

        expect(mockLogger.info).toHaveBeenCalledWith(
            'Layer layer1 [===> ] 30MB/50MB',
        );
    });

    test('should throttle in-progress updates within throttleMs', () => {
        const nowSpy = jest.spyOn(Date, 'now');
        nowSpy.mockReturnValue(10000);

        const logger = createPullProgressLogger(mockLogger, 2000);
        logger({
            id: 'layer1',
            status: 'Downloading',
            progress: '[> ] 10MB/50MB',
        });
        expect(mockLogger.info).toHaveBeenCalledTimes(1);

        // 500ms later: same status, updated progress -> throttled
        nowSpy.mockReturnValue(10500);
        logger({
            id: 'layer1',
            status: 'Downloading',
            progress: '[=> ] 15MB/50MB',
        });
        expect(mockLogger.info).toHaveBeenCalledTimes(1);

        // 1900ms later: same status, updated progress -> throttled
        nowSpy.mockReturnValue(11900);
        logger({
            id: 'layer1',
            status: 'Downloading',
            progress: '[==> ] 20MB/50MB',
        });
        expect(mockLogger.info).toHaveBeenCalledTimes(1);

        // 2000ms later: >= throttleMs -> logged
        nowSpy.mockReturnValue(12000);
        logger({
            id: 'layer1',
            status: 'Downloading',
            progress: '[===> ] 30MB/50MB',
        });
        expect(mockLogger.info).toHaveBeenCalledTimes(2);
        expect(mockLogger.info).toHaveBeenLastCalledWith(
            'Layer layer1: Downloading [===> ] 30MB/50MB',
        );

        nowSpy.mockRestore();
    });

    test('should not log duplicate events with same progress', () => {
        const nowSpy = jest.spyOn(Date, 'now');
        nowSpy.mockReturnValue(10000);

        const logger = createPullProgressLogger(mockLogger, 2000);
        logger({
            id: 'layer1',
            status: 'Downloading',
            progress: '[> ] 10MB/50MB',
        });
        expect(mockLogger.info).toHaveBeenCalledTimes(1);

        // 3000ms later, but exact same progress -> not logged
        nowSpy.mockReturnValue(13000);
        logger({
            id: 'layer1',
            status: 'Downloading',
            progress: '[> ] 10MB/50MB',
        });
        expect(mockLogger.info).toHaveBeenCalledTimes(1);

        nowSpy.mockRestore();
    });

    test('should not throttle when throttleMs is 0', () => {
        const logger = createPullProgressLogger(mockLogger, 0);
        logger({
            id: 'layer1',
            status: 'Downloading',
            progress: '[> ] 10MB/50MB',
        });
        logger({
            id: 'layer1',
            status: 'Downloading',
            progress: '[=> ] 15MB/50MB',
        });
        logger({
            id: 'layer1',
            status: 'Downloading',
            progress: '[==> ] 20MB/50MB',
        });

        expect(mockLogger.info).toHaveBeenCalledTimes(3);
    });

    test('should track multiple layers independently', () => {
        const logger = createPullProgressLogger(mockLogger, 2000);
        logger({
            id: 'layer1',
            status: 'Downloading',
            progress: '[> ] 10MB/50MB',
        });
        logger({
            id: 'layer2',
            status: 'Downloading',
            progress: '[> ] 5MB/20MB',
        });

        expect(mockLogger.info).toHaveBeenCalledWith(
            'Layer layer1: Downloading [> ] 10MB/50MB',
        );
        expect(mockLogger.info).toHaveBeenCalledWith(
            'Layer layer2: Downloading [> ] 5MB/20MB',
        );
    });

    test('should log global status events and handle Status: prefix', () => {
        const logger = createPullProgressLogger(mockLogger);
        logger({ status: 'Pulling from library/ubuntu' });
        logger({ status: 'Digest: sha256:123456' });
        logger({ status: 'Status: Downloaded newer image for ubuntu:latest' });

        expect(mockLogger.info).toHaveBeenNthCalledWith(
            1,
            'Status: Pulling from library/ubuntu',
        );
        expect(mockLogger.info).toHaveBeenNthCalledWith(
            2,
            'Status: Digest: sha256:123456',
        );
        expect(mockLogger.info).toHaveBeenNthCalledWith(
            3,
            'Status: Downloaded newer image for ubuntu:latest',
        );
    });

    test('should throttle repeated global status events', () => {
        const nowSpy = jest.spyOn(Date, 'now');
        nowSpy.mockReturnValue(10000);

        const logger = createPullProgressLogger(mockLogger, 2000);
        logger({ status: 'Downloading', progress: '10%' });
        expect(mockLogger.info).toHaveBeenCalledTimes(1);

        nowSpy.mockReturnValue(10500);
        logger({ status: 'Downloading', progress: '15%' });
        expect(mockLogger.info).toHaveBeenCalledTimes(1);

        nowSpy.mockReturnValue(12500);
        logger({ status: 'Downloading', progress: '25%' });
        expect(mockLogger.info).toHaveBeenCalledTimes(2);

        nowSpy.mockRestore();
    });
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
        Image: 'docker.io/test/test:2.0.0',
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

describe('MAC address handling on recreate (#1461)', () => {
    // Docker derives the MAC of a bridge endpoint from its IPv4 address: 02:42:<ip as hex>
    const generatedFor = (ip) =>
        `02:42:${ip
            .split('.')
            .map((o) => Number(o).toString(16).padStart(2, '0'))
            .join(':')}`;

    describe('getEndpointIPv4Address', () => {
        test('should prefer the live address over the IPAM request', () => {
            expect(
                getEndpointIPv4Address({
                    IPAddress: '172.19.0.6',
                    IPAMConfig: { IPv4Address: '172.19.0.50' },
                }),
            ).toEqual('172.19.0.6');
        });

        test('should fall back to the IPAM request when the container is stopped', () => {
            expect(
                getEndpointIPv4Address({
                    IPAddress: '',
                    IPAMConfig: { IPv4Address: '172.19.0.50' },
                }),
            ).toEqual('172.19.0.50');
        });

        test('should return undefined when there is no IPv4 address', () => {
            expect(getEndpointIPv4Address(undefined)).toBeUndefined();
            expect(getEndpointIPv4Address({ IPAddress: '' })).toBeUndefined();
            expect(
                getEndpointIPv4Address({
                    GlobalIPv6Address: 'fd00::6',
                    IPAMConfig: { IPv6Address: 'fd00::6' },
                }),
            ).toBeUndefined();
        });
    });

    describe('isDockerGeneratedMacAddress', () => {
        test('should recognize the MAC Docker derives from the IPv4 address', () => {
            expect(
                isDockerGeneratedMacAddress('02:42:ac:13:00:0c', '172.19.0.12'),
            ).toBe(true);
            expect(
                isDockerGeneratedMacAddress('02:42:AC:13:00:0C', '172.19.0.12'),
            ).toBe(true);
            expect(
                isDockerGeneratedMacAddress(
                    '02:42:c0:a8:01:e7',
                    '192.168.1.231',
                ),
            ).toBe(true);
        });

        test('should not match a MAC derived from a different address', () => {
            expect(
                isDockerGeneratedMacAddress('02:42:ac:13:00:0c', '172.19.0.6'),
            ).toBe(false);
        });

        test('should not match a user-configured MAC', () => {
            expect(
                isDockerGeneratedMacAddress('de:ad:be:ef:00:01', '172.19.0.12'),
            ).toBe(false);
            expect(
                isDockerGeneratedMacAddress('02:42:ac:13:00:0d', '172.19.0.12'),
            ).toBe(false);
        });

        test('should return false when the MAC or the address is missing or malformed', () => {
            expect(isDockerGeneratedMacAddress(undefined, '172.19.0.12')).toBe(
                false,
            );
            expect(isDockerGeneratedMacAddress('', '172.19.0.12')).toBe(false);
            expect(
                isDockerGeneratedMacAddress('02:42:ac:13:00:0c', undefined),
            ).toBe(false);
            expect(isDockerGeneratedMacAddress('02:42:ac:13:00:0c', '')).toBe(
                false,
            );
            expect(
                isDockerGeneratedMacAddress('02:42:ac:13:00:0c', 'fd00::c'),
            ).toBe(false);
            expect(
                isDockerGeneratedMacAddress('02:42:ac:13:00:0c', '172.19.0'),
            ).toBe(false);
            expect(
                isDockerGeneratedMacAddress(
                    '02:42:ac:13:00:0c',
                    '172.19.0.999',
                ),
            ).toBe(false);
        });
    });

    describe('shouldForwardMacAddress', () => {
        test('should drop a Docker-generated MAC', () => {
            expect(
                shouldForwardMacAddress('02:42:ac:13:00:0c', '172.19.0.12'),
            ).toBe(false);
        });

        test('should keep a user-configured MAC', () => {
            expect(
                shouldForwardMacAddress('de:ad:be:ef:00:01', '172.19.0.12'),
            ).toBe(true);
        });

        test('should keep a MAC when the address is unknown (cannot prove it was generated)', () => {
            expect(
                shouldForwardMacAddress('02:42:ac:13:00:0c', undefined),
            ).toBe(true);
        });

        test('should not forward an empty MAC', () => {
            expect(shouldForwardMacAddress(undefined, '172.19.0.12')).toBe(
                false,
            );
            expect(shouldForwardMacAddress('', '172.19.0.12')).toBe(false);
        });
    });

    describe('cloneContainer', () => {
        const inspectWith = (networks, config = {}) => ({
            Name: '/sonarr',
            Id: 'abcdef123456',
            HostConfig: { NetworkMode: 'media' },
            Config: { Image: 'lscr.io/linuxserver/sonarr:latest', ...config },
            NetworkSettings: { Networks: networks },
        });

        test('should drop the Docker-generated MAC of a bridge endpoint so the new container derives its own', () => {
            const clone = docker.cloneContainer(
                inspectWith({
                    media: {
                        IPAddress: '172.19.0.12',
                        MacAddress: generatedFor('172.19.0.12'),
                        Aliases: ['abcdef123456', 'sonarr'],
                    },
                }),
                'lscr.io/linuxserver/sonarr:latest',
            );
            expect(
                clone.NetworkingConfig.EndpointsConfig.media.MacAddress,
            ).toBeUndefined();
            expect(
                clone.NetworkingConfig.EndpointsConfig.media.Aliases,
            ).toEqual(['sonarr']);
            expect(clone.MacAddress).toBeUndefined();
        });

        test('should drop the generated MAC on every endpoint of a multi-network container', () => {
            const clone = docker.cloneContainer(
                inspectWith({
                    media: {
                        IPAddress: '172.19.0.12',
                        MacAddress: generatedFor('172.19.0.12'),
                    },
                    management: {
                        IPAddress: '172.20.0.5',
                        MacAddress: generatedFor('172.20.0.5'),
                    },
                }),
                'lscr.io/linuxserver/sonarr:latest',
            );
            expect(
                clone.NetworkingConfig.EndpointsConfig.media.MacAddress,
            ).toBeUndefined();
            expect(
                clone.NetworkingConfig.EndpointsConfig.management.MacAddress,
            ).toBeUndefined();
        });

        test('should keep a user-configured MAC (mac_address / macvlan DHCP reservation)', () => {
            const clone = docker.cloneContainer(
                inspectWith({
                    lan: {
                        IPAddress: '192.168.1.50',
                        MacAddress: 'de:ad:be:ef:00:01',
                    },
                }),
                'lscr.io/linuxserver/sonarr:latest',
            );
            expect(
                clone.NetworkingConfig.EndpointsConfig.lan.MacAddress,
            ).toEqual('de:ad:be:ef:00:01');
        });

        test('should keep the MAC of an endpoint whose IPv4 address is unknown', () => {
            const clone = docker.cloneContainer(
                inspectWith({
                    v6only: {
                        IPAddress: '',
                        GlobalIPv6Address: 'fd00::c',
                        MacAddress: '02:42:ac:13:00:0c',
                    },
                }),
                'lscr.io/linuxserver/sonarr:latest',
            );
            expect(
                clone.NetworkingConfig.EndpointsConfig.v6only.MacAddress,
            ).toEqual('02:42:ac:13:00:0c');
        });

        test('should drop the legacy Config.MacAddress when it was generated for one of the endpoints', () => {
            const clone = docker.cloneContainer(
                inspectWith(
                    {
                        media: {
                            IPAddress: '172.19.0.12',
                            MacAddress: generatedFor('172.19.0.12'),
                        },
                    },
                    { MacAddress: generatedFor('172.19.0.12') },
                ),
                'lscr.io/linuxserver/sonarr:latest',
            );
            expect(clone.MacAddress).toBeUndefined();
        });

        test('should keep the legacy Config.MacAddress when the user set it', () => {
            const clone = docker.cloneContainer(
                inspectWith(
                    {
                        media: {
                            IPAddress: '172.19.0.12',
                            MacAddress: 'de:ad:be:ef:00:01',
                        },
                    },
                    { MacAddress: 'de:ad:be:ef:00:01' },
                ),
                'lscr.io/linuxserver/sonarr:latest',
            );
            expect(clone.MacAddress).toEqual('de:ad:be:ef:00:01');
            expect(
                clone.NetworkingConfig.EndpointsConfig.media.MacAddress,
            ).toEqual('de:ad:be:ef:00:01');
        });

        test('should leave endpoints without a MAC untouched', () => {
            const clone = docker.cloneContainer(
                inspectWith({
                    media: { IPAddress: '172.19.0.12', Aliases: ['sonarr'] },
                }),
                'lscr.io/linuxserver/sonarr:latest',
            );
            expect(clone.NetworkingConfig.EndpointsConfig.media).toEqual({
                IPAddress: '172.19.0.12',
                Aliases: ['sonarr'],
            });
        });
    });

    describe('sanitizeEndpointConfig', () => {
        test('should drop a Docker-generated MAC', () => {
            const sanitized = docker.sanitizeEndpointConfig(
                {
                    IPAddress: '172.19.0.12',
                    MacAddress: generatedFor('172.19.0.12'),
                    Aliases: ['sonarr'],
                },
                'abcdef123456',
            );
            expect(sanitized.MacAddress).toBeUndefined();
            expect(sanitized.Aliases).toEqual(['sonarr']);
        });

        test('should keep a user-configured MAC', () => {
            const sanitized = docker.sanitizeEndpointConfig(
                {
                    IPAddress: '172.19.0.12',
                    MacAddress: 'de:ad:be:ef:00:01',
                },
                'abcdef123456',
            );
            expect(sanitized.MacAddress).toEqual('de:ad:be:ef:00:01');
        });

        test('should judge the MAC of a stopped container by its static IPAM address', () => {
            // generated for the requested static IP => still Docker's own, drop it
            expect(
                docker.sanitizeEndpointConfig(
                    {
                        IPAddress: '',
                        IPAMConfig: { IPv4Address: '172.19.0.50' },
                        MacAddress: generatedFor('172.19.0.50'),
                    },
                    'abcdef123456',
                ).MacAddress,
            ).toBeUndefined();
            // user-chosen MAC on a static IP => keep
            expect(
                docker.sanitizeEndpointConfig(
                    {
                        IPAddress: '',
                        IPAMConfig: { IPv4Address: '172.19.0.50' },
                        MacAddress: 'de:ad:be:ef:00:01',
                    },
                    'abcdef123456',
                ).MacAddress,
            ).toEqual('de:ad:be:ef:00:01');
        });
    });
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
        expect(clone.Image).toEqual('docker.io/library/my-app:2.0.0');
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

    describe('Docker Compose label synchronization (#1422)', () => {
        test('should update com.docker.compose.image to newImageSpec.Id when present', () => {
            const composeContainer = {
                ...baseContainer,
                Config: {
                    ...baseContainer.Config,
                    Labels: {
                        'com.docker.compose.project': 'my-project',
                        'com.docker.compose.service': 'web',
                        'com.docker.compose.image': 'sha256:oldimageid123456',
                        'com.docker.compose.config-hash': 'abcde12345hash',
                    },
                },
            };
            const oldImageSpec = {
                Id: 'sha256:oldimageid123456',
                Config: {
                    Labels: {},
                },
            };
            const newImageSpec = {
                Id: 'sha256:newimageid789012',
                Config: {
                    Labels: {},
                },
            };

            const clone = docker.cloneContainer(
                composeContainer as any,
                'my-app:2.0.0',
                oldImageSpec as any,
                newImageSpec as any,
            );

            expect(clone.Labels).toBeDefined();
            expect(clone.Labels?.['com.docker.compose.image']).toEqual(
                'sha256:newimageid789012',
            );
            expect(clone.Labels?.['com.docker.compose.config-hash']).toEqual(
                'abcde12345hash',
            );
            expect(clone.Labels?.['com.docker.compose.project']).toEqual(
                'my-project',
            );
            expect(clone.Labels?.['com.docker.compose.service']).toEqual('web');
        });

        test('should preserve other compose labels such as config-hash and service name', () => {
            const composeContainer = {
                ...baseContainer,
                Config: {
                    ...baseContainer.Config,
                    Labels: {
                        'com.docker.compose.config-hash': 'cfghash98765',
                        'com.docker.compose.container-number': '1',
                        'com.docker.compose.oneoff': 'False',
                        'com.docker.compose.project': 'stack',
                        'com.docker.compose.service': 'app',
                        'com.docker.compose.version': '2.24.0',
                        'com.docker.compose.image': 'sha256:old111',
                    },
                },
            };
            const newImageSpec = {
                Id: 'sha256:new222',
                Config: {
                    Labels: {},
                },
            };

            const clone = docker.cloneContainer(
                composeContainer as any,
                'my-app:2.0.0',
                undefined,
                newImageSpec as any,
            );

            expect(clone.Labels?.['com.docker.compose.image']).toEqual(
                'sha256:new222',
            );
            expect(clone.Labels?.['com.docker.compose.config-hash']).toEqual(
                'cfghash98765',
            );
            expect(clone.Labels?.['com.docker.compose.project']).toEqual(
                'stack',
            );
            expect(clone.Labels?.['com.docker.compose.service']).toEqual('app');
        });

        test('should leave normal containers without compose labels unaffected', () => {
            const normalContainer = {
                ...baseContainer,
                Config: {
                    ...baseContainer.Config,
                    Labels: {
                        'app.version': '1.0.0',
                        maintainer: 'dev@example.com',
                    },
                },
            };
            const newImageSpec = {
                Id: 'sha256:newimageid789012',
                Config: {
                    Labels: {
                        'app.version': '2.0.0',
                    },
                },
            };

            const clone = docker.cloneContainer(
                normalContainer as any,
                'my-app:2.0.0',
                undefined,
                newImageSpec as any,
            );

            expect(clone.Labels).toEqual({
                'app.version': '1.0.0',
                maintainer: 'dev@example.com',
            });
            expect(clone.Labels?.['com.docker.compose.image']).toBeUndefined();
        });
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

test('trigger should skip and return when newTag is null or not resolvable (fixes #1007)', async () => {
    const watcherSpy = jest.spyOn(docker, 'getWatcher');
    await expect(
        docker.trigger({
            updateAvailable: true,
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
            result: {
                tag: null,
            },
            updateKind: {
                kind: 'tag',
                remoteValue: null,
            },
        }),
    ).resolves.toBeUndefined();

    expect(watcherSpy).not.toHaveBeenCalled();
    watcherSpy.mockRestore();
});

test('trigger should skip when updateKind is unknown and remote tag equals current tag (fixes #1007)', async () => {
    const watcherSpy = jest.spyOn(docker, 'getWatcher');
    await expect(
        docker.trigger({
            updateAvailable: true,
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
            result: {
                tag: '1.0.0',
            },
            updateKind: {
                kind: 'unknown',
            },
        }),
    ).resolves.toBeUndefined();

    expect(watcherSpy).not.toHaveBeenCalled();
    watcherSpy.mockRestore();
});

test('trigger should skip when container is already running the latest image (fixes #1007)', async () => {
    const createContainer = jest.fn();
    const dockerApi = {
        getContainer: jest.fn(() => ({
            inspect: () =>
                Promise.resolve({
                    Name: '/container-name',
                    Id: '123456798',
                    Image: 'sha256:same-image-hash',
                    State: { Running: true },
                }),
            stop: jest.fn(),
            remove: jest.fn(),
            start: jest.fn(),
        })),
        createContainer,
        pull: jest.fn(() => Promise.resolve()),
        getImage: jest.fn((imageRef) => ({
            inspect: () =>
                Promise.resolve({
                    Id: 'sha256:same-image-hash',
                }),
        })),
        modem: {
            followProgress: (pullStream: any, res: any) => res(),
        },
    };

    const watcherSpy = jest.spyOn(docker, 'getWatcher').mockReturnValue({
        dockerApi,
    } as any);

    await expect(
        docker.trigger({
            updateAvailable: true,
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
            result: {
                tag: '2.0.0',
            },
            updateKind: {
                kind: 'tag',
                remoteValue: '2.0.0',
            },
        }),
    ).resolves.toBeUndefined();

    watcherSpy.mockRestore();
    expect(createContainer).not.toHaveBeenCalled();
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
        'Refusing to update the container WUD runs in: stopping it would abort the update and leave the container down. Enable it with WUD_TRIGGER_DOCKER_{trigger_name}_SELFUPDATE=true, or exclude WUD from this trigger with the wud.trigger.exclude label and update it externally.',
    );

    // The whole point: the container must not be touched.
    expect(stop).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();

    watcherSpy.mockRestore();
    selfSpy.mockRestore();
});

test('trigger should format error message with trigger type when selfupdate is disabled', async () => {
    const { dockerApi } = buildSelfUpdateDockerApi();
    const watcherSpy = jest.spyOn(docker, 'getWatcher').mockReturnValue({
        dockerApi,
        configuration: { socket: '/var/run/docker.sock' },
    });
    const selfSpy = jest
        .spyOn(docker, 'resolveSelfContainerId')
        .mockResolvedValue('123456798');
    const originalType = docker.type;
    docker.type = 'custom';

    await expect(docker.trigger(selfContainer)).rejects.toThrow(
        'Refusing to update the container WUD runs in: stopping it would abort the update and leave the container down. Enable it with WUD_TRIGGER_CUSTOM_{trigger_name}_SELFUPDATE=true, or exclude WUD from this trigger with the wud.trigger.exclude label and update it externally.',
    );

    docker.type = originalType;
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
    expect(helperSpec.Labels).toEqual({ 'wud.watch': 'false' });
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
            id: 'new-container-id',
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

    describe('Issue #1393 - Post-update reconciliation in trigger', () => {
        test('should call watcher.reconcileContainer on plain update success', async () => {
            const { dockerApi } = buildGatedMocks();
            const reconcileContainerMock = jest.fn(() => Promise.resolve());
            const watcherSpy = jest
                .spyOn(docker, 'getWatcher')
                .mockReturnValue({
                    dockerApi,
                    reconcileContainer: reconcileContainerMock,
                });

            await docker.performUpdate(gatedContainer());

            expect(reconcileContainerMock).toHaveBeenCalledWith(
                'new-container-id',
                {
                    oldContainerId: 'aaaaaaaaaaaa',
                    forceRefresh: true,
                },
            );

            watcherSpy.mockRestore();
        });

        test('should call watcher.reconcileContainer on gated update success', async () => {
            const { dockerApi } = buildGatedMocks({ healthStatus: 'healthy' });
            const reconcileContainerMock = jest.fn(() => Promise.resolve());
            const watcherSpy = jest
                .spyOn(docker, 'getWatcher')
                .mockReturnValue({
                    dockerApi,
                    reconcileContainer: reconcileContainerMock,
                });

            await docker.performUpdate(
                gatedContainer({ 'wud.rollback.enable': 'true' }),
                {
                    gate: {
                        enabled: true,
                        window: 100,
                        interval: 10,
                        grace: 10,
                    },
                },
            );

            expect(reconcileContainerMock).toHaveBeenCalledWith(
                'new-container-id',
                {
                    oldContainerId: 'aaaaaaaaaaaa',
                    forceRefresh: true,
                },
            );

            watcherSpy.mockRestore();
        });

        test('should call watcher.reconcileContainer on rollback outcome', async () => {
            const { dockerApi } = buildGatedMocks({
                healthStatus: 'unhealthy',
            });
            const reconcileContainerMock = jest.fn(() => Promise.resolve());
            const watcherSpy = jest
                .spyOn(docker, 'getWatcher')
                .mockReturnValue({
                    dockerApi,
                    reconcileContainer: reconcileContainerMock,
                });

            await docker.performUpdate(
                gatedContainer({ 'wud.rollback.enable': 'true' }),
                {
                    gate: {
                        enabled: true,
                        window: 100,
                        interval: 10,
                        grace: 10,
                    },
                },
            );

            expect(reconcileContainerMock).toHaveBeenCalledWith(
                'aaaaaaaaaaaa',
                {
                    forceRefresh: true,
                },
            );

            watcherSpy.mockRestore();
        });
    });
});

describe('Docker 29 containerd store & fully qualified image (#1081)', () => {
    describe('getFullyQualifiedImage', () => {
        test('should return empty string for empty/undefined input', () => {
            expect(docker.getFullyQualifiedImage(undefined)).toEqual('');
            expect(docker.getFullyQualifiedImage('')).toEqual('');
        });

        test('should qualify official Docker Hub images without tag', () => {
            expect(docker.getFullyQualifiedImage('nginx')).toEqual(
                'docker.io/library/nginx',
            );
        });

        test('should qualify official Docker Hub images with tag', () => {
            expect(docker.getFullyQualifiedImage('nginx:1.31.2')).toEqual(
                'docker.io/library/nginx:1.31.2',
            );
        });

        test('should qualify official Docker Hub images with library prefix', () => {
            expect(
                docker.getFullyQualifiedImage('library/nginx:1.31.2'),
            ).toEqual('docker.io/library/nginx:1.31.2');
        });

        test('should qualify user/org Docker Hub images', () => {
            expect(docker.getFullyQualifiedImage('bitnami/redis:7.0')).toEqual(
                'docker.io/bitnami/redis:7.0',
            );
        });

        test('should qualify docker.io official images missing library prefix', () => {
            expect(
                docker.getFullyQualifiedImage('docker.io/nginx:1.31.2'),
            ).toEqual('docker.io/library/nginx:1.31.2');
        });

        test('should preserve already fully qualified docker.io images', () => {
            expect(
                docker.getFullyQualifiedImage('docker.io/library/nginx:1.31.2'),
            ).toEqual('docker.io/library/nginx:1.31.2');
            expect(
                docker.getFullyQualifiedImage('docker.io/bitnami/redis:7.0'),
            ).toEqual('docker.io/bitnami/redis:7.0');
        });

        test('should preserve third-party registries', () => {
            expect(
                docker.getFullyQualifiedImage('ghcr.io/owner/repo:1.0.0'),
            ).toEqual('ghcr.io/owner/repo:1.0.0');
            expect(
                docker.getFullyQualifiedImage('quay.io/coreos/etcd:v3.5'),
            ).toEqual('quay.io/coreos/etcd:v3.5');
        });

        test('should preserve registry domain with custom port', () => {
            expect(
                docker.getFullyQualifiedImage('localhost:5000/my-image:v1'),
            ).toEqual('localhost:5000/my-image:v1');
            expect(
                docker.getFullyQualifiedImage(
                    'registry.internal:5000/team/app:1.0',
                ),
            ).toEqual('registry.internal:5000/team/app:1.0');
        });

        test('should qualify official images pinned by digest', () => {
            expect(
                docker.getFullyQualifiedImage(
                    'nginx@sha256:45b23d064c0fc53ff7b79ac61ac134e3f4f7ac9b284debc1aaf80d3f539f66fa',
                ),
            ).toEqual(
                'docker.io/library/nginx@sha256:45b23d064c0fc53ff7b79ac61ac134e3f4f7ac9b284debc1aaf80d3f539f66fa',
            );
        });

        test('should qualify user images pinned by digest', () => {
            expect(
                docker.getFullyQualifiedImage(
                    'bitnami/redis@sha256:45b23d064c0fc53ff7b79ac61ac134e3f4f7ac9b284debc1aaf80d3f539f66fa',
                ),
            ).toEqual(
                'docker.io/bitnami/redis@sha256:45b23d064c0fc53ff7b79ac61ac134e3f4f7ac9b284debc1aaf80d3f539f66fa',
            );
        });

        test('should adopt matching RepoTag from imageSpec if available', () => {
            const imageSpec = {
                RepoTags: [
                    'docker.io/library/nginx:1.31.2',
                    'docker.io/library/nginx:latest',
                ],
            } as any;
            expect(
                docker.getFullyQualifiedImage('nginx:1.31.2', imageSpec),
            ).toEqual('docker.io/library/nginx:1.31.2');
        });

        test('should adopt exact RepoTag from imageSpec when identical', () => {
            const imageSpec = {
                RepoTags: ['custom-registry.io/app:v2'],
            } as any;
            expect(
                docker.getFullyQualifiedImage(
                    'custom-registry.io/app:v2',
                    imageSpec,
                ),
            ).toEqual('custom-registry.io/app:v2');
        });
    });

    describe('cloneContainer with Docker 29 containerd store', () => {
        test('should set Image to fully qualified name when recreating container with unqualified image (#1081)', () => {
            const base = {
                Name: '/local_nginx',
                Id: 'abc123456789',
                Config: {
                    Image: 'nginx:1.31.0',
                    Env: ['FOO=bar'],
                },
                HostConfig: {},
                NetworkSettings: { Networks: {} },
            } as any;

            const clone = docker.cloneContainer(base, 'nginx:1.31.2');
            expect(clone.Image).toEqual('docker.io/library/nginx:1.31.2');
        });

        test('should use RepoTag from newImageSpec when recreating container (#1081)', () => {
            const base = {
                Name: '/local_nginx',
                Id: 'abc123456789',
                Config: { Image: 'nginx:1.31.0' },
                HostConfig: {},
                NetworkSettings: { Networks: {} },
            } as any;

            const newImageSpec = {
                RepoTags: ['docker.io/library/nginx:1.31.2'],
                Config: {},
            } as any;

            const clone = docker.cloneContainer(
                base,
                'nginx:1.31.2',
                undefined,
                newImageSpec,
            );
            expect(clone.Image).toEqual('docker.io/library/nginx:1.31.2');
        });
    });

    describe('createContainer with Docker 29 containerd store', () => {
        test('should ensure Image is fully qualified when sent to dockerApi.createContainer (#1081)', async () => {
            let capturedOptions: any;
            const mockDockerApi = {
                createContainer: jest.fn((opts) => {
                    capturedOptions = opts;
                    return Promise.resolve({ id: 'new-container-id' });
                }),
            };

            await docker.createContainer(
                mockDockerApi as any,
                {
                    name: 'local_nginx',
                    Image: 'nginx:1.31.2',
                },
                'local_nginx',
                log,
            );

            expect(mockDockerApi.createContainer).toHaveBeenCalledTimes(1);
            expect(capturedOptions.Image).toEqual(
                'docker.io/library/nginx:1.31.2',
            );
        });
    });

    describe('inspectImage fallback on Docker 29', () => {
        test('should fall back to fully qualified ref when unqualified ref fails with not found (#1081)', async () => {
            const mockInspect = {
                Id: 'sha256:pulled123',
                RepoTags: ['docker.io/library/nginx:1.31.2'],
            };
            const mockDockerApi = {
                getImage: jest.fn((ref) => {
                    if (ref === 'nginx:1.31.2') {
                        return {
                            inspect: jest.fn(() =>
                                Promise.reject(
                                    new Error(
                                        '(HTTP code 404) no such image: nginx:1.31.2',
                                    ),
                                ),
                            ),
                        };
                    }
                    if (ref === 'docker.io/library/nginx:1.31.2') {
                        return {
                            inspect: jest.fn(() =>
                                Promise.resolve(mockInspect),
                            ),
                        };
                    }
                    return {
                        inspect: jest.fn(() =>
                            Promise.reject(new Error('not found')),
                        ),
                    };
                }),
            };

            const result = await docker.inspectImage(
                mockDockerApi as any,
                'nginx:1.31.2',
                log,
            );

            expect(result).toEqual(mockInspect);
            expect(mockDockerApi.getImage).toHaveBeenCalledWith('nginx:1.31.2');
            expect(mockDockerApi.getImage).toHaveBeenCalledWith(
                'docker.io/library/nginx:1.31.2',
            );
        });
    });
});

describe('pull rate limiting', () => {
    const ghcrRateLimit = () =>
        new Error(
            'toomanyrequests: retry-after: 267.922µs, allowed: 44000/minute',
        );
    const fakeRegistry = () => ({
        withPullPermit: jest.fn((pull) => pull()),
        deferPulls: jest.fn(),
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('isPullRateLimited should recognize 429s from the daemon and the pull stream', () => {
        expect(isPullRateLimited({ statusCode: 429, message: 'x' })).toBe(true);
        expect(isPullRateLimited(ghcrRateLimit())).toBe(true);
        expect(
            isPullRateLimited(
                new Error('(HTTP code 429) unexpected - toomanyrequests'),
            ),
        ).toBe(true);
        expect(isPullRateLimited(new Error('manifest unknown'))).toBe(false);
        expect(
            isPullRateLimited(
                new Error('manifest for test/test:1.429 not found'),
            ),
        ).toBe(false);
        expect(isPullRateLimited(undefined)).toBe(false);
    });

    test('getPullRetryAfterMs should read the retry-after in the message', () => {
        expect(getPullRetryAfterMs(ghcrRateLimit())).toBeCloseTo(0.267922);
        expect(
            getPullRetryAfterMs(
                new Error('toomanyrequests: retry-after: 250ms'),
            ),
        ).toBe(250);
        expect(
            getPullRetryAfterMs(new Error('toomanyrequests: retry-after: 3s')),
        ).toBe(3000);
        expect(
            getPullRetryAfterMs(new Error('toomanyrequests: retry-after: 5')),
        ).toBe(5000);
        expect(getPullRetryAfterMs(new Error('toomanyrequests'))).toBe(
            undefined,
        );
    });

    test('pullImage should queue the pull with the registry', async () => {
        const registry = fakeRegistry();
        const pullImageOnce = jest
            .spyOn(docker, 'pullImageOnce')
            .mockResolvedValue(undefined);

        await docker.pullImage({}, undefined, 'test/test:1.2.3', log, registry);

        expect(registry.withPullPermit).toHaveBeenCalledTimes(1);
        expect(pullImageOnce).toHaveBeenCalledWith(
            {},
            undefined,
            'test/test:1.2.3',
            log,
        );
        expect(registry.deferPulls).not.toHaveBeenCalled();
    });

    test('pullImage should defer the registry and retry a rate-limited pull', async () => {
        const registry = fakeRegistry();
        jest.spyOn(Math, 'random').mockReturnValue(0.5);
        const pullImageOnce = jest
            .spyOn(docker, 'pullImageOnce')
            .mockRejectedValueOnce(ghcrRateLimit())
            .mockRejectedValueOnce({ statusCode: 429, message: 'HTTP 429' })
            .mockResolvedValueOnce(undefined);

        await expect(
            docker.pullImage({}, undefined, 'test/test:1.2.3', log, registry),
        ).resolves.toBeUndefined();

        expect(pullImageOnce).toHaveBeenCalledTimes(3);
        // GHCR's microsecond retry-after is only a floor under the backoff.
        expect(registry.deferPulls.mock.calls.map(([delay]) => delay)).toEqual([
            1500, 3000,
        ]);
    });

    test('pullImage should give up after three retries with the original error', async () => {
        const registry = fakeRegistry();
        const error = ghcrRateLimit();
        const pullImageOnce = jest
            .spyOn(docker, 'pullImageOnce')
            .mockRejectedValue(error);

        await expect(
            docker.pullImage({}, undefined, 'test/test:1.2.3', log, registry),
        ).rejects.toBe(error);

        expect(pullImageOnce).toHaveBeenCalledTimes(4);
        expect(registry.deferPulls).toHaveBeenCalledTimes(3);
    });

    test('pullImage should not retry other errors or a retry-after over one minute', async () => {
        const registry = fakeRegistry();
        const notFound = new Error('manifest unknown');
        const pullImageOnce = jest
            .spyOn(docker, 'pullImageOnce')
            .mockRejectedValueOnce(notFound);

        await expect(
            docker.pullImage({}, undefined, 'test/test:1.2.3', log, registry),
        ).rejects.toBe(notFound);

        const longWait = new Error('toomanyrequests: retry-after: 120s');
        pullImageOnce.mockRejectedValueOnce(longWait);
        await expect(
            docker.pullImage({}, undefined, 'test/test:1.2.3', log, registry),
        ).rejects.toBe(longWait);

        expect(pullImageOnce).toHaveBeenCalledTimes(2);
        expect(registry.deferPulls).not.toHaveBeenCalled();
    });

    test('pullImage without a registry should pull directly', async () => {
        const pullImageOnce = jest
            .spyOn(docker, 'pullImageOnce')
            .mockResolvedValue(undefined);

        await docker.pullImage({}, undefined, 'test/test:1.2.3', log);

        expect(pullImageOnce).toHaveBeenCalledTimes(1);
    });

    test('pullImage should defer queued pulls before releasing the permit on rate limit', async () => {
        const events = [];
        const pending = [];
        let active = 0;
        let resolveQueueCheck;
        const secondQueued = new Promise((resolve) => {
            resolveQueueCheck = resolve;
        });

        const registry = {
            withPullPermit: jest.fn(async (pull) => {
                if (active >= 1) {
                    await new Promise((resolve) => {
                        pending.push(resolve);
                        resolveQueueCheck();
                    });
                } else {
                    active += 1;
                }
                try {
                    return await pull();
                } finally {
                    const next = pending.shift();
                    if (next) {
                        next();
                    } else {
                        active -= 1;
                    }
                }
            }),
            deferPulls: jest.fn((delay) => {
                events.push(`deferPulls:${delay}`);
            }),
        };

        jest.spyOn(Math, 'random').mockReturnValue(0.5);
        let pull1Attempts = 0;
        const pullImageOnce = jest
            .spyOn(docker, 'pullImageOnce')
            .mockImplementation(async (_api, _auth, image) => {
                if (image === 'image1') {
                    pull1Attempts += 1;
                    if (pull1Attempts === 1) {
                        await secondQueued;
                        throw ghcrRateLimit();
                    }
                    events.push('pull1Retried');
                    return;
                }
                if (image === 'image2') {
                    events.push('pull2Started');
                    expect(registry.deferPulls).toHaveBeenCalledWith(1500);
                    return;
                }
            });

        const pull1Promise = docker.pullImage(
            {},
            undefined,
            'image1',
            log,
            registry,
        );
        const pull2Promise = docker.pullImage(
            {},
            undefined,
            'image2',
            log,
            registry,
        );

        await Promise.all([pull1Promise, pull2Promise]);

        expect(pullImageOnce).toHaveBeenCalledTimes(3);
        expect(events[0]).toBe('deferPulls:1500');
        expect(events[1]).toBe('pull2Started');
        expect(events[2]).toBe('pull1Retried');
    });

    describe('preload', () => {
        let pullImageSpy;

        beforeEach(() => {
            pullImageSpy = jest
                .spyOn(docker, 'pullImage')
                .mockResolvedValue(undefined);
        });

        test('supportsPreload should return true', () => {
            expect(docker.supportsPreload()).toBe(true);
        });

        test('preload should skip when updateAvailable is false', async () => {
            const container = {
                id: '123456789',
                name: 'test-app',
                watcher: 'test',
                updateAvailable: false,
                image: {
                    name: 'test',
                    tag: { value: '1.0.0', semver: true },
                    registry: { name: 'hub', url: 'hub.docker.com' },
                },
                result: { tag: '1.1.0' },
            };
            await docker.preload(container);
            expect(pullImageSpy).not.toHaveBeenCalled();
            expect(container.result.preloaded).toBeUndefined();
        });

        test('preload should skip when hasResolvableUpdate is false', async () => {
            const container = {
                id: '123456789',
                name: 'test-app',
                watcher: 'test',
                updateAvailable: true,
                updateKind: { kind: 'tag', remoteValue: '1.0.0' },
                image: {
                    name: 'test',
                    tag: { value: '1.0.0', semver: true },
                    registry: { name: 'hub', url: 'hub.docker.com' },
                },
                result: { tag: '1.0.0' },
            };
            await docker.preload(container);
            expect(pullImageSpy).not.toHaveBeenCalled();
            expect(container.result.preloaded).toBeUndefined();
        });

        test('preload should throw when watcher is missing', async () => {
            const container = {
                id: '123456789',
                name: 'test-app',
                watcher: 'unknown',
                updateAvailable: true,
                updateKind: { kind: 'tag', remoteValue: '1.1.0' },
                image: {
                    name: 'test',
                    tag: { value: '1.0.0', semver: true },
                    registry: { name: 'hub', url: 'hub.docker.com' },
                },
                result: { tag: '1.1.0' },
            };
            await expect(docker.preload(container)).rejects.toThrow(
                /Watcher unknown not found/,
            );
        });

        test('preload should pull candidate tag for semver image and mark preloaded', async () => {
            const container = {
                id: '123456789',
                name: 'test-app',
                watcher: 'test',
                updateAvailable: true,
                updateKind: {
                    kind: 'tag',
                    remoteValue: '1.1.0',
                    semverDiff: 'minor',
                },
                image: {
                    name: 'test',
                    tag: { value: '1.0.0', semver: true },
                    digest: { watch: false },
                    registry: { name: 'hub', url: 'hub.docker.com' },
                },
                result: { tag: '1.1.0' },
            };
            await docker.preload(container);
            expect(pullImageSpy).toHaveBeenCalledWith(
                expect.anything(),
                undefined,
                'hub.docker.com/test:1.1.0',
                expect.anything(),
                expect.anything(),
            );
            expect(container.result.preloaded).toBe(true);
        });

        test('preload should pull by manifest digest for floating tag image', async () => {
            const container = {
                id: '123456789',
                name: 'test-app',
                watcher: 'test',
                updateAvailable: true,
                updateKind: {
                    kind: 'digest',
                    remoteValue: 'sha256:remote-digest-123',
                },
                image: {
                    name: 'test',
                    tag: { value: 'latest', semver: false },
                    digest: { watch: false, value: 'sha256:local-digest-000' },
                    registry: { name: 'hub', url: 'hub.docker.com' },
                },
                result: { tag: 'latest', digest: 'sha256:remote-digest-123' },
            };
            await docker.preload(container);
            expect(pullImageSpy).toHaveBeenCalledWith(
                expect.anything(),
                undefined,
                'hub.docker.com/test@sha256:remote-digest-123',
                expect.anything(),
                expect.anything(),
            );
            expect(container.result.preloaded).toBe(true);
        });

        test('preload should pull by manifest digest when digest watch is enabled on semver image', async () => {
            const container = {
                id: '123456789',
                name: 'test-app',
                watcher: 'test',
                updateAvailable: true,
                updateKind: {
                    kind: 'digest',
                    remoteValue: 'sha256:digest-abc',
                },
                image: {
                    name: 'test',
                    tag: { value: '1.0.0', semver: true },
                    digest: { watch: true, value: 'sha256:digest-old' },
                    registry: { name: 'hub', url: 'hub.docker.com' },
                },
                result: { tag: '1.0.0', digest: 'sha256:digest-abc' },
            };
            await docker.preload(container);
            expect(pullImageSpy).toHaveBeenCalledWith(
                expect.anything(),
                undefined,
                'hub.docker.com/test@sha256:digest-abc',
                expect.anything(),
                expect.anything(),
            );
            expect(container.result.preloaded).toBe(true);
        });

        test('preload should never call container stop, remove, or createContainer', async () => {
            const watcher = docker.getWatcher({ watcher: 'test' });
            const createSpy = jest.spyOn(watcher.dockerApi, 'createContainer');

            const container = {
                id: '123456789',
                name: 'test-app',
                watcher: 'test',
                updateAvailable: true,
                updateKind: { kind: 'tag', remoteValue: '1.1.0' },
                image: {
                    name: 'test',
                    tag: { value: '1.0.0', semver: true },
                    registry: { name: 'hub', url: 'hub.docker.com' },
                },
                result: { tag: '1.1.0' },
            };

            await docker.preload(container);
            expect(createSpy).not.toHaveBeenCalled();
        });
    });
});
