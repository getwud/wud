import express from 'express';
import request from 'supertest';
import * as registryApi from './registry';
import * as registry from '../registry';

jest.mock('../registry', () => ({
    getState: jest.fn(() => ({
        registry: {
            'mock.test': {
                type: 'mock',
                name: 'test',
                maskConfiguration: () => ({ mockConfig: true })
            }
        }
    }))
}));

describe('API Registry', () => {
    let app: express.Express;

    beforeEach(() => {
        jest.clearAllMocks();
        app = express();
        app.use(express.json());
        app.use(registryApi.init());
    });

    test('should get all registries', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([
            { id: 'mock.test', type: 'mock', name: 'test', configuration: { mockConfig: true } }
        ]);
    });

    test('should get registry by type and name', async () => {
        const res = await request(app).get('/mock/test');
        expect(res.status).toBe(200);
        expect(res.body).toEqual(
            { id: 'mock.test', type: 'mock', name: 'test', configuration: { mockConfig: true } }
        );
    });

    test('should return 404 for unknown registry', async () => {
        const res = await request(app).get('/mock/unknown');
        expect(res.status).toBe(404);
    });
});
