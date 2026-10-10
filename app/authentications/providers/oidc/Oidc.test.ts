import { ValidationError } from 'joi';
import express from 'express';
import * as client from 'openid-client';
import Oidc, {
    prunePendingChecks,
    withOidcSessionLock,
    reloadSession,
    saveSession,
    OIDC_CHECKS_TTL_MS,
    OIDC_MAX_PENDING_CHECKS,
} from './Oidc';
import * as userStore from '../../../store/user';

// Mock the openid-client module
jest.mock('openid-client');

jest.mock('../../../store/user', () => ({
    getUserByUsername: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
}));

const app = express();

const configurationValid = {
    clientid: '123465798',
    clientsecret: 'secret',
    discovery: 'https://idp/.well-known/openid-configuration',
    redirect: false,
    timeout: 5000,
    ttl: 60,
    usernameclaim: 'email',
    groupsclaim: 'groups',
    defaultrole: 'ro',
};

const mockConfig = {
    serverMetadata: jest.fn().mockReturnValue({
        supportsPKCE: jest.fn().mockReturnValue(true),
    }),
};

let oidc: any;

beforeEach(async () => {
    jest.resetAllMocks();
    (userStore.getUserByUsername as jest.Mock).mockResolvedValue(null);
    (userStore.createUser as jest.Mock).mockImplementation((data) =>
        Promise.resolve({
            id: 'oidc-user-id',
            username: data.username,
            role: data.role || 'ro',
            provider: 'oidc',
            preferences: { theme: 'light' },
        }),
    );
    (userStore.updateUser as jest.Mock).mockImplementation((id, data) =>
        Promise.resolve({
            id,
            username: 'mocked',
            role: data.role || 'ro',
            provider: 'oidc',
            preferences: { theme: 'light' },
        }),
    );

    oidc = new Oidc();
    oidc.configuration = configurationValid;
    // Access private config property for testing
    (oidc as any).config = mockConfig;
    (oidc as any).discoveryCachedAt = Date.now();
    oidc.log = { debug: jest.fn(), warn: jest.fn(), info: jest.fn() };
});

test('validateConfiguration should return validated configuration when valid', async () => {
    const validatedConfiguration =
        oidc.validateConfiguration(configurationValid);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should throw error when invalid', async () => {
    const configuration = {};
    expect(() => {
        oidc.validateConfiguration(configuration);
    }).toThrow(ValidationError);
});

test('getStrategy should return an Authentication strategy', async () => {
    const strategy = oidc.getStrategy(app);
    expect(strategy.name).toEqual('oidc');
});

test('maskConfiguration should mask configuration secrets', async () => {
    expect(oidc.maskConfiguration()).toEqual({
        clientid: '1*******8',
        clientsecret: 's****t',
        discovery: 'https://idp/.well-known/openid-configuration',
        redirect: false,
        timeout: 5000,
        ttl: 60,
        usernameclaim: 'email',
        groupsclaim: 'groups',
        defaultrole: 'ro',
    });
});

test('getStrategyDescription should return strategy description', async () => {
    // Set private logoutUrl property for testing
    (oidc as any).logoutUrl = 'https://idp/logout';
    expect(oidc.getStrategyDescription()).toEqual({
        type: 'oidc',
        name: oidc.name,
        redirect: false,
        logoutUrl: 'https://idp/logout',
    });
});

test('initAuthentication should not throw when discovery fails', async () => {
    (oidc as any).config = undefined;
    (client.discovery as jest.Mock).mockRejectedValue(
        new Error('Authority unavailable'),
    );
    oidc.log = { debug: jest.fn(), warn: jest.fn(), info: jest.fn() };

    await expect(oidc.initAuthentication()).resolves.toBeUndefined();
    expect(client.discovery).toHaveBeenCalledTimes(1);
});

