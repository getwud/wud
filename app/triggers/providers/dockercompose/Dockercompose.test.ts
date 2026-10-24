import yaml from 'yaml';
import log from '../../../log';
import Dockercompose, {
    doesContainerBelongToCompose,
    findServiceKeyForContainer,
    isMatchingServiceImage,
} from './Dockercompose';
import Docker from '../docker/Docker';
import { testTriggerProvider } from '../TriggerTestHelper';
import { HookManager } from '../../hooks/HookManager';
import { Container } from '../../../model/container';

jest.mock('../../../registry', () => ({
    getState() {
        return {
            registry: {
                hub: {
                    getAuthPull: async () => undefined,
                    withPullPermit: (pull: any) => pull(),
                    deferPulls: () => undefined,
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
        service: 'test',
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

    test('ensureComposeBackup should force a .back copy', async () => {
        (fs.copyFile as jest.Mock).mockResolvedValue(undefined);
        await dockercompose.ensureComposeBackup('test.yml');
        expect(fs.copyFile).toHaveBeenCalledWith('test.yml', 'test.yml.back');
    });

    test('restoreComposeFileFromBackup should copy .back over the compose file', async () => {
        (fs.copyFile as jest.Mock).mockResolvedValue(undefined);
        await dockercompose.restoreComposeFileFromBackup('test.yml');
        expect(fs.copyFile).toHaveBeenCalledWith('test.yml.back', 'test.yml');
    });

    test('rewriteComposeFile should replace the mapped versions', async () => {
        (fs.readFile as jest.Mock).mockResolvedValue(
            Buffer.from('services:\n  web:\n    image: app:1.0.0'),
        );
        (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
        await dockercompose.rewriteComposeFile('test.yml', [
            { current: 'app:1.0.0', update: 'app:2.0.0' },
        ]);
        expect(fs.writeFile).toHaveBeenCalledWith(
            'test.yml',
            expect.stringContaining('app:2.0.0'),
        );
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

    test('validateConfiguration should accept valid hooks in configuration', () => {
        const configWithHooks = {
            ...configurationValid,
            hooks: [
                {
                    type: 'exec',
                    phase: 'pre',
                    command: 'echo "backup"',
                },
                {
                    type: 'trigger',
                    phase: 'post',
                    trigger: 'slack',
                },
            ],
        };
        const validated = dockercompose.validateConfiguration(configWithHooks);
        expect(validated.hooks).toHaveLength(2);
    });

    test('processComposeFile should execute pre-hooks and post-hooks', async () => {
        dockercompose.processComposeFile =
            Dockercompose.prototype.processComposeFile;
        dockercompose.configuration = {
            ...configurationValid,
            dryrun: false,
        };
        const preSpy = jest
            .spyOn(HookManager, 'runPreHooks')
            .mockResolvedValue(undefined);
        const postSpy = jest
            .spyOn(HookManager, 'runPostHooks')
            .mockResolvedValue(undefined);

        dockercompose.getComposeFileAsObject = jest
            .fn()
            .mockResolvedValue(composeMatching);
        dockercompose.getComposeFile = jest
            .fn()
            .mockResolvedValue(
                Buffer.from('services:\n  test:\n    image: test/test:1.2.3'),
            );
        dockercompose.writeComposeFile = jest.fn().mockResolvedValue(undefined);
        dockercompose.getWatcher = jest.fn().mockReturnValue({
            dockerApi: {},
        });
        const superTriggerSpy = jest
            .spyOn(Object.getPrototypeOf(Dockercompose.prototype), 'trigger')
            .mockResolvedValue(undefined);

        const testContainer = {
            ...container,
            id: 'c1',
            watcher: 'local',
        };

        await dockercompose.processComposeFile('/path/compose.yml', [
            testContainer,
        ]);

        expect(preSpy).toHaveBeenCalledTimes(1);
        expect(dockercompose.writeComposeFile).toHaveBeenCalled();
        expect(superTriggerSpy).toHaveBeenCalledWith(testContainer, {
            runHooks: false,
        });
        expect(postSpy).toHaveBeenCalledTimes(1);

        preSpy.mockRestore();
        postSpy.mockRestore();
        superTriggerSpy.mockRestore();
    });

    test('processComposeFile should abort and NOT write compose file or update containers if pre-hook fails', async () => {
        dockercompose.processComposeFile =
            Dockercompose.prototype.processComposeFile;
        dockercompose.configuration = {
            ...configurationValid,
            dryrun: false,
        };
        const preSpy = jest
            .spyOn(HookManager, 'runPreHooks')
            .mockRejectedValue(new Error('Pre-hook failed'));
        const postSpy = jest
            .spyOn(HookManager, 'runPostHooks')
            .mockResolvedValue(undefined);

        dockercompose.getComposeFileAsObject = jest
            .fn()
            .mockResolvedValue(composeMatching);
        dockercompose.writeComposeFile = jest.fn();
        dockercompose.getWatcher = jest.fn().mockReturnValue({
            dockerApi: {},
        });
        const superTriggerSpy = jest
            .spyOn(Object.getPrototypeOf(Dockercompose.prototype), 'trigger')
            .mockResolvedValue(undefined);

        const testContainer = {
            ...container,
            id: 'c1',
            watcher: 'local',
        };

        await expect(
            dockercompose.processComposeFile('/path/compose.yml', [
                testContainer,
            ]),
        ).rejects.toThrow('Pre-hook failed');

        expect(preSpy).toHaveBeenCalledTimes(1);
        expect(dockercompose.writeComposeFile).not.toHaveBeenCalled();
        expect(superTriggerSpy).not.toHaveBeenCalled();
        expect(postSpy).not.toHaveBeenCalled();

        preSpy.mockRestore();
        postSpy.mockRestore();
        superTriggerSpy.mockRestore();
    });

    describe('Digest-only updates for floating tags (#1404)', () => {
        const currentDigest = `sha256:${'1'.repeat(64)}`;
        const remoteDigest = `sha256:${'2'.repeat(64)}`;
        const digestContainer = {
            ...container,
            labels: { 'com.docker.compose.service': 'test' },
            image: {
                ...container.image,
                tag: { value: 'latest', semver: false },
                digest: { value: currentDigest, watch: true },
            },
            updateKind: {
                kind: 'digest',
                localValue: currentDigest,
                remoteValue: remoteDigest,
            },
            result: { digest: remoteDigest },
        };
        let digestTrigger: Dockercompose;
        let composeYaml: string;
        let superTriggerSpy: jest.SpyInstance;

        beforeEach(() => {
            digestTrigger = new Dockercompose();
            digestTrigger.configuration = {
                ...configurationValid,
                auto: false,
                dryrun: false,
            };
            composeYaml = [
                '# Floating tags must remain unpinned',
                'services:',
                '  test:',
                '    image: "test/test:latest"',
                '  sibling:',
                '    image: "test/test:latest"',
                '',
            ].join('\n');
            (fs.access as jest.Mock).mockResolvedValue(undefined);
            (fs.readFile as jest.Mock).mockImplementation(async () =>
                Buffer.from(composeYaml),
            );
            (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
            digestTrigger.getWatcher = jest.fn().mockReturnValue({
                dockerApi: { modem: { socketPath: '/var/run/docker.sock' } },
            });
            superTriggerSpy = jest
                .spyOn(
                    Object.getPrototypeOf(Dockercompose.prototype),
                    'trigger',
                )
                .mockResolvedValue(undefined);
        });

        afterEach(() => {
            superTriggerSpy.mockRestore();
        });

        test.each(['latest', 'stable'])(
            'should apply a manual digest update for :%s without pinning or updating sibling services',
            async (tag) => {
                composeYaml = composeYaml.replaceAll(':latest', `:${tag}`);
                const testContainer = {
                    ...digestContainer,
                    image: {
                        ...digestContainer.image,
                        tag: { value: tag, semver: false },
                    },
                };
                const sibling = {
                    ...testContainer,
                    labels: { 'com.docker.compose.service': 'sibling' },
                    updateAvailable: false,
                };

                await digestTrigger.triggerBatch([testContainer, sibling]);

                expect(superTriggerSpy).toHaveBeenCalledTimes(1);
                expect(superTriggerSpy).toHaveBeenCalledWith(testContainer, {
                    runHooks: false,
                });
                expect(fs.writeFile).toHaveBeenCalledTimes(1);
                expect(fs.writeFile).toHaveBeenCalledWith(
                    configurationValid.file,
                    composeYaml,
                );
            },
        );

        test.each([
            { kind: 'digest', remoteValue: currentDigest },
            { kind: 'digest', remoteValue: undefined },
            { kind: 'digest', remoteValue: '' },
            { kind: 'tag', remoteValue: 'latest' },
        ])(
            'should skip an unchanged image with updateKind %j',
            async (update) => {
                const testContainer = {
                    ...digestContainer,
                    updateKind: {
                        localValue:
                            update.kind === 'tag' ? 'latest' : currentDigest,
                        ...update,
                    },
                    result: {},
                };

                await digestTrigger.triggerBatch([testContainer]);

                expect(superTriggerSpy).not.toHaveBeenCalled();
                expect(fs.writeFile).not.toHaveBeenCalled();
            },
        );

        test('should resolve a digest update from result.digest when remoteValue is missing', async () => {
            const testContainer = {
                ...digestContainer,
                updateKind: {
                    kind: 'digest',
                    localValue: currentDigest,
                },
            };

            await digestTrigger.triggerBatch([testContainer]);

            expect(superTriggerSpy).toHaveBeenCalledWith(testContainer, {
                runHooks: false,
            });
            expect(fs.writeFile).toHaveBeenCalled();
        });

        test('dry-run should not write or back up the compose file for a digest update', async () => {
            digestTrigger.configuration.dryrun = true;
            digestTrigger.configuration.backup = true;

            await digestTrigger.triggerBatch([digestContainer]);

            expect(superTriggerSpy).toHaveBeenCalledWith(digestContainer, {
                runHooks: false,
            });
            expect(fs.writeFile).not.toHaveBeenCalled();
            expect(fs.copyFile).not.toHaveBeenCalled();
        });
    });

    describe('Services sharing identical images (#1323)', () => {
        const sharedCompose = {
            services: {
                mariadb_nc: {
                    image: 'mariadb:10.5.8',
                    container_name: 'mariadbnc',
                },
                mariadb_ha: {
                    image: 'mariadb:10.5.8',
                    container_name: 'mariadbha',
                },
            },
        };

        const container1 = {
            name: 'mariadbnc',
            updateAvailable: true,
            labels: {
                'com.docker.compose.service': 'mariadb_nc',
            },
            image: {
                registry: { name: 'hub' },
                name: 'mariadb',
                tag: { value: '10.5.8', semver: true },
            },
            updateKind: { kind: 'tag', remoteValue: '10.5.9' },
            watcher: 'local',
        };

        const container2 = {
            name: 'mariadbha',
            updateAvailable: true,
            labels: {
                'com.docker.compose.service': 'mariadb_ha',
            },
            image: {
                registry: { name: 'hub' },
                name: 'mariadb',
                tag: { value: '10.5.8', semver: true },
            },
            updateKind: { kind: 'tag', remoteValue: '10.5.9' },
            watcher: 'local',
        };

        test('findServiceKeyForContainer should match service by com.docker.compose.service label', () => {
            expect(findServiceKeyForContainer(sharedCompose, container1)).toBe(
                'mariadb_nc',
            );
            expect(findServiceKeyForContainer(sharedCompose, container2)).toBe(
                'mariadb_ha',
            );
        });

        test('findServiceKeyForContainer should match service by container_name when label is missing', () => {
            const containerNoLabel = {
                ...container1,
                labels: {},
            };
            expect(
                findServiceKeyForContainer(sharedCompose, containerNoLabel),
            ).toBe('mariadb_nc');
        });

        test('findServiceKeyForContainer should match service by key when container name matches service key', () => {
            const composeWithoutContainerName = {
                services: {
                    mariadb_nc: {
                        image: 'mariadb:10.5.8',
                    },
                },
            };
            const containerWithServiceKeyAsName = {
                name: 'mariadb_nc',
                image: container1.image,
            };
            expect(
                findServiceKeyForContainer(
                    composeWithoutContainerName,
                    containerWithServiceKeyAsName,
                ),
            ).toBe('mariadb_nc');
        });

        test('findServiceKeyForContainer should return undefined when compose service label does not exist in compose file', () => {
            const containerWrongStack = {
                ...container1,
                labels: {
                    'com.docker.compose.service': 'nonexistent_service',
                },
            };
            expect(
                findServiceKeyForContainer(sharedCompose, containerWrongStack),
            ).toBeUndefined();
        });

        test('findServiceKeyForContainer should return undefined for invalid compose object or missing registry', () => {
            expect(
                findServiceKeyForContainer(null, container1),
            ).toBeUndefined();
            expect(findServiceKeyForContainer({}, container1)).toBeUndefined();
            expect(
                findServiceKeyForContainer(sharedCompose, {
                    ...container1,
                    image: { registry: { name: 'unknown_registry' } },
                }),
            ).toBeUndefined();
        });

        test('mapCurrentVersionToUpdateVersion should target the correct service by label', () => {
            const processedServices = new Set<string>();
            const mapping1 = dockercompose.mapCurrentVersionToUpdateVersion(
                sharedCompose,
                container1,
                processedServices,
            );
            expect(mapping1).toEqual({
                service: 'mariadb_nc',
                current: 'mariadb:10.5.8',
                update: 'mariadb:10.5.9',
            });

            const mapping2 = dockercompose.mapCurrentVersionToUpdateVersion(
                sharedCompose,
                container2,
                processedServices,
            );
            expect(mapping2).toEqual({
                service: 'mariadb_ha',
                current: 'mariadb:10.5.8',
                update: 'mariadb:10.5.9',
            });
        });

        test('mapCurrentVersionToUpdateVersion should skip already processed service on duplicate container', () => {
            const processedServices = new Set<string>();
            const mapping1 = dockercompose.mapCurrentVersionToUpdateVersion(
                sharedCompose,
                container1,
                processedServices,
            );
            expect(mapping1).toBeDefined();

            // Sibling replica of container1
            const mappingDuplicate =
                dockercompose.mapCurrentVersionToUpdateVersion(
                    sharedCompose,
                    container1,
                    processedServices,
                );
            expect(mappingDuplicate).toBeUndefined();
        });

        test('processComposeFile updating container1 must not rewrite container2 service image', async () => {
            dockercompose.processComposeFile =
                Dockercompose.prototype.processComposeFile;
            dockercompose.configuration = {
                ...configurationValid,
                dryrun: false,
            };

            const rawComposeYaml = [
                '# Sibling containers stack',
                'services:',
                '  mariadb_nc:',
                '    # nextcloud db',
                '    image: "mariadb:10.5.8"',
                '    container_name: mariadbnc',
                '  mariadb_ha:',
                '    # home assistant db',
                '    image: "mariadb:10.5.8"',
                '    container_name: mariadbha',
            ].join('\n');

            let writtenContent = '';
            dockercompose.getComposeFileAsObject = jest
                .fn()
                .mockImplementation(async () =>
                    yaml.parse(writtenContent || rawComposeYaml),
                );
            dockercompose.getComposeFile = jest
                .fn()
                .mockImplementation(async () =>
                    Buffer.from(writtenContent || rawComposeYaml),
                );
            dockercompose.writeComposeFile = jest
                .fn()
                .mockImplementation(async (_file, data) => {
                    writtenContent = data;
                });
            dockercompose.getWatcher = jest.fn().mockReturnValue({
                dockerApi: {},
            });
            const superTriggerSpy = jest
                .spyOn(
                    Object.getPrototypeOf(Dockercompose.prototype),
                    'trigger',
                )
                .mockResolvedValue(undefined);

            // Update container1 only
            await dockercompose.processComposeFile('/path/docker-compose.yml', [
                container1 as any,
            ]);

            const parsedAfterContainer1 = yaml.parse(writtenContent);
            expect(parsedAfterContainer1.services.mariadb_nc.image).toBe(
                'mariadb:10.5.9',
            );
            // container2 service image MUST remain 10.5.8
            expect(parsedAfterContainer1.services.mariadb_ha.image).toBe(
                'mariadb:10.5.8',
            );
            // Comments must be preserved
            expect(writtenContent).toContain('# Sibling containers stack');
            expect(writtenContent).toContain('# nextcloud db');
            expect(writtenContent).toContain('# home assistant db');

            // Now container2 must still belong to compose and be updatable
            expect(
                doesContainerBelongToCompose(parsedAfterContainer1, container2),
            ).toBe(true);

            // Update container2
            await dockercompose.processComposeFile('/path/docker-compose.yml', [
                container2 as any,
            ]);

            const parsedAfterContainer2 = yaml.parse(writtenContent);
            expect(parsedAfterContainer2.services.mariadb_nc.image).toBe(
                'mariadb:10.5.9',
            );
            expect(parsedAfterContainer2.services.mariadb_ha.image).toBe(
                'mariadb:10.5.9',
            );

            superTriggerSpy.mockRestore();
        });

        test('updateComposeYaml should fallback to string replacement when YAML has syntax errors', () => {
            const invalidYaml = 'services:\n  broken: [unclosed';
            const updates = [
                {
                    service: 'broken',
                    current: '[unclosed',
                    update: 'fixed',
                },
            ];
            const result = dockercompose.updateComposeYaml(
                invalidYaml,
                updates,
            );
            expect(result).toBe('services:\n  broken: fixed');
        });
    });

    describe('Digest-pinning in compose file (#834)', () => {
        const mockRegistry = {
            getImageFullName: (
                image: { name: string },
                tagOrDigest?: string,
            ) => (tagOrDigest ? `${image.name}:${tagOrDigest}` : image.name),
        };

        const digestContainer = {
            name: 'my-service',
            updateAvailable: true,
            image: {
                registry: { name: 'hub' },
                name: 'test/test',
                tag: { value: '1.2.3', semver: true },
                digest: {
                    watch: true,
                    repo: 'sha256:old1111111111111111111111111111111111111111111111111111111111111',
                    value: 'sha256:old1111111111111111111111111111111111111111111111111111111111111',
                },
            },
            updateKind: {
                kind: 'tag',
                localValue: '1.2.3',
                remoteValue: '4.5.6',
            },
            result: {
                tag: '4.5.6',
                digest: 'sha256:new2222222222222222222222222222222222222222222222222222222222222',
            },
        } as unknown as Container;

        describe('isMatchingServiceImage', () => {
            test('should match standard image tag', () => {
                expect(
                    isMatchingServiceImage(
                        'test/test:1.2.3',
                        digestContainer,
                        mockRegistry as any,
                    ),
                ).toBe(true);
            });

            test('should match tag + digest pinned image', () => {
                expect(
                    isMatchingServiceImage(
                        'test/test:1.2.3@sha256:old1111111111111111111111111111111111111111111111111111111111111',
                        digestContainer,
                        mockRegistry as any,
                    ),
                ).toBe(true);
            });

            test('should match tagless digest pinned image by repo and digest', () => {
                expect(
                    isMatchingServiceImage(
                        'test/test@sha256:old1111111111111111111111111111111111111111111111111111111111111',
                        digestContainer,
                        mockRegistry as any,
                    ),
                ).toBe(true);
            });

            test('should match tagless digest pinned image when container tag is latest', () => {
                const latestContainer = {
                    ...digestContainer,
                    image: {
                        ...digestContainer.image,
                        tag: { value: 'latest', semver: false },
                    },
                } as unknown as Container;

                expect(
                    isMatchingServiceImage(
                        'test/test@sha256:anydigest',
                        latestContainer,
                        mockRegistry as any,
                    ),
                ).toBe(true);
            });

            test('should return false when repository does not match', () => {
                expect(
                    isMatchingServiceImage(
                        'other/repo:1.2.3@sha256:old1111111111111111111111111111111111111111111111111111111111111',
                        digestContainer,
                        mockRegistry as any,
                    ),
                ).toBe(false);
            });
        });

        describe('findServiceKeyForContainer', () => {
            test('should find service with tag + digest pinned image', () => {
                const compose = {
                    services: {
                        webapp: {
                            image: 'test/test:1.2.3@sha256:old1111111111111111111111111111111111111111111111111111111111111',
                        },
                    },
                };
                expect(
                    findServiceKeyForContainer(compose as any, digestContainer),
                ).toBe('webapp');
            });

            test('should find service with tagless digest pinned image', () => {
                const compose = {
                    services: {
                        webapp: {
                            image: 'test/test@sha256:old1111111111111111111111111111111111111111111111111111111111111',
                        },
                    },
                };
                expect(
                    findServiceKeyForContainer(compose as any, digestContainer),
                ).toBe('webapp');
            });

            test('should find service by com.docker.compose.service label with digest pinned image', () => {
                const labeledContainer = {
                    ...digestContainer,
                    labels: {
                        'com.docker.compose.service': 'custom_service',
                    },
                } as unknown as Container;
                const compose = {
                    services: {
                        custom_service: {
                            image: 'test/test:1.2.3@sha256:old1111111111111111111111111111111111111111111111111111111111111',
                        },
                    },
                };
                expect(
                    findServiceKeyForContainer(
                        compose as any,
                        labeledContainer,
                    ),
                ).toBe('custom_service');
            });
        });

        describe('mapCurrentVersionToUpdateVersion with digest pinning', () => {
            test('should update both tag and digest for tag update on tag+digest pinned image', () => {
                const compose = {
                    services: {
                        test: {
                            image: 'test/test:1.2.3@sha256:old1111111111111111111111111111111111111111111111111111111111111',
                        },
                    },
                };
                const mapping = dockercompose.mapCurrentVersionToUpdateVersion(
                    compose as any,
                    digestContainer,
                    new Set(),
                );
                expect(mapping).toEqual({
                    service: 'test',
                    current:
                        'test/test:1.2.3@sha256:old1111111111111111111111111111111111111111111111111111111111111',
                    update: 'test/test:4.5.6@sha256:new2222222222222222222222222222222222222222222222222222222222222',
                });
            });

            test('should update only digest for digest update on tag+digest pinned image', () => {
                const compose = {
                    services: {
                        test: {
                            image: 'test/test:1.2.3@sha256:old1111111111111111111111111111111111111111111111111111111111111',
                        },
                    },
                };
                const digestUpdateContainer = {
                    ...digestContainer,
                    updateKind: {
                        kind: 'digest',
                        localValue:
                            'sha256:old1111111111111111111111111111111111111111111111111111111111111',
                        remoteValue:
                            'sha256:new2222222222222222222222222222222222222222222222222222222222222',
                    },
                    result: {
                        digest: 'sha256:new2222222222222222222222222222222222222222222222222222222222222',
                    },
                } as unknown as Container;

                const mapping = dockercompose.mapCurrentVersionToUpdateVersion(
                    compose as any,
                    digestUpdateContainer,
                    new Set(),
                );
                expect(mapping).toEqual({
                    service: 'test',
                    current:
                        'test/test:1.2.3@sha256:old1111111111111111111111111111111111111111111111111111111111111',
                    update: 'test/test:1.2.3@sha256:new2222222222222222222222222222222222222222222222222222222222222',
                });
            });

            test('should preserve tagless format when updating digest on tagless pinned image', () => {
                const compose = {
                    services: {
                        test: {
                            image: 'test/test@sha256:old1111111111111111111111111111111111111111111111111111111111111',
                        },
                    },
                };
                const taglessDigestContainer = {
                    ...digestContainer,
                    updateKind: {
                        kind: 'digest',
                        localValue:
                            'sha256:old1111111111111111111111111111111111111111111111111111111111111',
                        remoteValue:
                            'sha256:new2222222222222222222222222222222222222222222222222222222222222',
                    },
                    result: {
                        digest: 'sha256:new2222222222222222222222222222222222222222222222222222222222222',
                    },
                } as unknown as Container;

                const mapping = dockercompose.mapCurrentVersionToUpdateVersion(
                    compose as any,
                    taglessDigestContainer,
                    new Set(),
                );
                expect(mapping).toEqual({
                    service: 'test',
                    current:
                        'test/test@sha256:old1111111111111111111111111111111111111111111111111111111111111',
                    update: 'test/test@sha256:new2222222222222222222222222222222222222222222222222222222222222',
                });
            });

            test('should update tag and digest on tagless pinned image when tag update occurs', () => {
                const compose = {
                    services: {
                        test: {
                            image: 'test/test@sha256:old1111111111111111111111111111111111111111111111111111111111111',
                        },
                    },
                };
                const mapping = dockercompose.mapCurrentVersionToUpdateVersion(
                    compose as any,
                    digestContainer,
                    new Set(),
                );
                expect(mapping).toEqual({
                    service: 'test',
                    current:
                        'test/test@sha256:old1111111111111111111111111111111111111111111111111111111111111',
                    update: 'test/test:4.5.6@sha256:new2222222222222222222222222222222222222222222222222222222222222',
                });
            });

            test('should strip stale pinned digest when no new remote digest is available for tag update', () => {
                const compose = {
                    services: {
                        test: {
                            image: 'test/test:1.2.3@sha256:old1111111111111111111111111111111111111111111111111111111111111',
                        },
                    },
                };
                const containerWithoutRemoteDigest = {
                    ...digestContainer,
                    result: {
                        tag: '4.5.6',
                    },
                } as unknown as Container;

                const mapping = dockercompose.mapCurrentVersionToUpdateVersion(
                    compose as any,
                    containerWithoutRemoteDigest,
                    new Set(),
                );
                expect(mapping).toEqual({
                    service: 'test',
                    current:
                        'test/test:1.2.3@sha256:old1111111111111111111111111111111111111111111111111111111111111',
                    update: 'test/test:4.5.6',
                });
            });

            test('should preserve custom registry and port while updating tag and pinned digest', () => {
                const compose = {
                    services: {
                        test: {
                            image: 'registry.example.com:5000/myorg/myapp:1.0.0@sha256:old1111111111111111111111111111111111111111111111111111111111111',
                        },
                    },
                };
                const customRegistryContainer = {
                    ...digestContainer,
                    image: {
                        ...digestContainer.image,
                        name: 'registry.example.com:5000/myorg/myapp',
                        tag: { value: '1.0.0', semver: true },
                    },
                    updateKind: {
                        kind: 'tag',
                        localValue: '1.0.0',
                        remoteValue: '2.0.0',
                    },
                    result: {
                        tag: '2.0.0',
                        digest: 'sha256:new2222222222222222222222222222222222222222222222222222222222222',
                    },
                } as unknown as Container;

                const mapping = dockercompose.mapCurrentVersionToUpdateVersion(
                    compose as any,
                    customRegistryContainer,
                    new Set(),
                );
                expect(mapping).toEqual({
                    service: 'test',
                    current:
                        'registry.example.com:5000/myorg/myapp:1.0.0@sha256:old1111111111111111111111111111111111111111111111111111111111111',
                    update: 'registry.example.com:5000/myorg/myapp:2.0.0@sha256:new2222222222222222222222222222222222222222222222222222222222222',
                });
            });
        });

        describe('updateComposeYaml with digest pinning', () => {
            test('should update digest-pinned image preserving yaml structure and quotes', () => {
                const composeYaml = `version: '3.8'
services:
  web:
    image: "test/test:1.2.3@sha256:old1111111111111111111111111111111111111111111111111111111111111"
    restart: always
`;
                const updates = [
                    {
                        service: 'web',
                        current:
                            'test/test:1.2.3@sha256:old1111111111111111111111111111111111111111111111111111111111111',
                        update: 'test/test:4.5.6@sha256:new2222222222222222222222222222222222222222222222222222222222222',
                    },
                ];

                const result = dockercompose.updateComposeYaml(
                    composeYaml,
                    updates,
                );
                expect(result).toContain(
                    'image: "test/test:4.5.6@sha256:new2222222222222222222222222222222222222222222222222222222222222"',
                );
                expect(result).toContain('restart: always');
            });
        });

        describe('preserve YAML formatting (#1409)', () => {
            test('should preserve 0-indent lists, flow arrays, and comments exactly', () => {
                const composeYaml = `# Global stack header
version: "3.8"

services:
  # Web frontend
  web:
    image: nginx:1.20 # Main web server
    ports:
    - 80:80
    - 443:443
    environment: [ FOO=BAR, BAZ=QUX ]
`;
                const updates = [
                    {
                        service: 'web',
                        current: 'nginx:1.20',
                        update: 'nginx:1.21',
                    },
                ];

                const expected = `# Global stack header
version: "3.8"

services:
  # Web frontend
  web:
    image: nginx:1.21 # Main web server
    ports:
    - 80:80
    - 443:443
    environment: [ FOO=BAR, BAZ=QUX ]
`;
                const result = dockercompose.updateComposeYaml(
                    composeYaml,
                    updates,
                );
                expect(result).toBe(expected);
            });

            test('should preserve quoting styles (double, single, unquoted) across services', () => {
                const composeYaml = `services:
  web:
    image: "nginx:1.20"
  db:
    image: 'postgres:14'
  cache:
    image: redis:6-alpine
`;
                const updates = [
                    {
                        service: 'web',
                        current: 'nginx:1.20',
                        update: 'nginx:1.21',
                    },
                    {
                        service: 'db',
                        current: 'postgres:14',
                        update: 'postgres:15',
                    },
                    {
                        service: 'cache',
                        current: 'redis:6-alpine',
                        update: 'redis:7-alpine',
                    },
                ];

                const expected = `services:
  web:
    image: "nginx:1.21"
  db:
    image: 'postgres:15'
  cache:
    image: redis:7-alpine
`;
                const result = dockercompose.updateComposeYaml(
                    composeYaml,
                    updates,
                );
                expect(result).toBe(expected);
            });

            test('should not collide when one service image is a prefix of another', () => {
                const composeYaml = `services:
  api:
    image: myrepo/app:1.0.0
  worker:
    image: myrepo/app:1.0.0-worker
`;
                const updates = [
                    {
                        service: 'api',
                        current: 'myrepo/app:1.0.0',
                        update: 'myrepo/app:2.0.0',
                    },
                ];

                const expected = `services:
  api:
    image: myrepo/app:2.0.0
  worker:
    image: myrepo/app:1.0.0-worker
`;
                const result = dockercompose.updateComposeYaml(
                    composeYaml,
                    updates,
                );
                expect(result).toBe(expected);
            });

            test('should update compose file when service is omitted by matching current image', () => {
                const composeYaml = `services:
  web:
    image: app:1.0.0
    restart: always
`;
                const updates = [
                    {
                        current: 'app:1.0.0',
                        update: 'app:2.0.0',
                    },
                ];

                const expected = `services:
  web:
    image: app:2.0.0
    restart: always
`;
                const result = dockercompose.updateComposeYaml(
                    composeYaml,
                    updates,
                );
                expect(result).toBe(expected);
            });

            test('should fallback to doc.setIn when service exists without an image scalar node', () => {
                const composeYaml = `services:
  web:
    build: .
    restart: always
`;
                const updates = [
                    {
                        service: 'web',
                        update: 'web:1.0.0',
                    },
                ];

                const result = dockercompose.updateComposeYaml(
                    composeYaml,
                    updates,
                );
                expect(result).toContain('image: web:1.0.0');
                expect(result).toContain('build: .');
            });

            test('rewriteComposeFile should use updateComposeYaml and preserve file formatting', async () => {
                const originalYaml = `# Compose file with custom formatting
services:
  web:
    image: nginx:1.20 # web comment
    ports:
    - 80:80
`;
                (fs.readFile as jest.Mock).mockResolvedValue(
                    Buffer.from(originalYaml),
                );
                (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

                await dockercompose.rewriteComposeFile('docker-compose.yml', [
                    {
                        service: 'web',
                        current: 'nginx:1.20',
                        update: 'nginx:1.21',
                    },
                ]);

                const expectedYaml = `# Compose file with custom formatting
services:
  web:
    image: nginx:1.21 # web comment
    ports:
    - 80:80
`;
                expect(fs.writeFile).toHaveBeenCalledWith(
                    'docker-compose.yml',
                    expectedYaml,
                );
            });
        });
    });

    describe('selfupdate', () => {
        test('should refuse to update the container WUD runs in when selfupdate is disabled', async () => {
            const stop = jest.fn();
            const remove = jest.fn();
            const createContainer = jest.fn();
            const dockerApi = {
                createContainer,
                pull: () => Promise.resolve(),
                modem: {
                    followProgress: (_pullStream: any, res: any) => res(),
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
            const watcherSpy = jest
                .spyOn(dockercompose, 'getWatcher')
                .mockReturnValue({
                    dockerApi,
                    configuration: { socket: '/var/run/docker.sock' },
                } as any);
            const selfSpy = jest
                .spyOn(dockercompose, 'resolveSelfContainerId')
                .mockResolvedValue('123456798');

            const selfContainer = {
                updateAvailable: true,
                watcher: 'test',
                id: '123456789',
                name: 'wud',
                image: {
                    name: 'getwud/wud',
                    registry: { name: 'hub', url: 'my-registry' },
                },
                updateKind: { kind: 'tag', remoteValue: '9.0.3' },
            };

            await expect(
                dockercompose.performUpdate(selfContainer as any),
            ).rejects.toThrow(
                'Refusing to update the container WUD runs in: stopping it would abort the update and leave the container down. Enable it with WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_SELFUPDATE=true, or exclude WUD from this trigger with the wud.trigger.exclude label and update it externally.',
            );

            expect(stop).not.toHaveBeenCalled();
            expect(remove).not.toHaveBeenCalled();

            watcherSpy.mockRestore();
            selfSpy.mockRestore();
        });
    });

    describe('preload', () => {
        test('supportsPreload should return true', () => {
            expect(dockercompose.supportsPreload()).toBe(true);
        });

        test('preload should delegate to super.preload and execute image pull', async () => {
            const pullImageSpy = jest
                .spyOn(Docker.prototype, 'pullImage')
                .mockResolvedValue(undefined);

            const container: any = {
                id: '123456789',
                name: 'compose-service',
                watcher: 'local',
                updateAvailable: true,
                updateKind: {
                    kind: 'tag',
                    remoteValue: '2.0.0',
                    semverDiff: 'major',
                },
                image: {
                    name: 'my-compose-app',
                    tag: { value: '1.0.0', semver: true },
                    digest: { watch: false },
                    registry: { name: 'hub', url: 'hub.docker.com' },
                },
                result: { tag: '2.0.0' },
            };

            const watcherSpy = jest
                .spyOn(dockercompose, 'getWatcher')
                .mockReturnValue({
                    dockerApi: {},
                } as any);

            await dockercompose.preload(container);

            expect(pullImageSpy).toHaveBeenCalledWith(
                expect.anything(),
                undefined,
                expect.stringContaining('2.0.0'),
                expect.anything(),
                expect.anything(),
            );
            expect(container.result.preloaded).toBe(true);

            pullImageSpy.mockRestore();
            watcherSpy.mockRestore();
        });
    });
});
