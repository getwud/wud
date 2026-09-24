// @ts-nocheck
import Dockerode from 'dockerode';
import {
    Swarm,
    isServiceToWatch,
    buildContainerId,
    extractDigestFromImage,
} from './Swarm';
import { getLabelValue } from './label';
import * as event from '../../../event';
import * as storeContainer from '../../../store/container';
import * as registry from '../../../registry';

jest.mock('dockerode');
jest.mock('node-cron', () => ({
    schedule: jest.fn().mockReturnValue({ stop: jest.fn() }),
}));
jest.mock('../../../event');
jest.mock('../../../store/container');
jest.mock('../../../registry');
jest.mock('../../../prometheus/watcher');

describe('Swarm Watcher - Pure Helpers', () => {
    test('isServiceToWatch should evaluate watch label and defaults', () => {
        expect(isServiceToWatch(undefined, true)).toBe(true);
        expect(isServiceToWatch(undefined, false)).toBe(false);
        expect(isServiceToWatch('', true)).toBe(true);
        expect(isServiceToWatch('true', false)).toBe(true);
        expect(isServiceToWatch('TRUE', false)).toBe(true);
        expect(isServiceToWatch('false', true)).toBe(false);
        expect(isServiceToWatch('FALSE', true)).toBe(false);
    });

    test('buildContainerId should format container id with and without stack', () => {
        expect(buildContainerId('swarm_test', 'web', 'production')).toBe(
            'swarm_test_production_web',
        );
        expect(buildContainerId('swarm_test', 'web')).toBe('swarm_test_web');
    });

    test('extractDigestFromImage should extract digest when pinned with @sha256', () => {
        expect(
            extractDigestFromImage(
                'nginx:1.27.0@sha256:d9e853e87e55526f6b2917df91a2115c36dd7c696a35be12163d44e6e2a4b6bc',
            ),
        ).toBe(
            'sha256:d9e853e87e55526f6b2917df91a2115c36dd7c696a35be12163d44e6e2a4b6bc',
        );
        expect(extractDigestFromImage('nginx:1.27.0')).toBeUndefined();
        expect(extractDigestFromImage(undefined)).toBeUndefined();
    });

    test('getLabelValue should resolve canonical getwud.app/ and wud.* prefixes', () => {
        const labels = {
            'getwud.app/watch': 'true',
            'wud.tag.include': '^1\\.0',
            'wud/display.name': 'My App',
            'wud.getwud.io/stack': 'prod',
        };
        expect(getLabelValue(labels, 'watch')).toBe('true');
        expect(getLabelValue(labels, 'tag.include')).toBe('^1\\.0');
        expect(getLabelValue(labels, 'display.name')).toBe('My App');
        expect(getLabelValue(labels, 'stack')).toBe('prod');
        expect(getLabelValue(labels, 'nonexistent')).toBeUndefined();
        expect(getLabelValue(undefined, 'watch')).toBeUndefined();
    });
});

describe('Swarm Watcher - Configuration Schema', () => {
    let watcher: Swarm;

    beforeEach(() => {
        watcher = new Swarm();
        watcher.joi = require('joi');
    });

    test('validates default configuration', () => {
        const schema = watcher.getConfigurationSchema();
        const { value, error } = schema.validate({});
        expect(error).toBeUndefined();
        expect(value.socket).toBe('/var/run/docker.sock');
        expect(value.port).toBe(2375);
        expect(value.cron).toBe('0 * * * *');
        expect(value.jitter).toBe(60000);
        expect(value.watchbydefault).toBe(true);
        expect(value.watchatstart).toBe(true);
        expect(value.stacks).toEqual([]);
    });

    test('validates custom configuration with host and stacks', () => {
        const schema = watcher.getConfigurationSchema();
        const { value, error } = schema.validate({
            host: 'swarm-manager.local',
            port: 2376,
            stacks: 'prod, staging',
            watchbydefault: false,
        });
        expect(error).toBeUndefined();
        expect(value.host).toBe('swarm-manager.local');
        expect(value.port).toBe(2376);
        expect(value.stacks).toEqual(['prod', 'staging']);
        expect(value.watchbydefault).toBe(false);
    });

    test('rejects invalid port', () => {
        const schema = watcher.getConfigurationSchema();
        const { error } = schema.validate({ port: 99999 });
        expect(error).toBeDefined();
    });

    test('rejects invalid cron expression', () => {
        const schema = watcher.getConfigurationSchema();
        const { error } = schema.validate({ cron: 'not-a-cron' });
        expect(error).toBeDefined();
    });
});