test('getUserFromAccessToken should retry discovery after initial failure', async () => {
    (oidc as any).config = undefined;
    (client.discovery as jest.Mock)
        .mockRejectedValueOnce(new Error('Authority unavailable'))
        .mockResolvedValueOnce(mockConfig);
    (client.fetchUserInfo as jest.Mock).mockResolvedValue({
        email: 'retry@example.com',
    });
    oidc.log = { debug: jest.fn(), warn: jest.fn(), info: jest.fn() };

    await oidc.initAuthentication();
    const user = await oidc.getUserFromAccessToken('token');

    expect(client.discovery).toHaveBeenCalledTimes(2);
    expect(user).toEqual(
        expect.objectContaining({ username: 'retry@example.com' }),
    );
});

test('getUserFromAccessToken should rediscover when cache ttl expires', async () => {
    (oidc as any).config = undefined;
    (client.discovery as jest.Mock).mockResolvedValue(mockConfig);
    (client.fetchUserInfo as jest.Mock).mockResolvedValue({
        email: 'ttl@example.com',
    });

    await oidc.initAuthentication();
    (oidc as any).discoveryCachedAt =
        Date.now() - configurationValid.ttl * 60_000 - 1;

    const user = await oidc.getUserFromAccessToken('token');

    expect(client.discovery).toHaveBeenCalledTimes(2);
    expect(user).toEqual(
        expect.objectContaining({ username: 'ttl@example.com' }),
    );
});

test('getUserFromAccessToken should keep discovery cache when ttl is unlimited', async () => {
    oidc.configuration = { ...configurationValid, ttl: -1 };
    (oidc as any).cachedConfig = mockConfig;
    (oidc as any).discoveryCachedAt = 0;
    (client.fetchUserInfo as jest.Mock).mockResolvedValue({
        email: 'unlimited@example.com',
    });

    const user = await oidc.getUserFromAccessToken('token');

    expect(client.discovery).not.toHaveBeenCalled();
    expect(user).toEqual(
        expect.objectContaining({ username: 'unlimited@example.com' }),
    );
});

test('verify should return user on valid token', async () => {
    oidc.configuration = { ...configurationValid, ttl: -1 };
    (oidc as any).cachedConfig = mockConfig;
    const mockUserInfo = { email: 'test@example.com' };
    (client.fetchUserInfo as jest.Mock).mockResolvedValue(mockUserInfo);

    const done = jest.fn();
    await oidc.verify('valid-token', done);

    expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({ username: 'test@example.com' }),
    );
});

test('verify should return false on invalid token', async () => {
    (client.fetchUserInfo as jest.Mock).mockRejectedValue(
        new Error('Invalid token'),
    );
    oidc.log = { warn: jest.fn(), info: jest.fn(), debug: jest.fn() };

    const done = jest.fn();
    await oidc.verify('invalid-token', done);
    expect(done).toHaveBeenCalledWith(null, false);
});

test('getUserFromAccessToken should return user with email', async () => {
    oidc.configuration = { ...configurationValid, ttl: -1 };
    (oidc as any).cachedConfig = mockConfig;
    const mockUserInfo = { email: 'user@example.com' };
    (client.fetchUserInfo as jest.Mock).mockResolvedValue(mockUserInfo);

    const user = await oidc.getUserFromAccessToken('token');
    expect(user).toEqual(
        expect.objectContaining({ username: 'user@example.com' }),
    );
});

test('getUserFromAccessToken should return unknown for missing email', async () => {
    oidc.configuration = { ...configurationValid, ttl: -1 };
    (oidc as any).cachedConfig = mockConfig;
    const mockUserInfo = {};
    (client.fetchUserInfo as jest.Mock).mockResolvedValue(mockUserInfo);

    const user = await oidc.getUserFromAccessToken('token');
    expect(user).toEqual(expect.objectContaining({ username: 'unknown' }));
});

test('getUserFromAccessToken should skip the subject check when called without a claim (bearer token path)', async () => {
    oidc.configuration = { ...configurationValid, ttl: -1 };
    (oidc as any).cachedConfig = mockConfig;
    (client.fetchUserInfo as jest.Mock).mockResolvedValue({
        email: 'bearer@example.com',
    });

    await oidc.getUserFromAccessToken('token');

    expect(client.fetchUserInfo).toHaveBeenCalledWith(
        mockConfig,
        'token',
        client.skipSubjectCheck,
    );
});

