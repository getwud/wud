// @ts-nocheck
import axios from 'axios';
import cron from 'node-cron';
import {
    Nomad,
    isTaskToWatch,
    buildContainerId,
    extractDigestFromImage,
    isTaskImageChanged,
} from './Nomad';
import { getMetaValue } from './annotation';
import * as event from '../../../event';
import * as storeContainer from '../../../store/container';
import * as registry from '../../../registry';

jest.mock('axios');
jest.mock('node-cron', () => ({
    schedule: jest.fn().mockReturnValue({ stop: jest.fn() }),
}));
jest.mock('../../../event');
jest.mock('../../../store/container');
jest.mock('../../../registry');
jest.mock('../../../prometheus/watcher');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Nomad Watcher - Pure Helpers', () => {
    test('isTaskToWatch should correctly evaluate watch metadata and defaults', () => {
        expect(isTaskToWatch(undefined, true)).toBe(true);
        expect(isTaskToWatch(undefined, false)).toBe(false);
        expect(isTaskToWatch('', true)).toBe(true);
        expect(isTaskToWatch('true', false)).toBe(true);
        expect(isTaskToWatch('TRUE', false)).toBe(true);
        expect(isTaskToWatch('false', true)).toBe(false);
        expect(isTaskToWatch('FALSE', true)).toBe(false);
    });

    test('buildContainerId should format and sanitize container id', () => {
        expect(
            buildContainerId('default', 'web-app', 'frontend', 'nginx'),
        ).toBe('default_web-app_frontend_nginx');
        expect(buildContainerId('Prod', 'My.Job', 'Group 1', 'Task.A')).toBe(
            'prod_my_job_group_1_task_a',
        );
    });

    test('extractDigestFromImage should extract sha256 digest when present', () => {
        expect(
            extractDigestFromImage(
                'redis@sha256:71036ef607f095995cc5b0c41f6236b020b727d8592c5252c3370a8030006846',
            ),
        ).toBe(
            'sha256:71036ef607f095995cc5b0c41f6236b020b727d8592c5252c3370a8030006846',
        );
        expect(
            extractDigestFromImage(
                'nginx:1.27@sha256:abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
            ),
        ).toBe(
            'sha256:abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
        );
        expect(extractDigestFromImage('nginx:1.27')).toBeUndefined();
        expect(extractDigestFromImage('')).toBeUndefined();
    });

    describe('isTaskImageChanged', () => {
        test('should return true when image id differs', () => {
            const container = {
                image: {
                    id: 'nginx:1.20',
                    tag: { value: '1.20', semver: true },
                },
            };
            expect(isTaskImageChanged(container as any, 'nginx:1.21')).toBe(
                true,
            );
        });

        test('should return true when tag differs', () => {
            const container = {
                image: {
                    id: 'nginx:latest',
                    tag: { value: 'latest', semver: false },
                },
            };
            expect(
                isTaskImageChanged(container as any, 'nginx:1.20', '1.20'),
            ).toBe(true);
        });

        test('should return true when pinned digest differs', () => {
            const container = {
                image: {
                    id: 'nginx:latest@sha256:old',
                    tag: { value: 'latest', semver: false },
                    digest: { repo: 'sha256:old', value: 'sha256:old' },
                },
            };
            expect(
                isTaskImageChanged(container as any, 'nginx:latest@sha256:new'),
            ).toBe(true);
        });

        test('should return false when image spec is identical', () => {
            const container = {
                image: {
                    id: 'nginx:1.20',
                    tag: { value: '1.20', semver: true },
                },
            };
            expect(isTaskImageChanged(container as any, 'nginx:1.20')).toBe(
                false,
            );
        });

        test('should return false when pinned digest is identical', () => {
            const container = {
                image: {
                    id: 'nginx:latest@sha256:abc',
                    tag: { value: 'latest', semver: false },
                    digest: { repo: 'sha256:abc', value: 'sha256:abc' },
                },
            };
            expect(
                isTaskImageChanged(container as any, 'nginx:latest@sha256:abc'),
            ).toBe(false);
        });

        test('should handle image without explicit tag (defaults to latest)', () => {
            const container = {
                image: {
                    id: 'nginx',
                    tag: { value: 'latest', semver: false },
                },
            };
            expect(isTaskImageChanged(container as any, 'nginx')).toBe(false);
            expect(isTaskImageChanged(container as any, 'nginx:1.20')).toBe(
                true,
            );
        });
    });
});

