import express from 'express';
import request from 'supertest';
import * as trigger from './trigger';
import * as registry from '../registry';

jest.mock('../registry', () => ({
    getState: jest.fn(() => ({
        trigger: {
            'mock.test': {
                type: 'mock',
                name: 'test',
                maskConfiguration: () => ({ mockConfig: true }),
                trigger: jest.fn().mockResolvedValue(true),
            },
            'mock.fail': {
                type: 'mock',
                name: 'fail',
                maskConfiguration: () => ({ mockConfig: true }),
                trigger: jest.fn().mockRejectedValue(new Error('fail error')),
            },
        },
    })),
}));

describe('API Trigger', () => {
    let app: express.Express;

    beforeEach(() => {
        jest.clearAllMocks();
        app = express();
        app.use(express.json());
        app.use(trigger.init());
    });

    test('should get all triggers', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([
            {
                id: 'mock.fail',
                type: 'mock',
                name: 'fail',
                configuration: { mockConfig: true },
            },
            {
                id: 'mock.test',
                type: 'mock',
                name: 'test',
                configuration: { mockConfig: true },
            },
        ]);
    });

    test('should get trigger by type and name', async () => {
        const res = await request(app).get('/mock/test');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            id: 'mock.test',
            type: 'mock',
            name: 'test',
            configuration: { mockConfig: true },
        });
    });

    test('should return 404 for unknown trigger', async () => {
        const res = await request(app).get('/mock/unknown');
        expect(res.status).toBe(404);
    });

    test('should run trigger successfully', async () => {
        const res = await request(app)
            .post('/mock/test')
            .send({ containerName: 'test-container' });
        expect(res.status).toBe(200);
    });

    test('should return 404 if trigger not found when running', async () => {
        const res = await request(app)
            .post('/mock/unknown')
            .send({ containerName: 'test-container' });
        expect(res.status).toBe(404);
        expect(res.body).toEqual({
            error: 'Error when running trigger mock.unknown (trigger not found)',
        });
    });

    test('should return 400 if no container provided', async () => {
        // We mock req.body inside a middleware for this specific test
        const appNoBody = express();
        appNoBody.use((req, res, next) => {
            req.body = undefined;
            next();
        });
        appNoBody.use(trigger.init());

        const res = await request(appNoBody).post('/mock/test');
        expect(res.status).toBe(400);
        expect(res.body).toEqual({
            error: 'Error when running trigger mock.test (container is undefined)',
        });
    });

    test('should handle trigger run failure', async () => {
        const res = await request(app)
            .post('/mock/fail')
            .send({ containerName: 'test-container' });
        expect(res.status).toBe(500);
        expect(res.body).toEqual({
            error: 'Error when running trigger mock.fail (fail error)',
        });
    });
});