test('getUserFromAccessToken should check the subject when called with a claim (authorization code path)', async () => {
    oidc.configuration = { ...configurationValid, ttl: -1 };
    (oidc as any).cachedConfig = mockConfig;
    (client.fetchUserInfo as jest.Mock).mockResolvedValue({
        email: 'code@example.com',
    });

    await oidc.getUserFromAccessToken('token', { sub: 'abc' } as any);

    expect(client.fetchUserInfo).toHaveBeenCalledWith(
        mockConfig,
        'token',
        'abc',
    );
});

test('redirect should store next url in session when valid relative path provided', async () => {
    oidc.configuration = { ...configurationValid, ttl: -1 };
    (oidc as any).cachedConfig = mockConfig;
    (client.randomPKCECodeVerifier as jest.Mock).mockReturnValue('verifier');
    (client.calculatePKCECodeChallenge as jest.Mock).mockResolvedValue(
        'challenge',
    );
    (client.randomState as jest.Mock).mockReturnValue('state123');
    (client.buildAuthorizationUrl as jest.Mock).mockReturnValue(
        new URL('https://idp/auth'),
    );

    const req: any = {
        protocol: 'http',
        headers: { host: 'localhost:3000' },
        session: {},
        query: { next: '/containers?update=true' },
    };
    const res: any = {
        json: jest.fn(),
    };

    await oidc.redirect(req, res);

    expect(req.session.oidc.next).toEqual('/containers?update=true');
    expect(res.json).toHaveBeenCalledWith({ url: new URL('https://idp/auth') });
});

test('redirect should ignore next url when not a relative path', async () => {
    oidc.configuration = { ...configurationValid, ttl: -1 };
    (oidc as any).cachedConfig = mockConfig;
    (client.randomPKCECodeVerifier as jest.Mock).mockReturnValue('verifier');
    (client.calculatePKCECodeChallenge as jest.Mock).mockResolvedValue(
        'challenge',
    );
    (client.randomState as jest.Mock).mockReturnValue('state123');
    (client.buildAuthorizationUrl as jest.Mock).mockReturnValue(
        new URL('https://idp/auth'),
    );

    const req: any = {
        protocol: 'http',
        headers: { host: 'localhost:3000' },
        session: {},
        query: { next: 'https://attacker.com' },
    };
    const res: any = {
        json: jest.fn(),
    };

    await oidc.redirect(req, res);

    expect(req.session.oidc.next).toBeUndefined();
});

test('callback should redirect to next url when authenticated', async () => {
    oidc.configuration = { ...configurationValid, ttl: -1 };
    (oidc as any).cachedConfig = mockConfig;
    (client.authorizationCodeGrant as jest.Mock).mockResolvedValue({
        access_token: 'token123',
        claims: () => ({ sub: 'user-sub' }),
    });
    (client.fetchUserInfo as jest.Mock).mockResolvedValue({
        email: 'user@example.com',
    });

    const req: any = {
        protocol: 'http',
        headers: { host: 'localhost:3000' },
        originalUrl: '/auth/oidc/oidc/cb?code=123',
        session: {
            oidc: {
                codeVerifier: 'verifier',
                state: 'state123',
                next: '/containers',
            },
        },
        query: {},
        login: jest.fn((user, cb) => cb(null)),
    };
    const res: any = {
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
    };

    await oidc.callback(req, res);

    expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/containers',
    );
    expect(req.session.oidc.next).toBeUndefined();
});

test('getEffectiveScope should return base scopes when no groups configured', () => {
    oidc.configuration = { ...configurationValid };
    expect(oidc.getEffectiveScope()).toEqual('openid email profile');
});

test('getEffectiveScope should include groups when admingroup is configured and no server metadata', () => {
    oidc.configuration = { ...configurationValid, admingroup: 'admins' };
    expect(oidc.getEffectiveScope()).toEqual('openid email profile groups');
});

test('getEffectiveScope should include groups when IdP declares groups in scopes_supported (Authelia/Authentik)', () => {
    oidc.configuration = { ...configurationValid, admingroup: 'admins' };
    const configWithGroups = {
        serverMetadata: () => ({
            scopes_supported: ['openid', 'email', 'profile', 'groups'],
        }),
    };
    expect(oidc.getEffectiveScope(configWithGroups as any)).toEqual(
        'openid email profile groups',
    );
});

