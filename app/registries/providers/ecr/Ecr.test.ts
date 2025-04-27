import { ContainerImage } from '../../../model/container';
import { Ecr, EcrConfiguration } from './Ecr';

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

jest.mock('request-promise-native');

test('validatedConfiguration should initialize when configuration is valid', () => {
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

test('validatedConfiguration should throw error when accessKey is missing', () => {
    expect(() => {
        ecr.validateConfiguration({
            secretaccesskey: 'secretaccesskey',
            region: 'region',
        } as EcrConfiguration);
    }).toThrow('"accesskeyid" is required');
});

test('validatedConfiguration should throw error when secretaccesskey is missing', () => {
    expect(() => {
        ecr.validateConfiguration({
            accesskeyid: 'accesskeyid',
            region: 'region',
        } as EcrConfiguration);
    }).toThrow('"secretaccesskey" is required');
});

test('validatedConfiguration should throw error when secretaccesskey is missing', () => {
    expect(() => {
        ecr.validateConfiguration({
            accesskeyid: 'accesskeyid',
            secretaccesskey: 'secretaccesskey',
        } as EcrConfiguration);
    }).toThrow('"region" is required');
});

test('match should return true when registry url is from ecr', () => {
    expect(
        ecr.match({
            registry: {
                url: '123456789.dkr.ecr.eu-west-1.amazonaws.com',
            },
        } as ContainerImage),
    ).toBeTruthy();
});

test('match should return false when registry url is not from ecr', () => {
    expect(
        ecr.match({
            registry: {
                url: '123456789.dkr.ecr.eu-west-1.acme.com',
            },
        } as ContainerImage),
    ).toBeFalsy();
});

test('maskConfiguration should mask configuration secrets', () => {
    expect(ecr.maskConfiguration()).toEqual({
        accesskeyid: 'a*********d',
        region: 'region',
        secretaccesskey: 's*************y',
    });
});

test('normalizeImage should return the proper registry v2 endpoint', () => {
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

test('authenticate should call ecr auth endpoint', () => {
    expect(ecr.authenticate({} as ContainerImage, { headers: {} })).resolves.toEqual({
        headers: {
            Authorization: 'Basic xxxxx',
        },
    });
});
