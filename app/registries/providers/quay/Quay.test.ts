import rp, { RequestPromise } from 'request-promise-native';
import { Quay, QuayConfiguration } from './Quay';
import log from '../../../log';
import { ContainerImage } from '../../../model/container';

jest.mock('request-promise-native');
(rp as unknown as jest.Mock).mockImplementation((): Promise<{ token: string }> => Promise.resolve({
    token: 'token',
}));

const quay = new Quay();
quay.configuration = {
    namespace: 'namespace',
    account: 'account',
    token: 'token',
};
quay.log = log;

test('validatedConfiguration should initialize when anonymous configuration is valid', () => {
    expect(quay.validateConfiguration('' as unknown as QuayConfiguration)).toStrictEqual({});
    expect(quay.validateConfiguration(undefined as unknown as QuayConfiguration)).toStrictEqual({});
});

test('validatedConfiguration should initialize when auth configuration is valid', () => {
    expect(
        quay.validateConfiguration({
            namespace: 'namespace',
            account: 'account',
            token: 'token',
        }),
    ).toStrictEqual({
        namespace: 'namespace',
        account: 'account',
        token: 'token',
    });
});

test('validatedConfiguration should throw error when configuration is missing', () => {
    expect(() => {
        quay.validateConfiguration({} as QuayConfiguration);
    }).toThrow('"namespace" is required');
});

test('maskConfiguration should mask anonymous configuration secrets', () => {
    const quayInstance = new Quay();
    quayInstance.configuration = '' as unknown as QuayConfiguration;
    expect(quayInstance.maskConfiguration()).toEqual({});
});

test('maskConfiguration should mask authentication configuration secrets', () => {
    expect(quay.maskConfiguration()).toEqual({
        account: 'account',
        namespace: 'namespace',
        token: 't***n',
    });
});

test('match should return true when registry url is from quay.io', () => {
    expect(
        quay.match({
            registry: {
                url: 'quay.io',
            },
        } as ContainerImage),
    ).toBeTruthy();
});

test('match should return false when registry url is not from quay.io', () => {
    expect(
        quay.match({
            registry: {
                url: 'error.io',
            },
        } as ContainerImage),
    ).toBeFalsy();
});

test('normalizeImage should return the proper registry v2 endpoint', () => {
    expect(
        quay.normalizeImage({
            name: 'test/image',
            registry: {
                url: 'quay.io/test/image',
            },
        } as ContainerImage),
    ).toStrictEqual({
        name: 'test/image',
        registry: {
            url: 'https://quay.io/test/image/v2',
        },
    });
});

test('getAuthCredentials should return undefined when anonymous configuration', () => {
    const quayInstance = new Quay();
    quayInstance.configuration = {} as QuayConfiguration;
    expect(quayInstance.getAuthCredentials()).toEqual(undefined);
});

test('getAuthCredentials should return base64 encode credentials when auth configuration', () => {
    const quayInstance = new Quay();
    quayInstance.configuration = {
        namespace: 'namespace',
        account: 'account',
        token: 'token',
    };
    expect(quayInstance.getAuthCredentials()).toEqual(
        'bmFtZXNwYWNlK2FjY291bnQ6dG9rZW4=',
    );
});

test('getAuthPull should return undefined when anonymous configuration', () => {
    const quayInstance = new Quay();
    quayInstance.configuration = {} as QuayConfiguration;
    expect(quayInstance.getAuthPull()).toEqual(undefined);
});

test('getAuthPull should return credentials when auth configuration', () => {
    const quayInstance = new Quay();
    quayInstance.configuration = {
        namespace: 'namespace',
        account: 'account',
        token: 'token',
    };
    expect(quayInstance.getAuthPull()).toEqual({
        password: 'token',
        username: 'namespace+account',
    });
});

test('authenticate should populate header with base64 bearer', () => {
    expect(quay.authenticate({} as ContainerImage, { headers: {} })).resolves.toEqual({
        headers: {
            Authorization: 'Bearer token',
        },
    });
});

test('authenticate should not populate header with base64 bearer when anonymous', () => {
    const quayInstance = new Quay();
    quayInstance.configuration = {} as QuayConfiguration;
    expect(quayInstance.authenticate({} as ContainerImage, { headers: {} })).resolves.toEqual({
        headers: {},
    });
});