test('getEffectiveScope should NOT include groups when IdP does NOT declare groups in scopes_supported (Entra ID/Google)', () => {
    oidc.configuration = { ...configurationValid, admingroup: 'admins' };
    const configWithoutGroups = {
        serverMetadata: () => ({
            scopes_supported: ['openid', 'email', 'profile', 'offline_access'],
        }),
    };
    expect(oidc.getEffectiveScope(configWithoutGroups as any)).toEqual(
        'openid email profile',
    );
});

test('getEffectiveScope should return explicitly configured scope regardless of metadata', () => {
    oidc.configuration = {
        ...configurationValid,
        scope: 'openid email profile custom',
    };
    expect(oidc.getEffectiveScope()).toEqual('openid email profile custom');
});

test('redirect should use effective scope with groups when admingroup is set', async () => {
    oidc.configuration = {
        ...configurationValid,
        admingroup: 'wud-admin',
        ttl: -1,
    };
    (oidc as any).cachedConfig = mockConfig;
    (client.randomPKCECodeVerifier as jest.Mock).mockReturnValue('verifier');
    (client.calculatePKCECodeChallenge as jest.Mock).mockResolvedValue(
        'challenge',
    );
    (client.randomState as jest.Mock).mockReturnValue('state123');
    (client.buildAuthorizationUrl as jest.Mock).mockReturnValue(
        new URL('https://idp/auth'),
    );

    const req: any = {
        protocol: 'http',
        headers: { host: 'localhost:3000' },
        session: {},
        query: {},
    };
    const res: any = { json: jest.fn() };

    await oidc.redirect(req, res);

    expect(client.buildAuthorizationUrl).toHaveBeenCalledWith(
        mockConfig,
        expect.objectContaining({
            scope: 'openid email profile groups',
        }),
    );
});

test('getUserFromAccessToken should assign admin role when group matches admingroup', async () => {
    oidc.configuration = {
        ...configurationValid,
        admingroup: 'wud-admin',
        ttl: -1,
    };
    (oidc as any).cachedConfig = mockConfig;
    (client.fetchUserInfo as jest.Mock).mockResolvedValue({
        email: 'admin@example.com',
        groups: ['other-group', 'wud-admin'],
    });

    const user = await oidc.getUserFromAccessToken('token');
    expect(user.role).toEqual('admin');
});

test('validateConfiguration should accept rogroup and defaultrole none', async () => {
    const config = {
        ...configurationValid,
        rogroup: 'readers',
        defaultrole: 'none',
    };
    const validated = oidc.validateConfiguration(config);
    expect(validated.rogroup).toEqual('readers');
    expect(validated.defaultrole).toEqual('none');
});

test('validateConfiguration should throw error when defaultrole is invalid', async () => {
    const config = {
        ...configurationValid,
        defaultrole: 'invalid',
    };
    expect(() => {
        oidc.validateConfiguration(config);
    }).toThrow(ValidationError);
});

test('getEffectiveScope should include groups when rogroup is configured', () => {
    oidc.configuration = { ...configurationValid, rogroup: 'readers' };
    expect(oidc.getEffectiveScope()).toEqual('openid email profile groups');
});

test('getUserFromAccessToken should assign ro role when group matches rogroup', async () => {
    oidc.configuration = {
        ...configurationValid,
        rogroup: 'wud-ro',
        ttl: -1,
    };
    (oidc as any).cachedConfig = mockConfig;
    (client.fetchUserInfo as jest.Mock).mockResolvedValue({
        email: 'reader@example.com',
        groups: ['wud-ro'],
    });

    const user = await oidc.getUserFromAccessToken('token');
    expect(user.role).toEqual('ro');
});

