import express from 'express';
import request from 'supertest';
import * as auth from './auth';
import * as registry from '../registry';
import { countLocalUsers, getUserById } from '../store/user';

jest.mock('./SqliteSessionStore', () => {
    const session = require('express-session');
    return jest.fn().mockImplementation(() => new session.MemoryStore());
});

jest.mock('../store/user', () => ({
    getUserById: jest.fn(),
    countLocalUsers: jest.fn(),
}));

jest.mock('../store', () => ({
    store: {
        getConfiguration: jest.fn(() => ({
            path: '/tmp',
            file: 'wud.sqlite',
        })),
    },
}));

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
    let serializeUserFn: (
        user: unknown,
        done: (err: unknown, serialized?: unknown) => void,
    ) => void;
    let deserializeUserFn: (
        serialized: unknown,
        done: (err: unknown, user?: unknown) => void,
    ) => Promise<void>;

    beforeEach(() => {
        jest.clearAllMocks();
        (registry.getState as jest.Mock).mockReturnValue({
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
        });
        (countLocalUsers as jest.Mock).mockResolvedValue(1);
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
        jest.spyOn(passport, 'serializeUser').mockImplementation(
            (fn: unknown) => {
                serializeUserFn = fn as (
                    user: unknown,
                    done: (err: unknown, serialized?: unknown) => void,
                ) => void;
            },
        );
        jest.spyOn(passport, 'deserializeUser').mockImplementation(
            (fn: unknown) => {
                deserializeUserFn = fn as (
                    serialized: unknown,
                    done: (err: unknown, user?: unknown) => void,
                ) => Promise<void>;
            },
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

    test('GET /auth/strategies should exclude basic strategy when countLocalUsers is 0', async () => {
        (countLocalUsers as jest.Mock).mockResolvedValue(0);
        (registry.getState as jest.Mock).mockReturnValue({
            authentication: {
                basicAuth: {
                    getId: () => 'basicAuth',
                    getStrategy: () => ({ name: 'basic' }),
                    getStrategyDescription: () => ({
                        type: 'basic',
                        name: 'Local Credentials',
                    }),
                },
                oidcAuth: {
                    getId: () => 'oidcAuth',
                    getStrategy: () => ({ name: 'oidc' }),
                    getStrategyDescription: () => ({
                        type: 'oidc',
                        name: 'Keycloak',
                    }),
                },
            },
        });

        const res = await request(app).get('/auth/strategies');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ type: 'oidc', name: 'Keycloak' }]);
        expect(countLocalUsers).toHaveBeenCalled();
    });

    test('GET /auth/strategies should include basic strategy when countLocalUsers > 0', async () => {
        (countLocalUsers as jest.Mock).mockResolvedValue(2);
        (registry.getState as jest.Mock).mockReturnValue({
            authentication: {
                basicAuth: {
                    getId: () => 'basicAuth',
                    getStrategy: () => ({ name: 'basic' }),
                    getStrategyDescription: () => ({
                        type: 'basic',
                        name: 'Local Credentials',
                    }),
                },
                oidcAuth: {
                    getId: () => 'oidcAuth',
                    getStrategy: () => ({ name: 'oidc' }),
                    getStrategyDescription: () => ({
                        type: 'oidc',
                        name: 'Keycloak',
                    }),
                },
            },
        });

        const res = await request(app).get('/auth/strategies');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([
            { type: 'oidc', name: 'Keycloak' },
            { type: 'basic', name: 'Local Credentials' },
        ]);
        expect(countLocalUsers).toHaveBeenCalled();
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

    describe('passport serializeUser and deserializeUser', () => {
        test('serializeUser should serialize user to JSON string', () => {
            const done = jest.fn();
            serializeUserFn({ id: 'u1', username: 'alice' }, done);
            expect(done).toHaveBeenCalledWith(
                null,
                JSON.stringify({ id: 'u1', username: 'alice' }),
            );
        });

        test('deserializeUser should return user when found in database', async () => {
            (getUserById as jest.Mock).mockResolvedValue({
                id: 'u1',
                username: 'alice',
                role: 'admin',
                provider: 'local',
                preferences: { theme: 'dark' },
            });

            const done = jest.fn();
            await deserializeUserFn(
                JSON.stringify({ id: 'u1', username: 'stale-name' }),
                done,
            );

            expect(getUserById).toHaveBeenCalledWith('u1');
            expect(done).toHaveBeenCalledWith(null, {
                id: 'u1',
                username: 'alice',
                role: 'admin',
                provider: 'local',
                preferences: { theme: 'dark' },
            });
        });

        test('deserializeUser should reject with false when user was deleted (GHSA-gwmj-qqhx-pr5c)', async () => {
            (getUserById as jest.Mock).mockResolvedValue(undefined);

            const done = jest.fn();
            await deserializeUserFn(
                JSON.stringify({
                    id: 'u-deleted',
                    username: 'deleted',
                    role: 'admin',
                }),
                done,
            );

            expect(getUserById).toHaveBeenCalledWith('u-deleted');
            expect(done).toHaveBeenCalledWith(null, false);
        });

        test('deserializeUser should reject with false when id is missing', async () => {
            const done = jest.fn();
            await deserializeUserFn(
                JSON.stringify({ username: 'missing-id', role: 'admin' }),
                done,
            );

            expect(getUserById).not.toHaveBeenCalled();
            expect(done).toHaveBeenCalledWith(null, false);
        });

        test('deserializeUser should reject with false when serialized object is empty', async () => {
            const done = jest.fn();
            await deserializeUserFn(JSON.stringify({}), done);

            expect(getUserById).not.toHaveBeenCalled();
            expect(done).toHaveBeenCalledWith(null, false);
        });

        test('deserializeUser should reject with false when serialized value is null', async () => {
            const done = jest.fn();
            await deserializeUserFn(JSON.stringify(null), done);

            expect(getUserById).not.toHaveBeenCalled();
            expect(done).toHaveBeenCalledWith(null, false);
        });

        test('deserializeUser should accept object input if not stringified', async () => {
            (getUserById as jest.Mock).mockResolvedValue({
                id: 'u2',
                username: 'bob',
                role: 'ro',
                provider: 'oidc',
                preferences: null,
            });

            const done = jest.fn();
            await deserializeUserFn({ id: 'u2' }, done);

            expect(getUserById).toHaveBeenCalledWith('u2');
            expect(done).toHaveBeenCalledWith(null, {
                id: 'u2',
                username: 'bob',
                role: 'ro',
                provider: 'oidc',
                preferences: null,
            });
        });

        test('deserializeUser should pass syntax error when JSON is invalid', async () => {
            const done = jest.fn();
            await deserializeUserFn('not-valid-json-{', done);

            expect(done).toHaveBeenCalledWith(expect.any(SyntaxError));
        });

        test('deserializeUser should pass error when getUserById throws', async () => {
            (getUserById as jest.Mock).mockRejectedValue(
                new Error('DB failure'),
            );

            const done = jest.fn();
            await deserializeUserFn(JSON.stringify({ id: 'u1' }), done);

            expect(done).toHaveBeenCalledWith(expect.any(Error));
        });
    });
});
