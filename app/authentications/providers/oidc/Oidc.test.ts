import { ValidationError } from 'joi';
import express from 'express';
import * as client from 'openid-client';
import Oidc from './Oidc';
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
