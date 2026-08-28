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
        app.use(containerRouterLocal.init());
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
        appDisabled.use(containerRouterLocal.init());

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
        expect(res.body.error).toContain(
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
        expect(res.body.error).toEqual('Trigger not found');
    });

    test('should return 404 if container not found when running trigger', async () => {
        (storeContainer.getContainer as jest.Mock).mockReturnValue(undefined);

        const res = await request(app).post('/container1/triggers/mock/test');
        expect(res.status).toBe(404);
        expect(res.body.error).toEqual('Container not found');
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
        expect(res.body.error).toContain('No provider found');
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
        expect(res.body.error).toContain('Error when watching container');
    });

    test('should return 404 for unknown container watch', async () => {
        (storeContainer.getContainer as jest.Mock).mockReturnValue(undefined);

        const res = await request(app).post('/container1/watch');
        expect(res.status).toBe(404);
    });
});
