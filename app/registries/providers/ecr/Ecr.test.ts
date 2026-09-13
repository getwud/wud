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

import axios from 'axios';
import { Logger } from 'pino';
import { ContainerImage } from '../../../model/container';
import { Ecr } from './Ecr';
import { testRegistryProvider } from '../RegistryTestHelper';

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
        concurrency: 2,
    });
});

test('validatedConfiguration should validate when public is true without AWS keys', async () => {
    expect(
        ecr.validateConfiguration({
            public: true,
        }),
    ).toStrictEqual({
        public: true,
        region: 'us-east-1',
        concurrency: 2,
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

test('validatedConfiguration should throw error when region is missing', async () => {
    expect(() => {
        ecr.validateConfiguration({
            accesskeyid: 'accesskeyid',
            secretaccesskey: 'secretaccesskey',
        });
    }).toThrow('"region" is required');
});

test('default public registry instance should initialize public to true and match public.ecr.aws', async () => {
    const defaultEcr = new Ecr();
    await defaultEcr.register('registry', 'ecr', 'public', '' as any);

    expect(defaultEcr.configuration.public).toBe(true);
    expect(defaultEcr.match('public.ecr.aws')).toBe(true);
    expect(defaultEcr.match('123456789.dkr.ecr.eu-west-1.amazonaws.com')).toBe(
        false,
    );
});

test('public instance with public: true should match public.ecr.aws and not private ECR', async () => {
    const pubEcr = new Ecr();
    await pubEcr.register('registry', 'ecr', 'mypub', { public: true });

    expect(pubEcr.configuration.public).toBe(true);
    expect(pubEcr.match('public.ecr.aws')).toBe(true);
    expect(pubEcr.match('123456789.dkr.ecr.eu-west-1.amazonaws.com')).toBe(
        false,
    );
});

test('private registry with accesskeyid should match private ECR and not public.ecr.aws unless public is true', async () => {
    const privEcr = new Ecr();
    await privEcr.register('registry', 'ecr', 'private', {
        accesskeyid: 'my-key',
        secretaccesskey: 'my-secret',
        region: 'eu-west-1',
    });

    expect(privEcr.configuration.public).toBe(false);
    expect(privEcr.match('123456789.dkr.ecr.eu-west-1.amazonaws.com')).toBe(
        true,
    );
    expect(privEcr.match('public.ecr.aws')).toBe(false);

    // If private registry explicitly sets public: true
    const hybridEcr = new Ecr();
    await hybridEcr.register('registry', 'ecr', 'hybrid', {
        accesskeyid: 'my-key',
        secretaccesskey: 'my-secret',
        region: 'eu-west-1',
        public: true,
    });
    expect(hybridEcr.match('public.ecr.aws')).toBe(true);
    expect(hybridEcr.match('123456789.dkr.ecr.eu-west-1.amazonaws.com')).toBe(
        true,
    );
});

test('match should return true when registry url is from ecr', async () => {
    expect(ecr.match('123456789.dkr.ecr.eu-west-1.amazonaws.com')).toBeTruthy();
});

test('match should return false when registry url is not from ecr', async () => {
    expect(ecr.match('123456789.dkr.ecr.eu-west-1.acme.com')).toBeFalsy();
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

test('authenticate should call ecr auth endpoint for private images', async () => {
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

test('authenticate should use public ecr token endpoint for public.ecr.aws even when private keys are set', async () => {
    const axiosMock = axios as unknown as jest.MockedFunction<typeof axios>;
    axiosMock.mockResolvedValueOnce({
        data: { token: 'public-token-123' },
    });

    const result = await ecr.authenticate(
        {
            name: 'docker/library/traefik',
            registry: {
                url: 'https://public.ecr.aws/v2',
            },
        } as ContainerImage,
        { headers: {} },
    );

    expect(axiosMock).toHaveBeenCalledWith(
        expect.objectContaining({
            method: 'GET',
            url: 'https://public.ecr.aws/token/',
        }),
    );
    expect(result.headers?.Authorization).toBe('Bearer public-token-123');
});

test('getTagsPage should use proper baseUrl for public and private ecr pagination', async () => {
    const pubImage = {
        name: 'docker/library/traefik',
        registry: {
            url: 'https://public.ecr.aws/v2',
        },
    } as ContainerImage;

    const callRegistrySpy = jest
        .spyOn(ecr, 'callRegistry')
        // @ts-ignore
        .mockResolvedValueOnce({ name: 'traefik', tags: ['v1'] });

    await ecr.getTagsPage(
        pubImage,
        undefined,
        '</v2/docker/library/traefik/tags/list?n=1000&next_token=abc>; rel="next"',
    );

    expect(callRegistrySpy).toHaveBeenCalledWith(
        expect.objectContaining({
            url: 'https://public.ecr.aws/v2/docker/library/traefik/tags/list?n=1000&next_token=abc',
        }),
    );
});

test('getAuthPull should call ecr auth endpoint and get token', async () => {
    await expect(ecr.getAuthPull()).resolves.toEqual({
        username: 'accesskeyid',
        password: 'secretaccesskey',
    });
});

testRegistryProvider(Ecr, {
    accesskeyid: 'accesskeyid',
    secretaccesskey: 'secretaccesskey',
    region: 'region',
});
