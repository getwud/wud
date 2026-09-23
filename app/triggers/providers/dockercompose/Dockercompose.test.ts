import log from '../../../log';
import Dockercompose, { doesContainerBelongToCompose } from './Dockercompose';
import { testTriggerProvider } from '../TriggerTestHelper';

jest.mock('../../../registry', () => ({
    getState() {
        return {
            registry: {
                hub: {
                    getImageFullName: (
                        image: { name: string },
                        tagOrDigest: string,
                    ) => `${image.name}:${tagOrDigest}`,
                },
            },
        };
    },
}));

const dockercompose = new Dockercompose();
dockercompose.log = log;

const configurationValid = {
    file: '/path/to/docker-compose.yml',
    threshold: 'all',
    mode: 'simple',
    once: true,
    auto: true,
};

describe('Dockercompose Trigger', () => {
    testTriggerProvider(Dockercompose, configurationValid, {
        testTemplateRenders: false,
    });

    test('should validate configuration when pathmapping is valid', () => {
        const config = {
            ...configurationValid,
            pathmapping: {
                host: '/srv/docker',
                container: '/docker',
            },
        };
        expect(() => dockercompose.validateConfiguration(config)).not.toThrow();
    });

    test('should throw error when pathmapping is missing host or container', () => {
        const configMissingHost = {
            ...configurationValid,
            pathmapping: {
                container: '/docker',
            },
        };
        expect(() =>
            dockercompose.validateConfiguration(configMissingHost),
        ).toThrow();

        const configMissingContainer = {
            ...configurationValid,
            pathmapping: {
                host: '/srv/docker',
            },
        };
        expect(() =>
            dockercompose.validateConfiguration(configMissingContainer),
        ).toThrow();
    });
});

const container = {
    name: 'test',
    updateAvailable: true,
    image: {
        registry: { name: 'hub' },
        name: 'test/test',
        tag: { value: '1.2.3', semver: true },
    },
    updateKind: { kind: 'tag', remoteValue: '4.5.6' },
};

const composeMatching = {
    services: {
        test: {
            image: 'test/test:1.2.3',
        },
        builder: { build: '.' },
    },
};

const composeNoMatch = {
    services: {
        builder: { build: '.' },
        other: { image: 'something/else:1.0.0' },
    },
};

test('doesContainerBelongToCompose should match a service whose image contains the container image', () => {
    expect(doesContainerBelongToCompose(composeMatching, container)).toBe(true);
});

test('doesContainerBelongToCompose should return false without throwing when a service has no image', () => {
    expect(() =>
        doesContainerBelongToCompose(composeNoMatch, container),
    ).not.toThrow();
    expect(doesContainerBelongToCompose(composeNoMatch, container)).toBe(false);
});

test('mapCurrentVersionToUpdateVersion should map the matching service to its update', () => {
    const mapping = dockercompose.mapCurrentVersionToUpdateVersion(
        composeMatching,
        container,
        new Set(),
    );
    expect(mapping).toEqual({
        current: 'test/test:1.2.3',
        update: 'test/test:4.5.6',
    });
});

test('mapCurrentVersionToUpdateVersion should return undefined when no service matches', () => {
    const mapping = dockercompose.mapCurrentVersionToUpdateVersion(
        composeNoMatch,
        container,
        new Set(),
    );
    expect(mapping).toBeUndefined();
});

test('configured file takes precedence over automatic compose label', () => {
    dockercompose.configuration = {
        file: '/some/path/docker-compose.yml',
        composeFileLabel: 'wud.compose.file',
    };

    expect(
        dockercompose.getComposeFileForContainer({
            labels: {
                'com.docker.compose.project.config_files':
                    '/some/path/automatic-compose.yaml',
            },
        }),
    ).toBe('/some/path/docker-compose.yml');
});

test('per-container WUD label takes precedence over configured file', () => {
    dockercompose.configuration = {
        file: '/some/path/docker-compose.yml',
        composeFileLabel: 'wud.compose.file',
    };

    expect(
        dockercompose.getComposeFileForContainer({
            labels: {
                'wud.compose.file': '/some/path/label-compose.yml',
                'com.docker.compose.project.config_files':
                    '/some/path/automatic-compose.yaml',
            },
        }),
    ).toBe('/some/path/label-compose.yml');
});

test('automatic compose label is used without explicit configuration', () => {
    dockercompose.configuration = {
        composeFileLabel: 'wud.compose.file',
    };

    expect(
        dockercompose.getComposeFileForContainer({
            labels: {
                'com.docker.compose.project.config_files':
                    '/some/path/automatic-compose.yaml',
            },
        }),
    ).toBe('/some/path/automatic-compose.yaml');
});

