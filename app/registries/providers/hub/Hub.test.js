const rp = require('request-promise-native');
const Hub = require('./Hub');

const hub = new Hub();
hub.configuration = {
    login: 'login',
    token: 'token',
    url: 'https://registry-1.docker.io',
};

jest.mock('request-promise-native');

test('validatedConfiguration should initialize when configuration is valid', () => {
    expect(
        hub.validateConfiguration({
            login: 'login',
            password: 'password',
        }),
    ).toStrictEqual({
        login: 'login',
        password: 'password',
    });
    expect(hub.validateConfiguration({ auth: 'auth' })).toStrictEqual({
        auth: 'auth',
    });
    expect(hub.validateConfiguration({})).toStrictEqual({});
    expect(hub.validateConfiguration(undefined)).toStrictEqual({});
});

test('validatedConfiguration should throw error when auth is not base64', () => {
    expect(() => {
        hub.validateConfiguration({
            auth: '°°°',
        });
    }).toThrow('"auth" must be a valid base64 string');
});

test('maskConfiguration should mask configuration secrets', () => {
    expect(hub.maskConfiguration()).toEqual({
        auth: undefined,
        login: 'login',
        token: 't***n',
        url: 'https://registry-1.docker.io',
    });
});

test('match should return true when no registry on the image', () => {
    expect(
        hub.match({
            registry: {},
        }),
    ).toBeTruthy();
});

test('match should return true when registry id docker.io on the image', () => {
    expect(
        hub.match({
            registry: {
                url: 'docker.io',
            },
        }),
    ).toBeTruthy();
});

test('match should return false when registry on the image', () => {
    expect(
        hub.match({
            registry: {
                url: 'registry',
            },
        }),
    ).toBeFalsy();
});

test('normalizeImage should prefix with library when no organization', () => {
    expect(
        hub.normalizeImage({
            name: 'test',
            registry: {},
        }),
    ).toStrictEqual({
        name: 'library/test',
        registry: {
            url: 'https://registry-1.docker.io/v2',
        },
    });
});

test('normalizeImage should not prefix with library when existing organization', () => {
    expect(
        hub.normalizeImage({
            name: 'myorga/test',
            registry: {},
        }),
    ).toStrictEqual({
        name: 'myorga/test',
        registry: {
            url: 'https://registry-1.docker.io/v2',
        },
    });
});

test('authenticate should perform authenticate request', () => {
    rp.mockImplementation(() => ({
        token: 'token',
    }));
    expect(
        hub.authenticate(
            {},
            {
                headers: {},
            },
        ),
    ).resolves.toEqual({ headers: { Authorization: 'Bearer token' } });
});

test('getAuthCredentials should return base64 creds when set in configuration', () => {
    hub.configuration.auth = 'dXNlcm5hbWU6cGFzc3dvcmQ=';
    expect(hub.getAuthCredentials()).toEqual('dXNlcm5hbWU6cGFzc3dvcmQ=');
});

test('getAuthCredentials should return base64 creds when login/token set in configuration', () => {
    hub.configuration.login = 'username';
    hub.configuration.token = 'password';
    expect(hub.getAuthCredentials()).toEqual('dXNlcm5hbWU6cGFzc3dvcmQ=');
});

test('getAuthCredentials should return undefined when no login/token/auth set in configuration', () => {
    hub.configuration = {};
    expect(hub.getAuthCredentials()).toBe(undefined);
});