describe('Nomad Watcher - Configuration & Schema', () => {
    let watcher: Nomad;

    beforeEach(() => {
        watcher = new Nomad();
        watcher.log = {
            info: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            child: jest.fn().mockReturnThis(),
        } as any;
    });

    test('should validate default configuration successfully', () => {
        const validated = watcher.validateConfiguration({});
        expect(validated.url).toBe('http://localhost:4646');
        expect(validated.namespace).toBe('*');
        expect(validated.cron).toBe('0 * * * *');
        expect(validated.jitter).toBe(60000);
        expect(validated.watchbydefault).toBe(true);
        expect(validated.watchatstart).toBe(true);
        expect(validated.drivers).toEqual(['docker', 'podman']);
        expect(validated.token).toBe('');
    });

    test('should validate custom configuration successfully', () => {
        const validated = watcher.validateConfiguration({
            url: 'https://nomad.internal:4646',
            token: 'secret-nomad-acl-token',
            namespace: 'production',
            cron: '*/15 * * * *',
            jitter: 10000,
            watchbydefault: false,
            watchdigestdefault: true,
            watchatstart: false,
            drivers: ['docker'],
        });
        expect(validated.url).toBe('https://nomad.internal:4646');
        expect(validated.token).toBe('secret-nomad-acl-token');
        expect(validated.namespace).toBe('production');
        expect(validated.cron).toBe('*/15 * * * *');
        expect(validated.jitter).toBe(10000);
        expect(validated.watchbydefault).toBe(false);
        expect(validated.watchdigestdefault).toBe(true);
        expect(validated.watchatstart).toBe(false);
        expect(validated.drivers).toEqual(['docker']);
    });

    test('should reject invalid configuration', () => {
        expect(() =>
            watcher.validateConfiguration({ url: 'not-a-valid-url' }),
        ).toThrow();
        expect(() =>
            watcher.validateConfiguration({ cron: 'invalid-cron-string' }),
        ).toThrow();
        expect(() => watcher.validateConfiguration({ jitter: -5 })).toThrow();
    });

    test('should mask sensitive token in configuration', () => {
        const masked = watcher.maskConfiguration({
            url: 'http://localhost:4646',
            token: 'secret-acl-token',
        });
        expect(masked.token).not.toBe('secret-acl-token');
        expect(masked.token).toContain('*');
    });
});

describe('Nomad Watcher - Lifecycle & Client Init', () => {
    let watcher: Nomad;

    beforeEach(() => {
        jest.clearAllMocks();
        watcher = new Nomad();
        watcher.log = {
            info: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            child: jest.fn().mockReturnThis(),
        } as any;
        watcher.configuration = watcher.validateConfiguration({
            token: 'my-token',
        }) as any;
        mockedAxios.create.mockReturnValue({
            get: jest.fn(),
            post: jest.fn(),
        } as any);
    });

    test('init should create axios client with Nomad token and schedule cron', async () => {
        (storeContainer.getContainers as jest.Mock).mockReturnValue([]);
        await watcher.init();

        expect(mockedAxios.create).toHaveBeenCalledWith(
            expect.objectContaining({
                baseURL: 'http://localhost:4646',
                headers: { 'X-Nomad-Token': 'my-token' },
                timeout: 10000,
            }),
        );
        expect(cron.schedule).toHaveBeenCalledWith(
            '0 * * * *',
            expect.any(Function),
            { maxRandomDelay: 60000 },
        );
        expect(watcher.watchCronTimeout).toBeDefined();

        await watcher.deregisterComponent();
        expect(watcher.watchCron).toBeUndefined();
    });
});