describe('Dockercompose - template and path resolution', () => {
    test('interpolated file path resolves container labels', () => {
        dockercompose.configuration = {
            file: '/compose/${container.labels["com.docker.compose.project"]}/docker-compose.yml',
            composeFileLabel: 'wud.compose.file',
        };

        expect(
            dockercompose.getComposeFileForContainer({
                name: 'my-service',
                labels: {
                    'com.docker.compose.project': 'my-stack',
                },
            }),
        ).toBe('/compose/my-stack/docker-compose.yml');
    });

    test('templated file returns null and logs warning when evaluation throws', () => {
        const warnSpy = jest
            .spyOn(dockercompose.log, 'warn')
            .mockImplementation(() => {});
        dockercompose.configuration = {
            file: '${container.labels.nested.nonexistent}/docker-compose.yml',
            composeFileLabel: 'wud.compose.file',
        };

        const result = dockercompose.getComposeFileForContainer({
            name: 'my-service',
            labels: undefined,
        });

        expect(result).toBeNull();
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
    });

    test('templated file applies pathmapping if host prefix matches', () => {
        dockercompose.configuration = {
            file: '${container.labels["com.docker.compose.project.working_dir"]}/docker-compose.yml',
            composeFileLabel: 'wud.compose.file',
            pathmapping: {
                host: '/home/user/docker',
                container: '/compose',
            },
        };

        expect(
            dockercompose.getComposeFileForContainer({
                name: 'my-service',
                labels: {
                    'com.docker.compose.project.working_dir':
                        '/home/user/docker/project1',
                },
            }),
        ).toBe('/compose/project1/docker-compose.yml');
    });

    test('auto-detects first file when config_files is comma-separated', () => {
        dockercompose.configuration = {
            composeFileLabel: 'wud.compose.file',
        };

        expect(
            dockercompose.getComposeFileForContainer({
                labels: {
                    'com.docker.compose.project.config_files':
                        '/path/to/docker-compose.yml, /path/to/docker-compose.override.yml',
                },
            }),
        ).toBe('/path/to/docker-compose.yml');
    });

    test('auto-detects compose file from working_dir when config_files is not set', () => {
        dockercompose.configuration = {
            composeFileLabel: 'wud.compose.file',
        };

        expect(
            dockercompose.getComposeFileForContainer({
                labels: {
                    'com.docker.compose.project.working_dir':
                        '/home/user/myproject',
                },
            }),
        ).toBe('/home/user/myproject/docker-compose.yml');
    });

    test('auto-detection with pathmapping translates host path to container path', () => {
        dockercompose.configuration = {
            composeFileLabel: 'wud.compose.file',
            pathmapping: {
                host: '/home/user/stacks',
                container: '/var/compose',
            },
        };

        expect(
            dockercompose.getComposeFileForContainer({
                labels: {
                    'com.docker.compose.project.config_files':
                        '/home/user/stacks/nextcloud/docker-compose.yml',
                },
            }),
        ).toBe('/var/compose/nextcloud/docker-compose.yml');
    });

    test('pathmapping handles trailing slashes on host and container paths cleanly', () => {
        dockercompose.configuration = {
            composeFileLabel: 'wud.compose.file',
            pathmapping: {
                host: '/home/user/stacks/',
                container: '/var/compose/',
            },
        };

        expect(
            dockercompose.getComposeFileForContainer({
                labels: {
                    'com.docker.compose.project.working_dir':
                        '/home/user/stacks/nginx',
                },
            }),
        ).toBe('/var/compose/nginx/docker-compose.yml');
    });

    test('pathmapping does not modify path when host prefix does not match', () => {
        dockercompose.configuration = {
            composeFileLabel: 'wud.compose.file',
            pathmapping: {
                host: '/home/user/stacks',
                container: '/var/compose',
            },
        };

        expect(
            dockercompose.getComposeFileForContainer({
                labels: {
                    'com.docker.compose.project.config_files':
                        '/opt/docker/other/docker-compose.yml',
                },
            }),
        ).toBe('/opt/docker/other/docker-compose.yml');
    });

    test('returns null when no compose file or label can be found', () => {
        dockercompose.configuration = {
            composeFileLabel: 'wud.compose.file',
        };

        expect(
            dockercompose.getComposeFileForContainer({
                labels: {},
            }),
        ).toBeNull();
    });
});

import fs from 'fs/promises';
jest.mock('fs/promises');

