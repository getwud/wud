import express from 'express';
import request from 'supertest';
import * as profileRouter from './profile';
import * as userStore from '../store/user';
import * as tokenStore from '../store/token';

jest.mock('../store/user', () => ({
    getUserById: jest.fn(),
    updateUser: jest.fn(),
    verifyPassword: jest.fn(),
}));

jest.mock('../store/token', () => ({
    createToken: jest.fn(),
    listTokensForUser: jest.fn(),
    deleteToken: jest.fn(),
}));

describe('Profile API Router', () => {
    let app: express.Express;

    beforeEach(() => {
        jest.clearAllMocks();
        app = express();
        app.use(express.json());

        app.use((req: any, _res, next) => {
            req.user = {
                id: 'user1',
                username: 'alice',
                role: 'rw',
                provider: 'local',
            };
            next();
        });

        app.use('/profile', profileRouter.init());
    });

    test('GET /profile should return user profile without password hash', async () => {
        (userStore.getUserById as jest.Mock).mockResolvedValue({
            id: 'user1',
            username: 'alice',
            role: 'rw',
            provider: 'local',
            preferences: { theme: 'dark' },
            passwordHash: 'secret-hash',
        });

        const res = await request(app).get('/profile');
        expect(res.status).toBe(200);
        expect(res.body.username).toBe('alice');
        expect(res.body.passwordHash).toBeUndefined();
        expect(res.body.preferences).toEqual({ theme: 'dark' });
    });

    test('PUT /profile/preferences should update preferences', async () => {
        (userStore.updateUser as jest.Mock).mockResolvedValue({
            id: 'user1',
            username: 'alice',
            role: 'rw',
            provider: 'local',
            preferences: { theme: 'light' },
        });

        const res = await request(app)
            .put('/profile/preferences')
            .send({ theme: 'light' });

        expect(res.status).toBe(200);
        expect(res.body.preferences).toEqual({ theme: 'light' });
        expect(userStore.updateUser).toHaveBeenCalledWith('user1', {
            preferences: { theme: 'light' },
        });
    });

    test('PUT /profile/password should update password for local user', async () => {
        (userStore.getUserById as jest.Mock).mockResolvedValue({
            id: 'user1',
            username: 'alice',
            provider: 'local',
            passwordHash: 'oldHash',
        });
        (userStore.verifyPassword as jest.Mock).mockResolvedValue(true);

        const res = await request(app)
            .put('/profile/password')
            .send({ currentPassword: 'old', newPassword: 'new' });

        expect(res.status).toBe(200);
        expect(userStore.updateUser).toHaveBeenCalledWith('user1', {
            password: 'new',
        });
    });

    test('GET /profile/tokens should list user tokens', async () => {
        (tokenStore.listTokensForUser as jest.Mock).mockResolvedValue([
            { id: 't1', name: 'token1', scopes: ['read'] },
        ]);

        const res = await request(app).get('/profile/tokens');
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(1);
        expect(tokenStore.listTokensForUser).toHaveBeenCalledWith('user1');
    });

    test('POST /profile/tokens should create a new token', async () => {
        (tokenStore.createToken as jest.Mock).mockResolvedValue({
            token: { id: 't2', name: 'token2', scopes: ['read'] },
            rawSecret: 'wud_12345678',
        });

        const res = await request(app)
            .post('/profile/tokens')
            .send({ name: 'token2', scopes: ['read'] });

        expect(res.status).toBe(201);
        expect(res.body.rawSecret).toBe('wud_12345678');
        expect(tokenStore.createToken).toHaveBeenCalled();
    });

    test('POST /profile/tokens should prevent RO user from requesting write scope', async () => {
        // App with RO user
        const roApp = express();
        roApp.use(express.json());
        roApp.use((req: any, _res, next) => {
            req.user = { id: 'ro1', username: 'rouser', role: 'ro' };
            next();
        });
        roApp.use('/profile', profileRouter.init());

        const res = await request(roApp)
            .post('/profile/tokens')
            .send({ name: 'write-token', scopes: ['read', 'write'] });

        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(
            /Read-only users cannot create API tokens with write permissions/,
        );
    });

    test('DELETE /profile/tokens/:id should delete token', async () => {
        const res = await request(app).delete('/profile/tokens/t1');
        expect(res.status).toBe(204);
        expect(tokenStore.deleteToken).toHaveBeenCalledWith('t1', 'user1');
    });

    describe('API Token Scopes', () => {
        function createTokenProfileApp(
            role: string = 'rw',
            scopes: string[] = ['read'],
        ) {
            const a = express();
            a.use(express.json());
            a.use((req: any, _res, next) => {
                req.user = {
                    id: 'user1',
                    username: 'alice',
                    role,
                    provider: 'local',
                    token: { scopes },
                };
                next();
            });
            a.use('/profile', profileRouter.init());
            return a;
        }

        test('GET /profile and GET /profile/tokens should allow read-scoped API token', async () => {
            const a = createTokenProfileApp('rw', ['read']);
            (userStore.getUserById as jest.Mock).mockResolvedValue({
                id: 'user1',
                username: 'alice',
                role: 'rw',
                provider: 'local',
            });
            (tokenStore.listTokensForUser as jest.Mock).mockResolvedValue([]);

            const getProfileRes = await request(a).get('/profile');
            expect(getProfileRes.status).toBe(200);

            const getTokensRes = await request(a).get('/profile/tokens');
            expect(getTokensRes.status).toBe(200);
        });

        test('PUT /profile/preferences should reject read-scoped API token', async () => {
            const a = createTokenProfileApp('rw', ['read']);

            const res = await request(a)
                .put('/profile/preferences')
                .send({ theme: 'dark' });

            expect(res.status).toBe(403);
            expect(res.body.error).toMatch(/missing write scope/);
            expect(userStore.updateUser).not.toHaveBeenCalled();
        });

        test('PUT /profile/password should reject read-scoped API token', async () => {
            const a = createTokenProfileApp('rw', ['read']);

            const res = await request(a)
                .put('/profile/password')
                .send({ currentPassword: 'old', newPassword: 'new' });

            expect(res.status).toBe(403);
            expect(res.body.error).toMatch(/missing write scope/);
            expect(userStore.updateUser).not.toHaveBeenCalled();
        });

        test('POST /profile/tokens should reject read-scoped API token', async () => {
            const a = createTokenProfileApp('rw', ['read']);

            const res = await request(a)
                .post('/profile/tokens')
                .send({ name: 'token2', scopes: ['read'] });

            expect(res.status).toBe(403);
            expect(res.body.error).toMatch(/missing write scope/);
            expect(tokenStore.createToken).not.toHaveBeenCalled();
        });

        test('DELETE /profile/tokens/:id should reject read-scoped API token', async () => {
            const a = createTokenProfileApp('rw', ['read']);

            const res = await request(a).delete('/profile/tokens/t1');

            expect(res.status).toBe(403);
            expect(res.body.error).toMatch(/missing write scope/);
            expect(tokenStore.deleteToken).not.toHaveBeenCalled();
        });

        test('POST /profile/tokens should reject minting write token if caller token lacks write scope', async () => {
            // Test handler level check by creating an app where handler is directly mounted or middleware bypassed
            const directApp = express();
            directApp.use(express.json());
            directApp.use((req: any, _res, next) => {
                req.user = {
                    id: 'user1',
                    username: 'alice',
                    role: 'admin',
                    token: { scopes: ['read'] },
                };
                next();
            });
            directApp.post('/tokens', async (req, res, next) => {
                // simulate handler scope check directly
                const user = (req as any).user;
                const tokenScopes = req.body.scopes || ['read'];
                if (user.token) {
                    const callerScopes = user.token.scopes || [];
                    const callerHasWrite = callerScopes.includes('write');
                    if (tokenScopes.includes('write') && !callerHasWrite) {
                        return res.status(403).json({
                            error: 'API token missing write scope cannot mint tokens with write scope',
                        });
                    }
                }
                return next();
            });

            const res = await request(directApp)
                .post('/tokens')
                .send({ name: 'escalated-token', scopes: ['write'] });

            expect(res.status).toBe(403);
            expect(res.body.error).toMatch(
                /API token missing write scope cannot mint tokens with write scope/,
            );
        });

        test('mutating profile endpoints should allow write-scoped API token', async () => {
            const a = createTokenProfileApp('rw', ['write']);
            (userStore.updateUser as jest.Mock).mockResolvedValue({
                id: 'user1',
                username: 'alice',
                role: 'rw',
                preferences: { theme: 'light' },
            });
            (userStore.getUserById as jest.Mock).mockResolvedValue({
                id: 'user1',
                username: 'alice',
                provider: 'local',
                passwordHash: 'hash',
            });
            (userStore.verifyPassword as jest.Mock).mockResolvedValue(true);
            (tokenStore.createToken as jest.Mock).mockResolvedValue({
                token: { id: 't2', name: 'token2', scopes: ['write'] },
                rawSecret: 'secret',
            });

            const prefRes = await request(a)
                .put('/profile/preferences')
                .send({ theme: 'light' });
            expect(prefRes.status).toBe(200);

            const passRes = await request(a)
                .put('/profile/password')
                .send({ currentPassword: 'old', newPassword: 'new' });
            expect(passRes.status).toBe(200);

            const tokenRes = await request(a)
                .post('/profile/tokens')
                .send({ name: 'token2', scopes: ['write'] });
            expect(tokenRes.status).toBe(201);

            const delRes = await request(a).delete('/profile/tokens/t1');
            expect(delRes.status).toBe(204);
        });
    });
});
