import express from 'express';
import request from 'supertest';
import * as authApi from './authentication';
import * as registry from '../registry';

jest.mock('../registry', () => ({
    getState: jest.fn(() => ({
        authentication: {
            'mock.test': {
                type: 'mock',
                name: 'test',
                maskConfiguration: () => ({ mockConfig: true }),
            },
        },
    })),
}));

describe('API Authentication', () => {
    let app: express.Express;

    beforeEach(() => {
        jest.clearAllMocks();
        app = express();
        app.use(express.json());
        app.use(authApi.init());
    });

    test('should get all authentications', async () => {
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

    test('should get authentication by type and name', async () => {
        const res = await request(app).get('/mock/test');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            id: 'mock.test',
            type: 'mock',
            name: 'test',
            configuration: { mockConfig: true },
        });
    });

    test('should return 404 for unknown authentication', async () => {
        const res = await request(app).get('/mock/unknown');
        expect(res.status).toBe(404);
    });
});
