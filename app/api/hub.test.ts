import express from 'express';
import request from 'supertest';
import * as hubRouter from './hub';
import { getRemoteMetadataProvider } from '../metadata';

jest.mock('../metadata', () => {
    const mockProvider = {
        getStatus: jest.fn(() => ({
            enabled: true,
            status: 'connected',
            endpoint: 'https://hub.getwud.com',
            hasKey: true,
        })),
    };
    return {
        getRemoteMetadataProvider: jest.fn(() => mockProvider),
    };
});

describe('Hub API Router', () => {
    let app: express.Express;

    beforeEach(() => {
        jest.clearAllMocks();
        app = express();
        app.use(express.json());
        app.use('/hub', hubRouter.init());
    });

    test('GET /hub/status should return 200 with status summary for authenticated user', async () => {
        const res = await request(app).get('/hub/status');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('connected');
        expect(res.body.enabled).toBe(true);
        expect(res.body.hasKey).toBe(true);

        const provider = getRemoteMetadataProvider();
        expect(provider.getStatus).toHaveBeenCalled();
    });

    test('GET /hub/status should return 200 without authentication', async () => {
        const res = await request(app).get('/hub/status');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('connected');
        expect(res.body.enabled).toBe(true);
    });
});