describe('Swarm Watcher - Service Discovery & Mapping', () => {
    let watcher: Swarm;
    let mockDocker: any;

    beforeEach(async () => {
        jest.clearAllMocks();
        watcher = new Swarm();

        mockDocker = {
            listServices: jest.fn(),
            listNodes: jest.fn().mockResolvedValue([
                {
                    Description: {
                        Platform: {
                            Architecture: 'x86_64',
                            OS: 'linux',
                        },
                    },
                },
            ]),
            info: jest.fn().mockResolvedValue({ Architecture: 'x86_64' }),
        };
        (Dockerode as unknown as jest.Mock).mockImplementation(
            () => mockDocker,
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

        (storeContainer.getContainers as jest.Mock).mockReturnValue([]);
        (storeContainer.getContainer as jest.Mock).mockReturnValue(undefined);

        await watcher.register('watcher', 'swarm', 'test', {
            socket: '/var/run/docker.sock',
            watchbydefault: true,
            watchatstart: false,
        });
    });

    test('should warn and return empty array if node is not a swarm manager', async () => {
        mockDocker.listServices.mockRejectedValue(
            new Error(
                'This node is not a swarm manager. Use "docker swarm init" to connect.',
            ),
        );

        const containers = await watcher.getContainers();
        expect(containers).toEqual([]);
    });

    test('should discover and map Swarm services with stack and labels', async () => {
        mockDocker.listServices.mockResolvedValue([
            {
                ID: 'service_1',
                Spec: {
                    Name: 'prod-stack_web',
                    Labels: {
                        'com.docker.stack.namespace': 'prod-stack',
                        'getwud.app/display.name': 'Production Web',
                        'getwud.app/tag.include': '^1\\.27',
                    },
                    TaskTemplate: {
                        ContainerSpec: {
                            Image: 'nginx:1.27.0@sha256:d9e853e87e55526f6b2917df91a2115c36dd7c696a35be12163d44e6e2a4b6bc',
                        },
                    },
                },
            },
        ]);

        const containers = await watcher.getContainers();
        expect(containers).toHaveLength(1);
        const c = containers[0];
        expect(c.id).toBe('test_prod-stack_prod-stack_web');
        expect(c.name).toBe('prod-stack_web');
        expect(c.stack).toBe('prod-stack');
        expect(c.displayName).toBe('Production Web');
        expect(c.includeTags).toBe('^1\\.27');
        expect(c.image.name).toBe('nginx');
        expect(c.image.tag.value).toBe('1.27.0');
        expect(c.image.tag.semver).toBe(true);
        expect(c.image.digest.repo).toBe(
            'sha256:d9e853e87e55526f6b2917df91a2115c36dd7c696a35be12163d44e6e2a4b6bc',
        );
        expect(c.image.architecture).toBe('amd64');
    });

    test('should respect watch.digest=true for semver tags in getContainers', async () => {
        mockDocker.listServices.mockResolvedValue([
            {
                ID: 'service_digest',
                Spec: {
                    Name: 'immich',
                    Labels: {
                        'getwud.app/watch.digest': 'true',
                    },
                    TaskTemplate: {
                        ContainerSpec: {
                            Image: 'ghcr.io/immich-app/immich-server:v3',
                        },
                    },
                },
            },
        ]);

        const containers = await watcher.getContainers();
        expect(containers).toHaveLength(1);
        expect(containers[0].image.tag.semver).toBe(true);
        expect(containers[0].image.digest.watch).toBe(true);
    });

    test('should filter out services with watch=false', async () => {
        mockDocker.listServices.mockResolvedValue([
            {
                ID: 'service_ignored',
                Spec: {
                    Name: 'ignored_worker',
                    Labels: {
                        'wud.watch': 'false',
                    },
                    TaskTemplate: {
                        ContainerSpec: {
                            Image: 'redis:7.0',
                        },
                    },
                },
            },
        ]);

        const containers = await watcher.getContainers();
        expect(containers).toHaveLength(0);
    });

    test('should respect stacks configuration filter', async () => {
        watcher.configuration.stacks = ['frontend'];

        mockDocker.listServices.mockResolvedValue([
            {
                ID: 'svc_frontend',
                Spec: {
                    Name: 'frontend_web',
                    Labels: {
                        'com.docker.stack.namespace': 'frontend',
                    },
                    TaskTemplate: {
                        ContainerSpec: { Image: 'nginx:1.27' },
                    },
                },
            },
            {
                ID: 'svc_backend',
                Spec: {
                    Name: 'backend_api',
                    Labels: {
                        'com.docker.stack.namespace': 'backend',
                    },
                    TaskTemplate: {
                        ContainerSpec: { Image: 'node:20' },
                    },
                },
            },
        ]);

        const containers = await watcher.getContainers();
        expect(containers).toHaveLength(1);
        expect(containers[0].name).toBe('frontend_web');
    });

    test('should prune removed services from container store', async () => {
        mockDocker.listServices.mockResolvedValue([]);
        (storeContainer.getContainers as jest.Mock).mockReturnValue([
            { id: 'test_old_service', name: 'old_service', watcher: 'test' },
        ]);

        await watcher.getContainers();
        expect(storeContainer.deleteContainer).toHaveBeenCalledWith(
            'test_old_service',
        );
    });
});

describe('Swarm Watcher - Version Lookup & Watch Cycle', () => {
    let watcher: Swarm;

    beforeEach(async () => {
        jest.clearAllMocks();
        watcher = new Swarm();
        await watcher.register('watcher', 'swarm', 'test', {});
    });

    test('watch should run cycle and emit watcher events', async () => {
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
            labels: { 'getwud.app/watch.digest': 'true' },
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

    describe('one-shot mode', () => {
        const originalRunMode = process.env.WUD_RUN_MODE;

        beforeEach(() => {
            process.env.WUD_RUN_MODE = 'oneshot';
        });

        afterEach(() => {
            if (originalRunMode === undefined) {
                delete process.env.WUD_RUN_MODE;
            } else {
                process.env.WUD_RUN_MODE = originalRunMode;
            }
        });

        test('init should disable cron and watchatstart in one-shot mode', async () => {
            const cronMock = require('node-cron');
            cronMock.schedule.mockClear();
            storeContainer.getContainers.mockClear();

            const oneshotWatcher = new Swarm();
            await oneshotWatcher.register('watcher', 'swarm', 'test', {
                cron: '0 * * * *',
                watchatstart: true,
            });

            expect(cronMock.schedule).not.toHaveBeenCalled();
            expect(storeContainer.getContainers).not.toHaveBeenCalled();
            expect(oneshotWatcher.watchCron).toBeUndefined();
            expect(oneshotWatcher.watchCronTimeout).toBeUndefined();
        });

        test('mapContainerToContainerReport should be stateless in one-shot mode', () => {
            storeContainer.getContainer.mockClear();
            storeContainer.insertContainer.mockClear();
            storeContainer.updateContainer.mockClear();

            const containerWithUpdate = {
                id: 'swarm-c1',
                updateAvailable: true,
            };
            const reportWithUpdate =
                watcher.mapContainerToContainerReport(containerWithUpdate);
            expect(reportWithUpdate.container).toBe(containerWithUpdate);
            expect(reportWithUpdate.changed).toBe(true);

            const containerWithoutUpdate = {
                id: 'swarm-c2',
                updateAvailable: false,
            };
            const reportWithoutUpdate = watcher.mapContainerToContainerReport(
                containerWithoutUpdate,
            );
            expect(reportWithoutUpdate.container).toBe(containerWithoutUpdate);
            expect(reportWithoutUpdate.changed).toBe(false);

            expect(storeContainer.getContainer).not.toHaveBeenCalled();
            expect(storeContainer.insertContainer).not.toHaveBeenCalled();
            expect(storeContainer.updateContainer).not.toHaveBeenCalled();
        });

        test('getContainers should not query store or prune in one-shot mode', async () => {
            storeContainer.getContainer.mockClear();
            storeContainer.getContainers.mockClear();
            storeContainer.deleteContainer.mockClear();

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

            watcher.docker = {
                listServices: jest.fn().mockResolvedValue([
                    {
                        ID: 'srv1',
                        Spec: {
                            Name: 'myservice',
                            TaskTemplate: {
                                ContainerSpec: {
                                    Image: 'nginx:1.20',
                                },
                            },
                        },
                    },
                ]),
                listTasks: jest.fn().mockResolvedValue([]),
            };

            const containers = await watcher.getContainers();

            expect(containers).toHaveLength(1);
            expect(storeContainer.getContainer).not.toHaveBeenCalled();
            expect(storeContainer.getContainers).not.toHaveBeenCalled();
            expect(storeContainer.deleteContainer).not.toHaveBeenCalled();
        });
    });
});
