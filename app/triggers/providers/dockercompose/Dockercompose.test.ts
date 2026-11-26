import yaml from 'yaml';
import log from '../../../log';
import Dockercompose, {
    doesContainerBelongToCompose,
    findServiceKeyForContainer,
    getServiceDependencies,
    isMatchingServiceImage,
    orderContainersByDependencies,
} from './Dockercompose';
import Docker from '../docker/Docker';
import { testTriggerProvider } from '../TriggerTestHelper';
import { HookManager } from '../../hooks/HookManager';
import { Container } from '../../../model/container';
import * as event from '../../../event';

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

    test('should validate configuration with strict_digest', () => {
        const validatedDefault =
            dockercompose.validateConfiguration(configurationValid);
        expect(validatedDefault.strict_digest).toBe(false);

        const validatedExplicit = dockercompose.validateConfiguration({
            ...configurationValid,
            strict_digest: true,
        });
        expect(validatedExplicit.strict_digest).toBe(true);

        const validatedNested = dockercompose.validateConfiguration({
            ...configurationValid,
            strict: { digest: 'true' },
        } as any);
        expect(validatedNested.strict_digest).toBe(true);

        const validatedFlat = dockercompose.validateConfiguration({
            ...configurationValid,
            strictdigest: 'true',
        } as any);
        expect(validatedFlat.strict_digest).toBe(true);
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

    describe('Windows pathmapping and separator normalization (#1527)', () => {
        test('mapPath translates Windows backslashes with forward-slash host mapping', () => {
            dockercompose.configuration = {
                pathmapping: {
                    host: 'D:/Containers',
                    container: '/stacks',
                },
            };

            expect(
                dockercompose.mapPath(
                    'D:\\Containers\\dashboard\\homarr\\compose.yml',
                ),
            ).toBe('/stacks/dashboard/homarr/compose.yml');
        });

        test('mapPath translates Windows backslashes with backslash host mapping', () => {
            dockercompose.configuration = {
                pathmapping: {
                    host: 'D:\\Containers',
                    container: '/stacks',
                },
            };

            expect(
                dockercompose.mapPath(
                    'D:\\Containers\\dashboard\\homarr\\compose.yml',
                ),
            ).toBe('/stacks/dashboard/homarr/compose.yml');
        });

        test('mapPath handles case-insensitive Windows drive letters and directory names', () => {
            dockercompose.configuration = {
                pathmapping: {
                    host: 'd:/containers',
                    container: '/stacks',
                },
            };

            // Uppercase drive in filePath, lowercase in host
            expect(
                dockercompose.mapPath(
                    'D:\\Containers\\dashboard\\homarr\\compose.yml',
                ),
            ).toBe('/stacks/dashboard/homarr/compose.yml');

            dockercompose.configuration = {
                pathmapping: {
                    host: 'D:\\Containers',
                    container: '/stacks',
                },
            };

            // Lowercase drive in filePath, uppercase in host
            expect(
                dockercompose.mapPath(
                    'd:\\Containers\\dashboard\\homarr\\compose.yml',
                ),
            ).toBe('/stacks/dashboard/homarr/compose.yml');
        });

        test('mapPath handles trailing slashes and backslashes cleanly with Windows paths', () => {
            dockercompose.configuration = {
                pathmapping: {
                    host: 'D:/Containers/',
                    container: '/stacks/',
                },
            };

            expect(
                dockercompose.mapPath(
                    'D:\\Containers\\dashboard\\homarr\\compose.yml',
                ),
            ).toBe('/stacks/dashboard/homarr/compose.yml');

            dockercompose.configuration = {
                pathmapping: {
                    host: 'D:\\Containers\\',
                    container: '/stacks',
                },
            };

            expect(
                dockercompose.mapPath(
                    'D:\\Containers\\dashboard\\homarr\\compose.yml',
                ),
            ).toBe('/stacks/dashboard/homarr/compose.yml');
        });

        test('mapPath handles root drive mapping on Windows', () => {
            dockercompose.configuration = {
                pathmapping: {
                    host: 'D:/',
                    container: '/mnt/d',
                },
            };

            expect(
                dockercompose.mapPath('D:\\Containers\\dashboard\\compose.yml'),
            ).toBe('/mnt/d/Containers/dashboard/compose.yml');
        });

        test('mapPath returns path unchanged when Windows drive letter does not match', () => {
            dockercompose.configuration = {
                pathmapping: {
                    host: 'D:/Containers',
                    container: '/stacks',
                },
            };

            expect(
                dockercompose.mapPath(
                    'C:\\Containers\\dashboard\\homarr\\compose.yml',
                ),
            ).toBe('C:\\Containers\\dashboard\\homarr\\compose.yml');
        });

        test('mapPath does not match partial directory prefix on Windows paths', () => {
            dockercompose.configuration = {
                pathmapping: {
                    host: 'D:/Containers',
                    container: '/stacks',
                },
            };

            expect(
                dockercompose.mapPath(
                    'D:\\Containers_backup\\dashboard\\compose.yml',
                ),
            ).toBe('D:\\Containers_backup\\dashboard\\compose.yml');
        });

        test('getComposeFileForContainer translates Windows com.docker.compose.project.config_files label', () => {
            dockercompose.configuration = {
                composeFileLabel: 'wud.compose.file',
                pathmapping: {
                    host: 'D:/Containers',
                    container: '/stacks',
                },
            };

            expect(
                dockercompose.getComposeFileForContainer({
                    labels: {
                        'com.docker.compose.project.config_files':
                            'D:\\Containers\\dashboard\\homarr\\compose.yml',
                    },
                }),
            ).toBe('/stacks/dashboard/homarr/compose.yml');
        });

        test('getComposeFileForContainer translates first file from comma-separated Windows config_files', () => {
            dockercompose.configuration = {
                composeFileLabel: 'wud.compose.file',
                pathmapping: {
                    host: 'D:/Containers',
                    container: '/stacks',
                },
            };

            expect(
                dockercompose.getComposeFileForContainer({
                    labels: {
                        'com.docker.compose.project.config_files':
                            'D:\\Containers\\app\\compose.yml, D:\\Containers\\app\\docker-compose.override.yml',
                    },
                }),
            ).toBe('/stacks/app/compose.yml');
        });

        test('getComposeFileForContainer translates Windows com.docker.compose.project.working_dir label', () => {
            dockercompose.configuration = {
                composeFileLabel: 'wud.compose.file',
                pathmapping: {
                    host: 'D:/Containers',
                    container: '/stacks',
                },
            };

            expect(
                dockercompose.getComposeFileForContainer({
                    labels: {
                        'com.docker.compose.project.working_dir':
                            'D:\\Containers\\dashboard\\homarr',
                    },
                }),
            ).toBe('/stacks/dashboard/homarr/docker-compose.yml');
        });

        test('getComposeFileForContainer handles Windows working_dir with trailing backslash', () => {
            dockercompose.configuration = {
                composeFileLabel: 'wud.compose.file',
                pathmapping: {
                    host: 'D:/Containers',
                    container: '/stacks',
                },
            };

            expect(
                dockercompose.getComposeFileForContainer({
                    labels: {
                        'com.docker.compose.project.working_dir':
                            'D:\\Containers\\dashboard\\homarr\\',
                    },
                }),
            ).toBe('/stacks/dashboard/homarr/docker-compose.yml');
        });

        test('getComposeFileForContainer preserves Windows path in custom composeFileLabel without path.resolve cwd corruption', () => {
            dockercompose.configuration = {
                composeFileLabel: 'wud.compose.file',
                pathmapping: {
                    host: 'D:/Containers',
                    container: '/stacks',
                },
            };

            expect(
                dockercompose.getComposeFileForContainer({
                    labels: {
                        'wud.compose.file':
                            'D:\\Containers\\dashboard\\homarr\\custom-compose.yml',
                    },
                }),
            ).toBe('/stacks/dashboard/homarr/custom-compose.yml');
        });

        test('getComposeFileForContainer normalizes working_dir fallback when pathmapping is not configured', () => {
            dockercompose.configuration = {
                composeFileLabel: 'wud.compose.file',
            };

            expect(
                dockercompose.getComposeFileForContainer({
                    labels: {
                        'com.docker.compose.project.working_dir':
                            'D:\\Containers\\dashboard\\homarr',
                    },
                }),
            ).toBe('D:/Containers/dashboard/homarr/docker-compose.yml');
        });
    });
});

import fs from 'fs/promises';
jest.mock('fs/promises');

