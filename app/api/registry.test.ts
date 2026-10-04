import express from 'express';
import request from 'supertest';
import * as registryApi from './registry';
import * as registry from '../registry';
import Registry from '../registries/Registry';

jest.mock('../registry', () => ({
    getState: jest.fn(() => ({
        registry: {
            'mock.test': {
                type: 'mock',
                name: 'test',
                maskConfiguration: () => ({ mockConfig: true }),
            },
        },
    })),
}));

describe('API Registry', () => {
    let app: express.Express;

    beforeEach(() => {
        jest.clearAllMocks();
        app = express();
        app.use(express.json());
        app.get('/', registryApi.getRegistries);
        app.get('/:type/:name', registryApi.getRegistry);
    });

    test('should get all registries', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([
            {
                id: 'mock.test',
                type: 'mock',
                name: 'test',
                configuration: { mockConfig: true },
            },
        ]);
    });

    test('should get registry by type and name', async () => {
        const res = await request(app).get('/mock/test');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            id: 'mock.test',
            type: 'mock',
            name: 'test',
            configuration: { mockConfig: true },
        });
    });

    test('registry API masks nested webhook credentials', async () => {
        const provider = new Registry();
        provider.type = 'mock';
        provider.name = 'test';
        provider.configuration = { webhook: { token: 'private-secret' } };
        jest.mocked(registry.getState).mockReturnValueOnce({
            registry: { 'mock.test': provider },
        } as unknown as registry.RegistryState);
        const response = await request(app).get('/');
        expect(response.status).toBe(200);
        expect(JSON.stringify(response.body)).not.toContain('private-secret');
        expect(provider.configuration.webhook.token).toBe('private-secret');
    });
    test('should return 404 for unknown registry', async () => {
        const res = await request(app).get('/mock/unknown');
        expect(res.status).toBe(404);
    });
});