test('getUserFromAccessToken should throw access denied when defaultrole is none and user has no matching group', async () => {
    oidc.configuration = {
        ...configurationValid,
        admingroup: 'wud-admin',
        rwgroup: 'wud-rw',
        rogroup: 'wud-ro',
        defaultrole: 'none',
        ttl: -1,
    };
    (oidc as any).cachedConfig = mockConfig;
    (client.fetchUserInfo as jest.Mock).mockResolvedValue({
        email: 'unauthorized@example.com',
        groups: ['other-group'],
    });

    await expect(oidc.getUserFromAccessToken('token')).rejects.toThrow(
        'Access denied: user does not belong to any authorized group',
    );
});

test('getUserFromAccessToken should allow access when defaultrole is none and group matches rogroup', async () => {
    oidc.configuration = {
        ...configurationValid,
        rogroup: 'wud-ro',
        defaultrole: 'none',
        ttl: -1,
    };
    (oidc as any).cachedConfig = mockConfig;
    (client.fetchUserInfo as jest.Mock).mockResolvedValue({
        email: 'reader@example.com',
        groups: ['wud-ro'],
    });

    const user = await oidc.getUserFromAccessToken('token');
    expect(user.role).toEqual('ro');
});

test('callback should redirect to login with error parameter when authentication fails', async () => {
    oidc.configuration = { ...configurationValid, ttl: -1 };
    (oidc as any).cachedConfig = mockConfig;
    (client.authorizationCodeGrant as jest.Mock).mockRejectedValue(
        new Error('Invalid authorization code'),
    );

    const req: any = {
        protocol: 'http',
        headers: { host: 'localhost:3000' },
        originalUrl: '/auth/oidc/oidc/cb?code=123',
        session: {
            oidc: {
                codeVerifier: 'verifier',
                state: 'state123',
            },
        },
        query: {},
    };
    const res: any = {
        redirect: jest.fn(),
    };

    await oidc.callback(req, res);

    expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/#/login?error=Invalid%20authorization%20code',
    );
});

