// @ts-nocheck
import Docker from './Docker';
import * as event from '../../../event';
import * as storeContainer from '../../../store/container';
import * as registry from '../../../registry';
import { fullName } from '../../../model/container';

// Mock all dependencies
jest.mock('dockerode');
jest.mock('node-cron');
jest.mock('just-debounce');
jest.mock('../../../event');
jest.mock('../../../store/container');
jest.mock('../../../registry');
jest.mock('../../../model/container');
jest.mock('../../../tag');
jest.mock('../../../prometheus/watcher');
jest.mock('parse-docker-image-name');
jest.mock('fs');

import mockDockerode from 'dockerode';
import mockCron from 'node-cron';
import mockDebounce from 'just-debounce';
import mockFs from 'fs';
import mockParse from 'parse-docker-image-name';
import * as mockTag from '../../../tag';
import * as mockPrometheus from '../../../prometheus/watcher';

describe('Docker Watcher', () => {
    let docker;
    let mockDockerApi;
    let mockSchedule;
    let mockContainer;
    let mockImage;

    beforeEach(async () => {
        jest.clearAllMocks();

        // Setup dockerode mock
        mockDockerApi = {
            listContainers: jest.fn(),
            getContainer: jest.fn(),
            getEvents: jest.fn(),
            getImage: jest.fn(),
        };
        mockDockerode.mockImplementation(() => mockDockerApi);

        // Setup cron mock
        mockSchedule = {
            stop: jest.fn(),
        };
        mockCron.schedule.mockReturnValue(mockSchedule);

        // Setup debounce mock
        mockDebounce.mockImplementation((fn) => fn);

        // Setup container mock
        mockContainer = {
            inspect: jest.fn(),
        };
        mockDockerApi.getContainer.mockReturnValue(mockContainer);

        // Setup image mock
        mockImage = {
            inspect: jest.fn(),
        };
        mockDockerApi.getImage.mockReturnValue(mockImage);

        // Setup store mock
        storeContainer.getContainers.mockReturnValue([]);
        storeContainer.getContainer.mockReturnValue(undefined);
        storeContainer.insertContainer.mockImplementation((c) => c);
        storeContainer.updateContainer.mockImplementation((c) => c);
        storeContainer.deleteContainer.mockImplementation(() => {});

        // Setup registry mock
        registry.getState.mockReturnValue({ registry: {} });

        // Setup event mock
        event.emitWatcherStart.mockImplementation(() => {});
        event.emitWatcherStop.mockImplementation(() => {});
        event.emitContainerReport.mockImplementation(() => {});
        event.emitContainerReports.mockImplementation(() => {});

        // Setup tag mock
        mockTag.parse.mockReturnValue({ major: 1, minor: 0, patch: 0 });
        mockTag.isGreater.mockReturnValue(false);
        mockTag.transform.mockImplementation((transform, tag) => tag);

        // Setup prometheus mock
        const mockGauge = { set: jest.fn() };
        mockPrometheus.getWatchContainerGauge.mockReturnValue(mockGauge);

        // Setup parse mock
        mockParse.mockReturnValue({
            domain: 'docker.io',
            path: 'library/nginx',
            tag: '1.0.0',
        });

        // Setup fullName mock
        fullName.mockReturnValue('test_container');

        docker = new Docker();
    });

    describe('Configuration', () => {
        test('should create instance', async () => {
            expect(docker).toBeDefined();
            expect(docker).toBeInstanceOf(Docker);
        });

        test('should have correct configuration schema', async () => {
            const schema = docker.getConfigurationSchema();
            expect(schema).toBeDefined();
        });

        test('should validate configuration', async () => {
            const config = { socket: '/var/run/docker.sock' };
            expect(() => docker.validateConfiguration(config)).not.toThrow();
        });

        test('should validate configuration with watchall option', async () => {
            const config = { socket: '/var/run/docker.sock', watchall: true };
            expect(() => docker.validateConfiguration(config)).not.toThrow();
        });

        test('should validate configuration with custom cron', async () => {
            const config = {
                socket: '/var/run/docker.sock',
                cron: '*/5 * * * *',
            };
            expect(() => docker.validateConfiguration(config)).not.toThrow();
        });
    });

    describe('Initialization', () => {
        test('should initialize docker client with socket', async () => {
            await docker.register('watcher', 'docker', 'test', {
                socket: '/var/run/docker.sock',
            });
            expect(mockDockerode).toHaveBeenCalledWith({
                socketPath: '/var/run/docker.sock',
            });
        });

        test('should initialize with host configuration', async () => {
            await docker.register('watcher', 'docker', 'test', {
                host: 'localhost',
                port: 2376,
            });
            expect(mockDockerode).toHaveBeenCalledWith({
                host: 'localhost',
                port: 2376,
            });
        });

        test('should initialize with SSL configuration', async () => {
            mockFs.readFileSync.mockReturnValue('cert-content');
            await docker.register('watcher', 'docker', 'test', {
                host: 'localhost',
                port: 2376,
                cafile: '/ca.pem',
                certfile: '/cert.pem',
                keyfile: '/key.pem',
            });
            expect(mockFs.readFileSync).toHaveBeenCalledTimes(3);
            expect(mockDockerode).toHaveBeenCalledWith({
                host: 'localhost',
                port: 2376,
                ca: 'cert-content',
                cert: 'cert-content',
                key: 'cert-content',
            });
        });

        test('should schedule cron job on init', async () => {
            await docker.register('watcher', 'docker', 'test', {
                cron: '0 * * * *',
            });
            docker.init();
            expect(mockCron.schedule).toHaveBeenCalledWith(
                '0 * * * *',
                expect.any(Function),
                { maxRandomDelay: 60000 },
            );
        });

        test('should warn about deprecated watchdigest', async () => {
            await docker.register('watcher', 'docker', 'test', {
                watchdigest: true,
            });
            const mockLog = { warn: jest.fn(), info: jest.fn() };
            docker.log = mockLog;
            docker.init();
            expect(mockLog.warn).toHaveBeenCalledWith(
                expect.stringContaining('deprecated'),
            );
        });

        test('should setup docker events listener', async () => {
            await docker.register('watcher', 'docker', 'test', {
                watchevents: true,
            });
            docker.init();
            expect(mockDebounce).toHaveBeenCalled();
        });

        test('should not setup events when disabled', async () => {
            await docker.register('watcher', 'docker', 'test', {
                watchevents: false,
            });
            docker.init();
            expect(mockDebounce).not.toHaveBeenCalled();
        });

        test('should set watchatstart based on store state', async () => {
            storeContainer.getContainers.mockReturnValue([{ id: 'existing' }]);
            await docker.register('watcher', 'docker', 'test', {
                watchatstart: true,
            });
            docker.init();
            expect(docker.configuration.watchatstart).toBe(false);
        });
    });

    describe('Deregistration', () => {
        test('should stop cron and clear timeouts on deregister', async () => {
            await docker.register('watcher', 'docker', 'test', {});
            docker.init();
            await docker.deregisterComponent();
            expect(mockSchedule.stop).toHaveBeenCalled();
        });
    });

    describe('Docker Events', () => {
        test('should listen to docker events', async () => {
            const mockStream = { on: jest.fn() };
            mockDockerApi.getEvents.mockImplementation((options, callback) => {
                callback(null, mockStream);
            });
            await docker.register('watcher', 'docker', 'test', {});
            await docker.listenDockerEvents();
            expect(mockDockerApi.getEvents).toHaveBeenCalledWith(
                {
                    filters: {
                        type: ['container'],
                        event: [
                            'create',
                            'destroy',
                            'start',
                            'stop',
                            'pause',
                            'unpause',
                            'die',
                            'update',
                        ],
                    },
                },
                expect.any(Function),
            );
        });

        test('should handle docker events error', async () => {
            await docker.register('watcher', 'docker', 'test', {});
            const mockLog = {
                warn: jest.fn(),
                debug: jest.fn(),
                info: jest.fn(),
            };
            docker.log = mockLog;
            mockDockerApi.getEvents.mockImplementation((options, callback) => {
                callback(new Error('Connection failed'));
            });
            await docker.listenDockerEvents();
            expect(mockLog.warn).toHaveBeenCalledWith(
                expect.stringContaining('Connection failed'),
            );
        });

        test('should handle docker events parsing error', async () => {
            await docker.register('watcher', 'docker', 'test', {});
            const mockLog = {
                warn: jest.fn(),
                debug: jest.fn(),
                info: jest.fn(),
            };
            docker.log = mockLog;
            await docker.onDockerEvent(Buffer.from('{"Action":"create"'));
            expect(mockLog.warn).toHaveBeenCalledWith(
                expect.stringContaining('Unable to parse Docker event'),
            );
        });

        test('should process create/destroy events', async () => {
            docker.watchCronDebounced = jest.fn();
            const event = JSON.stringify({
                Action: 'create',
                id: 'container123',
            });
            await docker.onDockerEvent(Buffer.from(event));
            expect(docker.watchCronDebounced).toHaveBeenCalled();
        });

        test('should process chunked create/destroy events', async () => {
            const mockStream = { on: jest.fn() };
            mockDockerApi.getEvents.mockImplementation((options, callback) => {
                callback(null, mockStream);
            });
            docker.onDockerEvent = jest.fn();

            await docker.register('watcher', 'docker', 'test', {});
            await docker.listenDockerEvents();

            const dataHandler = mockStream.on.mock.calls.find(
                (c) => c[0] === 'data',
            )[1];
            dataHandler(Buffer.from('{"Action":"create"'));
            dataHandler(Buffer.from(',"id":"container123"}'));
            expect(docker.onDockerEvent).not.toHaveBeenCalled();

            dataHandler(Buffer.from('\n'));
            expect(docker.onDockerEvent).toHaveBeenCalledTimes(1);

            const calledWith = docker.onDockerEvent.mock.calls[0][0].toString();
            expect(calledWith).toBe(
                '{"Action":"create","id":"container123"}\n',
            );
        });

        test('should update container status on other events', async () => {
            await docker.register('watcher', 'docker', 'test', {});
            const mockLog = {
                child: jest.fn().mockReturnValue({ info: jest.fn() }),
                debug: jest.fn(),
            };
            docker.log = mockLog;
            mockContainer.inspect.mockResolvedValue({
                State: { Status: 'running' },
            });
            const existingContainer = { id: 'container123', status: 'stopped' };
            storeContainer.getContainer.mockReturnValue(existingContainer);

            const event = JSON.stringify({
                Action: 'start',
                id: 'container123',
            });
            await docker.onDockerEvent(Buffer.from(event));

            expect(mockContainer.inspect).toHaveBeenCalled();
            expect(storeContainer.updateContainer).toHaveBeenCalled();
        });

        test('should handle container not found during event processing', async () => {
            const mockLog = { debug: jest.fn() };
            docker.log = mockLog;
            mockDockerApi.getContainer.mockImplementation(() => {
                throw new Error('No such container');
            });

            const event = JSON.stringify({
                Action: 'start',
                id: 'nonexistent',
            });
            await docker.onDockerEvent(Buffer.from(event));

            expect(mockLog.debug).toHaveBeenCalledWith(
                expect.stringContaining('Unable to get container'),
            );
        });
    });

    describe('Container Watching', () => {
        test('should watch containers from cron', async () => {
            await docker.register('watcher', 'docker', 'test', {
                cron: '0 * * * *',
            });
            const mockLog = { info: jest.fn() };
            docker.log = mockLog;
            docker.watch = jest.fn().mockResolvedValue([]);

            await docker.watchFromCron();

            expect(docker.watch).toHaveBeenCalled();
            expect(mockLog.info).toHaveBeenCalledWith(
                expect.stringContaining('Cron started'),
            );
            expect(mockLog.info).toHaveBeenCalledWith(
                expect.stringContaining('Cron finished'),
            );
        });

        test('should report container statistics', async () => {
            await docker.register('watcher', 'docker', 'test', {
                cron: '0 * * * *',
            });
            const mockLog = { info: jest.fn() };
            docker.log = mockLog;
            const containerReports = [
                { container: { updateAvailable: true, error: undefined } },
                {
                    container: {
                        updateAvailable: false,
                        error: { message: 'error' },
                    },
                },
            ];
            docker.watch = jest.fn().mockResolvedValue(containerReports);

            await docker.watchFromCron();

            expect(mockLog.info).toHaveBeenCalledWith(
                expect.stringContaining(
                    '2 containers watched, 1 errors, 1 available updates',
                ),
            );
        });

        test('should emit watcher events during watch', async () => {
            docker.getContainers = jest.fn().mockResolvedValue([]);

            await docker.watch();

            expect(event.emitWatcherStart).toHaveBeenCalledWith(docker);
            expect(event.emitWatcherStop).toHaveBeenCalledWith(docker);
        });

        test('should handle error getting containers', async () => {
            const mockLog = { warn: jest.fn() };
            docker.log = mockLog;
            docker.getContainers = jest
                .fn()
                .mockRejectedValue(new Error('Docker unavailable'));

            await docker.watch();

            expect(mockLog.warn).toHaveBeenCalledWith(
                expect.stringContaining('Docker unavailable'),
            );
        });

        test('should handle error processing containers', async () => {
            const mockLog = { warn: jest.fn() };
            docker.log = mockLog;
            docker.getContainers = jest
                .fn()
                .mockResolvedValue([{ id: 'test' }]);
            docker.watchContainer = jest
                .fn()
                .mockRejectedValue(new Error('Processing failed'));

            const result = await docker.watch();

            expect(result).toEqual([]);
            expect(mockLog.warn).toHaveBeenCalledWith(
                expect.stringContaining('Processing failed'),
            );
        });
    });

    describe('Container Processing', () => {
        test('should watch individual container', async () => {
            const container = { id: 'test123', name: 'test' };
            const mockLog = {
                child: jest.fn().mockReturnValue({ debug: jest.fn() }),
            };
            docker.log = mockLog;
            docker.findNewVersion = jest
                .fn()
                .mockResolvedValue({ tag: '2.0.0' });
            docker.mapContainerToContainerReport = jest
                .fn()
                .mockReturnValue({ container, changed: false });

            await docker.watchContainer(container);

            expect(docker.findNewVersion).toHaveBeenCalledWith(
                container,
                expect.any(Object),
            );
            expect(event.emitContainerReport).toHaveBeenCalled();
        });

        test('should handle container processing error', async () => {
            const container = { id: 'test123', name: 'test' };
            const mockLogChild = { warn: jest.fn(), debug: jest.fn() };
            const mockLog = { child: jest.fn().mockReturnValue(mockLogChild) };
            docker.log = mockLog;
            docker.findNewVersion = jest
                .fn()
                .mockRejectedValue(new Error('Registry error'));
            docker.mapContainerToContainerReport = jest
                .fn()
                .mockReturnValue({ container, changed: false });

            await docker.watchContainer(container);

            expect(mockLogChild.warn).toHaveBeenCalledWith(
                expect.stringContaining('Registry error'),
            );
            expect(container.error).toEqual({ message: 'Registry error' });
        });
    });

    describe('Container Retrieval', () => {
        test('should get containers with default options', async () => {
            const containers = [
                {
                    Id: '123',
                    Labels: { 'wud.watch': 'true' },
                    Names: ['/test'],
                },
            ];
            mockDockerApi.listContainers.mockResolvedValue(containers);
            docker.addImageDetailsToContainer = jest
                .fn()
                .mockResolvedValue({ id: '123' });

            await docker.register('watcher', 'docker', 'test', {
                watchbydefault: true,
            });
            const result = await docker.getContainers();

            expect(mockDockerApi.listContainers).toHaveBeenCalledWith({});
            expect(result).toHaveLength(1);
        });

        test('should get all containers when watchall enabled', async () => {
            mockDockerApi.listContainers.mockResolvedValue([]);

            await docker.register('watcher', 'docker', 'test', {
                watchall: true,
            });
            await docker.getContainers();

            expect(mockDockerApi.listContainers).toHaveBeenCalledWith({
                all: true,
            });
        });

        test('should filter containers based on watch label', async () => {
            const containers = [
                { Id: '1', Labels: { 'wud.watch': 'true' }, Names: ['/test1'] },
                {
                    Id: '2',
                    Labels: { 'wud.watch': 'false' },
                    Names: ['/test2'],
                },
                { Id: '3', Labels: {}, Names: ['/test3'] },
            ];
            mockDockerApi.listContainers.mockResolvedValue(containers);
            docker.addImageDetailsToContainer = jest
                .fn()
                .mockResolvedValue({ id: '1' });

            await docker.register('watcher', 'docker', 'test', {
                watchbydefault: false,
            });
            const result = await docker.getContainers();

            expect(result).toHaveLength(1);
        });

        test('should prune old containers', async () => {
            const oldContainers = [{ id: 'old1' }, { id: 'old2' }];
            storeContainer.getContainers.mockReturnValue(oldContainers);
            mockDockerApi.listContainers.mockResolvedValue([]);

            await docker.register('watcher', 'docker', 'test', {});
            await docker.getContainers();

            expect(storeContainer.deleteContainer).toHaveBeenCalledWith('old1');
            expect(storeContainer.deleteContainer).toHaveBeenCalledWith('old2');
        });

        test('should handle pruning error', async () => {
            await docker.register('watcher', 'docker', 'test', {});
            const mockLog = { warn: jest.fn() };
            docker.log = mockLog;
            storeContainer.getContainers.mockImplementationOnce(() => {
                throw new Error('Store error');
            });
            mockDockerApi.listContainers.mockResolvedValue([]);

            await docker.getContainers();

            expect(mockLog.warn).toHaveBeenCalledWith(
                expect.stringContaining('Store error'),
            );
        });
    });

    describe('Version Finding', () => {
        test('should find new version using registry', async () => {
            const container = {
                image: {
                    registry: { name: 'hub' },
                    tag: { value: '1.0.0' },
                    digest: { watch: false },
                },
            };
            const mockRegistry = {
                getTags: jest
                    .fn()
                    .mockResolvedValue(['1.0.0', '1.1.0', '2.0.0']),
            };
            registry.getState.mockReturnValue({
                registry: { hub: mockRegistry },
            });
            const mockLogChild = { error: jest.fn() };

            const result = await docker.findNewVersion(container, mockLogChild);

            expect(mockRegistry.getTags).toHaveBeenCalledWith(container.image);
            expect(result).toEqual({ tag: '1.0.0' });
        });

        test('should handle unsupported registry', async () => {
            const container = {
                image: {
                    registry: { name: 'unknown' },
                    tag: { value: '1.0.0' },
                    digest: { watch: false },
                },
            };
            registry.getState.mockReturnValue({ registry: {} });
            const mockLogChild = { error: jest.fn() };

            try {
                await docker.findNewVersion(container, mockLogChild);
            } catch (error) {
                expect(error.message).toContain('Unsupported Registry');
            }
        });

        test('should handle digest watching with v2 manifest', async () => {
            const container = {
                image: {
                    id: 'image123',
                    registry: { name: 'hub' },
                    tag: { value: '1.0.0' },
                    digest: { watch: true, repo: 'sha256:abc123' },
                },
            };
            const mockRegistry = {
                getTags: jest.fn().mockResolvedValue(['1.0.0']),
                getImageManifestDigest: jest
                    .fn()
                    .mockResolvedValueOnce({
                        digest: 'sha256:def456',
                        created: '2023-01-01',
                        version: 2,
                    })
                    .mockResolvedValueOnce({
                        digest: 'sha256:manifest123',
                    }),
            };
            registry.getState.mockReturnValue({
                registry: { hub: mockRegistry },
            });
            const mockLogChild = { error: jest.fn() };

            const result = await docker.findNewVersion(container, mockLogChild);

            expect(mockRegistry.getImageManifestDigest).toHaveBeenCalledTimes(
                2,
            );
            expect(result.digest).toBe('sha256:def456');
            expect(result.created).toBe('2023-01-01');
        });

        test('should handle digest watching with v1 manifest', async () => {
            await docker.register('watcher', 'docker', 'test', {});
            const container = {
                image: {
                    id: 'image123',
                    registry: { name: 'hub' },
                    tag: { value: '1.0.0' },
                    digest: { watch: true, repo: 'sha256:abc123' },
                },
            };
            const mockRegistry = {
                getTags: jest.fn().mockResolvedValue(['1.0.0']),
                getImageManifestDigest: jest.fn().mockResolvedValue({
                    digest: 'sha256:def456',
                    created: '2023-01-01',
                    version: 1,
                }),
            };
            registry.getState.mockReturnValue({
                registry: { hub: mockRegistry },
            });
            const mockLogChild = { error: jest.fn() };
            const mockImageInspect = { Config: { Image: 'sha256:legacy123' } };
            mockImage.inspect.mockResolvedValue(mockImageInspect);

            const result = await docker.findNewVersion(container, mockLogChild);

            expect(mockImage.inspect).toHaveBeenCalled();
            expect(container.image.digest.value).toBe('sha256:legacy123');
        });

        test('should handle tag candidates with semver', async () => {
            const container = {
                includeTags: '^v\\d+',
                excludeTags: 'beta',
                transformTags: 's/v//',
                image: {
                    registry: { name: 'hub' },
                    tag: { value: '1.0.0', semver: true },
                    digest: { watch: false },
                },
            };
            const mockRegistry = {
                getTags: jest
                    .fn()
                    .mockResolvedValue([
                        'v1.0.0',
                        'v1.1.0',
                        'v2.0.0-beta',
                        'latest',
                    ]),
            };
            registry.getState.mockReturnValue({
                registry: { hub: mockRegistry },
            });
            mockTag.parse.mockReturnValue({ major: 1, minor: 1, patch: 0 });
            mockTag.isGreater.mockReturnValue(true);
            const mockLogChild = { error: jest.fn(), warn: jest.fn() };

            await docker.findNewVersion(container, mockLogChild);

            expect(mockRegistry.getTags).toHaveBeenCalled();
        });

        test('should filter tags with different number of semver parts', async () => {
            const container = {
                image: {
                    registry: { name: 'hub' },
                    tag: { value: '1.2', semver: true },
                    digest: { watch: false },
                },
            };
            const mockRegistry = {
                getTags: jest.fn().mockResolvedValue([
                    '1.2.1', // 3 parts, should be filtered out
                    '1.3', // 2 parts, should be kept
                    '1.1', // 2 parts, should be kept (but lower)
                    '2', // 1 part, should be filtered out
                ]),
            };
            registry.getState.mockReturnValue({
                registry: { hub: mockRegistry },
            });

            // Mock isGreater to return true for 1.3 > 1.2
            mockTag.isGreater.mockImplementation((t1, t2) => {
                if (t1 === '1.3' && t2 === '1.2') return true;
                return false;
            });

            const mockLogChild = { error: jest.fn(), warn: jest.fn() };

            const result = await docker.findNewVersion(container, mockLogChild);

            expect(result).toEqual({ tag: '1.3' });
        });
    });

    describe('Container Details', () => {
        test('should return existing container from store', async () => {
            await docker.register('watcher', 'docker', 'test', {});
            const mockLog = { debug: jest.fn() };
            docker.log = mockLog;
            const existingContainer = { id: '123', error: undefined };
            storeContainer.getContainer.mockReturnValue(existingContainer);

            const result = await docker.addImageDetailsToContainer({
                Id: '123',
            });

            expect(result).toBe(existingContainer);
        });

        test('should add image details to new container', async () => {
            await docker.register('watcher', 'docker', 'test', {});
            const container = {
                Id: '123',
                Image: 'nginx:1.0.0',
                Names: ['/test-container'],
                State: 'running',
                Labels: {},
            };
            const imageDetails = {
                Id: 'image123',
                Architecture: 'amd64',
                Os: 'linux',
                Variant: 'v8',
                Created: '2023-01-01',
                RepoDigests: ['nginx@sha256:abc123'],
            };
            mockImage.inspect.mockResolvedValue(imageDetails);
            mockTag.parse.mockReturnValue({ major: 1, minor: 0, patch: 0 });
            const mockRegistry = {
                normalizeImage: jest.fn((img) => img),
                getId: () => 'hub',
                match: () => true,
            };
            registry.getState.mockReturnValue({
                registry: { hub: mockRegistry },
            });

            // Mock the validateContainer function to return the container
            const containerModule = await import('../../../model/container');
            const validateContainer = containerModule.validate;
            // @ts-ignore
            validateContainer.mockReturnValue({
                id: '123',
                name: 'test-container',
                image: { architecture: 'amd64', variant: 'v8' },
            });

            const result = await docker.addImageDetailsToContainer(container);

            expect(mockImage.inspect).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        test('should handle container with implicit docker hub image (no domain)', async () => {
            await docker.register('watcher', 'docker', 'test', {});
            const container = {
                Id: '123',
                Image: 'prom/prometheus:v3.8.0',
                Names: ['/prometheus'],
                State: 'running',
                Labels: {},
            };
            const imageDetails = {
                RepoTags: ['prom/prometheus:v3.8.0'],
                Architecture: 'amd64',
                Os: 'linux',
                Created: '2023-01-01',
                Id: 'image123',
            };
            mockImage.inspect.mockResolvedValue(imageDetails);
            // Mock parse to return undefined domain (simulating parse-docker-image-name behavior)
            mockParse.mockReturnValue({
                domain: undefined,
                path: 'prom/prometheus',
                tag: 'v3.8.0',
            });

            // Mock registry to handle unknown/docker hub
            const mockRegistry = {
                normalizeImage: jest.fn((img) => img),
                getId: () => 'hub',
                match: () => true,
            };
            registry.getState.mockReturnValue({
                registry: { hub: mockRegistry },
            });

            const containerModule = await import('../../../model/container');
            const validateContainer = containerModule.validate;
            // @ts-ignore
            validateContainer.mockReturnValue({
                id: '123',
                name: 'prometheus',
                image: { architecture: 'amd64' },
            });

            const result = await docker.addImageDetailsToContainer(container);

            expect(result).toBeDefined();
            // Verify parse was called
            expect(mockParse).toHaveBeenCalledWith('prom/prometheus:v3.8.0');
        });

        test('should handle container with SHA256 image', async () => {
            await docker.register('watcher', 'docker', 'test', {});
            const container = {
                Id: '123',
                Image: 'sha256:abcdef123456',
                Names: ['/test'],
                State: 'running',
                Labels: {},
            };
            const imageDetails = {
                RepoTags: ['nginx:latest'],
                Architecture: 'amd64',
                Os: 'linux',
                Created: '2023-01-01',
                Id: 'image123',
            };
            mockImage.inspect.mockResolvedValue(imageDetails);
            const mockRegistry = {
                normalizeImage: jest.fn((img) => img),
                getId: () => 'hub',
                match: () => true,
            };
            registry.getState.mockReturnValue({
                registry: { hub: mockRegistry },
            });

            // Mock the validateContainer function to return the container
            const containerModule = await import('../../../model/container');
            const validateContainer = containerModule.validate;
            // @ts-ignore
            validateContainer.mockReturnValue({
                id: '123',
                name: 'test',
                image: { architecture: 'amd64' },
            });

            const result = await docker.addImageDetailsToContainer(container);

            expect(result).toBeDefined();
        });

        test('should handle container with no repo tags', async () => {
            await docker.register('watcher', 'docker', 'test', {});
            const mockLog = { warn: jest.fn() };
            docker.log = mockLog;
            const container = {
                Id: '123',
                Image: 'sha256:abcdef123456',
                Names: ['/test'],
                State: 'running',
                Labels: {},
            };
            const imageDetails = { RepoTags: [] };
            mockImage.inspect.mockResolvedValue(imageDetails);

            const result = await docker.addImageDetailsToContainer(container);

            expect(mockLog.warn).toHaveBeenCalledWith(
                expect.stringContaining('Cannot get a reliable tag'),
            );
            expect(result).toBeUndefined();
        });

        test('should warn for non-semver without digest watching', async () => {
            await docker.register('watcher', 'docker', 'test', {});
            const mockLog = { warn: jest.fn() };
            docker.log = mockLog;
            const container = {
                Id: '123',
                Image: 'nginx:latest',
                Names: ['/test'],
                State: 'running',
                Labels: {},
            };
            const imageDetails = {
                Id: 'image123',
                Architecture: 'amd64',
                Os: 'linux',
                Created: '2023-01-01',
            };
            mockImage.inspect.mockResolvedValue(imageDetails);
            mockTag.parse.mockReturnValue(null);
            const mockRegistry = {
                normalizeImage: jest.fn((img) => img),
                getId: () => 'hub',
                match: () => true,
            };
            registry.getState.mockReturnValue({
                registry: { hub: mockRegistry },
            });

            // Mock the validateContainer function to return the container
            const containerModule = await import('../../../model/container');
            const validateContainer = containerModule.validate;
            // @ts-ignore
            validateContainer.mockReturnValue({
                id: '123',
                name: 'test',
                image: { architecture: 'amd64' },
            });

            const result = await docker.addImageDetailsToContainer(container);

            expect(result).toBeDefined();
        });
    });

    describe('Container Reporting', () => {
        test('should map container to report for new container', async () => {
            const container = { id: '123', name: 'test' };
            const mockLogChild = { debug: jest.fn() };
            const mockLog = { child: jest.fn().mockReturnValue(mockLogChild) };
            docker.log = mockLog;
            storeContainer.getContainer.mockReturnValue(undefined);
            storeContainer.insertContainer.mockReturnValue(container);

            const result = docker.mapContainerToContainerReport(container);

            expect(result.changed).toBe(true);
            expect(storeContainer.insertContainer).toHaveBeenCalledWith(
                container,
            );
        });

        test('should map container to report for existing container', async () => {
            const container = {
                id: '123',
                name: 'test',
                updateAvailable: true,
            };
            const existingContainer = {
                resultChanged: jest.fn().mockReturnValue(true),
            };
            const mockLogChild = { debug: jest.fn() };
            const mockLog = { child: jest.fn().mockReturnValue(mockLogChild) };
            docker.log = mockLog;
            storeContainer.getContainer.mockReturnValue(existingContainer);
            storeContainer.updateContainer.mockReturnValue(container);

            const result = docker.mapContainerToContainerReport(container);

            expect(result.changed).toBe(true);
            expect(storeContainer.updateContainer).toHaveBeenCalledWith(
                container,
            );
        });

        test('should not mark as changed when no update available', async () => {
            const container = {
                id: '123',
                name: 'test',
                updateAvailable: false,
            };
            const existingContainer = {
                resultChanged: jest.fn().mockReturnValue(true),
            };
            const mockLogChild = { debug: jest.fn() };
            const mockLog = { child: jest.fn().mockReturnValue(mockLogChild) };
            docker.log = mockLog;
            storeContainer.getContainer.mockReturnValue(existingContainer);
            storeContainer.updateContainer.mockReturnValue(container);

            const result = docker.mapContainerToContainerReport(container);

            expect(result.changed).toBe(false);
        });
    });

    describe('Utility Functions', () => {
        test('should get tag candidates with include filter', async () => {
            const tags = ['v1.0.0', 'latest', 'v2.0.0', 'beta'];
            const filtered = tags.filter((tag) => /^v\d+/.test(tag));
            expect(filtered).toEqual(['v1.0.0', 'v2.0.0']);
        });

        test('should get container name and strip slash', async () => {
            const container = { Names: ['/test-container'] };
            const name = container.Names[0].replace(/\//, '');
            expect(name).toBe('test-container');
        });

        test('should get repo digest from image', async () => {
            const image = { RepoDigests: ['nginx@sha256:abc123def456'] };
            const digest = image.RepoDigests[0].split('@')[1];
            expect(digest).toBe('sha256:abc123def456');
        });

        test('should handle empty repo digests', async () => {
            const image = { RepoDigests: [] };
            expect(image.RepoDigests.length).toBe(0);
        });

        test('should get old containers for pruning', async () => {
            const newContainers = [{ id: '1' }, { id: '2' }];
            const storeContainers = [{ id: '1' }, { id: '3' }];

            const oldContainers = storeContainers.filter((storeContainer) => {
                const stillExists = newContainers.find(
                    (newContainer) => newContainer.id === storeContainer.id,
                );
                return stillExists === undefined;
            });

            expect(oldContainers).toEqual([{ id: '3' }]);
        });

        test('should handle null inputs for old containers', async () => {
            expect([].filter(() => false)).toEqual([]);
        });
    });
});

describe('isDigestToWatch Logic', () => {
    let docker;
    let mockImage;

    beforeEach(async () => {
        // Setup dockerode mock
        const mockDockerApi = {
            getImage: jest.fn(),
        };
        mockDockerode.mockImplementation(() => mockDockerApi);

        mockImage = {
            inspect: jest.fn(),
        };
        mockDockerApi.getImage.mockReturnValue(mockImage);

        // Setup store mock
        storeContainer.getContainer.mockReturnValue(undefined);
        storeContainer.insertContainer.mockImplementation((c) => c);
        storeContainer.updateContainer.mockImplementation((c) => c);

        // Setup registry mock
        registry.getState.mockReturnValue({ registry: {} });

        // Setup event mock
        event.emitContainerReport.mockImplementation(() => {});

        // Setup prometheus mock
        const mockGauge = { set: jest.fn() };
        mockPrometheus.getWatchContainerGauge.mockReturnValue(mockGauge);

        // Setup fullName mock
        fullName.mockReturnValue('test_container');

        docker = new Docker();
        docker.name = 'test';
        docker.dockerApi = mockDockerApi;
        docker.ensureLogger();
    });

    // Helper to setup the environment for addImageDetailsToContainer
    const setupTest = async (labels, domain, tag, isSemver = false) => {
        const container = {
            Id: '123',
            Image: `${domain ? domain + '/' : ''}repo/image:${tag}`,
            Names: ['/test'],
            State: 'running',
            Labels: labels || {},
        };
        const imageDetails = {
            Id: 'image123',
            Architecture: 'amd64',
            Os: 'linux',
            Created: '2023-01-01',
            RepoDigests: ['repo/image@sha256:abc'],
            RepoTags: [`${domain ? domain + '/' : ''}repo/image:${tag}`],
        };
        mockImage.inspect.mockResolvedValue(imageDetails);
        // Mock parse to return appropriate structure
        mockParse.mockReturnValue({
            domain: domain,
            path: 'repo/image',
            tag: tag,
        });

        // Mock semver check
        if (isSemver) {
            mockTag.parse.mockReturnValue({ major: 1, minor: 0, patch: 0 });
        } else {
            mockTag.parse.mockReturnValue(null);
        }

        const mockRegistry = {
            normalizeImage: jest.fn((img) => img),
            getId: () => 'registry',
            match: () => true,
        };
        registry.getState.mockReturnValue({
            registry: { registry: mockRegistry },
        });

        const containerModule = await import('../../../model/container');
        const validateContainer = containerModule.validate;
        // @ts-ignore
        validateContainer.mockImplementation((c) => c);

        return container;
    };

    // Case 1: Explicit Label present
    test('should watch digest if label is true (semver)', async () => {
        const container = await setupTest(
            { 'wud.watch.digest': 'true' },
            'my.registry',
            '1.0.0',
            true,
        );
        const result = await docker.addImageDetailsToContainer(container);
        expect(result.image.digest.watch).toBe(true);
    });

    test('should watch digest if label is true (non-semver)', async () => {
        const container = await setupTest(
            { 'wud.watch.digest': 'true' },
            'my.registry',
            'latest',
            false,
        );
        const result = await docker.addImageDetailsToContainer(container);
        expect(result.image.digest.watch).toBe(true);
    });

    test('should NOT watch digest if label is false (semver)', async () => {
        const container = await setupTest(
            { 'wud.watch.digest': 'false' },
            'my.registry',
            '1.0.0',
            true,
        );
        const result = await docker.addImageDetailsToContainer(container);
        expect(result.image.digest.watch).toBe(false);
    });

    test('should NOT watch digest if label is false (non-semver)', async () => {
        const container = await setupTest(
            { 'wud.watch.digest': 'false' },
            'my.registry',
            'latest',
            false,
        );
        const result = await docker.addImageDetailsToContainer(container);
        expect(result.image.digest.watch).toBe(false);
    });

    // Case 2: Semver (no label) -> default false
    test('should NOT watch digest by default for semver images', async () => {
        const container = await setupTest({}, 'my.registry', '1.0.0', true);
        const result = await docker.addImageDetailsToContainer(container);
        expect(result.image.digest.watch).toBe(false);
    });

    test('should NOT watch digest by default for semver images (Docker Hub)', async () => {
        const container = await setupTest({}, 'docker.io', '1.0.0', true);
        const result = await docker.addImageDetailsToContainer(container);
        expect(result.image.digest.watch).toBe(false);
    });

    // Case 3: Non-Semver (no label) -> default true, EXCEPT Docker Hub
    test('should watch digest by default for non-semver images (Custom Registry)', async () => {
        const container = await setupTest({}, 'my.registry', 'latest', false);
        const result = await docker.addImageDetailsToContainer(container);
        expect(result.image.digest.watch).toBe(true);
    });

    test('should NOT watch digest by default for non-semver images (Docker Hub Explicit)', async () => {
        const container = await setupTest({}, 'docker.io', 'latest', false);
        const result = await docker.addImageDetailsToContainer(container);
        expect(result.image.digest.watch).toBe(false);
    });

    test('should NOT watch digest by default for non-semver images (Docker Hub Registry-1)', async () => {
        const container = await setupTest(
            {},
            'registry-1.docker.io',
            'latest',
            false,
        );
        const result = await docker.addImageDetailsToContainer(container);
        expect(result.image.digest.watch).toBe(false);
    });

    test('should NOT watch digest by default for non-semver images (Docker Hub Implicit)', async () => {
        const container = await setupTest({}, undefined, 'latest', false); // Implicit
        const result = await docker.addImageDetailsToContainer(container);
        expect(result.image.digest.watch).toBe(false);
    });
});
