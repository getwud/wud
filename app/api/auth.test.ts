import express from 'express';
import request from 'supertest';
import * as auth from './auth';

jest.mock('../store', () => {
    const Loki = require('lokijs');
    const db = new Loki('test.db');

    return {
        store: {
            getDb: jest.fn(() => db),
            getConfiguration: jest.fn(() => ({
                path: '/tmp',
                file: 'test.db',
            })),
        },
    };
});

jest.mock('../registry', () => ({
    getState: jest.fn(() => ({
        authentication: {
            mockAuth: {
                getId: () => 'mockAuth',
                getStrategy: () => ({ name: 'mockStrategy' }),
                getStrategyDescription: () => ({
                    type: 'mock',
                    name: 'Mock Auth',
                    logoutUrl: 'http://logout',
                }),
            },
        },
    })),
}));

jest.mock('getmac', () => jest.fn(() => '00:00:00:00:00:00'));
jest.mock('uuid', () => ({
    v5: jest.fn(() => '12345678-1234-5678-1234-567812345678'),
}));

jest.mock('../configuration', () => ({
    getVersion: jest.fn(() => '1.0.0'),
    getLogLevel: jest.fn(() => 'info'),
}));

describe('API Auth', () => {
    let app: express.Express;

    beforeEach(() => {
        jest.clearAllMocks();
        app = express();
        app.use(express.json());

        // Mock passport authentication middleware so it passes
        const passport = require('passport');
        jest.spyOn(passport, 'authenticate').mockImplementation(
            () => (req: any, res: any, next: any) => {
                req.user = { username: 'testuser' };
                req.isAuthenticated = () => true;
                next();
            },
        );
        jest.spyOn(passport, 'initialize').mockImplementation(
            () => (req: any, res: any, next: any) => {
                req.logout = jest.fn((cb: any) => {
                    if (typeof cb === 'function') cb(null);
                });
                req.isAuthenticated = () => true;
                req.user = { username: 'testuser' };
                next();
            },
        );
        jest.spyOn(passport, 'session').mockImplementation(
            () => (req: any, res: any, next: any) => next(),
        );

        auth.init(app);
    });

    test('GET /auth/strategies should return unique strategies', async () => {
        const res = await request(app).get('/auth/strategies');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([
            { type: 'mock', name: 'Mock Auth', logoutUrl: 'http://logout' },
        ]);
    });

    test('POST /auth/login should return user', async () => {
        const res = await request(app).post('/auth/login');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ username: 'testuser' });
    });

    test('GET /auth/user should return current user', async () => {
        const res = await request(app).get('/auth/user');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ username: 'testuser' });
    });

    test('POST /auth/logout should clear session', async () => {
        // We override the passport mock to mock req.logout
        const tempApp = express();
        tempApp.use(express.json());
        auth.init(tempApp);
        tempApp.use((err: any, req: any, res: any) => {
            console.error(err);
            res.status(500).json({ error: err.message });
        });

        const res = await request(tempApp).post('/auth/logout');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('logoutUrl');
    });

    test('requireAuthentication middleware should proceed if authenticated', () => {
        const req = { isAuthenticated: () => true } as any;
        const res = {} as any;
        const next = jest.fn();
        auth.requireAuthentication(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    test('requireAuthentication middleware should call passport if not authenticated', () => {
        const req = { isAuthenticated: () => false } as any;
        const res = {} as any;
        const next = jest.fn();

        auth.requireAuthentication(req, res, next);
        // Since we mocked passport.authenticate to call next() and set user
        expect(req.user).toEqual({ username: 'testuser' });
        expect(next).toHaveBeenCalled();
    });

    test('getAllIds should return registered strategy ids', () => {
        const ids = auth.getAllIds();
        expect(ids).toContain('mockAuth');
    });
});