describe('Dockercompose Trigger - file operations', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        dockercompose.configuration = { ...configurationValid };
    });

    test('initTrigger should verify file access if file configured', async () => {
        (fs.access as jest.Mock).mockResolvedValue(undefined);
        await dockercompose.initTrigger();
        expect(fs.access).toHaveBeenCalledWith(configurationValid.file);
        expect(dockercompose.configuration.mode).toBe('batch');
    });

    test('initTrigger should skip file access if file contains template expression', async () => {
        (fs.access as jest.Mock).mockResolvedValue(undefined);
        dockercompose.configuration.file =
            '/compose/${container.labels["com.docker.compose.project"]}/docker-compose.yml';
        await dockercompose.initTrigger();
        expect(fs.access).not.toHaveBeenCalled();
    });

    test('initTrigger should check mapped path when static file and pathmapping configured', async () => {
        (fs.access as jest.Mock).mockResolvedValue(undefined);
        dockercompose.configuration.file =
            '/home/user/docker/project/docker-compose.yml';
        dockercompose.configuration.pathmapping = {
            host: '/home/user/docker',
            container: '/compose',
        };
        await dockercompose.initTrigger();
        expect(fs.access).toHaveBeenCalledWith(
            '/compose/project/docker-compose.yml',
        );
    });

    test('initTrigger should throw error if file access fails', async () => {
        (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));
        await expect(dockercompose.initTrigger()).rejects.toThrow(
            'File not found',
        );
    });

    test('backup should copy file', async () => {
        (fs.copyFile as jest.Mock).mockResolvedValue(undefined);
        await dockercompose.backup('test.yml', 'test.yml.back');
        expect(fs.copyFile).toHaveBeenCalledWith('test.yml', 'test.yml.back');
    });

    test('writeComposeFile should write data', async () => {
        (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
        await dockercompose.writeComposeFile('test.yml', 'data');
        expect(fs.writeFile).toHaveBeenCalledWith('test.yml', 'data');
    });

    test('getComposeFile should read file', async () => {
        (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('services:'));
        const result = await dockercompose.getComposeFile('test.yml');
        expect(fs.readFile).toHaveBeenCalledWith('test.yml');
        expect(result.toString()).toBe('services:');
    });

    test('triggerBatch should process compose file', async () => {
        (fs.access as jest.Mock).mockResolvedValue(undefined);
        dockercompose.getWatcher = jest.fn().mockReturnValue({
            dockerApi: { modem: { socketPath: '/var/run/docker.sock' } },
        });
        dockercompose.processComposeFile = jest
            .fn()
            .mockResolvedValue(undefined);

        await dockercompose.triggerBatch([container as any]);

        expect(dockercompose.processComposeFile).toHaveBeenCalledWith(
            configurationValid.file,
            [container],
        );
    });

    test('trigger should skip and return without error when updateAvailable is false', async () => {
        const triggerBatchSpy = jest.spyOn(dockercompose, 'triggerBatch');
        await expect(
            dockercompose.trigger({
                ...container,
                updateAvailable: false,
            } as any),
        ).resolves.toBeUndefined();

        expect(triggerBatchSpy).not.toHaveBeenCalled();
        triggerBatchSpy.mockRestore();
    });

    test('triggerBatch should skip and return without error when no containers have updates available', async () => {
        dockercompose.processComposeFile = jest.fn();
        await expect(
            dockercompose.triggerBatch([
                { ...container, updateAvailable: false } as any,
            ]),
        ).resolves.toBeUndefined();

        expect(dockercompose.processComposeFile).not.toHaveBeenCalled();
    });

    test('triggerBatch should skip containers when watcher is not found without throwing', async () => {
        dockercompose.getWatcher = jest.fn().mockReturnValue(undefined);
        dockercompose.processComposeFile = jest.fn();

        await expect(
            dockercompose.triggerBatch([
                { ...container, watcher: 'nonexistent' } as any,
            ]),
        ).resolves.toBeUndefined();

        expect(dockercompose.processComposeFile).not.toHaveBeenCalled();
    });

    test('triggerBatch should skip containers when watcher has no dockerApi without throwing', async () => {
        dockercompose.getWatcher = jest.fn().mockReturnValue({});
        dockercompose.processComposeFile = jest.fn();

        await expect(
            dockercompose.triggerBatch([
                { ...container, watcher: 'nonexistent' } as any,
            ]),
        ).resolves.toBeUndefined();

        expect(dockercompose.processComposeFile).not.toHaveBeenCalled();
    });

    test('triggerBatch should skip containers when watcher modem socketPath is empty string', async () => {
        dockercompose.getWatcher = jest.fn().mockReturnValue({
            dockerApi: { modem: { socketPath: '' } },
        });
        dockercompose.processComposeFile = jest.fn();

        await expect(
            dockercompose.triggerBatch([
                { ...container, watcher: 'remote' } as any,
            ]),
        ).resolves.toBeUndefined();

        expect(dockercompose.processComposeFile).not.toHaveBeenCalled();
    });

    test('triggerBatch should handle undefined modem safely', async () => {
        (fs.access as jest.Mock).mockResolvedValue(undefined);
        dockercompose.getWatcher = jest.fn().mockReturnValue({
            dockerApi: {},
        });
        dockercompose.processComposeFile = jest
            .fn()
            .mockResolvedValue(undefined);

        await expect(
            dockercompose.triggerBatch([container as any]),
        ).resolves.toBeUndefined();

        expect(dockercompose.processComposeFile).toHaveBeenCalled();
    });

    test('trigger should skip container when watcher is not found without throwing', async () => {
        dockercompose.getWatcher = jest.fn().mockReturnValue(undefined);
        dockercompose.processComposeFile = jest.fn();

        await expect(
            dockercompose.trigger({
                ...container,
                watcher: 'nonexistent',
            } as any),
        ).resolves.toBeUndefined();

        expect(dockercompose.processComposeFile).not.toHaveBeenCalled();
    });
});
