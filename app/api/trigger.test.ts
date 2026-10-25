import express from 'express';
import request from 'supertest';
import * as trigger from './trigger';
import * as registry from '../registry';

const mockTestTrigger = jest.fn().mockResolvedValue(true);
const mockFailTrigger = jest.fn().mockRejectedValue(new Error('fail error'));

jest.mock('../registry', () => ({
    getState: jest.fn(() => ({
        trigger: {
            'mock.test': {
                type: 'mock',
                name: 'test',
                maskConfiguration: () => ({ mockConfig: true }),
                trigger: mockTestTrigger,
            },
            'mock.fail': {
                type: 'mock',
                name: 'fail',
                maskConfiguration: () => ({ mockConfig: true }),
                trigger: mockFailTrigger,
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
        app.get('/', trigger.getTriggers);
        app.get('/:type/:name', trigger.getTrigger);
        app.post('/:type/:name', trigger.runTrigger);
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

    test('should set overrideCooldown=true on container when running trigger with overrideCooldown query parameter', async () => {
        const payload = { containerName: 'test-container' };
        const res = await request(app)
            .post('/mock/test?overrideCooldown=true')
            .send(payload);
        expect(res.status).toBe(200);
        expect(mockTestTrigger).toHaveBeenCalledWith(
            expect.objectContaining({
                containerName: 'test-container',
                overrideCooldown: true,
            }),
        );
    });

    test('should return 404 if trigger not found when running', async () => {
        const res = await request(app)
            .post('/mock/unknown')
            .send({ containerName: 'test-container' });
        expect(res.status).toBe(404);
        expect(res.body).toEqual({
            error: 'Not found',
            message:
                'Error when running trigger mock.unknown (trigger not found)',
        });
    });

    test('should return 400 if no container provided', async () => {
        // We mock req.body inside a middleware for this specific test
        const appNoBody = express();
        appNoBody.use((req, res, next) => {
            req.body = undefined;
            next();
        });
        appNoBody.post('/:type/:name', trigger.runTrigger);

        const res = await request(appNoBody).post('/mock/test');
        expect(res.status).toBe(400);
        expect(res.body).toEqual({
            error: 'Bad Request',
            message:
                'Error when running trigger mock.test (container is undefined)',
        });
    });

    test('should handle trigger run failure', async () => {
        const res = await request(app)
            .post('/mock/fail')
            .send({ containerName: 'test-container' });
        expect(res.status).toBe(500);
        expect(res.body).toEqual({
            error: 'Trigger execution failed',
            message: 'Error when running trigger mock.fail (fail error)',
        });
    });
});
