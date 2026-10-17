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
            cacheStats: { size: 10, hits: 5, misses: 2 },
        })),
        clearCache: jest.fn(),
    };
    return {
        getRemoteMetadataProvider: jest.fn(() => mockProvider),
    };
});

jest.mock('./auth', () => ({
    requireAuthentication: (req: any, res: any, next: any) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        next();
    },
}));

describe('Hub API Router', () => {
    let app: express.Express;
    let currentUser: any;

    beforeEach(() => {
        jest.clearAllMocks();
        currentUser = { id: 'admin1', username: 'admin', role: 'admin' };
        app = express();
        app.use(express.json());

        app.use((req: any, _res, next) => {
            if (currentUser) {
                req.user = currentUser;
            }
            next();
        });

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
        currentUser = null;
        const res = await request(app).get('/hub/status');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('connected');
        expect(res.body.enabled).toBe(true);
    });

    test('POST /hub/cache/clear should return 401 when unauthenticated', async () => {
        currentUser = null;
        const res = await request(app).post('/hub/cache/clear');
        expect(res.status).toBe(401);

        const provider = getRemoteMetadataProvider();
        expect(provider.clearCache).not.toHaveBeenCalled();
    });

    test('POST /hub/cache/clear should return 204 for admin user', async () => {
        const res = await request(app).post('/hub/cache/clear');
        expect(res.status).toBe(204);

        const provider = getRemoteMetadataProvider();
        expect(provider.clearCache).toHaveBeenCalled();
    });

    test('POST /hub/cache/clear should return 403 for read-only user', async () => {
        currentUser = { id: 'ro1', username: 'viewer', role: 'ro' };
        const res = await request(app).post('/hub/cache/clear');
        expect(res.status).toBe(403);

        const provider = getRemoteMetadataProvider();
        expect(provider.clearCache).not.toHaveBeenCalled();
    });
});
