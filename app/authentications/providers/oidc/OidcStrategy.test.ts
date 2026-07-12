// @ts-nocheck
import * as client from 'openid-client';
import OidcStrategy from './OidcStrategy';
import log from '../../../log';

// Mock the openid-client module
jest.mock('openid-client');

const mockClient = {
    client_id: '123456789',
};

const mockConfig = {
    serverMetadata: jest.fn().mockReturnValue({
        supportsPKCE: jest.fn().mockReturnValue(true),
    }),
};

let oidcStrategy: any;

beforeEach(async () => {
    jest.resetAllMocks();
    oidcStrategy = new OidcStrategy(
        { config: mockConfig, client: mockClient },
        () => {},
        log,
    );
    oidcStrategy.success = jest.fn();
    oidcStrategy.fail = jest.fn();
});

test('authenticate should return user from session if so', async () => {
    oidcStrategy.authenticate({ isAuthenticated: () => true });
    expect(oidcStrategy.success).toHaveBeenCalled();
});

test('authenticate should call super.authenticate when no existing session', async () => {
    const fail = jest.spyOn(oidcStrategy, 'fail');
    oidcStrategy.authenticate({ isAuthenticated: () => false, headers: {} });
    expect(fail).toHaveBeenCalled();
});

test('authenticate should get & validate Bearer token', async () => {
    const verify = jest.spyOn(oidcStrategy, 'verify');
    oidcStrategy.authenticate({
        isAuthenticated: () => false,
        headers: {
            authorization: 'Bearer XXXXX',
        },
    });
    expect(verify).toHaveBeenCalledWith('XXXXX', expect.any(Function));
});