describe('Nomad Watcher - Discovery & Workload Mapping', () => {
    let watcher: Nomad;
    let mockClient: any;

    beforeEach(() => {
        jest.clearAllMocks();
        watcher = new Nomad();
        watcher.name = 'nomad_test';
        watcher.type = 'nomad';
        watcher.log = {
            info: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            child: jest.fn().mockReturnThis(),
        } as any;
        watcher.configuration = watcher.validateConfiguration({}) as any;

        mockClient = {
            get: jest.fn(),
            post: jest.fn(),
        };
        watcher.apiClient = mockClient;

        (registry.getState as jest.Mock).mockReturnValue({
            registry: {
                hub: {
                    getId: () => 'hub',
                    match: (url: string) => url.includes('docker.io'),
                    normalizeImage: (img: any) => img,
                },
            },
        });
        (storeContainer.getContainers as jest.Mock).mockReturnValue([]);
        (storeContainer.getContainer as jest.Mock).mockReturnValue(undefined);
    });

    test('getClusterArchitecture should resolve kernel.arch from Nomad nodes', async () => {
        mockClient.get.mockImplementation((url: string) => {
            if (url === '/v1/nodes') {
                return Promise.resolve({ data: [{ ID: 'node-1' }] });
            }
            if (url === '/v1/node/node-1') {
                return Promise.resolve({
                    data: {
                        Attributes: { 'kernel.arch': 'x86_64' },
                    },
                });
            }
            return Promise.reject(new Error('not found'));
        });

        const arch = await watcher.getClusterArchitecture();
        expect(arch).toBe('amd64');
    });

    test('getClusterArchitecture should fallback to amd64 when nodes query fails', async () => {
        mockClient.get.mockRejectedValue(new Error('Network error'));
        const arch = await watcher.getClusterArchitecture();
        expect(arch).toBe('amd64');
    });

    test('listJobs should fetch active jobs and their full definitions', async () => {
        mockClient.get.mockImplementation((url: string) => {
            if (url.startsWith('/v1/jobs')) {
                return Promise.resolve({
                    data: [
                        {
                            ID: 'job-running',
                            Name: 'job-running',
                            Namespace: 'default',
                            Status: 'running',
                            Stop: false,
                        },
                        {
                            ID: 'job-dead',
                            Name: 'job-dead',
                            Namespace: 'default',
                            Status: 'dead',
                            Stop: true,
                        },
                    ],
                });
            }
            if (url.startsWith('/v1/job/job-running')) {
                return Promise.resolve({
                    data: {
                        ID: 'job-running',
                        Name: 'job-running',
                        Namespace: 'default',
                        TaskGroups: [
                            {
                                Name: 'web',
                                Tasks: [
                                    {
                                        Name: 'server',
                                        Driver: 'docker',
                                        Config: { image: 'nginx:1.27.0' },
                                    },
                                ],
                            },
                        ],
                    },
                });
            }
            return Promise.reject(new Error('Not found'));
        });

        const jobs = await watcher.listJobs();
        expect(jobs).toHaveLength(1);
        expect(jobs[0].ID).toBe('job-running');
    });

    test('getContainers should map Nomad tasks into WUD Container objects', async () => {
        mockClient.get.mockImplementation((url: string) => {
            if (url === '/v1/nodes') {
                return Promise.resolve({ data: [] });
            }
            if (url.startsWith('/v1/jobs')) {
                return Promise.resolve({
                    data: [
                        {
                            ID: 'my-service',
                            Name: 'my-service',
                            Namespace: 'default',
                            Status: 'running',
                            Stop: false,
                        },
                    ],
                });
            }
            if (url.startsWith('/v1/job/my-service')) {
                return Promise.resolve({
                    data: {
                        ID: 'my-service',
                        Name: 'my-service',
                        Namespace: 'default',
                        Meta: {
                            'wud.stack': 'custom-stack',
                            'wud.tag.include': '^1\\.',
                        },
                        TaskGroups: [
                            {
                                Name: 'backend',
                                Tasks: [
                                    {
                                        Name: 'app',
                                        Driver: 'docker',
                                        Config: { image: 'redis:7.2.4' },
                                        Meta: {
                                            'wud.display.name': 'My Redis',
                                        },
                                    },
                                    {
                                        Name: 'non-docker',
                                        Driver: 'exec',
                                        Config: { command: '/bin/bash' },
                                    },
                                ],
                            },
                        ],
                    },
                });
            }
            return Promise.reject(new Error('Unknown URL'));
        });

        const containers = await watcher.getContainers();
        expect(containers).toHaveLength(1);

        const redisContainer = containers[0];
        expect(redisContainer.id).toBe('default_my-service_backend_app');
        expect(redisContainer.displayName).toBe('My Redis');
        expect(redisContainer.displayIcon).toBe('cib:nomad');
        expect(redisContainer.stack).toBe('custom-stack');
        expect(redisContainer.includeTags).toBe('^1\\.');
        expect(redisContainer.image.name).toBe('redis');
        expect(redisContainer.image.tag.value).toBe('7.2.4');
        expect(redisContainer.image.tag.semver).toBe(true);
        expect(redisContainer.watcher).toBe('nomad_test');
    });

    test('getContainers should respect wud.watch.digest=true for semver tag', async () => {
        mockClient.get.mockImplementation((url: string) => {
            if (url === '/v1/nodes') return Promise.resolve({ data: [] });
            if (url.startsWith('/v1/jobs')) {
                return Promise.resolve({
                    data: [
                        {
                            ID: 'digest-job',
                            Name: 'digest-job',
                            Namespace: 'default',
                            Status: 'running',
                            Stop: false,
                        },
                    ],
                });
            }
            if (url.startsWith('/v1/job/digest-job')) {
                return Promise.resolve({
                    data: {
                        ID: 'digest-job',
                        Name: 'digest-job',
                        Namespace: 'default',
                        TaskGroups: [
                            {
                                Name: 'backend',
                                Tasks: [
                                    {
                                        Name: 'app',
                                        Driver: 'docker',
                                        Config: {
                                            image: 'ghcr.io/immich-app/immich-server:v3',
                                        },
                                        Meta: {
                                            'wud.watch.digest': 'true',
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                });
            }
            return Promise.reject(new Error('Unknown URL'));
        });

        const containers = await watcher.getContainers();
        expect(containers).toHaveLength(1);
        expect(containers[0].image.tag.semver).toBe(true);
        expect(containers[0].image.digest.watch).toBe(true);
    });

    test('getContainers should respect wud.watch=false override', async () => {
        mockClient.get.mockImplementation((url: string) => {
            if (url === '/v1/nodes') return Promise.resolve({ data: [] });
            if (url.startsWith('/v1/jobs')) {
                return Promise.resolve({
                    data: [
                        {
                            ID: 'ignored-job',
                            Name: 'ignored-job',
                            Namespace: 'default',
                            Status: 'running',
                            Stop: false,
                        },
                    ],
                });
            }
            if (url.startsWith('/v1/job/ignored-job')) {
                return Promise.resolve({
                    data: {
                        ID: 'ignored-job',
                        Name: 'ignored-job',
                        Namespace: 'default',
                        Meta: { 'wud.watch': 'false' },
                        TaskGroups: [
                            {
                                Name: 'grp',
                                Tasks: [
                                    {
                                        Name: 'task1',
                                        Driver: 'docker',
                                        Config: { image: 'alpine:3.19' },
                                    },
                                ],
                            },
                        ],
                    },
                });
            }
            return Promise.reject(new Error('Unknown URL'));
        });

        const containers = await watcher.getContainers();
        expect(containers).toHaveLength(0);
    });

    test('getContainers should prune old containers no longer watched', async () => {
        mockClient.get.mockImplementation((url: string) => {
            if (url === '/v1/nodes') return Promise.resolve({ data: [] });
            if (url.startsWith('/v1/jobs'))
                return Promise.resolve({ data: [] });
            return Promise.reject(new Error('Unknown URL'));
        });

        (storeContainer.getContainers as jest.Mock).mockReturnValue([
            { id: 'old_container_1', watcher: 'nomad_test' },
        ]);

        await watcher.getContainers();
        expect(storeContainer.deleteContainer).toHaveBeenCalledWith(
            'old_container_1',
        );
    });
});

describe('Nomad Watcher - Version Lookup & Watch Cycle', () => {
    let watcher: Nomad;

    beforeEach(() => {
        jest.clearAllMocks();
        watcher = new Nomad();
        watcher.name = 'nomad_test';
        watcher.log = {
            info: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            child: jest.fn().mockReturnThis(),
        } as any;
        watcher.configuration = watcher.validateConfiguration({}) as any;
    });

    test('findNewVersion should query registry and return candidate version', async () => {
        const mockRegistry = {
            getId: () => 'hub',
            getTags: jest
                .fn()
                .mockResolvedValue(['1.26.0', '1.27.0', '1.28.0']),
            shouldWatchDigest: jest.fn().mockReturnValue(false),
        };

        (registry.getState as jest.Mock).mockReturnValue({
            registry: { hub: mockRegistry },
        });

        const container: any = {
            id: 'test_id',
            image: {
                registry: { name: 'hub', url: 'registry-1.docker.io' },
                name: 'library/nginx',
                tag: { value: '1.26.0', semver: true },
                digest: { watch: false },
            },
        };

        const result = await watcher.findNewVersion(container, watcher.log);
        expect(result.tag).toBe('1.28.0');
    });

    test('findNewVersion should watch digest for semver tag when wud.watch.digest is true', async () => {
        const mockRegistry = {
            getId: () => 'hub',
            getTags: jest.fn().mockResolvedValue(['v3']),
            getImageManifestDigest: jest.fn().mockResolvedValue({
                digest: 'sha256:remote-digest-123',
                created: '2023-01-01',
                version: 2,
            }),
            shouldWatchDigest: jest.fn().mockReturnValue(true),
        };

        (registry.getState as jest.Mock).mockReturnValue({
            registry: { hub: mockRegistry },
        });

        const container: any = {
            id: 'test_id',
            labels: { 'wud.watch.digest': 'true' },
            image: {
                registry: { name: 'hub', url: 'registry-1.docker.io' },
                name: 'library/nginx',
                tag: { value: 'v3', semver: true },
                digest: { watch: true, repo: 'sha256:local-digest-123' },
            },
        };

        const result = await watcher.findNewVersion(container, watcher.log);
        expect(mockRegistry.getImageManifestDigest).toHaveBeenCalled();
        expect(result.digest).toBe('sha256:remote-digest-123');
    });

    test('findNewVersion should watch digest for stored non-semver container with digest.watch=false when registry shouldWatchDigest is true (fixes #1337)', async () => {
        const mockRegistry = {
            getId: () => 'hub',
            getTags: jest.fn().mockResolvedValue(['latest']),
            getImageManifestDigest: jest.fn().mockResolvedValue({
                digest: 'sha256:remote-digest-456',
                created: '2023-01-01',
                version: 2,
            }),
            shouldWatchDigest: jest.fn().mockReturnValue(true),
        };

        (registry.getState as jest.Mock).mockReturnValue({
            registry: { hub: mockRegistry },
        });

        const container: any = {
            id: 'nomad_default_job1_group1_firefly',
            labels: {},
            image: {
                registry: { name: 'hub', url: 'registry-1.docker.io' },
                name: 'fireflyiii/core',
                tag: { value: 'latest', semver: false },
                digest: { watch: false, repo: 'sha256:local-digest-123' },
            },
        };

        const result = await watcher.findNewVersion(container, watcher.log);
        expect(mockRegistry.shouldWatchDigest).toHaveBeenCalled();
        expect(mockRegistry.getImageManifestDigest).toHaveBeenCalled();
        expect(result.digest).toBe('sha256:remote-digest-456');
        expect(container.image.digest.watch).toBe(true);
    });

    test('findNewVersion should respect meta watch.digest=false over registry shouldWatchDigest=true (fixes #1337)', async () => {
        const mockRegistry = {
            getId: () => 'hub',
            getTags: jest.fn().mockResolvedValue(['latest']),
            getImageManifestDigest: jest.fn(),
            shouldWatchDigest: jest.fn().mockReturnValue(true),
        };

        (registry.getState as jest.Mock).mockReturnValue({
            registry: { hub: mockRegistry },
        });

        const container: any = {
            id: 'nomad_default_job1_group1_firefly',
            labels: { 'wud.watch.digest': 'false' },
            image: {
                registry: { name: 'hub', url: 'registry-1.docker.io' },
                name: 'fireflyiii/core',
                tag: { value: 'latest', semver: false },
                digest: { watch: true, repo: 'sha256:local-digest-123' },
            },
        };

        const result = await watcher.findNewVersion(container, watcher.log);
        expect(mockRegistry.getImageManifestDigest).not.toHaveBeenCalled();
        expect(result.digest).toBeUndefined();
        expect(container.image.digest.watch).toBe(false);
    });

    test('mapTaskToWudContainer should update container watcher in store when watcher name changed', async () => {
        const existing = {
            id: 'nomad_default_job1_group1_task1',
            name: 'task1',
            watcher: 'old-nomad',
            image: {
                id: 'nginx:1.0.0',
                tag: { value: '1.0.0', semver: true },
                registry: { name: 'hub' },
            },
            result: { tag: '2.0.0' },
            error: undefined,
        } as any;
        (storeContainer.getContainer as jest.Mock).mockReturnValue(existing);
        const job = { Name: 'job1', Meta: {} };
        const group = { Name: 'group1', Meta: {} };
        const task = {
            Name: 'task1',
            Meta: {},
            Config: { image: 'nginx:1.0.0' },
        };

        const result = await watcher.mapNomadTaskToWudContainer({
            job: job as any,
            group: group as any,
            task: task as any,
            namespace: 'default',
            imageName: 'nginx:1.0.0',
            mergedMeta: {},
            architecture: 'amd64',
        });

        expect(result.watcher).toBe('nomad_test');
        expect(storeContainer.updateContainer).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'nomad_default_job1_group1_task1',
                watcher: 'nomad_test',
            }),
        );
    });

    test('watchContainer should record errors gracefully when registry fails', async () => {
        (registry.getState as jest.Mock).mockReturnValue({
            registry: {},
        });

        const container: any = {
            id: 'test_id',
            image: {
                registry: { name: 'nonexistent', url: 'example.com' },
                name: 'app',
                tag: { value: '1.0.0', semver: true },
                digest: { watch: false },
            },
        };

        (storeContainer.getContainer as jest.Mock).mockReturnValue(undefined);
        (storeContainer.insertContainer as jest.Mock).mockImplementation(
            (c) => c,
        );

        const report = await watcher.watchContainer(container);
        expect(report.container.error).toBeDefined();
        expect(report.container.error.message).toContain(
            'Unsupported registry',
        );
        expect(event.emitContainerReport).toHaveBeenCalledWith(report);
    });

    test('watch should run cycle, emit events and return container reports', async () => {
        const mockContainers = [
            {
                id: 'cont1',
                image: {
                    registry: { name: 'hub' },
                    name: 'nginx',
                    tag: { value: '1.0.0', semver: true },
                    digest: {},
                },
            },
        ];

        jest.spyOn(watcher, 'getContainers').mockResolvedValue(
            mockContainers as any,
        );
        jest.spyOn(watcher, 'watchContainer').mockResolvedValue({
            container: mockContainers[0],
            changed: true,
        } as any);

        const reports = await watcher.watch();
        expect(event.emitWatcherStart).toHaveBeenCalledWith(watcher);
        expect(event.emitContainerReports).toHaveBeenCalledWith(reports);
        expect(event.emitWatcherStop).toHaveBeenCalledWith(watcher);
        expect(reports).toHaveLength(1);
    });
});

describe('Nomad getMetaValue helper', () => {
    test('resolves canonical getwud.app/ prefix with highest priority', () => {
        const meta = {
            'getwud.app/watch': 'true',
            'wud.watch': 'false',
        };
        expect(getMetaValue(meta, 'watch')).toBe('true');
    });

    test('resolves idiomatic wud. prefix', () => {
        const meta = {
            'wud.tag.include': '^1\\.0',
        };
        expect(getMetaValue(meta, 'tag.include')).toBe('^1\\.0');
    });

    test('resolves wud/ slash prefix', () => {
        const meta = {
            'wud/display.name': 'App Name',
        };
        expect(getMetaValue(meta, 'display.name')).toBe('App Name');
    });

    test('resolves legacy wud.getwud.io/ prefix', () => {
        const meta = {
            'wud.getwud.io/display.icon': 'mdi:docker',
        };
        expect(getMetaValue(meta, 'display.icon')).toBe('mdi:docker');
    });

    test('respects per-task override across prefixes', () => {
        const meta = {
            'getwud.app/display.name': 'Global Name',
            'wud.display.name.task1': 'Task 1 Specific Name',
        };
        expect(getMetaValue(meta, 'display.name', undefined, 'task1')).toBe(
            'Task 1 Specific Name',
        );
        expect(getMetaValue(meta, 'display.name', undefined, 'task2')).toBe(
            'Global Name',
        );
    });

    test('returns undefined when meta is undefined or key not present', () => {
        expect(getMetaValue(undefined, 'watch')).toBeUndefined();
        expect(getMetaValue({}, 'watch')).toBeUndefined();
    });
});

describe('Nomad Watcher - Task Image Change Detection (fixes #1341)', () => {
    let watcher: Nomad;
    let mockClient: any;

    beforeEach(() => {
        watcher = new Nomad();
        watcher.log = {
            info: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            child: jest.fn().mockReturnThis(),
        } as any;
        watcher.name = 'nomad_test';
        watcher.configuration = watcher.validateConfiguration({}) as any;

        mockClient = {
            get: jest.fn(),
        };
        watcher.apiClient = mockClient;

        (registry.getState as jest.Mock).mockReturnValue({
            registry: {
                hub: {
                    getId: () => 'hub',
                    match: () => true,
                    normalizeImage: (img: any) => img,
                    shouldWatchDigest: () => false,
                },
            },
        });
        (storeContainer.getContainers as jest.Mock).mockReturnValue([]);
    });

    test('should re-evaluate container when task image changes to a new tag', async () => {
        mockClient.get.mockImplementation((url: string) => {
            if (url === '/v1/nodes') return Promise.resolve({ data: [] });
            if (url.startsWith('/v1/jobs')) {
                return Promise.resolve({
                    data: [
                        {
                            ID: 'web',
                            Name: 'web',
                            Namespace: 'default',
                            Status: 'running',
                            Stop: false,
                        },
                    ],
                });
            }
            if (url.startsWith('/v1/job/web')) {
                return Promise.resolve({
                    data: {
                        ID: 'web',
                        Name: 'web',
                        Namespace: 'default',
                        TaskGroups: [
                            {
                                Name: 'group1',
                                Tasks: [
                                    {
                                        Name: 'app',
                                        Driver: 'docker',
                                        Config: { image: 'nginx:1.27.1' },
                                    },
                                ],
                            },
                        ],
                    },
                });
            }
            return Promise.reject(new Error('Unknown URL'));
        });

        const existing = {
            id: 'default_web_group1_app',
            name: 'default_web_group1_app',
            watcher: 'nomad_test',
            image: {
                id: 'nginx:1.27.0',
                name: 'nginx',
                tag: { value: '1.27.0', semver: true },
                registry: { name: 'hub', url: 'registry-1.docker.io' },
            },
            result: { tag: '1.27.0' },
            error: undefined,
        };
        (storeContainer.getContainer as jest.Mock).mockReturnValue(existing);

        const containers = await watcher.getContainers();
        expect(containers).toHaveLength(1);
        expect(containers[0].image.tag.value).toBe('1.27.1');
        expect(containers[0].image.id).toBe('nginx:1.27.1');
        expect(watcher.log.info).toHaveBeenCalledWith(
            'Container default_web_group1_app image changed, re-evaluating container',
        );
    });

    test('should re-evaluate container when task image digest changes', async () => {
        mockClient.get.mockImplementation((url: string) => {
            if (url === '/v1/nodes') return Promise.resolve({ data: [] });
            if (url.startsWith('/v1/jobs')) {
                return Promise.resolve({
                    data: [
                        {
                            ID: 'web',
                            Name: 'web',
                            Namespace: 'default',
                            Status: 'running',
                            Stop: false,
                        },
                    ],
                });
            }
            if (url.startsWith('/v1/job/web')) {
                return Promise.resolve({
                    data: {
                        ID: 'web',
                        Name: 'web',
                        Namespace: 'default',
                        TaskGroups: [
                            {
                                Name: 'group1',
                                Tasks: [
                                    {
                                        Name: 'app',
                                        Driver: 'docker',
                                        Config: {
                                            image: 'nginx:latest@sha256:repulled',
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                });
            }
            return Promise.reject(new Error('Unknown URL'));
        });

        const existing = {
            id: 'default_web_group1_app',
            name: 'default_web_group1_app',
            watcher: 'nomad_test',
            image: {
                id: 'nginx:latest@sha256:old',
                name: 'nginx',
                tag: { value: 'latest', semver: false },
                registry: { name: 'hub', url: 'registry-1.docker.io' },
                digest: { repo: 'sha256:old', value: 'sha256:old' },
            },
            result: { tag: 'latest' },
            error: undefined,
        };
        (storeContainer.getContainer as jest.Mock).mockReturnValue(existing);

        const containers = await watcher.getContainers();
        expect(containers).toHaveLength(1);
        expect(containers[0].image.id).toBe('nginx:latest@sha256:repulled');
        expect(containers[0].image.digest.repo).toBe('sha256:repulled');
    });

    test('should re-evaluate container when tag changes but digest is unchanged', async () => {
        mockClient.get.mockImplementation((url: string) => {
            if (url === '/v1/nodes') return Promise.resolve({ data: [] });
            if (url.startsWith('/v1/jobs')) {
                return Promise.resolve({
                    data: [
                        {
                            ID: 'db',
                            Name: 'db',
                            Namespace: 'default',
                            Status: 'running',
                            Stop: false,
                        },
                    ],
                });
            }
            if (url.startsWith('/v1/job/db')) {
                return Promise.resolve({
                    data: {
                        ID: 'db',
                        Name: 'db',
                        Namespace: 'default',
                        TaskGroups: [
                            {
                                Name: 'group1',
                                Tasks: [
                                    {
                                        Name: 'db',
                                        Driver: 'docker',
                                        Config: {
                                            image: 'postgres:16.4@sha256:same',
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                });
            }
            return Promise.reject(new Error('Unknown URL'));
        });

        const existing = {
            id: 'default_db_group1_db',
            name: 'default_db_group1_db',
            watcher: 'nomad_test',
            image: {
                id: 'postgres:16@sha256:same',
                name: 'postgres',
                tag: { value: '16', semver: false },
                registry: { name: 'hub', url: 'registry-1.docker.io' },
                digest: { repo: 'sha256:same', value: 'sha256:same' },
            },
            result: { tag: '16' },
            error: undefined,
        };
        (storeContainer.getContainer as jest.Mock).mockReturnValue(existing);

        const containers = await watcher.getContainers();
        expect(containers).toHaveLength(1);
        expect(containers[0].image.tag.value).toBe('16.4');
        expect(containers[0].image.id).toBe('postgres:16.4@sha256:same');
    });

    test('should preserve snooze state and result when task image changes', async () => {
        mockClient.get.mockImplementation((url: string) => {
            if (url === '/v1/nodes') return Promise.resolve({ data: [] });
            if (url.startsWith('/v1/jobs')) {
                return Promise.resolve({
                    data: [
                        {
                            ID: 'web',
                            Name: 'web',
                            Namespace: 'default',
                            Status: 'running',
                            Stop: false,
                        },
                    ],
                });
            }
            if (url.startsWith('/v1/job/web')) {
                return Promise.resolve({
                    data: {
                        ID: 'web',
                        Name: 'web',
                        Namespace: 'default',
                        TaskGroups: [
                            {
                                Name: 'group1',
                                Tasks: [
                                    {
                                        Name: 'app',
                                        Driver: 'docker',
                                        Config: { image: 'nginx:1.27.1' },
                                    },
                                ],
                            },
                        ],
                    },
                });
            }
            return Promise.reject(new Error('Unknown URL'));
        });

        const snoozedUntil = Date.UTC(2099, 0, 1);
        const existing = {
            id: 'default_web_group1_app',
            name: 'default_web_group1_app',
            watcher: 'nomad_test',
            image: {
                id: 'nginx:1.27.0',
                name: 'nginx',
                tag: { value: '1.27.0', semver: true },
                registry: { name: 'hub', url: 'registry-1.docker.io' },
            },
            snoozedVersion: '1.28.0',
            snoozedUntil,
            result: { tag: '1.28.0' },
            error: undefined,
        };
        (storeContainer.getContainer as jest.Mock).mockReturnValue(existing);

        const containers = await watcher.getContainers();
        expect(containers).toHaveLength(1);
        expect(containers[0].image.tag.value).toBe('1.27.1');
        expect(containers[0].snoozedVersion).toBe('1.28.0');
        expect(containers[0].snoozedUntil).toBe(snoozedUntil);
        expect(containers[0].result).toEqual({ tag: '1.28.0' });
    });

    test('should reuse store entry when task image is unchanged', async () => {
        mockClient.get.mockImplementation((url: string) => {
            if (url === '/v1/nodes') return Promise.resolve({ data: [] });
            if (url.startsWith('/v1/jobs')) {
                return Promise.resolve({
                    data: [
                        {
                            ID: 'web',
                            Name: 'web',
                            Namespace: 'default',
                            Status: 'running',
                            Stop: false,
                        },
                    ],
                });
            }
            if (url.startsWith('/v1/job/web')) {
                return Promise.resolve({
                    data: {
                        ID: 'web',
                        Name: 'web',
                        Namespace: 'default',
                        TaskGroups: [
                            {
                                Name: 'group1',
                                Tasks: [
                                    {
                                        Name: 'app',
                                        Driver: 'docker',
                                        Config: { image: 'nginx:1.27.0' },
                                    },
                                ],
                            },
                        ],
                    },
                });
            }
            return Promise.reject(new Error('Unknown URL'));
        });

        const existing = {
            id: 'default_web_group1_app',
            name: 'default_web_group1_app',
            watcher: 'nomad_test',
            image: {
                id: 'nginx:1.27.0',
                name: 'nginx',
                tag: { value: '1.27.0', semver: true },
                registry: { name: 'hub', url: 'registry-1.docker.io' },
            },
            result: { tag: '1.27.0' },
            error: undefined,
        };
        (storeContainer.getContainer as jest.Mock).mockReturnValue(existing);

        const containers = await watcher.getContainers();
        expect(containers).toHaveLength(1);
        expect(containers[0]).toBe(existing);
    });

    test('watch cycle updates container and store when task image changes', async () => {
        let currentImage = 'nginx:1.27.0@sha256:old';
        mockClient.get.mockImplementation((url: string) => {
            if (url === '/v1/nodes') return Promise.resolve({ data: [] });
            if (url.startsWith('/v1/jobs')) {
                return Promise.resolve({
                    data: [
                        {
                            ID: 'web',
                            Name: 'web',
                            Namespace: 'default',
                            Status: 'running',
                            Stop: false,
                        },
                    ],
                });
            }
            if (url.startsWith('/v1/job/web')) {
                return Promise.resolve({
                    data: {
                        ID: 'web',
                        Name: 'web',
                        Namespace: 'default',
                        TaskGroups: [
                            {
                                Name: 'group1',
                                Tasks: [
                                    {
                                        Name: 'app',
                                        Driver: 'docker',
                                        Config: { image: currentImage },
                                    },
                                ],
                            },
                        ],
                    },
                });
            }
            return Promise.reject(new Error('Unknown URL'));
        });

        const mockStore = new Map<string, any>();
        (storeContainer.getContainer as jest.Mock).mockImplementation(
            (id: string) => {
                const c = mockStore.get(id);
                return c ? { ...c, resultChanged: () => false } : undefined;
            },
        );
        (storeContainer.insertContainer as jest.Mock).mockImplementation(
            (c: any) => {
                mockStore.set(c.id, JSON.parse(JSON.stringify(c)));
                return c;
            },
        );
        (storeContainer.updateContainer as jest.Mock).mockImplementation(
            (c: any) => {
                mockStore.set(c.id, JSON.parse(JSON.stringify(c)));
                return c;
            },
        );

        (registry.getState as jest.Mock).mockReturnValue({
            registry: {
                hub: {
                    getId: () => 'hub',
                    match: () => true,
                    normalizeImage: (img: any) => img,
                    shouldWatchDigest: () => false,
                    getTags: jest.fn().mockResolvedValue(['1.27.0', '1.27.1']),
                },
            },
        });

        // First watch cycle: discovers 1.27.0
        let reports = await watcher.watch();
        expect(reports).toHaveLength(1);
        expect(reports[0].container.image.tag.value).toBe('1.27.0');

        // Task updated to 1.27.1
        currentImage = 'nginx:1.27.1@sha256:new';
        reports = await watcher.watch();
        expect(reports).toHaveLength(1);
        expect(reports[0].container.image.tag.value).toBe('1.27.1');
        expect(reports[0].container.image.id).toBe('nginx:1.27.1@sha256:new');
    });
});
