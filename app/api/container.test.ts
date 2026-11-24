import express from 'express';
import request from 'supertest';
import * as containerRouter from './container';
import * as storeContainer from '../store/container';
import * as registry from '../registry';
import * as configuration from '../configuration';

jest.mock('../store/container', () => ({
    getContainer: jest.fn(),
    getContainers: jest.fn(),
    deleteContainer: jest.fn(),
    snoozeContainer: jest.fn(),
    unsnoozeContainer: jest.fn(),
}));

jest.mock('../registry', () => ({
    getState: jest.fn(),
}));

jest.mock('../configuration', () => ({
    getLogLevel: jest.fn(() => 'info'),
    getServerConfiguration: jest.fn(() => ({
        feature: { delete: true },
    })),
}));

function createTrigger(type, name, configuration) {
    return {
        type,
        name,
        configuration,
        maskConfiguration: () => configuration,
    };
}

describe('API Container', () => {
    let app: express.Express;
    let containerRouterLocal;

    beforeEach(() => {
        jest.clearAllMocks();
        app = express();
        app.use(express.json());

        // Default configuration
        (configuration.getServerConfiguration as jest.Mock).mockReturnValue({
            feature: { delete: true },
        });

        jest.isolateModules(() => {
            containerRouterLocal = require('./container');
        });
        app.get('/', containerRouterLocal.getContainers);
        app.post('/watch', containerRouterLocal.watchContainers);
        app.get('/:id', containerRouterLocal.getContainer);
        app.delete('/:id', containerRouterLocal.deleteContainer);
        app.post('/:id/snooze', containerRouterLocal.snoozeContainer);
        app.delete('/:id/snooze', containerRouterLocal.unsnoozeContainer);
        app.get('/:id/triggers', containerRouterLocal.getContainerTriggers);
        app.post(
            '/triggers/:triggerType/:triggerName',
            containerRouterLocal.runTriggerForContainers,
        );
        app.post(
            '/:id/triggers/:triggerType/:triggerName',
            containerRouterLocal.runTriggerForContainer,
        );
        app.post('/:id/watch', containerRouterLocal.watchContainer);
    });

    test('should get all containers', async () => {
        (storeContainer.getContainers as jest.Mock).mockReturnValue([
            { id: 'container1' },
        ]);

        const res = await request(app).get('/');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ id: 'container1' }]);
    });

    test('should get a container by id', async () => {
        (storeContainer.getContainer as jest.Mock).mockReturnValue({
            id: 'container1',
        });

        const res = await request(app).get('/container1');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id: 'container1' });
    });

    test('should return 404 for unknown container', async () => {
        (storeContainer.getContainer as jest.Mock).mockReturnValue(undefined);

        const res = await request(app).get('/container2');
        expect(res.status).toBe(404);
    });

    test('should delete container if feature is enabled', async () => {
        (storeContainer.getContainer as jest.Mock).mockReturnValue({
            id: 'container1',
        });

        const res = await request(app).delete('/container1');
        expect(res.status).toBe(204);
        expect(storeContainer.deleteContainer).toHaveBeenCalledWith(
            'container1',
        );
    });

    test('should return 404 on delete if container not found', async () => {
        (storeContainer.getContainer as jest.Mock).mockReturnValue(undefined);

        const res = await request(app).delete('/container1');
        expect(res.status).toBe(404);
        expect(storeContainer.deleteContainer).not.toHaveBeenCalled();
    });

    test('should return 403 on delete if feature is disabled', async () => {
        (configuration.getServerConfiguration as jest.Mock).mockReturnValue({
            feature: { delete: false },
        });

        jest.isolateModules(() => {
            containerRouterLocal = require('./container');
        });
        const appDisabled = express();
        appDisabled.use(express.json());
        appDisabled.delete('/:id', containerRouterLocal.deleteContainer);

        const res = await request(appDisabled).delete('/container1');
        expect(res.status).toBe(403);
    });

    test('getContainerTriggers should not associate opt-in triggers by default', async () => {
        (storeContainer.getContainer as jest.Mock).mockReturnValue({
            id: 'container1',
        });
        (registry.getState as jest.Mock).mockReturnValue({
            trigger: {
                'smtp.gmail': createTrigger('smtp', 'gmail', {
                    includebydefault: true,
                }),
                'dockercompose.local': createTrigger('dockercompose', 'local', {
                    includebydefault: false,
                }),
            },
        });

        const res = await request(app).get('/container1/triggers');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([
            {
                id: 'smtp.gmail',
                type: 'smtp',
                name: 'gmail',
                configuration: { includebydefault: true },
            },
        ]);
    });

    test('getContainerTriggers should associate explicitly included opt-in triggers', async () => {
        (storeContainer.getContainer as jest.Mock).mockReturnValue({
            id: 'container1',
            triggerInclude: 'dockercompose.local:minor',
        });
        (registry.getState as jest.Mock).mockReturnValue({
            trigger: {
                'smtp.gmail': createTrigger('smtp', 'gmail', {
                    includebydefault: true,
                }),
                'dockercompose.local': createTrigger('dockercompose', 'local', {
                    includebydefault: false,
                }),
            },
        });

        const res = await request(app).get('/container1/triggers');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([
            {
                id: 'dockercompose.local',
                type: 'dockercompose',
                name: 'local',
                configuration: {
                    includebydefault: false,
                    threshold: 'minor',
                },
            },
        ]);
    });

    test('getContainerTriggers should exclude correctly', async () => {
        (storeContainer.getContainer as jest.Mock).mockReturnValue({
            id: 'container1',
            triggerExclude: 'smtp.gmail',
        });
        (registry.getState as jest.Mock).mockReturnValue({
            trigger: {
                'smtp.gmail': createTrigger('smtp', 'gmail', {
                    includebydefault: true,
                }),
            },
        });

        const res = await request(app).get('/container1/triggers');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    test('getContainerTriggers should return 404 for unknown container', async () => {
        (storeContainer.getContainer as jest.Mock).mockReturnValue(undefined);

        const res = await request(app).get('/container2/triggers');
        expect(res.status).toBe(404);
    });

    test('should watch all containers', async () => {
        const mockWatch = jest.fn().mockResolvedValue(true);
        (registry.getState as jest.Mock).mockReturnValue({
            watcher: {
                'docker.local': { watch: mockWatch },
            },
        });
        (storeContainer.getContainers as jest.Mock).mockReturnValue([
            { id: 'c1' },
        ]);

        const res = await request(app).post('/watch');
        expect(res.status).toBe(200);
        expect(mockWatch).toHaveBeenCalled();
        expect(res.body).toEqual([{ id: 'c1' }]);
    });

    test('should watch all containers async', async () => {
        const mockWatch = jest.fn().mockResolvedValue(true);
        (registry.getState as jest.Mock).mockReturnValue({
            watcher: {
                'docker.local': { watch: mockWatch },
            },
        });
        (storeContainer.getContainers as jest.Mock).mockReturnValue([
            { id: 'c1' },
        ]);

        const res = await request(app).post('/watch?async=true');
        expect(res.status).toBe(202);
        expect(res.body).toEqual({
            status: 'started',
            jobId: expect.any(String),
        });
    });

    test('should handle watch all failure', async () => {
        const mockWatch = jest.fn().mockRejectedValue(new Error('fail watch'));
        (registry.getState as jest.Mock).mockReturnValue({
            watcher: {
                'docker.local': { watch: mockWatch },
            },
        });

        const res = await request(app).post('/watch');
        expect(res.status).toBe(500);
        expect(res.body.error).toContain('Error when watching images');
    });

    test('should run trigger on a container', async () => {
        const mockTrigger = jest.fn().mockResolvedValue(true);
        (storeContainer.getContainer as jest.Mock).mockReturnValue({
            id: 'container1',
        });
        (registry.getState as jest.Mock).mockReturnValue({
            trigger: {
                'mock.test': { trigger: mockTrigger },
            },
        });

        const res = await request(app).post('/container1/triggers/mock/test');
        expect(res.status).toBe(200);
        expect(mockTrigger).toHaveBeenCalledWith({ id: 'container1' });
    });

    test('should return 200 when running trigger on a container with no update available', async () => {
        const mockTrigger = jest.fn().mockResolvedValue(undefined);
        (storeContainer.getContainer as jest.Mock).mockReturnValue({
            id: 'container1',
            updateAvailable: false,
            updateKind: { kind: 'unknown' },
        });
        (registry.getState as jest.Mock).mockReturnValue({
            trigger: {
                'dockercompose.test': { trigger: mockTrigger },
            },
        });

        const res = await request(app).post(
            '/container1/triggers/dockercompose/test',
        );
        expect(res.status).toBe(200);
        expect(mockTrigger).toHaveBeenCalledWith({
            id: 'container1',
            updateAvailable: false,
            updateKind: { kind: 'unknown' },
        });
    });

    test('should set overrideCooldown=true on container when running trigger with overrideCooldown query parameter', async () => {
        const mockTrigger = jest.fn().mockResolvedValue(true);
        const containerObj = {
            id: 'container1',
            isCoolingDown: true,
            overrideCooldown: false,
        };
        (storeContainer.getContainer as jest.Mock).mockReturnValue(
            containerObj,
        );
        (registry.getState as jest.Mock).mockReturnValue({
            trigger: {
                'mock.test': { trigger: mockTrigger },
            },
        });

        const res = await request(app).post(
            '/container1/triggers/mock/test?overrideCooldown=true',
        );
        expect(res.status).toBe(200);
        expect(containerObj.overrideCooldown).toBe(true);
        expect(mockTrigger).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'container1',
                overrideCooldown: true,
            }),
        );
    });

    test('should set overrideCooldown=true on container when running trigger with overrideCooldown in request body', async () => {
        const mockTrigger = jest.fn().mockResolvedValue(true);
        const containerObj = {
            id: 'container1',
            isCoolingDown: true,
            overrideCooldown: false,
        };
        (storeContainer.getContainer as jest.Mock).mockReturnValue(
            containerObj,
        );
        (registry.getState as jest.Mock).mockReturnValue({
            trigger: {
                'mock.test': { trigger: mockTrigger },
            },
        });

        const res = await request(app)
            .post('/container1/triggers/mock/test')
            .send({ overrideCooldown: true });
        expect(res.status).toBe(200);
        expect(containerObj.overrideCooldown).toBe(true);
        expect(mockTrigger).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'container1',
                overrideCooldown: true,
            }),
        );
    });

    test('should not set overrideCooldown when running trigger without overrideCooldown parameter', async () => {
        const mockTrigger = jest.fn().mockResolvedValue(true);
        const containerObj = {
            id: 'container1',
            isCoolingDown: true,
        };
        (storeContainer.getContainer as jest.Mock).mockReturnValue(
            containerObj,
        );
        (registry.getState as jest.Mock).mockReturnValue({
            trigger: {
                'mock.test': { trigger: mockTrigger },
            },
        });

        const res = await request(app).post('/container1/triggers/mock/test');
        expect(res.status).toBe(200);
        expect(containerObj).not.toHaveProperty('overrideCooldown', true);
    });

    test('should return 500 if running trigger fails', async () => {
        const mockTrigger = jest
            .fn()
            .mockRejectedValue(new Error('fail trigger'));
        (storeContainer.getContainer as jest.Mock).mockReturnValue({
            id: 'container1',
        });
        (registry.getState as jest.Mock).mockReturnValue({
            trigger: {
                'mock.test': { trigger: mockTrigger },
            },
        });

        const res = await request(app).post('/container1/triggers/mock/test');
        expect(res.status).toBe(500);
        expect(res.body.message).toContain(
            'Error when running trigger (type=mock, name=test) (fail trigger)',
        );
    });

    test('should return 404 if trigger not found', async () => {
        (storeContainer.getContainer as jest.Mock).mockReturnValue({
            id: 'container1',
        });
        (registry.getState as jest.Mock).mockReturnValue({
            trigger: {},
        });

        const res = await request(app).post('/container1/triggers/mock/test');
        expect(res.status).toBe(404);
        expect(res.body.message).toEqual('Trigger not found');
    });

    test('should return 404 if container not found when running trigger', async () => {
        (storeContainer.getContainer as jest.Mock).mockReturnValue(undefined);

        const res = await request(app).post('/container1/triggers/mock/test');
        expect(res.status).toBe(404);
        expect(res.body.message).toEqual('Container not found');
    });

    test('should watch single container', async () => {
        const mockWatchContainer = jest.fn().mockResolvedValue({
            container: { id: 'container1', result: true },
        });
        const mockGetContainers = jest
            .fn()
            .mockResolvedValue([{ id: 'container1' }]);
        (storeContainer.getContainer as jest.Mock).mockReturnValue({
            id: 'container1',
            watcher: 'local',
        });
        (registry.getState as jest.Mock).mockReturnValue({
            watcher: {
                'docker.local': {
                    watchContainer: mockWatchContainer,
                    getContainers: mockGetContainers,
                },
            },
        });

        const res = await request(app).post('/container1/watch');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id: 'container1', result: true });
        expect(mockWatchContainer).toHaveBeenCalledWith({
            id: 'container1',
            watcher: 'local',
        });
    });

    test('should return 404 if single container no longer in watcher containers', async () => {
        const mockGetContainers = jest.fn().mockResolvedValue([]);
        (storeContainer.getContainer as jest.Mock).mockReturnValue({
            id: 'container1',
            watcher: 'local',
        });
        (registry.getState as jest.Mock).mockReturnValue({
            watcher: {
                'docker.local': { getContainers: mockGetContainers },
            },
        });

        const res = await request(app).post('/container1/watch');
        expect(res.status).toBe(404);
    });

    test('should return 500 if watcher not found', async () => {
        (storeContainer.getContainer as jest.Mock).mockReturnValue({
            id: 'container1',
            watcher: 'unknown',
        });
        (registry.getState as jest.Mock).mockReturnValue({
            watcher: {},
        });

        const res = await request(app).post('/container1/watch');
        expect(res.status).toBe(500);
        expect(res.body.message).toContain('No provider found');
    });

    test('should return 500 on watch single container failure', async () => {
        const mockGetContainers = jest
            .fn()
            .mockRejectedValue(new Error('fail get containers'));
        (storeContainer.getContainer as jest.Mock).mockReturnValue({
            id: 'container1',
            watcher: 'local',
        });
        (registry.getState as jest.Mock).mockReturnValue({
            watcher: {
                'docker.local': { getContainers: mockGetContainers },
            },
        });

        const res = await request(app).post('/container1/watch');
        expect(res.status).toBe(500);
        expect(res.body.message).toContain('Error when watching container');
    });

    test('should return 404 for unknown container watch', async () => {
        (storeContainer.getContainer as jest.Mock).mockReturnValue(undefined);

        const res = await request(app).post('/container1/watch');
        expect(res.status).toBe(404);
    });

    describe('snoozeContainer', () => {
        test('should return 404 when container is not found', async () => {
            (storeContainer.getContainer as jest.Mock).mockReturnValue(
                undefined,
            );

            const res = await request(app)
                .post('/container-missing/snooze')
                .send({ version: '2.0.0' });
            expect(res.status).toBe(404);
        });

        test('should return 400 when no version provided and container has no candidate result', async () => {
            (storeContainer.getContainer as jest.Mock).mockReturnValue({
                id: 'container1',
            });

            const res = await request(app).post('/container1/snooze').send({});
            expect(res.status).toBe(400);
            expect(res.body.message).toContain(
                'No candidate version to snooze',
            );
        });

        test('should snooze container with explicit version and until timestamp', async () => {
            (storeContainer.getContainer as jest.Mock).mockReturnValue({
                id: 'container1',
                result: { tag: '2.0.0' },
            });
            const mockSnoozed = {
                id: 'container1',
                snoozedVersion: '2.0.0',
                snoozedUntil: 1234567890,
                isSnoozed: true,
                updateAvailable: false,
            };
            (storeContainer.snoozeContainer as jest.Mock).mockReturnValue(
                mockSnoozed,
            );

            const res = await request(app)
                .post('/container1/snooze')
                .send({ version: '2.0.0', until: 1234567890 });
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockSnoozed);
            expect(storeContainer.snoozeContainer).toHaveBeenCalledWith(
                'container1',
                '2.0.0',
                1234567890,
            );
        });

        test('should snooze container with default candidate version from container.result.tag', async () => {
            (storeContainer.getContainer as jest.Mock).mockReturnValue({
                id: 'container1',
                result: { tag: '3.0.0' },
            });
            const mockSnoozed = {
                id: 'container1',
                snoozedVersion: '3.0.0',
                isSnoozed: true,
                updateAvailable: false,
            };
            (storeContainer.snoozeContainer as jest.Mock).mockReturnValue(
                mockSnoozed,
            );

            const res = await request(app).post('/container1/snooze').send({});
            expect(res.status).toBe(200);
            expect(storeContainer.snoozeContainer).toHaveBeenCalledWith(
                'container1',
                '3.0.0',
                undefined,
            );
        });

        test('should return 500 when storeContainer.snoozeContainer throws', async () => {
            (storeContainer.getContainer as jest.Mock).mockReturnValue({
                id: 'container1',
                result: { tag: '2.0.0' },
            });
            (storeContainer.snoozeContainer as jest.Mock).mockImplementation(
                () => {
                    throw new Error('store error');
                },
            );

            const res = await request(app)
                .post('/container1/snooze')
                .send({ version: '2.0.0' });
            expect(res.status).toBe(500);
            expect(res.body.message).toBe('store error');
        });
    });

    describe('unsnoozeContainer', () => {
        test('should return 404 when container is not found', async () => {
            (storeContainer.getContainer as jest.Mock).mockReturnValue(
                undefined,
            );

            const res = await request(app).delete('/container-missing/snooze');
            expect(res.status).toBe(404);
        });

        test('should unsnooze container successfully', async () => {
            (storeContainer.getContainer as jest.Mock).mockReturnValue({
                id: 'container1',
                snoozedVersion: '2.0.0',
            });
            const mockUnsnoozed = {
                id: 'container1',
                isSnoozed: false,
                updateAvailable: true,
            };
            (storeContainer.unsnoozeContainer as jest.Mock).mockReturnValue(
                mockUnsnoozed,
            );

            const res = await request(app).delete('/container1/snooze');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockUnsnoozed);
            expect(storeContainer.unsnoozeContainer).toHaveBeenCalledWith(
                'container1',
            );
        });

        test('should return 500 when storeContainer.unsnoozeContainer throws', async () => {
            (storeContainer.getContainer as jest.Mock).mockReturnValue({
                id: 'container1',
            });
            (storeContainer.unsnoozeContainer as jest.Mock).mockImplementation(
                () => {
                    throw new Error('store error');
                },
            );

            const res = await request(app).delete('/container1/snooze');
            expect(res.status).toBe(500);
            expect(res.body.message).toBe('store error');
        });
    });

    describe('runTriggerForContainers (batch)', () => {
        let containers;
        const batchTrigger = (triggerBatch) => ({
            triggerBatch,
            supportsBatch: () => true,
        });

        beforeEach(() => {
            // Fresh objects per test: the handler mutates them (overrideCooldown)
            containers = {
                container1: {
                    id: 'container1',
                    name: 'app',
                    updateAvailable: true,
                },
                container2: {
                    id: 'container2',
                    name: 'db',
                    updateAvailable: true,
                },
                uptodate: {
                    id: 'uptodate',
                    name: 'cache',
                    updateAvailable: false,
                },
                snoozed: {
                    id: 'snoozed',
                    name: 'proxy',
                    updateAvailable: true,
                    isSnoozed: true,
                },
            };
            (storeContainer.getContainer as jest.Mock).mockImplementation(
                (id) => containers[id],
            );
        });

        test('should run triggerBatch once with all containers', async () => {
            const triggerBatch = jest.fn().mockResolvedValue(undefined);
            (registry.getState as jest.Mock).mockReturnValue({
                trigger: { 'dockercompose.main': batchTrigger(triggerBatch) },
            });

            const res = await request(app)
                .post('/triggers/dockercompose/main')
                .send({ containers: ['container1', 'container2'] });

            expect(res.status).toBe(200);
            expect(res.body).toEqual({});
            expect(triggerBatch).toHaveBeenCalledTimes(1);
            expect(triggerBatch).toHaveBeenCalledWith([
                containers.container1,
                containers.container2,
            ]);
        });

        test('should deduplicate container ids', async () => {
            const triggerBatch = jest.fn().mockResolvedValue(undefined);
            (registry.getState as jest.Mock).mockReturnValue({
                trigger: { 'dockercompose.main': batchTrigger(triggerBatch) },
            });

            const res = await request(app)
                .post('/triggers/dockercompose/main')
                .send({ containers: ['container1', 'container1'] });

            expect(res.status).toBe(200);
            expect(triggerBatch).toHaveBeenCalledWith([containers.container1]);
        });

        test('should skip containers without a pending update or snoozed', async () => {
            const triggerBatch = jest.fn().mockResolvedValue(undefined);
            (registry.getState as jest.Mock).mockReturnValue({
                trigger: { 'dockercompose.main': batchTrigger(triggerBatch) },
            });

            const res = await request(app)
                .post('/triggers/dockercompose/main')
                .send({
                    containers: ['uptodate', 'container1', 'snoozed'],
                });

            expect(res.status).toBe(200);
            expect(triggerBatch).toHaveBeenCalledWith([containers.container1]);
        });

        test('should return 400 when no container has a pending update', async () => {
            const triggerBatch = jest.fn();
            (registry.getState as jest.Mock).mockReturnValue({
                trigger: { 'dockercompose.main': batchTrigger(triggerBatch) },
            });

            const res = await request(app)
                .post('/triggers/dockercompose/main')
                .send({ containers: ['uptodate', 'snoozed'] });

            expect(res.status).toBe(400);
            expect(res.body.message).toBe(
                'None of the containers has a pending update',
            );
            expect(triggerBatch).not.toHaveBeenCalled();
        });

        test('should set overrideCooldown on every container when requested in body', async () => {
            const triggerBatch = jest.fn().mockResolvedValue(undefined);
            (registry.getState as jest.Mock).mockReturnValue({
                trigger: { 'dockercompose.main': batchTrigger(triggerBatch) },
            });

            const res = await request(app)
                .post('/triggers/dockercompose/main')
                .send({
                    containers: ['container1', 'container2'],
                    overrideCooldown: true,
                });

            expect(res.status).toBe(200);
            expect(triggerBatch).toHaveBeenCalledWith([
                expect.objectContaining({
                    id: 'container1',
                    overrideCooldown: true,
                }),
                expect.objectContaining({
                    id: 'container2',
                    overrideCooldown: true,
                }),
            ]);
        });

        test('should set overrideCooldown when requested as query parameter', async () => {
            const triggerBatch = jest.fn().mockResolvedValue(undefined);
            (registry.getState as jest.Mock).mockReturnValue({
                trigger: { 'dockercompose.main': batchTrigger(triggerBatch) },
            });

            const res = await request(app)
                .post('/triggers/dockercompose/main?overrideCooldown=true')
                .send({ containers: ['container1'] });

            expect(res.status).toBe(200);
            expect(triggerBatch).toHaveBeenCalledWith([
                expect.objectContaining({
                    id: 'container1',
                    overrideCooldown: true,
                }),
            ]);
        });

        test('should not set overrideCooldown when not requested', async () => {
            const triggerBatch = jest.fn().mockResolvedValue(undefined);
            (registry.getState as jest.Mock).mockReturnValue({
                trigger: { 'dockercompose.main': batchTrigger(triggerBatch) },
            });

            const res = await request(app)
                .post('/triggers/dockercompose/main')
                .send({ containers: ['container1'] });

            expect(res.status).toBe(200);
            expect(triggerBatch.mock.calls[0][0][0]).not.toHaveProperty(
                'overrideCooldown',
            );
        });

        test.each([
            ['missing body', undefined],
            ['missing containers', {}],
            ['empty containers', { containers: [] }],
            ['containers not an array', { containers: 'container1' }],
            ['non-string ids', { containers: ['container1', 42] }],
            ['empty id', { containers: [''] }],
            ['body is an array', ['container1']],
            [
                'invalid overrideCooldown',
                { containers: ['container1'], overrideCooldown: 'maybe' },
            ],
        ])('should return 400 when %s', async (_label, body) => {
            const triggerBatch = jest.fn();
            (registry.getState as jest.Mock).mockReturnValue({
                trigger: { 'dockercompose.main': batchTrigger(triggerBatch) },
            });

            const req = request(app).post('/triggers/dockercompose/main');
            const res = body === undefined ? await req : await req.send(body);

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Bad Request');
            expect(res.body.message).toContain('Invalid request body');
            expect(triggerBatch).not.toHaveBeenCalled();
        });

        test('should return 404 when trigger is unknown', async () => {
            (registry.getState as jest.Mock).mockReturnValue({ trigger: {} });

            const res = await request(app)
                .post('/triggers/dockercompose/unknown')
                .send({ containers: ['container1'] });

            expect(res.status).toBe(404);
            expect(res.body.message).toBe('Trigger not found');
        });

        test.each([
            ['declares no batch support', { supportsBatch: () => false }],
            ['has no supportsBatch method', {}],
        ])(
            'should return 400 before resolving containers when the trigger %s',
            async (_label, triggerShape) => {
                const triggerBatch = jest.fn();
                (registry.getState as jest.Mock).mockReturnValue({
                    trigger: {
                        'mqtt.home': { triggerBatch, ...triggerShape },
                    },
                });

                const res = await request(app)
                    .post('/triggers/mqtt/home')
                    .send({ containers: ['does-not-exist'] });

                expect(res.status).toBe(400);
                expect(res.body.message).toBe(
                    'Trigger mqtt.home does not support batch execution',
                );
                expect(storeContainer.getContainer).not.toHaveBeenCalled();
                expect(triggerBatch).not.toHaveBeenCalled();
            },
        );

        test('should return 404 listing unknown containers without running the trigger', async () => {
            const triggerBatch = jest.fn();
            (registry.getState as jest.Mock).mockReturnValue({
                trigger: { 'dockercompose.main': batchTrigger(triggerBatch) },
            });

            const res = await request(app)
                .post('/triggers/dockercompose/main')
                .send({ containers: ['container1', 'nope1', 'nope2'] });

            expect(res.status).toBe(404);
            expect(res.body.message).toBe('Container not found (nope1, nope2)');
            expect(triggerBatch).not.toHaveBeenCalled();
        });

        test('should return 500 when triggerBatch fails', async () => {
            const triggerBatch = jest
                .fn()
                .mockRejectedValue(new Error('compose file locked'));
            (registry.getState as jest.Mock).mockReturnValue({
                trigger: { 'dockercompose.main': batchTrigger(triggerBatch) },
            });

            const res = await request(app)
                .post('/triggers/dockercompose/main')
                .send({ containers: ['container1', 'container2'] });

            expect(res.status).toBe(500);
            expect(res.body).toEqual({
                error: 'Trigger execution failed',
                message:
                    'Error when running trigger (type=dockercompose, name=main) (compose file locked)',
            });
        });

        test('should expose supportsBatch in the triggers of a container', async () => {
            (storeContainer.getContainer as jest.Mock).mockReturnValue({
                id: 'container1',
                labels: {},
            });
            (registry.getState as jest.Mock).mockReturnValue({
                trigger: {
                    'dockercompose.main': {
                        type: 'dockercompose',
                        name: 'main',
                        configuration: { includebydefault: true },
                        maskConfiguration: () => ({}),
                        supportsBatch: () => true,
                    },
                    'mqtt.home': {
                        type: 'mqtt',
                        name: 'home',
                        configuration: { includebydefault: true },
                        maskConfiguration: () => ({}),
                        supportsBatch: () => false,
                    },
                },
            });

            const res = await request(app).get('/container1/triggers');

            expect(res.status).toBe(200);
            expect(res.body.map((t) => [t.id, t.supportsBatch])).toEqual([
                ['dockercompose.main', true],
                ['mqtt.home', false],
            ]);
        });
    });
});