describe('OIDC state and session handling (Issue #896)', () => {
    test('redirect should store multiple pending states in session across multiple calls', async () => {
        oidc.configuration = { ...configurationValid, ttl: -1 };
        (oidc as any).cachedConfig = mockConfig;
        (client.calculatePKCECodeChallenge as jest.Mock).mockResolvedValue(
            'challenge',
        );
        (client.buildAuthorizationUrl as jest.Mock).mockReturnValue(
            new URL('https://idp/auth'),
        );

        (client.randomPKCECodeVerifier as jest.Mock)
            .mockReturnValueOnce('verifier-1')
            .mockReturnValueOnce('verifier-2');
        (client.randomState as jest.Mock)
            .mockReturnValueOnce('state-1')
            .mockReturnValueOnce('state-2');

        const session: any = {};
        const req1: any = {
            protocol: 'http',
            headers: { host: 'localhost:3000' },
            sessionID: 'sess-123',
            session,
            query: { next: '/tab1' },
        };
        const res1: any = { json: jest.fn() };

        await oidc.redirect(req1, res1);

        expect(session.oidc.pending['state-1']).toBeDefined();
        expect(session.oidc.pending['state-1'].codeVerifier).toBe('verifier-1');
        expect(session.oidc.pending['state-1'].next).toBe('/tab1');

        const req2: any = {
            protocol: 'http',
            headers: { host: 'localhost:3000' },
            sessionID: 'sess-123',
            session,
            query: { next: '/tab2' },
        };
        const res2: any = { json: jest.fn() };

        await oidc.redirect(req2, res2);

        // Both states must be present in pending checks
        expect(session.oidc.pending['state-1']).toBeDefined();
        expect(session.oidc.pending['state-2']).toBeDefined();
        expect(session.oidc.pending['state-1'].codeVerifier).toBe('verifier-1');
        expect(session.oidc.pending['state-2'].codeVerifier).toBe('verifier-2');
        expect(session.oidc.pending['state-2'].next).toBe('/tab2');
        // Legacy single-check fields match latest redirect
        expect(session.oidc.state).toBe('state-2');
        expect(session.oidc.codeVerifier).toBe('verifier-2');
    });

    test('callback should resolve earlier pending state even after subsequent redirect', async () => {
        oidc.configuration = { ...configurationValid, ttl: -1 };
        (oidc as any).cachedConfig = mockConfig;
        (client.authorizationCodeGrant as jest.Mock).mockResolvedValue({
            access_token: 'token-tab1',
            claims: () => ({ sub: 'user-1' }),
        });
        (client.fetchUserInfo as jest.Mock).mockResolvedValue({
            email: 'user1@example.com',
        });

        const session: any = {
            oidc: {
                codeVerifier: 'verifier-2',
                state: 'state-2',
                next: '/tab2',
                pending: {
                    'state-1': {
                        state: 'state-1',
                        codeVerifier: 'verifier-1',
                        next: '/tab1',
                        createdAt: Date.now(),
                    },
                    'state-2': {
                        state: 'state-2',
                        codeVerifier: 'verifier-2',
                        next: '/tab2',
                        createdAt: Date.now(),
                    },
                },
            },
        };

        const req: any = {
            protocol: 'http',
            headers: { host: 'localhost:3000' },
            originalUrl: '/auth/oidc/oidc/cb?code=code-1&state=state-1',
            sessionID: 'sess-123',
            session,
            query: { code: 'code-1', state: 'state-1' },
            login: jest.fn((user, cb) => cb(null)),
        };
        const res: any = {
            redirect: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };

        await oidc.callback(req, res);

        // Verification must use verifier-1 for state-1, NOT verifier-2
        expect(client.authorizationCodeGrant).toHaveBeenCalledWith(
            mockConfig,
            expect.any(URL),
            expect.objectContaining({
                pkceCodeVerifier: 'verifier-1',
                expectedState: 'state-1',
            }),
        );
        expect(res.redirect).toHaveBeenCalledWith('http://localhost:3000/tab1');

        // State 1 must be consumed, state 2 must still remain pending
        expect(session.oidc.pending['state-1']).toBeUndefined();
        expect(session.oidc.pending['state-2']).toBeDefined();
    });

    test('callback should allow multiple pending states to be resolved independently', async () => {
        oidc.configuration = { ...configurationValid, ttl: -1 };
        (oidc as any).cachedConfig = mockConfig;
        (client.authorizationCodeGrant as jest.Mock)
            .mockResolvedValueOnce({
                access_token: 'token-a',
                claims: () => ({ sub: 'sub-a' }),
            })
            .mockResolvedValueOnce({
                access_token: 'token-b',
                claims: () => ({ sub: 'sub-b' }),
            });
        (client.fetchUserInfo as jest.Mock).mockResolvedValue({
            email: 'user@example.com',
        });

        const session: any = {
            oidc: {
                pending: {
                    'state-a': {
                        state: 'state-a',
                        codeVerifier: 'verifier-a',
                        next: '/route-a',
                        createdAt: Date.now(),
                    },
                    'state-b': {
                        state: 'state-b',
                        codeVerifier: 'verifier-b',
                        next: '/route-b',
                        createdAt: Date.now(),
                    },
                },
            },
        };

        // First callback for state-a
        const reqA: any = {
            protocol: 'http',
            headers: { host: 'localhost:3000' },
            originalUrl: '/auth/oidc/oidc/cb?code=c1&state=state-a',
            sessionID: 'sess-ab',
            session,
            query: { code: 'c1', state: 'state-a' },
            login: jest.fn((user, cb) => cb(null)),
        };
        const resA: any = { redirect: jest.fn() };
        await oidc.callback(reqA, resA);

        expect(resA.redirect).toHaveBeenCalledWith(
            'http://localhost:3000/route-a',
        );
        expect(session.oidc.pending['state-a']).toBeUndefined();
        expect(session.oidc.pending['state-b']).toBeDefined();

        // Second callback for state-b
        const reqB: any = {
            protocol: 'http',
            headers: { host: 'localhost:3000' },
            originalUrl: '/auth/oidc/oidc/cb?code=c2&state=state-b',
            sessionID: 'sess-ab',
            session,
            query: { code: 'c2', state: 'state-b' },
            login: jest.fn((user, cb) => cb(null)),
        };
        const resB: any = { redirect: jest.fn() };
        await oidc.callback(reqB, resB);

        expect(resB.redirect).toHaveBeenCalledWith(
            'http://localhost:3000/route-b',
        );
        expect(session.oidc.pending['state-b']).toBeUndefined();
        expect(Object.keys(session.oidc.pending).length).toBe(0);
    });

    test('callback should fallback to legacy single-state session structure', async () => {
        oidc.configuration = { ...configurationValid, ttl: -1 };
        (oidc as any).cachedConfig = mockConfig;
        (client.authorizationCodeGrant as jest.Mock).mockResolvedValue({
            access_token: 'token-legacy',
            claims: () => ({ sub: 'user-legacy' }),
        });
        (client.fetchUserInfo as jest.Mock).mockResolvedValue({
            email: 'legacy@example.com',
        });

        const session: any = {
            oidc: {
                codeVerifier: 'legacy-verifier',
                state: 'legacy-state',
                next: '/dashboard',
            },
        };

        const req: any = {
            protocol: 'http',
            headers: { host: 'localhost:3000' },
            originalUrl: '/auth/oidc/oidc/cb?code=c&state=legacy-state',
            sessionID: 'sess-legacy',
            session,
            query: { code: 'c', state: 'legacy-state' },
            login: jest.fn((user, cb) => cb(null)),
        };
        const res: any = { redirect: jest.fn() };

        await oidc.callback(req, res);

        expect(client.authorizationCodeGrant).toHaveBeenCalledWith(
            mockConfig,
            expect.any(URL),
            expect.objectContaining({
                pkceCodeVerifier: 'legacy-verifier',
                expectedState: 'legacy-state',
            }),
        );
        expect(res.redirect).toHaveBeenCalledWith(
            'http://localhost:3000/dashboard',
        );
    });

    test('callback should redirect to login when state does not match any pending check', async () => {
        oidc.configuration = { ...configurationValid, ttl: -1 };
        (oidc as any).cachedConfig = mockConfig;

        const session: any = {
            oidc: {
                pending: {
                    'state-valid': {
                        state: 'state-valid',
                        codeVerifier: 'verifier-valid',
                        createdAt: Date.now(),
                    },
                },
            },
        };

        const req: any = {
            protocol: 'http',
            headers: { host: 'localhost:3000' },
            originalUrl: '/auth/oidc/oidc/cb?code=c&state=unknown-state',
            sessionID: 'sess-test',
            session,
            query: { code: 'c', state: 'unknown-state' },
            login: jest.fn(),
        };
        const res: any = { redirect: jest.fn() };

        await oidc.callback(req, res);

        expect(res.redirect).toHaveBeenCalledWith(
            'http://localhost:3000/#/login?error=OIDC%20session%20state%20mismatch%20or%20expired',
        );
    });

    test('callback should redirect to login when session oidc is missing', async () => {
        oidc.configuration = { ...configurationValid, ttl: -1 };
        (oidc as any).cachedConfig = mockConfig;

        const req: any = {
            protocol: 'http',
            headers: { host: 'localhost:3000' },
            originalUrl: '/auth/oidc/oidc/cb?code=c&state=state-1',
            sessionID: 'sess-empty',
            session: {},
            query: { code: 'c', state: 'state-1' },
            login: jest.fn(),
        };
        const res: any = { redirect: jest.fn() };

        await oidc.callback(req, res);

        expect(res.redirect).toHaveBeenCalledWith(
            'http://localhost:3000/#/login?error=OIDC%20session%20state%20not%20found',
        );
    });

    test('callback should support empty state query param when PKCE is used (Authentik)', async () => {
        oidc.configuration = { ...configurationValid, ttl: -1 };
        (oidc as any).cachedConfig = mockConfig;
        (client.authorizationCodeGrant as jest.Mock).mockResolvedValue({
            access_token: 'token-authentik',
            claims: () => ({ sub: 'sub-authentik' }),
        });
        (client.fetchUserInfo as jest.Mock).mockResolvedValue({
            email: 'authentik@example.com',
        });

        const session: any = {
            oidc: {
                codeVerifier: 'verifier-authentik',
                state: '',
            },
        };

        const req: any = {
            protocol: 'http',
            headers: { host: 'localhost:3000' },
            originalUrl: '/auth/oidc/oidc/cb?code=c&state=',
            sessionID: 'sess-authentik',
            session,
            query: { code: 'c', state: '' },
            login: jest.fn((user, cb) => cb(null)),
        };
        const res: any = { redirect: jest.fn() };

        await oidc.callback(req, res);

        expect(client.authorizationCodeGrant).toHaveBeenCalledWith(
            mockConfig,
            expect.any(URL),
            expect.objectContaining({
                pkceCodeVerifier: 'verifier-authentik',
                expectedState: client.skipStateCheck,
            }),
        );
    });

    test('prunePendingChecks should expire checks older than TTL', () => {
        const now = 1_000_000;
        const pending = {
            expired: {
                state: 'expired',
                codeVerifier: 'v1',
                createdAt: now - OIDC_CHECKS_TTL_MS - 1000,
            },
            valid: {
                state: 'valid',
                codeVerifier: 'v2',
                createdAt: now - 5000,
            },
        };

        const result = prunePendingChecks(pending, now);
        expect(result['expired']).toBeUndefined();
        expect(result['valid']).toBeDefined();
        expect(result['valid'].state).toBe('valid');
    });

    test('prunePendingChecks should limit pending checks to OIDC_MAX_PENDING_CHECKS', () => {
        const now = 10_000_000;
        const pending: any = {};
        for (let i = 1; i <= 15; i++) {
            pending[`state-${i}`] = {
                state: `state-${i}`,
                codeVerifier: `verifier-${i}`,
                createdAt: now - (16 - i) * 1000,
            };
        }

        const result = prunePendingChecks(pending, now);
        const keys = Object.keys(result);
        expect(keys.length).toBe(OIDC_MAX_PENDING_CHECKS);
        // The oldest 5 states (state-1 to state-5) must have been dropped
        expect(result['state-1']).toBeUndefined();
        expect(result['state-5']).toBeUndefined();
        // The newest 10 states (state-6 to state-15) must be present
        expect(result['state-6']).toBeDefined();
        expect(result['state-15']).toBeDefined();
    });

    test('withOidcSessionLock should serialize concurrent operations on the same sessionID', async () => {
        const order: string[] = [];
        let releaseFirst: () => void = () => {};
        const firstStarted = new Promise<void>((resolve) => {
            releaseFirst = resolve;
        });

        const op1 = withOidcSessionLock('sess-lock', async () => {
            order.push('op1-start');
            await firstStarted;
            order.push('op1-end');
        });

        const op2 = withOidcSessionLock('sess-lock', async () => {
            order.push('op2-start');
            order.push('op2-end');
        });

        // Let op1 run first
        releaseFirst();
        await Promise.all([op1, op2]);

        expect(order).toEqual(['op1-start', 'op1-end', 'op2-start', 'op2-end']);
    });

    test('saveSession and reloadSession should invoke session methods if present', async () => {
        const reloadMock = jest.fn((cb) => cb());
        const saveMock = jest.fn((cb) => cb());

        const req: any = {
            session: {
                reload: reloadMock,
                save: saveMock,
            },
        };

        await reloadSession(req);
        expect(reloadMock).toHaveBeenCalled();

        await saveSession(req);
        expect(saveMock).toHaveBeenCalled();
    });

    test('getStrategy cb route handler should redirect to login on unhandled error', async () => {
        const expressApp: any = {
            get: jest.fn(),
        };

        oidc.getStrategy(expressApp);

        // Find the cb route handler
        const cbCall = expressApp.get.mock.calls.find(
            (call: any[]) => call[0] === `/auth/oidc/${oidc.name}/cb`,
        );
        expect(cbCall).toBeDefined();
        const handler = cbCall[1];

        const req: any = {
            protocol: 'http',
            headers: { host: 'localhost:3000' },
            originalUrl: '/auth/oidc/oidc/cb',
            query: {},
        };
        const res: any = {
            redirect: jest.fn(),
        };

        // Spy on callback and reject with an error
        jest.spyOn(oidc, 'callback').mockRejectedValueOnce(
            new Error('Unhandled boom'),
        );

        await handler(req, res);

        expect(res.redirect).toHaveBeenCalledWith(
            'http://localhost:3000/#/login?error=Unhandled%20boom',
        );
    });
});
