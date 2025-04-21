import { ContainerImage } from '../../../model/container';
import { Custom, CustomConfiguration } from './Custom';

const custom = new Custom();
custom.configuration = {
    login: 'login',
    password: 'password',
    url: 'http://localhost:5000',
};

test('validatedConfiguration should initialize when configuration is valid', () => {
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

test('validatedConfiguration should throw error when auth is not base64', () => {
    expect(() => {
        custom.validateConfiguration({
            url: 'http://localhost:5000',
            auth: '°°°',
        });
    }).toThrow('"auth" must be a valid base64 string');
});

test('maskConfiguration should mask configuration secrets', () => {
    expect(custom.maskConfiguration()).toEqual({
        auth: undefined,
        login: 'login',
        password: 'p******d',
        url: 'http://localhost:5000',
    });
});

test('match should return true when registry url is from custom', () => {
    expect(
        custom.match({
            registry: {
                url: 'localhost:5000',
            },
        } as ContainerImage),
    ).toBeTruthy();
});

test('match should return false when registry url is not from custom', () => {
    expect(
        custom.match({
            registry: {
                url: 'est.notme.io',
            },
        } as ContainerImage),
    ).toBeFalsy();
});

test('normalizeImage should return the proper registry v2 endpoint', () => {
    expect(
        custom.normalizeImage({
            name: 'test/image',
            registry: {
                url: 'localhost:5000/test/image',
            },
        } as ContainerImage),
    ).toStrictEqual({
        name: 'test/image',
        registry: {
            url: 'http://localhost:5000/v2',
        },
    });
});

test('authenticate should add basic auth', () => {
    expect(custom.authenticate({} as ContainerImage, { headers: {} })).resolves.toEqual({
        headers: {
            Authorization: 'Basic bG9naW46cGFzc3dvcmQ=',
        },
    });
});

test('getAuthCredentials should return base64 creds when set in configuration', () => {
    custom.configuration.auth = 'dXNlcm5hbWU6cGFzc3dvcmQ=';
    expect(custom.getAuthCredentials()).toEqual('dXNlcm5hbWU6cGFzc3dvcmQ=');
});

test('getAuthCredentials should return base64 creds when login/token set in configuration', () => {
    custom.configuration.login = 'username';
    custom.configuration.password = 'password';
    expect(custom.getAuthCredentials()).toEqual('dXNlcm5hbWU6cGFzc3dvcmQ=');
});

test('getAuthCredentials should return undefined when no login/token/auth set in configuration', () => {
    custom.configuration = {} as CustomConfiguration;
    expect(custom.getAuthCredentials()).toBe(undefined);
});
