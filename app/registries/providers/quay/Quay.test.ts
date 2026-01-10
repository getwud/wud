// @ts-nocheck
import axios from 'axios';
import Quay from './Quay';
import log from '../../../log';

jest.mock('axios');
axios.mockImplementation(() => ({
    token: 'token',
}));

const quay = new Quay();
quay.configuration = {
    namespace: 'namespace',
    account: 'account',
    token: 'token',
};
quay.log = log;

test('validatedConfiguration should initialize when anonymous configuration is valid', async () => {
    expect(quay.validateConfiguration('')).toStrictEqual({});
    expect(quay.validateConfiguration(undefined)).toStrictEqual({});
});

test('validatedConfiguration should initialize when auth configuration is valid', async () => {
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

test('validatedConfiguration should throw error when configuration is missing', async () => {
    expect(() => {
        quay.validateConfiguration({});
    }).toThrow('"namespace" is required');
});

test('maskConfiguration should mask anonymous configuration secrets', async () => {
    const quayInstance = new Quay();
    quayInstance.configuration = '';
    expect(quayInstance.maskConfiguration()).toEqual({});
});

test('maskConfiguration should mask authentication configuration secrets', async () => {
    expect(quay.maskConfiguration()).toEqual({
        account: 'account',
        namespace: 'namespace',
        token: 't***n',
    });
});

test('match should return true when registry url is from quay.io', async () => {
    expect(
        quay.match({
            registry: {
                url: 'quay.io',
            },
        }),
    ).toBeTruthy();
});

test('match should return false when registry url is not from quay.io', async () => {
    expect(
        quay.match({
            registry: {
                url: 'error.io',
            },
        }),
    ).toBeFalsy();
});

test('normalizeImage should return the proper registry v2 endpoint', async () => {
    expect(
        quay.normalizeImage({
            name: 'test/image',
            registry: {
                url: 'quay.io/test/image',
            },
        }),
    ).toStrictEqual({
        name: 'test/image',
        registry: {
            url: 'https://quay.io/test/image/v2',
        },
    });
});

test('getAuthCredentials should return undefined when anonymous configuration', async () => {
    const quayInstance = new Quay();
    quayInstance.configuration = {};
    expect(quayInstance.getAuthCredentials()).toEqual(undefined);
});

test('getAuthCredentials should return base64 encode credentials when auth configuration', async () => {
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

test('getAuthPull should return undefined when anonymous configuration', async () => {
    const quayInstance = new Quay();
    quayInstance.configuration = {};
    expect(quayInstance.getAuthPull()).toEqual(undefined);
});

test('getAuthPull should return credentials when auth configuration', async () => {
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

test('authenticate should populate header with base64 bearer', async () => {
    expect(quay.authenticate({}, { headers: {} })).resolves.toEqual({
        headers: {
            Authorization: 'Bearer token',
        },
    });
});

test('authenticate should not populate header with base64 bearer when anonymous', async () => {
    const quayInstance = new Quay();
    quayInstance.configuration = {};
    expect(quayInstance.authenticate({}, { headers: {} })).resolves.toEqual({
        headers: {},
    });
});