describe('Dockercompose Trigger - file operations', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (fs.rename as jest.Mock).mockResolvedValue(undefined);
        (fs.unlink as jest.Mock).mockResolvedValue(undefined);
        (fs.stat as jest.Mock).mockResolvedValue(undefined);
        (fs.chmod as jest.Mock).mockResolvedValue(undefined);
        (fs.chown as jest.Mock).mockResolvedValue(undefined);
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
        (fs.rename as jest.Mock).mockResolvedValue(undefined);
        await dockercompose.rewriteComposeFile('test.yml', [
            { current: 'app:1.0.0', update: 'app:2.0.0' },
        ]);
        expect(fs.writeFile).toHaveBeenCalledWith(
            expect.stringMatching(/^test\.yml\.tmp\./),
            expect.stringContaining('app:2.0.0'),
        );
        expect(fs.rename).toHaveBeenCalledWith(
            expect.stringMatching(/^test\.yml\.tmp\./),
            'test.yml',
        );
    });

    test('rewriteComposeFile should write atomically to a temporary file and not corrupt compose file on write failure (issue #1496)', async () => {
        const originalContent = 'services:\n  web:\n    image: app:1.0.0';
        (fs.readFile as jest.Mock).mockResolvedValue(
            Buffer.from(originalContent),
        );
        const enospcError = Object.assign(
            new Error('ENOSPC: no space left on device'),
            { code: 'ENOSPC' },
        );
        (fs.writeFile as jest.Mock).mockRejectedValue(enospcError);
        (fs.unlink as jest.Mock).mockResolvedValue(undefined);

        await expect(
            dockercompose.rewriteComposeFile('test.yml', [
                { current: 'app:1.0.0', update: 'app:2.0.0' },
            ]),
        ).rejects.toThrow('ENOSPC');

        // Target compose file must NEVER be written to directly
        expect(fs.writeFile).not.toHaveBeenCalledWith(
            'test.yml',
            expect.anything(),
        );
        // Temporary file should have been written to and cleaned up
        expect(fs.writeFile).toHaveBeenCalledWith(
            expect.stringMatching(/^test\.yml\.tmp\./),
            expect.stringContaining('app:2.0.0'),
        );
        expect(fs.unlink).toHaveBeenCalledWith(
            expect.stringMatching(/^test\.yml\.tmp\./),
        );
        expect(fs.rename).not.toHaveBeenCalled();
    });

    test('rewriteComposeFile should clean up temp file and restore backup when rename fails and backup exists', async () => {
        (fs.readFile as jest.Mock).mockResolvedValue(
            Buffer.from('services:\n  web:\n    image: app:1.0.0'),
        );
        (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
        (fs.rename as jest.Mock).mockRejectedValue(
            new Error('EACCES: permission denied'),
        );
        (fs.unlink as jest.Mock).mockResolvedValue(undefined);
        (fs.access as jest.Mock).mockResolvedValue(undefined);
        (fs.copyFile as jest.Mock).mockResolvedValue(undefined);

        await expect(
            dockercompose.rewriteComposeFile('test.yml', [
                { current: 'app:1.0.0', update: 'app:2.0.0' },
            ]),
        ).rejects.toThrow('EACCES');

        expect(fs.unlink).toHaveBeenCalledWith(
            expect.stringMatching(/^test\.yml\.tmp\./),
        );
        expect(fs.access).toHaveBeenCalledWith('test.yml.back');
        expect(fs.copyFile).toHaveBeenCalledWith('test.yml.back', 'test.yml');
    });

    test('rewriteComposeFile should handle unlink or backup restore failure gracefully during error recovery', async () => {
        (fs.readFile as jest.Mock).mockResolvedValue(
            Buffer.from('services:\n  web:\n    image: app:1.0.0'),
        );
        (fs.writeFile as jest.Mock).mockRejectedValue(
            new Error('Write failure'),
        );
        (fs.unlink as jest.Mock).mockRejectedValue(new Error('Unlink failure'));
        (fs.access as jest.Mock).mockRejectedValue(
            new Error('ENOENT: no such file'),
        );

        await expect(
            dockercompose.rewriteComposeFile('test.yml', [
                { current: 'app:1.0.0', update: 'app:2.0.0' },
            ]),
        ).rejects.toThrow('Write failure');
    });

    test('rewriteComposeFile should preserve original file content in simulated filesystem on write failure (reproduction #1496)', async () => {
        const originalContent = 'services:\n  web:\n    image: app:1.0.0';
        const fileStore: Record<string, string> = {
            'docker-compose.yml': originalContent,
            'docker-compose.yml.back': originalContent,
        };

        (fs.readFile as jest.Mock).mockImplementation(
            async (filePath: string) => {
                if (fileStore[filePath]) {
                    return Buffer.from(fileStore[filePath]);
                }
                throw new Error(`ENOENT: ${filePath}`);
            },
        );

        (fs.writeFile as jest.Mock).mockImplementation(
            async (filePath: string, data: string) => {
                // If writing to the active compose file directly, partial corruption occurs
                if (filePath === 'docker-compose.yml') {
                    fileStore[filePath] = String(data).slice(0, 10);
                    throw Object.assign(new Error('ENOSPC'), {
                        code: 'ENOSPC',
                    });
                }
                // Sibling temporary file fails on ENOSPC before touching active file
                if (filePath.startsWith('docker-compose.yml.tmp.')) {
                    fileStore[filePath] = String(data).slice(0, 10);
                    throw Object.assign(new Error('ENOSPC'), {
                        code: 'ENOSPC',
                    });
                }
                fileStore[filePath] = String(data);
            },
        );

        (fs.unlink as jest.Mock).mockImplementation(
            async (filePath: string) => {
                delete fileStore[filePath];
            },
        );

        await expect(
            dockercompose.rewriteComposeFile('docker-compose.yml', [
                { current: 'app:1.0.0', update: 'app:2.0.0' },
            ]),
        ).rejects.toThrow('ENOSPC');

        // Target file must remain untouched with original content
        expect(fileStore['docker-compose.yml']).toBe(originalContent);
        // Backup file remains intact
        expect(fileStore['docker-compose.yml.back']).toBe(originalContent);
        // Temporary file is cleaned up
        const tempFiles = Object.keys(fileStore).filter((k) =>
            k.startsWith('docker-compose.yml.tmp.'),
        );
        expect(tempFiles).toHaveLength(0);
    });

    test('rewriteComposeFile should preserve file permissions and ownership on tmpFile before rename (issue #1577)', async () => {
        const callOrder: string[] = [];
        (fs.readFile as jest.Mock).mockResolvedValue(
            Buffer.from('services:\n  web:\n    image: app:1.0.0'),
        );
        (fs.stat as jest.Mock).mockImplementation(async () => {
            callOrder.push('stat');
            return {
                mode: 0o100664,
                uid: 1000,
                gid: 1000,
            };
        });
        (fs.writeFile as jest.Mock).mockImplementation(async () => {
            callOrder.push('writeFile');
        });
        (fs.chmod as jest.Mock).mockImplementation(async () => {
            callOrder.push('chmod');
        });
        (fs.chown as jest.Mock).mockImplementation(async () => {
            callOrder.push('chown');
        });
        (fs.rename as jest.Mock).mockImplementation(async () => {
            callOrder.push('rename');
        });

        await dockercompose.rewriteComposeFile('test.yml', [
            { current: 'app:1.0.0', update: 'app:2.0.0' },
        ]);

        expect(fs.stat).toHaveBeenCalledWith('test.yml');
        expect(fs.chmod).toHaveBeenCalledWith(
            expect.stringMatching(/^test\.yml\.tmp\./),
            0o664,
        );
        expect(fs.chown).toHaveBeenCalledWith(
            expect.stringMatching(/^test\.yml\.tmp\./),
            1000,
            1000,
        );
        expect(fs.rename).toHaveBeenCalledWith(
            expect.stringMatching(/^test\.yml\.tmp\./),
            'test.yml',
        );
        expect(callOrder).toEqual([
            'stat',
            'writeFile',
            'chmod',
            'chown',
            'rename',
        ]);
    });

    test('rewriteComposeFile should preserve ownership and permissions in simulated filesystem (reproduction #1577)', async () => {
        interface SimulatedFile {
            content: string;
            mode: number;
            uid: number;
            gid: number;
        }
        const fileStore: Record<string, SimulatedFile> = {
            'docker-compose.yml': {
                content: 'services:\n  web:\n    image: app:1.0.0',
                mode: 0o100664,
                uid: 1000,
                gid: 1000,
            },
        };

        (fs.readFile as jest.Mock).mockImplementation(
            async (filePath: string) =>
                Buffer.from(fileStore[filePath].content),
        );
        (fs.stat as jest.Mock).mockImplementation(async (filePath: string) => ({
            mode: fileStore[filePath].mode,
            uid: fileStore[filePath].uid,
            gid: fileStore[filePath].gid,
        }));
        (fs.writeFile as jest.Mock).mockImplementation(
            async (filePath: string, data: string) => {
                // Simulate Docker root process creating a new file with 0:0 and 0644
                fileStore[filePath] = {
                    content: String(data),
                    mode: 0o100644,
                    uid: 0,
                    gid: 0,
                };
            },
        );
        (fs.chmod as jest.Mock).mockImplementation(
            async (filePath: string, mode: number) => {
                fileStore[filePath].mode = 0o100000 | (mode & 0o7777);
            },
        );
        (fs.chown as jest.Mock).mockImplementation(
            async (filePath: string, uid: number, gid: number) => {
                fileStore[filePath].uid = uid;
                fileStore[filePath].gid = gid;
            },
        );
        (fs.rename as jest.Mock).mockImplementation(
            async (oldPath: string, newPath: string) => {
                fileStore[newPath] = fileStore[oldPath];
                delete fileStore[oldPath];
            },
        );

        await dockercompose.rewriteComposeFile('docker-compose.yml', [
            { current: 'app:1.0.0', update: 'app:2.0.0' },
        ]);

        expect(fileStore['docker-compose.yml']).toEqual({
            content: 'services:\n  web:\n    image: app:2.0.0',
            mode: 0o100664,
            uid: 1000,
            gid: 1000,
        });
    });

    test('rewriteComposeFile should succeed when chown fails with EPERM or ENOTSUP', async () => {
        const debugSpy = jest.spyOn(dockercompose.log, 'debug');
        (fs.readFile as jest.Mock).mockResolvedValue(
            Buffer.from('services:\n  web:\n    image: app:1.0.0'),
        );
        (fs.stat as jest.Mock).mockResolvedValue({
            mode: 0o100664,
            uid: 1000,
            gid: 1000,
        });
        (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
        (fs.chmod as jest.Mock).mockResolvedValue(undefined);
        const epermError = Object.assign(
            new Error('EPERM: operation not permitted'),
            { code: 'EPERM' },
        );
        (fs.chown as jest.Mock).mockRejectedValue(epermError);

        await expect(
            dockercompose.rewriteComposeFile('test.yml', [
                { current: 'app:1.0.0', update: 'app:2.0.0' },
            ]),
        ).resolves.toBeUndefined();

        expect(fs.chmod).toHaveBeenCalledWith(
            expect.stringMatching(/^test\.yml\.tmp\./),
            0o664,
        );
        expect(fs.chown).toHaveBeenCalledWith(
            expect.stringMatching(/^test\.yml\.tmp\./),
            1000,
            1000,
        );
        expect(fs.rename).toHaveBeenCalledWith(
            expect.stringMatching(/^test\.yml\.tmp\./),
            'test.yml',
        );
        expect(debugSpy).toHaveBeenCalledWith(
            expect.stringContaining('Unable to preserve ownership'),
        );
        debugSpy.mockRestore();
    });

    test('rewriteComposeFile should succeed when chmod fails with ENOTSUP and still attempt chown', async () => {
        const debugSpy = jest.spyOn(dockercompose.log, 'debug');
        (fs.readFile as jest.Mock).mockResolvedValue(
            Buffer.from('services:\n  web:\n    image: app:1.0.0'),
        );
        (fs.stat as jest.Mock).mockResolvedValue({
            mode: 0o100664,
            uid: 1000,
            gid: 1000,
        });
        (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
        const enotsupError = Object.assign(
            new Error('ENOTSUP: operation not supported'),
            { code: 'ENOTSUP' },
        );
        (fs.chmod as jest.Mock).mockRejectedValue(enotsupError);
        (fs.chown as jest.Mock).mockResolvedValue(undefined);

        await expect(
            dockercompose.rewriteComposeFile('test.yml', [
                { current: 'app:1.0.0', update: 'app:2.0.0' },
            ]),
        ).resolves.toBeUndefined();

        expect(fs.chown).toHaveBeenCalledWith(
            expect.stringMatching(/^test\.yml\.tmp\./),
            1000,
            1000,
        );
        expect(fs.rename).toHaveBeenCalledWith(
            expect.stringMatching(/^test\.yml\.tmp\./),
            'test.yml',
        );
        expect(debugSpy).toHaveBeenCalledWith(
            expect.stringContaining('Unable to preserve permissions'),
        );
        debugSpy.mockRestore();
    });

    test('rewriteComposeFile should succeed when stat fails', async () => {
        const debugSpy = jest.spyOn(dockercompose.log, 'debug');
        (fs.readFile as jest.Mock).mockResolvedValue(
            Buffer.from('services:\n  web:\n    image: app:1.0.0'),
        );
        (fs.stat as jest.Mock).mockRejectedValue(
            Object.assign(new Error('ENOSYS: function not implemented'), {
                code: 'ENOSYS',
            }),
        );
        (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

        await expect(
            dockercompose.rewriteComposeFile('test.yml', [
                { current: 'app:1.0.0', update: 'app:2.0.0' },
            ]),
        ).resolves.toBeUndefined();

        expect(fs.chmod).not.toHaveBeenCalled();
        expect(fs.chown).not.toHaveBeenCalled();
        expect(fs.rename).toHaveBeenCalledWith(
            expect.stringMatching(/^test\.yml\.tmp\./),
            'test.yml',
        );
        expect(debugSpy).toHaveBeenCalledWith(
            expect.stringContaining('Unable to stat test.yml'),
        );
        debugSpy.mockRestore();
    });

    test('rewriteComposeFile should handle non-Error rejections in stat, chmod, and chown gracefully', async () => {
        (fs.readFile as jest.Mock).mockResolvedValue(
            Buffer.from('services:\n  web:\n    image: app:1.0.0'),
        );
        (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

        (fs.stat as jest.Mock).mockRejectedValueOnce('stat string error');
        await expect(
            dockercompose.rewriteComposeFile('test.yml', [
                { current: 'app:1.0.0', update: 'app:2.0.0' },
            ]),
        ).resolves.toBeUndefined();

        (fs.stat as jest.Mock).mockResolvedValueOnce({
            mode: 0o100640,
            uid: 1000,
            gid: 1000,
        });
        (fs.chmod as jest.Mock).mockRejectedValueOnce('chmod string error');
        (fs.chown as jest.Mock).mockRejectedValueOnce('chown string error');
        await expect(
            dockercompose.rewriteComposeFile('test.yml', [
                { current: 'app:1.0.0', update: 'app:2.0.0' },
            ]),
        ).resolves.toBeUndefined();
    });

    test('rewriteComposeFile should restore metadata on composeFile when rename fails and backup is restored', async () => {
        (fs.readFile as jest.Mock).mockResolvedValue(
            Buffer.from('services:\n  web:\n    image: app:1.0.0'),
        );
        (fs.stat as jest.Mock).mockResolvedValue({
            mode: 0o100660,
            uid: 1000,
            gid: 1001,
        });
        (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
        (fs.rename as jest.Mock).mockRejectedValue(
            new Error('EACCES: permission denied'),
        );
        (fs.unlink as jest.Mock).mockResolvedValue(undefined);
        (fs.access as jest.Mock).mockResolvedValue(undefined);
        (fs.copyFile as jest.Mock).mockResolvedValue(undefined);

        await expect(
            dockercompose.rewriteComposeFile('test.yml', [
                { current: 'app:1.0.0', update: 'app:2.0.0' },
            ]),
        ).rejects.toThrow('EACCES');

        expect(fs.copyFile).toHaveBeenCalledWith('test.yml.back', 'test.yml');
        expect(fs.chmod).toHaveBeenCalledWith('test.yml', 0o660);
        expect(fs.chown).toHaveBeenCalledWith('test.yml', 1000, 1001);
    });

    test('ensureComposeBackup should preserve file permissions and ownership on .back file', async () => {
        (fs.copyFile as jest.Mock).mockResolvedValue(undefined);
        (fs.stat as jest.Mock).mockResolvedValue({
            mode: 0o100664,
            uid: 1000,
            gid: 1000,
        });

        await dockercompose.ensureComposeBackup('test.yml');

        expect(fs.copyFile).toHaveBeenCalledWith('test.yml', 'test.yml.back');
        expect(fs.stat).toHaveBeenCalledWith('test.yml');
        expect(fs.chmod).toHaveBeenCalledWith('test.yml.back', 0o664);
        expect(fs.chown).toHaveBeenCalledWith('test.yml.back', 1000, 1000);
    });

    test('restoreComposeFileFromBackup should preserve backup file permissions and ownership on compose file', async () => {
        (fs.copyFile as jest.Mock).mockResolvedValue(undefined);
        (fs.stat as jest.Mock).mockResolvedValue({
            mode: 0o100664,
            uid: 1000,
            gid: 1000,
        });

        await dockercompose.restoreComposeFileFromBackup('test.yml');

        expect(fs.copyFile).toHaveBeenCalledWith('test.yml.back', 'test.yml');
        expect(fs.stat).toHaveBeenCalledWith('test.yml.back');
        expect(fs.chmod).toHaveBeenCalledWith('test.yml', 0o664);
        expect(fs.chown).toHaveBeenCalledWith('test.yml', 1000, 1000);
    });

    test('backup should preserve file permissions and ownership on backup file', async () => {
        (fs.copyFile as jest.Mock).mockResolvedValue(undefined);
        (fs.stat as jest.Mock).mockResolvedValue({
            mode: 0o100640,
            uid: 1000,
            gid: 2000,
        });

        await dockercompose.backup('test.yml', 'test.yml.back');

        expect(fs.copyFile).toHaveBeenCalledWith('test.yml', 'test.yml.back');
        expect(fs.stat).toHaveBeenCalledWith('test.yml');
        expect(fs.chmod).toHaveBeenCalledWith('test.yml.back', 0o640);
        expect(fs.chown).toHaveBeenCalledWith('test.yml.back', 1000, 2000);
    });

    test('backup should log a warning when copyFile fails', async () => {
        const warnSpy = jest.spyOn(dockercompose.log, 'warn');
        (fs.copyFile as jest.Mock).mockRejectedValueOnce(
            new Error('EACCES: cannot write backup'),
        );
        await expect(
            dockercompose.backup('test.yml', 'test.yml.back'),
        ).resolves.toBeUndefined();
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('EACCES: cannot write backup'),
        );

        (fs.copyFile as jest.Mock).mockRejectedValueOnce('raw backup error');
        await expect(
            dockercompose.backup('test.yml', 'test.yml.back'),
        ).resolves.toBeUndefined();
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('raw backup error'),
        );
        warnSpy.mockRestore();
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

    test('triggerBatch should warn and skip containers when compose file does not exist on disk', async () => {
        (fs.access as jest.Mock).mockRejectedValue(
            new Error('ENOENT: no such file or directory'),
        );
        const warnSpy = jest
            .spyOn(dockercompose.log, 'warn')
            .mockImplementation(() => {});
        dockercompose.getWatcher = jest.fn().mockReturnValue({
            dockerApi: { modem: { socketPath: '/var/run/docker.sock' } },
        });
        dockercompose.processComposeFile = jest.fn();

        await expect(
            dockercompose.triggerBatch([container as any]),
        ).resolves.toBeUndefined();

        expect(dockercompose.processComposeFile).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining(
                `Compose file ${configurationValid.file} for container ${container.name} does not exist (ENOENT: no such file or directory)`,
            ),
        );
        warnSpy.mockRestore();
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
            emitEvents: false,
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

    test('processComposeFile should abort and emit failure event without modifying compose file when strict_digest is enabled and candidate lacks digest', async () => {
        dockercompose.processComposeFile =
            Dockercompose.prototype.processComposeFile;
        dockercompose.configuration = {
            ...configurationValid,
            strict_digest: true,
            dryrun: false,
        };
        const failureSpy = jest.spyOn(event, 'emitContainerUpdateFailure');
        const composeFileStr =
            'services:\n  test:\n    image: test/test:1.2.3@sha256:old1111111111111111111111111111111111111111111111111111111111111';
        dockercompose.getComposeFileAsObject = jest.fn().mockResolvedValue({
            services: {
                test: {
                    image: 'test/test:1.2.3@sha256:old1111111111111111111111111111111111111111111111111111111111111',
                },
            },
        });
        dockercompose.getComposeFile = jest
            .fn()
            .mockResolvedValue(Buffer.from(composeFileStr));
        dockercompose.writeComposeFile = jest.fn();
        dockercompose.getWatcher = jest.fn().mockReturnValue({
            dockerApi: {},
        });

        const testContainer = {
            name: 'test',
            id: 'c1',
            watcher: 'local',
            updateAvailable: true,
            labels: {
                'com.docker.compose.service': 'test',
            },
            image: {
                registry: { name: 'hub' },
                name: 'test/test',
                tag: { value: '1.2.3', semver: true },
            },
            updateKind: { kind: 'tag', remoteValue: '4.5.6' },
            result: { tag: '4.5.6' },
        } as unknown as Container;

        await expect(
            dockercompose.processComposeFile('/path/compose.yml', [
                testContainer,
            ]),
        ).rejects.toThrow('strict_digest is enabled');

        expect(dockercompose.writeComposeFile).not.toHaveBeenCalled();
        expect(failureSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'test',
                error: expect.stringContaining('strict_digest is enabled'),
            }),
        );
        failureSpy.mockRestore();
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
                    emitEvents: false,
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
                emitEvents: false,
            });
            expect(fs.writeFile).toHaveBeenCalled();
        });

        test('dry-run should not write or back up the compose file for a digest update', async () => {
            digestTrigger.configuration.dryrun = true;
            digestTrigger.configuration.backup = true;

            await digestTrigger.triggerBatch([digestContainer]);

            expect(superTriggerSpy).toHaveBeenCalledWith(digestContainer, {
                runHooks: false,
                emitEvents: false,
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

        describe('strict_digest mode (#1497)', () => {
            const composePinned = {
                services: {
                    test: {
                        image: 'test/test:1.2.3@sha256:old1111111111111111111111111111111111111111111111111111111111111',
                    },
                },
            };
            const composeUnpinned = {
                services: {
                    test: {
                        image: 'test/test:1.2.3',
                    },
                },
            };
            const containerWithoutRemoteDigest = {
                ...digestContainer,
                result: {
                    tag: '4.5.6',
                },
            } as unknown as Container;

            test('isStrictDigestEnabled helper should correctly evaluate trigger and container label settings', () => {
                dockercompose.type = 'dockercompose';
                dockercompose.name = 'compose1';

                // Default is false
                dockercompose.configuration = {
                    ...configurationValid,
                    strict_digest: false,
                };
                expect(dockercompose.isStrictDigestEnabled()).toBe(false);
                expect(dockercompose.isStrictDigestEnabled({} as any)).toBe(
                    false,
                );

                // Config level true
                dockercompose.configuration.strict_digest = true;
                expect(dockercompose.isStrictDigestEnabled()).toBe(true);
                expect(dockercompose.isStrictDigestEnabled({} as any)).toBe(
                    true,
                );

                // Container label override: true
                dockercompose.configuration.strict_digest = false;
                expect(
                    dockercompose.isStrictDigestEnabled({
                        labels: {
                            'wud.trigger.dockercompose.strict_digest': 'true',
                        },
                    } as any),
                ).toBe(true);
                expect(
                    dockercompose.isStrictDigestEnabled({
                        labels: {
                            'wud.trigger.dockercompose.compose1.strict_digest':
                                'true',
                        },
                    } as any),
                ).toBe(true);
                expect(
                    dockercompose.isStrictDigestEnabled({
                        labels: { 'wud.trigger.strict_digest': 'true' },
                    } as any),
                ).toBe(true);
                expect(
                    dockercompose.isStrictDigestEnabled({
                        labels: {
                            'wud.trigger.dockercompose.strict_digest': true,
                        },
                    } as any),
                ).toBe(true);

                // Container label override: false
                dockercompose.configuration.strict_digest = true;
                expect(
                    dockercompose.isStrictDigestEnabled({
                        labels: {
                            'wud.trigger.dockercompose.strict_digest': 'false',
                        },
                    } as any),
                ).toBe(false);
                expect(
                    dockercompose.isStrictDigestEnabled({
                        labels: {
                            'wud.trigger.dockercompose.compose1.strict_digest':
                                'false',
                        },
                    } as any),
                ).toBe(false);
                expect(
                    dockercompose.isStrictDigestEnabled({
                        labels: { 'wud.trigger.strict_digest': 'false' },
                    } as any),
                ).toBe(false);
            });

            test('should throw error when strict_digest is enabled on trigger and candidate has no digest', () => {
                dockercompose.configuration = {
                    ...configurationValid,
                    strict_digest: true,
                };

                expect(() =>
                    dockercompose.mapCurrentVersionToUpdateVersion(
                        composePinned as any,
                        containerWithoutRemoteDigest,
                        new Set(),
                    ),
                ).toThrow(
                    'Image test/test:1.2.3@sha256:old1111111111111111111111111111111111111111111111111111111111111 is pinned by digest, but no remote digest is available for test/test:4.5.6 and strict_digest is enabled',
                );
            });

            test('should throw error when candidate update is digest kind but has no remote digest in strict_digest mode', () => {
                dockercompose.configuration = {
                    ...configurationValid,
                    strict_digest: true,
                };
                const digestUpdateWithoutDigest = {
                    ...digestContainer,
                    updateKind: { kind: 'digest' },
                    result: {},
                } as unknown as Container;

                expect(() =>
                    dockercompose.mapCurrentVersionToUpdateVersion(
                        composePinned as any,
                        digestUpdateWithoutDigest,
                        new Set(),
                    ),
                ).toThrow(
                    'Image test/test:1.2.3@sha256:old1111111111111111111111111111111111111111111111111111111111111 is pinned by digest, but no remote digest is available for test/test:1.2.3 and strict_digest is enabled',
                );
            });

            test('should throw error when container has wud.trigger.dockercompose.strict_digest=true label override', () => {
                dockercompose.configuration = {
                    ...configurationValid,
                    strict_digest: false,
                };
                const containerWithStrictLabel = {
                    ...containerWithoutRemoteDigest,
                    labels: {
                        'wud.trigger.dockercompose.strict_digest': 'true',
                    },
                } as unknown as Container;

                expect(() =>
                    dockercompose.mapCurrentVersionToUpdateVersion(
                        composePinned as any,
                        containerWithStrictLabel,
                        new Set(),
                    ),
                ).toThrow(
                    'Image test/test:1.2.3@sha256:old1111111111111111111111111111111111111111111111111111111111111 is pinned by digest, but no remote digest is available for test/test:4.5.6 and strict_digest is enabled',
                );
            });

            test('should throw error when container has instance-specific wud.trigger.dockercompose.<name>.strict_digest=true label', () => {
                dockercompose.name = 'mycompose';
                dockercompose.configuration = {
                    ...configurationValid,
                    strict_digest: false,
                };
                const containerWithInstanceLabel = {
                    ...containerWithoutRemoteDigest,
                    labels: {
                        'wud.trigger.dockercompose.mycompose.strict_digest':
                            'true',
                    },
                } as unknown as Container;

                expect(() =>
                    dockercompose.mapCurrentVersionToUpdateVersion(
                        composePinned as any,
                        containerWithInstanceLabel,
                        new Set(),
                    ),
                ).toThrow(
                    'Image test/test:1.2.3@sha256:old1111111111111111111111111111111111111111111111111111111111111 is pinned by digest, but no remote digest is available for test/test:4.5.6 and strict_digest is enabled',
                );
            });

            test('should strip stale digest pin when trigger has strict_digest=true but container label opts out with false', () => {
                dockercompose.configuration = {
                    ...configurationValid,
                    strict_digest: true,
                };
                const containerWithOptOutLabel = {
                    ...containerWithoutRemoteDigest,
                    labels: {
                        'wud.trigger.dockercompose.strict_digest': 'false',
                    },
                } as unknown as Container;

                const mapping = dockercompose.mapCurrentVersionToUpdateVersion(
                    composePinned as any,
                    containerWithOptOutLabel,
                    new Set(),
                );
                expect(mapping).toEqual({
                    service: 'test',
                    current:
                        'test/test:1.2.3@sha256:old1111111111111111111111111111111111111111111111111111111111111',
                    update: 'test/test:4.5.6',
                });
            });

            test('should update normally when strict_digest is enabled and replacement has a remote digest', () => {
                dockercompose.configuration = {
                    ...configurationValid,
                    strict_digest: true,
                };

                const mapping = dockercompose.mapCurrentVersionToUpdateVersion(
                    composePinned as any,
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

            test('should update digest-pinned SemVer image when strict_digest is enabled and digest watching is disabled (watch: false) (fixes #1542)', () => {
                dockercompose.configuration = {
                    ...configurationValid,
                    strict_digest: true,
                };

                const semverContainerWithWatchDisabled = {
                    name: 'my-service',
                    updateAvailable: true,
                    image: {
                        registry: { name: 'hub' },
                        name: 'test/test',
                        tag: { value: '1.2.3', semver: true },
                        digest: {
                            watch: false,
                            repo: 'sha256:old1111111111111111111111111111111111111111111111111111111111111',
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

                const mapping = dockercompose.mapCurrentVersionToUpdateVersion(
                    composePinned as any,
                    semverContainerWithWatchDisabled,
                    new Set(),
                );
                expect(mapping).toEqual({
                    service: 'test',
                    current:
                        'test/test:1.2.3@sha256:old1111111111111111111111111111111111111111111111111111111111111',
                    update: 'test/test:4.5.6@sha256:new2222222222222222222222222222222222222222222222222222222222222',
                });
            });

            test('should update unpinned image normally to mutable tag when strict_digest is enabled', () => {
                dockercompose.configuration = {
                    ...configurationValid,
                    strict_digest: true,
                };

                const mapping = dockercompose.mapCurrentVersionToUpdateVersion(
                    composeUnpinned as any,
                    containerWithoutRemoteDigest,
                    new Set(),
                );
                expect(mapping).toEqual({
                    service: 'test',
                    current: 'test/test:1.2.3',
                    update: 'test/test:4.5.6',
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
                (fs.rename as jest.Mock).mockResolvedValue(undefined);

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
                    expect.stringMatching(/^docker-compose\.yml\.tmp\./),
                    expectedYaml,
                );
                expect(fs.rename).toHaveBeenCalledWith(
                    expect.stringMatching(/^docker-compose\.yml\.tmp\./),
                    'docker-compose.yml',
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

    describe('Lifecycle update event emission (#1491)', () => {
        let preSpy: jest.SpyInstance;
        let successSpy: jest.SpyInstance;
        let failureSpy: jest.SpyInstance;
        let superTriggerSpy: jest.SpyInstance;

        const composeYaml = yaml.stringify({
            services: {
                app: {
                    image: 'test/app:1.0.0',
                    container_name: 'app',
                },
                db: {
                    image: 'test/db:1.0.0',
                    container_name: 'db',
                },
            },
        });

        const appContainer: any = {
            id: 'c-app',
            name: 'app',
            watcher: 'local',
            updateAvailable: true,
            labels: {
                'com.docker.compose.service': 'app',
            },
            image: {
                name: 'test/app',
                tag: { value: '1.0.0', semver: true },
                digest: { watch: false },
                registry: { name: 'hub', url: 'hub.docker.com' },
            },
            updateKind: {
                kind: 'tag',
                localValue: '1.0.0',
                remoteValue: '2.0.0',
                semverDiff: 'major',
            },
            result: { tag: '2.0.0' },
        };

        const dbContainer: any = {
            id: 'c-db',
            name: 'db',
            watcher: 'local',
            updateAvailable: true,
            labels: {
                'com.docker.compose.service': 'db',
            },
            image: {
                name: 'test/db',
                tag: { value: '1.0.0', semver: true },
                digest: { watch: false },
                registry: { name: 'hub', url: 'hub.docker.com' },
            },
            updateKind: {
                kind: 'tag',
                localValue: '1.0.0',
                remoteValue: '2.0.0',
                semverDiff: 'major',
            },
            result: { tag: '2.0.0' },
        };

        beforeEach(() => {
            preSpy = jest
                .spyOn(event, 'emitContainerUpdatePre')
                .mockImplementation(() => {});
            successSpy = jest
                .spyOn(event, 'emitContainerUpdateSuccess')
                .mockImplementation(() => {});
            failureSpy = jest
                .spyOn(event, 'emitContainerUpdateFailure')
                .mockImplementation(() => {});
            dockercompose.configuration = {
                ...configurationValid,
                dryrun: false,
                backup: false,
            };
            dockercompose.getComposeFileAsObject = jest
                .fn()
                .mockResolvedValue(yaml.parse(composeYaml));
            dockercompose.getComposeFile = jest
                .fn()
                .mockResolvedValue(Buffer.from(composeYaml));
            dockercompose.writeComposeFile = jest
                .fn()
                .mockResolvedValue(undefined);
            dockercompose.getWatcher = jest.fn().mockReturnValue({
                dockerApi: {},
            });
            superTriggerSpy = jest
                .spyOn(
                    Object.getPrototypeOf(Dockercompose.prototype),
                    'trigger',
                )
                .mockResolvedValue(undefined);
        });

        afterEach(() => {
            preSpy.mockRestore();
            successSpy.mockRestore();
            failureSpy.mockRestore();
            superTriggerSpy.mockRestore();
        });

        test('should emit pre and success events exactly once per container on standard update', async () => {
            await dockercompose.processComposeFile('/path/compose.yml', [
                appContainer,
            ]);

            expect(preSpy).toHaveBeenCalledTimes(1);
            expect(preSpy).toHaveBeenCalledWith(appContainer);

            expect(successSpy).toHaveBeenCalledTimes(1);
            expect(successSpy).toHaveBeenCalledWith(appContainer);

            expect(failureSpy).not.toHaveBeenCalled();
            expect(superTriggerSpy).toHaveBeenCalledWith(appContainer, {
                runHooks: false,
                emitEvents: false,
            });
        });

        test('should emit pre and success events once per container for multiple updated containers in a stack', async () => {
            await dockercompose.processComposeFile('/path/compose.yml', [
                appContainer,
                dbContainer,
            ]);

            expect(preSpy).toHaveBeenCalledTimes(2);
            expect(preSpy).toHaveBeenNthCalledWith(1, appContainer);
            expect(preSpy).toHaveBeenNthCalledWith(2, dbContainer);

            expect(successSpy).toHaveBeenCalledTimes(2);
            expect(successSpy).toHaveBeenNthCalledWith(1, appContainer);
            expect(successSpy).toHaveBeenNthCalledWith(2, dbContainer);

            expect(failureSpy).not.toHaveBeenCalled();
        });

        test('should emit pre and failure events exactly once per container when update throws', async () => {
            superTriggerSpy.mockRejectedValue(
                new Error('Container recreate failed'),
            );

            await expect(
                dockercompose.processComposeFile('/path/compose.yml', [
                    appContainer,
                ]),
            ).rejects.toThrow('Container recreate failed');

            expect(preSpy).toHaveBeenCalledTimes(1);
            expect(preSpy).toHaveBeenCalledWith(appContainer);

            expect(successSpy).not.toHaveBeenCalled();

            expect(failureSpy).toHaveBeenCalledTimes(1);
            expect(failureSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'app',
                    error: 'Container recreate failed',
                }),
            );
        });

        test('should not emit pre or success events in dry-run mode', async () => {
            dockercompose.configuration.dryrun = true;

            await dockercompose.processComposeFile('/path/compose.yml', [
                appContainer,
            ]);

            expect(preSpy).not.toHaveBeenCalled();
            expect(successSpy).not.toHaveBeenCalled();
            expect(failureSpy).not.toHaveBeenCalled();
        });
    });
});

describe('Stack-aware recreation (#1410)', () => {
    const makeContainer = (service: string, image: string): any => ({
        id: `c-${service}`,
        name: service,
        watcher: 'local',
        updateAvailable: true,
        labels: { 'com.docker.compose.service': service },
        image: {
            name: image,
            tag: { value: '1.0.0', semver: true },
            digest: { watch: false },
            registry: { name: 'hub', url: 'hub.docker.com' },
        },
        updateKind: {
            kind: 'tag',
            localValue: '1.0.0',
            remoteValue: '2.0.0',
            semverDiff: 'major',
        },
        result: { tag: '2.0.0' },
    });

    const app = makeContainer('app', 'test/app');
    const db = makeContainer('db', 'test/db');
    const cache = makeContainer('cache', 'test/cache');
    const worker = makeContainer('worker', 'test/worker');

    const stackCompose = {
        services: {
            app: {
                image: 'test/app:1.0.0',
                depends_on: ['db', 'cache'],
            },
            worker: {
                image: 'test/worker:1.0.0',
                depends_on: { app: { condition: 'service_healthy' } },
            },
            db: { image: 'test/db:1.0.0' },
            cache: { image: 'test/cache:1.0.0' },
        },
    };

    const names = (waves: any[][]) =>
        waves.map((wave) => wave.map((c) => c.name).sort());

    describe('getServiceDependencies', () => {
        test('reads the short list syntax', () => {
            expect(
                getServiceDependencies({ depends_on: ['db', 'cache'] }),
            ).toEqual([{ name: 'db' }, { name: 'cache' }]);
        });

        test('reads the long map syntax with its condition', () => {
            expect(
                getServiceDependencies({
                    depends_on: {
                        db: { condition: 'service_healthy' },
                        cache: {},
                        proxy: null,
                    },
                }),
            ).toEqual([
                { name: 'db', condition: 'service_healthy' },
                { name: 'cache', condition: undefined },
                { name: 'proxy', condition: undefined },
            ]);
        });

        test('returns an empty list without depends_on or for invalid input', () => {
            expect(getServiceDependencies({ image: 'x' })).toEqual([]);
            expect(getServiceDependencies(undefined)).toEqual([]);
            expect(getServiceDependencies('db')).toEqual([]);
            expect(getServiceDependencies({ depends_on: 'db' })).toEqual([]);
            expect(getServiceDependencies({ depends_on: [1, 'db'] })).toEqual([
                { name: 'db' },
            ]);
        });
    });

    describe('orderContainersByDependencies', () => {
        test('recreates dependencies before dependents, independent services together', () => {
            const plan = orderContainersByDependencies(stackCompose, [
                worker,
                app,
                cache,
                db,
            ]);
            expect(names(plan.waves)).toEqual([
                ['cache', 'db'],
                ['app'],
                ['worker'],
            ]);
            expect(plan.cyclicServices).toEqual([]);
            expect([...plan.healthyDependencies]).toEqual(['app']);
        });

        test('orders through a service that is not updated', () => {
            // app -> proxy (not updated) -> db: db must still come before app
            const compose = {
                services: {
                    app: { image: 'test/app:1.0.0', depends_on: ['proxy'] },
                    proxy: { image: 'test/proxy:1.0.0', depends_on: ['db'] },
                    db: { image: 'test/db:1.0.0' },
                },
            };
            const plan = orderContainersByDependencies(compose, [app, db]);
            expect(names(plan.waves)).toEqual([['db'], ['app']]);
        });

        test('only reports health waits for updated dependencies', () => {
            const plan = orderContainersByDependencies(stackCompose, [
                worker,
                db,
            ]);
            expect(names(plan.waves)).toEqual([['db'], ['worker']]);
            expect(plan.healthyDependencies.size).toBe(0);
        });

        test('keeps a single wave when there is no dependency relation', () => {
            expect(
                names(
                    orderContainersByDependencies(stackCompose, [db, cache])
                        .waves,
                ),
            ).toEqual([['cache', 'db']]);
            expect(
                names(orderContainersByDependencies(stackCompose, [app]).waves),
            ).toEqual([['app']]);
        });

        test('keeps replicas of the same service in the same wave', () => {
            const appReplica = { ...app, id: 'c-app-2', name: 'app-2' };
            const plan = orderContainersByDependencies(stackCompose, [
                appReplica,
                db,
                app,
            ]);
            expect(names(plan.waves)).toEqual([['db'], ['app', 'app-2']]);
        });

        test('reports a dependency cycle and recreates its services together, last', () => {
            const cyclic = {
                services: {
                    app: { image: 'test/app:1.0.0', depends_on: ['db'] },
                    db: { image: 'test/db:1.0.0', depends_on: ['app'] },
                    cache: { image: 'test/cache:1.0.0' },
                },
            };
            const plan = orderContainersByDependencies(cyclic, [
                app,
                db,
                cache,
            ]);
            expect(names(plan.waves)).toEqual([['cache'], ['app', 'db']]);
            expect(plan.cyclicServices.sort()).toEqual(['app', 'db']);
        });

        test('does not report a cycle between services that are not updated', () => {
            const cyclic = {
                services: {
                    a: { image: 'test/a:1.0.0', depends_on: ['b'] },
                    b: { image: 'test/b:1.0.0', depends_on: ['a'] },
                    cache: { image: 'test/cache:1.0.0' },
                },
            };
            const plan = orderContainersByDependencies(cyclic, [cache]);
            expect(names(plan.waves)).toEqual([['cache']]);
            expect(plan.cyclicServices).toEqual([]);
        });

        test('puts containers without a matching service in the first wave', () => {
            const unknown = makeContainer('ghost', 'test/ghost');
            const plan = orderContainersByDependencies(stackCompose, [
                app,
                unknown,
                db,
            ]);
            expect(names(plan.waves)).toEqual([['db', 'ghost'], ['app']]);
            expect(
                names(
                    orderContainersByDependencies(stackCompose, [unknown])
                        .waves,
                ),
            ).toEqual([['ghost']]);
        });

        test('keeps the container WUD runs in out of the waves, as a post-commit step', () => {
            const wud = makeContainer('db', 'test/db');
            wud.id = 'c-wud';
            wud.name = 'wud';
            const plan = orderContainersByDependencies(
                stackCompose,
                [wud, app, db],
                (container) => container.id === 'c-wud',
            );
            expect(names(plan.waves)).toEqual([['db'], ['app']]);
            expect(plan.selfContainers).toEqual([wud]);
        });

        test('still awaits the service_healthy dependencies of the container WUD runs in', () => {
            const wud = makeContainer('worker', 'test/worker');
            wud.id = 'c-wud';
            wud.name = 'wud';
            const plan = orderContainersByDependencies(
                stackCompose,
                [wud, app],
                (container) => container.id === 'c-wud',
            );
            expect(names(plan.waves)).toEqual([['app']]);
            expect(plan.selfContainers).toEqual([wud]);
            expect([...plan.healthyDependencies]).toEqual(['app']);
        });

        test('returns no wave for an empty list or a compose file without services', () => {
            expect(
                orderContainersByDependencies(stackCompose, []).waves,
            ).toEqual([]);
            expect(orderContainersByDependencies({}, [app]).waves).toEqual([
                [app],
            ]);
        });
    });

    describe('processComposeFile', () => {
        let superTriggerSpy: jest.SpyInstance;
        let preEventSpy: jest.SpyInstance;
        let successEventSpy: jest.SpyInstance;
        let failureEventSpy: jest.SpyInstance;
        let preHookSpy: jest.SpyInstance;
        let postHookSpy: jest.SpyInstance;
        let waitForHealthySpy: jest.SpyInstance;
        const health = require('../docker/health');
        const composeYaml = yaml.stringify(stackCompose);
        const getContainer = jest.fn((name: string) => ({ name }));

        beforeEach(() => {
            dockercompose.processComposeFile =
                Dockercompose.prototype.processComposeFile;
            dockercompose.configuration = {
                ...configurationValid,
                dryrun: false,
                backup: false,
            };
            dockercompose.getComposeFileAsObject = jest
                .fn()
                .mockResolvedValue(yaml.parse(composeYaml));
            dockercompose.getComposeFile = jest
                .fn()
                .mockResolvedValue(Buffer.from(composeYaml));
            dockercompose.writeComposeFile = jest
                .fn()
                .mockResolvedValue(undefined);
            dockercompose.rewriteComposeFile = jest
                .fn()
                .mockResolvedValue(undefined);
            dockercompose.backup = jest.fn().mockResolvedValue(undefined);
            dockercompose.resolveSelfContainerId = jest
                .fn()
                .mockResolvedValue(undefined);
            dockercompose.getWatcher = jest.fn().mockReturnValue({
                dockerApi: { getContainer },
            });
            superTriggerSpy = jest
                .spyOn(
                    Object.getPrototypeOf(Dockercompose.prototype),
                    'trigger',
                )
                .mockResolvedValue(undefined);
            preEventSpy = jest
                .spyOn(event, 'emitContainerUpdatePre')
                .mockImplementation(() => {});
            successEventSpy = jest
                .spyOn(event, 'emitContainerUpdateSuccess')
                .mockImplementation(() => {});
            failureEventSpy = jest
                .spyOn(event, 'emitContainerUpdateFailure')
                .mockImplementation(() => {});
            preHookSpy = jest
                .spyOn(HookManager, 'runPreHooks')
                .mockResolvedValue(undefined);
            postHookSpy = jest
                .spyOn(HookManager, 'runPostHooks')
                .mockResolvedValue(undefined);
            waitForHealthySpy = jest
                .spyOn(health, 'waitForHealthy')
                .mockResolvedValue('healthy');
        });

        afterEach(() => {
            superTriggerSpy.mockRestore();
            preEventSpy.mockRestore();
            successEventSpy.mockRestore();
            failureEventSpy.mockRestore();
            preHookSpy.mockRestore();
            postHookSpy.mockRestore();
            waitForHealthySpy.mockRestore();
        });

        test('recreates services wave by wave, waiting for dependencies first', async () => {
            const timeline: string[] = [];
            superTriggerSpy.mockImplementation(async (c: any) => {
                timeline.push(`start:${c.name}`);
                // dependencies are slow on purpose: dependents must still wait
                await new Promise((resolve) =>
                    setTimeout(resolve, c.name === 'db' ? 30 : 1),
                );
                timeline.push(`end:${c.name}`);
            });

            await dockercompose.processComposeFile('/path/compose.yml', [
                worker,
                app,
                db,
                cache,
            ]);

            expect(dockercompose.writeComposeFile).toHaveBeenCalledTimes(1);
            expect(superTriggerSpy).toHaveBeenCalledTimes(4);
            const indexOf = (entry: string) => timeline.indexOf(entry);
            // db and cache start together, before app; app before worker
            expect(indexOf('start:db')).toBeLessThan(indexOf('end:cache'));
            expect(indexOf('start:cache')).toBeLessThan(indexOf('end:db'));
            expect(indexOf('start:app')).toBeGreaterThan(indexOf('end:db'));
            expect(indexOf('start:app')).toBeGreaterThan(indexOf('end:cache'));
            expect(indexOf('start:worker')).toBeGreaterThan(indexOf('end:app'));
            // lifecycle events still emitted once per container
            expect(preEventSpy).toHaveBeenCalledTimes(4);
            expect(successEventSpy).toHaveBeenCalledTimes(4);
        });

        test('waits for a service_healthy dependency before recreating its dependents', async () => {
            await dockercompose.processComposeFile('/path/compose.yml', [
                worker,
                app,
            ]);

            // worker depends on app with service_healthy: wait on app only
            expect(waitForHealthySpy).toHaveBeenCalledTimes(1);
            expect(getContainer).toHaveBeenCalledWith('app');
            expect(waitForHealthySpy.mock.calls[0][0]).toEqual({ name: 'app' });
            expect(waitForHealthySpy.mock.calls[0][1]).toEqual({
                window: 300_000,
                interval: 10_000,
            });
            expect(superTriggerSpy).toHaveBeenCalledTimes(2);
        });

        test('does not wait for health when no dependent requires it', async () => {
            await dockercompose.processComposeFile('/path/compose.yml', [
                app,
                db,
            ]);
            expect(waitForHealthySpy).not.toHaveBeenCalled();
        });

        test('accepts a dependency without healthcheck', async () => {
            waitForHealthySpy.mockResolvedValue('no-healthcheck');
            await dockercompose.processComposeFile('/path/compose.yml', [
                worker,
                app,
            ]);
            expect(superTriggerSpy).toHaveBeenCalledTimes(2);
        });

        test('aborts dependent waves when a dependency does not become healthy', async () => {
            waitForHealthySpy.mockResolvedValue('unhealthy');

            await expect(
                dockercompose.processComposeFile('/path/compose.yml', [
                    worker,
                    app,
                ]),
            ).rejects.toThrow(
                'Dependency app did not become healthy (unhealthy); dependent services are not recreated',
            );

            expect(superTriggerSpy).toHaveBeenCalledTimes(1);
            expect(superTriggerSpy).toHaveBeenCalledWith(app, {
                runHooks: false,
                emitEvents: false,
            });
            expect(failureEventSpy).toHaveBeenCalledTimes(2);
        });

        test('aborts subsequent waves when a service fails, rethrowing a single failure as is', async () => {
            const failure = new Error('db recreate failed');
            superTriggerSpy.mockImplementation(async (c: any) => {
                if (c.name === 'db') {
                    throw failure;
                }
            });

            await expect(
                dockercompose.processComposeFile('/path/compose.yml', [
                    app,
                    db,
                    cache,
                ]),
            ).rejects.toBe(failure);

            // first wave (db, cache) ran entirely, app was never recreated
            expect(superTriggerSpy).toHaveBeenCalledTimes(2);
            expect(superTriggerSpy).not.toHaveBeenCalledWith(
                app,
                expect.anything(),
            );
            expect(successEventSpy).not.toHaveBeenCalled();
        });

        test('aggregates several failures of the same wave', async () => {
            superTriggerSpy.mockImplementation(async (c: any) => {
                throw new Error(`${c.name} boom`);
            });

            await expect(
                dockercompose.processComposeFile('/path/compose.yml', [
                    db,
                    cache,
                ]),
            ).rejects.toThrow(
                '2 services failed to update (db: db boom; cache: cache boom)',
            );
        });

        test('passes the containers in dependency order to the rollback transaction', async () => {
            const rollback = require('./rollback');
            const transactionSpy = jest
                .spyOn(rollback, 'performProjectTransaction')
                .mockResolvedValue(true);
            dockercompose.configuration.rollback = true;

            await dockercompose.processComposeFile('/path/compose.yml', [
                worker,
                app,
                db,
            ]);

            expect(transactionSpy).toHaveBeenCalledTimes(1);
            const orderedContainers = transactionSpy.mock.calls[0][2] as any[];
            expect(orderedContainers.map((c: any) => c.name)).toEqual([
                'db',
                'app',
                'worker',
            ]);
            transactionSpy.mockRestore();
        });

        test('recreates the container WUD runs in last', async () => {
            const wud = makeContainer('cache', 'test/cache');
            wud.id = 'c-wud';
            wud.name = 'wud';
            dockercompose.resolveSelfContainerId = jest
                .fn()
                .mockResolvedValue('c-wud');
            const order: string[] = [];
            superTriggerSpy.mockImplementation(async (c: any) => {
                order.push(c.name);
            });

            await dockercompose.processComposeFile('/path/compose.yml', [
                wud,
                app,
                db,
            ]);

            expect(order).toEqual(['db', 'app', 'wud']);
        });

        test('tolerates a failing self container id lookup', async () => {
            dockercompose.resolveSelfContainerId = jest
                .fn()
                .mockRejectedValue(new Error('no docker api'));

            await dockercompose.processComposeFile('/path/compose.yml', [app]);

            expect(superTriggerSpy).toHaveBeenCalledTimes(1);
        });

        test('recreates the container WUD runs in only after the post hooks and success events of the stack', async () => {
            const wud = makeContainer('cache', 'test/cache');
            wud.id = 'c-wud';
            wud.name = 'wud';
            dockercompose.resolveSelfContainerId = jest
                .fn()
                .mockResolvedValue('c-wud');
            const order: string[] = [];
            superTriggerSpy.mockImplementation(async (c: any) => {
                order.push(`recreate:${c.name}`);
            });
            postHookSpy.mockImplementation(async (c: any) => {
                order.push(`post:${c.name}`);
            });
            successEventSpy.mockImplementation((c: any) => {
                order.push(`success:${c.name}`);
            });

            await dockercompose.processComposeFile('/path/compose.yml', [
                wud,
                app,
            ]);

            expect(order).toEqual([
                'recreate:app',
                'post:app',
                'success:app',
                'recreate:wud',
            ]);
            // Pre hooks and pre events still cover WUD itself
            expect(preHookSpy).toHaveBeenCalledTimes(2);
            expect(preEventSpy).toHaveBeenCalledTimes(2);
        });

        test('waits for the service_healthy dependency of the container WUD runs in', async () => {
            const wud = makeContainer('worker', 'test/worker');
            wud.id = 'c-wud';
            wud.name = 'wud';
            dockercompose.resolveSelfContainerId = jest
                .fn()
                .mockResolvedValue('c-wud');

            await dockercompose.processComposeFile('/path/compose.yml', [
                wud,
                app,
            ]);

            expect(waitForHealthySpy).toHaveBeenCalledTimes(1);
            expect(waitForHealthySpy.mock.calls[0][0]).toEqual({ name: 'app' });
            expect(superTriggerSpy).toHaveBeenCalledTimes(2);
        });

        test('keeps the container WUD runs in out of the rollback transaction and recreates it after the commit', async () => {
            const rollback = require('./rollback');
            const order: string[] = [];
            const transactionSpy = jest
                .spyOn(rollback, 'performProjectTransaction')
                .mockImplementation(async () => {
                    order.push('transaction');
                    return true;
                });
            dockercompose.configuration.rollback = true;
            const wud = makeContainer('cache', 'test/cache');
            wud.id = 'c-wud';
            wud.name = 'wud';
            dockercompose.resolveSelfContainerId = jest
                .fn()
                .mockResolvedValue('c-wud');
            superTriggerSpy.mockImplementation(async (c: any) => {
                order.push(`recreate:${c.name}`);
            });
            postHookSpy.mockImplementation(async (c: any) => {
                order.push(`post:${c.name}`);
            });

            await dockercompose.processComposeFile('/path/compose.yml', [
                wud,
                app,
                db,
            ]);

            const transacted = transactionSpy.mock.calls[0][2] as any[];
            expect(transacted.map((c: any) => c.name)).toEqual(['db', 'app']);
            expect(typeof transactionSpy.mock.calls[0][4]).toBe('function');
            expect(order).toEqual([
                'transaction',
                'post:db',
                'post:app',
                'recreate:wud',
            ]);
            expect(successEventSpy).toHaveBeenCalledTimes(2);
            transactionSpy.mockRestore();
        });

        test('does not recreate the container WUD runs in when the stack was rolled back', async () => {
            const rollback = require('./rollback');
            const transactionSpy = jest
                .spyOn(rollback, 'performProjectTransaction')
                .mockResolvedValue(false);
            const rollbackHookSpy = jest
                .spyOn(HookManager, 'runRollbackHooks')
                .mockResolvedValue(undefined);
            dockercompose.configuration.rollback = true;
            const wud = makeContainer('cache', 'test/cache');
            wud.id = 'c-wud';
            wud.name = 'wud';
            dockercompose.resolveSelfContainerId = jest
                .fn()
                .mockResolvedValue('c-wud');

            await dockercompose.processComposeFile('/path/compose.yml', [
                wud,
                app,
            ]);

            expect(superTriggerSpy).not.toHaveBeenCalled();
            expect(rollbackHookSpy).toHaveBeenCalledTimes(1);
            expect(rollbackHookSpy.mock.calls[0][0]).toBe(app);
            expect(successEventSpy).not.toHaveBeenCalled();
            rollbackHookSpy.mockRestore();
            transactionSpy.mockRestore();
        });

        test('gates service_healthy dependencies between the swaps of the rollback transaction', async () => {
            const rollback = require('./rollback');
            const transactionSpy = jest
                .spyOn(rollback, 'performProjectTransaction')
                .mockResolvedValue(true);
            dockercompose.configuration.rollback = true;

            await dockercompose.processComposeFile('/path/compose.yml', [
                worker,
                app,
            ]);

            const gate = transactionSpy.mock.calls[0][4] as (
                c: any,
            ) => Promise<void>;
            await gate(app);
            expect(waitForHealthySpy).toHaveBeenCalledTimes(1);
            expect(waitForHealthySpy.mock.calls[0][0]).toEqual({ name: 'app' });
            // worker is nobody's healthy dependency: no wait
            await gate(worker);
            expect(waitForHealthySpy).toHaveBeenCalledTimes(1);
            transactionSpy.mockRestore();
        });

        test('recreate=false runs no failure hooks and emits no failure event when the rewrite fails', async () => {
            dockercompose.configuration.recreate = false;
            dockercompose.rewriteComposeFile = jest
                .fn()
                .mockRejectedValue(new Error('disk full'));
            const failureHookSpy = jest
                .spyOn(HookManager, 'runFailureHooks')
                .mockResolvedValue(undefined);

            await expect(
                dockercompose.processComposeFile('/path/compose.yml', [app]),
            ).rejects.toThrow('disk full');

            expect(failureHookSpy).not.toHaveBeenCalled();
            expect(failureEventSpy).not.toHaveBeenCalled();
            expect(superTriggerSpy).not.toHaveBeenCalled();
            failureHookSpy.mockRestore();
        });

        test('recreate=false rewrites the compose file atomically and stops', async () => {
            dockercompose.configuration.recreate = false;
            dockercompose.configuration.backup = true;

            await dockercompose.processComposeFile('/path/compose.yml', [
                app,
                db,
            ]);

            expect(dockercompose.backup).toHaveBeenCalledWith(
                '/path/compose.yml',
                '/path/compose.yml.back',
            );
            expect(dockercompose.rewriteComposeFile).toHaveBeenCalledTimes(1);
            expect(dockercompose.rewriteComposeFile).toHaveBeenCalledWith(
                '/path/compose.yml',
                expect.arrayContaining([
                    expect.objectContaining({
                        service: 'app',
                        update: 'test/app:2.0.0',
                    }),
                    expect.objectContaining({
                        service: 'db',
                        update: 'test/db:2.0.0',
                    }),
                ]),
            );
            expect(dockercompose.writeComposeFile).not.toHaveBeenCalled();

            expect(superTriggerSpy).not.toHaveBeenCalled();
            expect(preHookSpy).not.toHaveBeenCalled();
            expect(postHookSpy).not.toHaveBeenCalled();
            expect(preEventSpy).not.toHaveBeenCalled();
            expect(successEventSpy).not.toHaveBeenCalled();
        });

        test('recreate=false does not touch the file or its backup when nothing changes in it', async () => {
            dockercompose.configuration.recreate = false;
            dockercompose.configuration.backup = true;
            // digest update behind a floating tag: the compose file keeps the same reference
            const floating = {
                ...makeContainer('db', 'test/db'),
                image: {
                    ...db.image,
                    tag: { value: '1.0.0', semver: false },
                    digest: { watch: true, value: 'sha256:old' },
                },
                updateKind: {
                    kind: 'digest',
                    localValue: 'sha256:old',
                    remoteValue: 'sha256:new',
                },
                result: { tag: '1.0.0', digest: 'sha256:new' },
            };

            await dockercompose.processComposeFile('/path/compose.yml', [
                floating,
            ]);

            expect(dockercompose.backup).not.toHaveBeenCalled();
            expect(dockercompose.rewriteComposeFile).not.toHaveBeenCalled();
            expect(superTriggerSpy).not.toHaveBeenCalled();
        });

        test('recreate=false takes precedence over rollback', async () => {
            const rollback = require('./rollback');
            const transactionSpy = jest.spyOn(
                rollback,
                'performProjectTransaction',
            );
            dockercompose.configuration.recreate = false;
            dockercompose.configuration.rollback = true;

            await dockercompose.processComposeFile('/path/compose.yml', [app]);

            expect(transactionSpy).not.toHaveBeenCalled();
            expect(dockercompose.rewriteComposeFile).toHaveBeenCalledTimes(1);
            expect(superTriggerSpy).not.toHaveBeenCalled();
            transactionSpy.mockRestore();
        });

        test('recreate=false with dry-run neither writes nor pulls', async () => {
            dockercompose.configuration.recreate = false;
            dockercompose.configuration.dryrun = true;

            await dockercompose.processComposeFile('/path/compose.yml', [app]);

            expect(dockercompose.backup).not.toHaveBeenCalled();
            expect(dockercompose.rewriteComposeFile).not.toHaveBeenCalled();
            expect(dockercompose.writeComposeFile).not.toHaveBeenCalled();
            expect(superTriggerSpy).not.toHaveBeenCalled();
            expect(preEventSpy).not.toHaveBeenCalled();
        });
    });

    test('validateConfiguration defaults recreate to true and accepts false', () => {
        expect(
            dockercompose.validateConfiguration(configurationValid).recreate,
        ).toBe(true);
        expect(
            dockercompose.validateConfiguration({
                ...configurationValid,
                recreate: false,
            }).recreate,
        ).toBe(false);
        expect(
            dockercompose.validateConfiguration({
                ...configurationValid,
                recreate: 'false',
            } as any).recreate,
        ).toBe(false);
    });
});

describe('Upstream image tracking (#664)', () => {
    const upstreamContainer = {
        ...container,
        name: 'caddy',
        image: {
            ...container.image,
            upstream: {
                ref: 'caddy',
                source: 'label',
                name: 'library/caddy',
                registry: { name: 'hub', url: 'https://hub' },
                tag: '1.2.3',
            },
        },
    };

    test('trigger should refuse a container tracking an upstream image', async () => {
        const triggerBatchSpy = jest.spyOn(dockercompose, 'triggerBatch');
        await expect(
            dockercompose.trigger(upstreamContainer as any),
        ).rejects.toThrow(/tracks upstream image caddy/);
        expect(triggerBatchSpy).not.toHaveBeenCalled();
        triggerBatchSpy.mockRestore();
    });

    test('triggerBatch should skip containers tracking an upstream image', async () => {
        dockercompose.processComposeFile = jest.fn();
        dockercompose.getWatcher = jest.fn().mockReturnValue({
            dockerApi: { modem: { socketPath: '/var/run/docker.sock' } },
        });
        await expect(
            dockercompose.triggerBatch([upstreamContainer as any]),
        ).resolves.toBeUndefined();
        expect(dockercompose.processComposeFile).not.toHaveBeenCalled();
    });
});
