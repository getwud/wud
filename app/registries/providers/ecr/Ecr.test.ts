jest.mock('@aws-sdk/client-ecr', () => {
    return {
        ECRClient: jest.fn().mockImplementation(() => ({
            send: jest.fn().mockResolvedValue({
                authorizationData: [
                    { authorizationToken: 'xxxxx', expiresAt: new Date() },
                ],
            }),
        })),
        GetAuthorizationTokenCommand: jest.fn(),
    };
});

import Logger from 'bunyan';
import { ContainerImage } from '../../../model/container';
import { Ecr } from './Ecr';

const ecr = new Ecr();
ecr.log = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
} as any as Logger;

ecr.configuration = {
    accesskeyid: 'accesskeyid',
    secretaccesskey: 'secretaccesskey',
    region: 'region',
    public: false,
};

jest.mock('axios');

test('validatedConfiguration should initialize when configuration is valid', async () => {
    expect(
        ecr.validateConfiguration({
            accesskeyid: 'accesskeyid',
            secretaccesskey: 'secretaccesskey',
            region: 'region',
            public: false,
        }),
    ).toStrictEqual({
        accesskeyid: 'accesskeyid',
        secretaccesskey: 'secretaccesskey',
        region: 'region',
        public: false,
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
        } as ContainerImage),
    ).toBeTruthy();
});

test('match should return false when registry url is not from ecr', async () => {
    expect(
        ecr.match({
            registry: {
                url: '123456789.dkr.ecr.eu-west-1.acme.com',
            },
        } as ContainerImage),
    ).toBeFalsy();
});

test('maskConfiguration should mask configuration secrets', async () => {
    expect(ecr.maskConfiguration()).toEqual({
        accesskeyid: 'a*********d',
        public: false,
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
        } as ContainerImage),
    ).toStrictEqual({
        name: 'test/image',
        registry: {
            url: 'https://123456789.dkr.ecr.eu-west-1.amazonaws.com/test/image/v2',
        },
    });
});

test('authenticate should call ecr auth endpoint', async () => {
    expect(
        ecr.authenticate(
            {
                registry: {
                    url: '123456789.dkr.ecr.eu-west-1.amazonaws.com',
                },
            } as ContainerImage,
            { headers: {} },
        ),
    ).resolves.toEqual({
        headers: {
            Authorization: 'Basic xxxxx',
        },
    });
});

test('getAuthPull should call ecr auth endpoint and get token', async () => {
    await expect(ecr.getAuthPull()).resolves.toEqual({
        username: 'accesskeyid',
        password: 'secretaccesskey',
    });
});
