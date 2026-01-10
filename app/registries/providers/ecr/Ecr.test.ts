// @ts-nocheck
import Ecr from './Ecr';

jest.mock('aws-sdk/clients/ecr', () =>
    jest.fn().mockImplementation(() => ({
        getAuthorizationToken: () => ({
            promise: () =>
                Promise.resolve({
                    authorizationData: [{ authorizationToken: 'xxxxx' }],
                }),
        }),
    })),
);

const ecr = new Ecr();
ecr.configuration = {
    accesskeyid: 'accesskeyid',
    secretaccesskey: 'secretaccesskey',
    region: 'region',
};

jest.mock('axios');

test('validatedConfiguration should initialize when configuration is valid', async () => {
    expect(
        ecr.validateConfiguration({
            accesskeyid: 'accesskeyid',
            secretaccesskey: 'secretaccesskey',
            region: 'region',
        }),
    ).toStrictEqual({
        accesskeyid: 'accesskeyid',
        secretaccesskey: 'secretaccesskey',
        region: 'region',
    });
});

test('validatedConfiguration should throw error when accessKey is missing', async () => {
    expect(() => {
        ecr.validateConfiguration({
            secretaccesskey: 'secretaccesskey',
            region: 'region',
        });
    }).toThrow('"accesskeyid" is required');
});

test('validatedConfiguration should throw error when secretaccesskey is missing', async () => {
    expect(() => {
        ecr.validateConfiguration({
            accesskeyid: 'accesskeyid',
            region: 'region',
        });
    }).toThrow('"secretaccesskey" is required');
});

test('validatedConfiguration should throw error when secretaccesskey is missing', async () => {
    expect(() => {
        ecr.validateConfiguration({
            accesskeyid: 'accesskeyid',
            secretaccesskey: 'secretaccesskey',
        });
    }).toThrow('"region" is required');
});

test('match should return true when registry url is from ecr', async () => {
    expect(
        ecr.match({
            registry: {
                url: '123456789.dkr.ecr.eu-west-1.amazonaws.com',
            },
        }),
    ).toBeTruthy();
});

test('match should return false when registry url is not from ecr', async () => {
    expect(
        ecr.match({
            registry: {
                url: '123456789.dkr.ecr.eu-west-1.acme.com',
            },
        }),
    ).toBeFalsy();
});

test('maskConfiguration should mask configuration secrets', async () => {
    expect(ecr.maskConfiguration()).toEqual({
        accesskeyid: 'a*********d',
        region: 'region',
        secretaccesskey: 's*************y',
    });
});

test('normalizeImage should return the proper registry v2 endpoint', async () => {
    expect(
        ecr.normalizeImage({
            name: 'test/image',
            registry: {
                url: '123456789.dkr.ecr.eu-west-1.amazonaws.com/test/image',
            },
        }),
    ).toStrictEqual({
        name: 'test/image',
        registry: {
            url: 'https://123456789.dkr.ecr.eu-west-1.amazonaws.com/test/image/v2',
        },
    });
});

test('authenticate should call ecr auth endpoint', async () => {
    expect(ecr.authenticate(undefined, { headers: {} })).resolves.toEqual({
        headers: {
            Authorization: 'Basic xxxxx',
        },
    });
});
