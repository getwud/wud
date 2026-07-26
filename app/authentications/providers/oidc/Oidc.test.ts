import { ValidationError } from 'joi';
import express from 'express';
import * as client from 'openid-client';
import Oidc from './Oidc';

// Mock the openid-client module
jest.mock('openid-client');

const app = express();

const configurationValid = {
    clientid: '123465798',
    clientsecret: 'secret',
    discovery: 'https://idp/.well-known/openid-configuration',
    redirect: false,
    timeout: 5000,
    ttl: 60,
    usernameclaim: 'email',
};

const mockConfig = {
    serverMetadata: jest.fn().mockReturnValue({
        supportsPKCE: jest.fn().mockReturnValue(true),
    }),
};

let oidc: any;

beforeEach(async () => {
    jest.resetAllMocks();
    oidc = new Oidc();
    oidc.configuration = configurationValid;
    // Access private config property for testing
    (oidc as any).config = mockConfig;
    (oidc as any).discoveryCachedAt = Date.now();
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
    oidc.log = { debug: jest.fn(), warn: jest.fn() };

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
    oidc.log = { debug: jest.fn(), warn: jest.fn() };

    await oidc.initAuthentication();
    const user = await oidc.getUserFromAccessToken('token');

    expect(client.discovery).toHaveBeenCalledTimes(2);
    expect(user).toEqual({ username: 'retry@example.com' });
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
    expect(user).toEqual({ username: 'ttl@example.com' });
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
    expect(user).toEqual({ username: 'unlimited@example.com' });
});

test('verify should return user on valid token', async () => {
    oidc.configuration = { ...configurationValid, ttl: -1 };
    (oidc as any).cachedConfig = mockConfig;
    const mockUserInfo = { email: 'test@example.com' };
    (client.fetchUserInfo as jest.Mock).mockResolvedValue(mockUserInfo);

    const done = jest.fn();
    await oidc.verify('valid-token', done);

    expect(done).toHaveBeenCalledWith(null, { username: 'test@example.com' });
});

test('verify should return false on invalid token', async () => {
    (client.fetchUserInfo as jest.Mock).mockRejectedValue(
        new Error('Invalid token'),
    );
    oidc.log = { warn: jest.fn() };

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
    expect(user).toEqual({ username: 'user@example.com' });
});

test('getUserFromAccessToken should return unknown for missing email', async () => {
    oidc.configuration = { ...configurationValid, ttl: -1 };
    (oidc as any).cachedConfig = mockConfig;
    const mockUserInfo = {};
    (client.fetchUserInfo as jest.Mock).mockResolvedValue(mockUserInfo);

    const user = await oidc.getUserFromAccessToken('token');
    expect(user).toEqual({ username: 'unknown' });
});
