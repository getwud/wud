// @ts-nocheck
import Custom from './Custom';

const custom = new Custom();
custom.configuration = {
    login: 'login',
    password: 'password',
    url: 'http://localhost:5000',
};

test('validatedConfiguration should initialize when configuration is valid', async () => {
    expect(
        custom.validateConfiguration({
            url: 'http://localhost:5000',
            login: 'login',
            password: 'password',
        }),
    ).toStrictEqual({
        url: 'http://localhost:5000',
        login: 'login',
        password: 'password',
    });
});

test('validatedConfiguration should throw error when auth is not base64', async () => {
    expect(() => {
        custom.validateConfiguration({
            url: 'http://localhost:5000',
            auth: '°°°',
        });
    }).toThrow('"auth" must be a valid base64 string');
});

test('maskConfiguration should mask configuration secrets', async () => {
    expect(custom.maskConfiguration()).toEqual({
        auth: undefined,
        login: 'login',
        password: 'p******d',
        url: 'http://localhost:5000',
    });
});

test('match should return true when registry url is from custom', async () => {
    expect(
        custom.match({
            registry: {
                url: 'localhost:5000',
            },
        }),
    ).toBeTruthy();
});

test('match should return false when registry url is not from custom', async () => {
    expect(
        custom.match({
            registry: {
                url: 'est.notme.io',
            },
        }),
    ).toBeFalsy();
});

test('normalizeImage should return the proper registry v2 endpoint', async () => {
    expect(
        custom.normalizeImage({
            name: 'test/image',
            registry: {
                url: 'localhost:5000/test/image',
            },
        }),
    ).toStrictEqual({
        name: 'test/image',
        registry: {
            url: 'http://localhost:5000/v2',
        },
    });
});

test('authenticate should add basic auth', async () => {
    expect(custom.authenticate(undefined, { headers: {} })).resolves.toEqual({
        headers: {
            Authorization: 'Basic bG9naW46cGFzc3dvcmQ=',
        },
    });
});

test('getAuthCredentials should return base64 creds when set in configuration', async () => {
    custom.configuration.auth = 'dXNlcm5hbWU6cGFzc3dvcmQ=';
    expect(custom.getAuthCredentials()).toEqual('dXNlcm5hbWU6cGFzc3dvcmQ=');
});

test('getAuthCredentials should return base64 creds when login/token set in configuration', async () => {
    custom.configuration.login = 'username';
    custom.configuration.token = 'password';
    expect(custom.getAuthCredentials()).toEqual('dXNlcm5hbWU6cGFzc3dvcmQ=');
});

test('getAuthCredentials should return undefined when no login/token/auth set in configuration', async () => {
    custom.configuration = {};
    expect(custom.getAuthCredentials()).toBe(undefined);
});
