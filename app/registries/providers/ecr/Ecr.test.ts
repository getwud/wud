const mockEcrSend = jest.fn();

jest.mock('@aws-sdk/client-ecr', () => {
    return {
        ECRClient: jest.fn().mockImplementation((config: unknown) => ({
            config,
            send: (...args: unknown[]) => mockEcrSend(...args),
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
} as unknown as Logger;

ecr.configuration = {
    accesskeyid: 'accesskeyid',
    secretaccesskey: 'secretaccesskey',
    region: 'region',
    public: false,
};

beforeEach(() => {
    mockEcrSend.mockReset();
    mockEcrSend.mockResolvedValue({
        authorizationData: [
            {
                authorizationToken: 'xxxxx',
                expiresAt: new Date(Date.now() + 3600 * 1000),
            },
        ],
    });
});

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
            headers: expect.objectContaining({
                'User-Agent': expect.stringMatching(/^wud\/.+/),
            }),
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

describe('getAuthPull', () => {
    let testEcr: Ecr;

    beforeEach(() => {
        testEcr = new Ecr();
        testEcr.log = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
        } as unknown as Logger;
        testEcr.configuration = {
            accesskeyid: 'my-access-key',
            secretaccesskey: 'my-secret-key',
            region: 'eu-west-1',
            public: false,
        };
    });

    test('should return undefined when configuration is undefined', async () => {
        testEcr.configuration =
            undefined as unknown as typeof testEcr.configuration;
        await expect(testEcr.getAuthPull()).resolves.toBeUndefined();
    });

    test('should return undefined when accesskeyid is missing', async () => {
        testEcr.configuration = {
            secretaccesskey: 'my-secret-key',
            region: 'eu-west-1',
            public: false,
        };
        await expect(testEcr.getAuthPull()).resolves.toBeUndefined();
    });

    test('should return undefined when secretaccesskey is missing', async () => {
        testEcr.configuration = {
            accesskeyid: 'my-access-key',
            region: 'eu-west-1',
            public: false,
        };
        await expect(testEcr.getAuthPull()).resolves.toBeUndefined();
    });

    test('should return undefined for public registry without AWS keys', async () => {
        testEcr.configuration = {
            public: true,
            region: 'us-east-1',
        };
        await expect(testEcr.getAuthPull()).resolves.toBeUndefined();
    });

    test('should decode base64 authorizationToken into username AWS and decoded password', async () => {
        const rawPassword = 'my-super-secret-ecr-token-password';
        const base64Token = Buffer.from(`AWS:${rawPassword}`).toString(
            'base64',
        );
        mockEcrSend.mockResolvedValueOnce({
            authorizationData: [
                {
                    authorizationToken: base64Token,
                    expiresAt: new Date(Date.now() + 3600 * 1000),
                },
            ],
        });

        const auth = await testEcr.getAuthPull();
        expect(auth).toEqual({
            username: 'AWS',
            password: rawPassword,
        });
    });

    test('should handle base64 authorizationToken when password contains colons', async () => {
        const rawPassword = 'part1:part2:part3:special';
        const base64Token = Buffer.from(`AWS:${rawPassword}`).toString(
            'base64',
        );
        mockEcrSend.mockResolvedValueOnce({
            authorizationData: [
                {
                    authorizationToken: base64Token,
                    expiresAt: new Date(Date.now() + 3600 * 1000),
                },
            ],
        });

        const auth = await testEcr.getAuthPull();
        expect(auth).toEqual({
            username: 'AWS',
            password: rawPassword,
        });
    });

    test('should handle already formatted user:password token without base64', async () => {
        mockEcrSend.mockResolvedValueOnce({
            authorizationData: [
                {
                    authorizationToken: 'AWS:plain-password',
                    expiresAt: new Date(Date.now() + 3600 * 1000),
                },
            ],
        });

        const auth = await testEcr.getAuthPull();
        expect(auth).toEqual({
            username: 'AWS',
            password: 'plain-password',
        });
    });

    test('should fallback to username AWS when authorizationToken is not user:password', async () => {
        mockEcrSend.mockResolvedValueOnce({
            authorizationData: [
                {
                    authorizationToken: 'raw-unencoded-token',
                    expiresAt: new Date(Date.now() + 3600 * 1000),
                },
            ],
        });

        const auth = await testEcr.getAuthPull();
        expect(auth).toEqual({
            username: 'AWS',
            password: 'raw-unencoded-token',
        });
    });

    test('should reuse cached token when it has not expired', async () => {
        const base64Token = Buffer.from('AWS:cached-token').toString('base64');
        mockEcrSend.mockResolvedValueOnce({
            authorizationData: [
                {
                    authorizationToken: base64Token,
                    expiresAt: new Date(Date.now() + 3600 * 1000),
                },
            ],
        });

        const firstAuth = await testEcr.getAuthPull();
        expect(firstAuth).toEqual({
            username: 'AWS',
            password: 'cached-token',
        });
        expect(mockEcrSend).toHaveBeenCalledTimes(1);

        // Second call should hit the cache without calling AWS again
        const secondAuth = await testEcr.getAuthPull();
        expect(secondAuth).toEqual({
            username: 'AWS',
            password: 'cached-token',
        });
        expect(mockEcrSend).toHaveBeenCalledTimes(1);
    });

    test('should refresh token when cached token has expired', async () => {
        const expiredToken =
            Buffer.from('AWS:expired-token').toString('base64');
        const refreshedToken = Buffer.from('AWS:refreshed-token').toString(
            'base64',
        );

        mockEcrSend
            .mockResolvedValueOnce({
                authorizationData: [
                    {
                        authorizationToken: expiredToken,
                        // Expired 10 seconds ago
                        expiresAt: new Date(Date.now() - 10 * 1000),
                    },
                ],
            })
            .mockResolvedValueOnce({
                authorizationData: [
                    {
                        authorizationToken: refreshedToken,
                        expiresAt: new Date(Date.now() + 3600 * 1000),
                    },
                ],
            });

        const firstAuth = await testEcr.getAuthPull();
        expect(firstAuth).toEqual({
            username: 'AWS',
            password: 'expired-token',
        });
        expect(mockEcrSend).toHaveBeenCalledTimes(1);

        // Second call should notice expiration and refresh
        const secondAuth = await testEcr.getAuthPull();
        expect(secondAuth).toEqual({
            username: 'AWS',
            password: 'refreshed-token',
        });
        expect(mockEcrSend).toHaveBeenCalledTimes(2);
    });

    test('should pass configured accountid to ECRClient', async () => {
        testEcr.configuration.accountid = '123456789012';
        const base64Token = Buffer.from('AWS:account-token').toString('base64');
        mockEcrSend.mockResolvedValueOnce({
            authorizationData: [
                {
                    authorizationToken: base64Token,
                    expiresAt: new Date(Date.now() + 3600 * 1000),
                },
            ],
        });

        await testEcr.getAuthPull();
        expect(mockEcrSend).toHaveBeenCalledTimes(1);
    });

    test('should throw error when authorizationData is empty', async () => {
        mockEcrSend.mockResolvedValueOnce({
            authorizationData: [],
        });

        await expect(testEcr.getAuthPull()).rejects.toThrow(
            'Unable to obtain ECR authorization token',
        );
        expect(testEcr.log.error).toHaveBeenCalled();
    });

    test('should throw error when authorizationToken is missing in authorizationData', async () => {
        mockEcrSend.mockResolvedValueOnce({
            authorizationData: [{ expiresAt: new Date() }],
        });

        await expect(testEcr.getAuthPull()).rejects.toThrow(
            'Unable to obtain ECR authorization token',
        );
        expect(testEcr.log.error).toHaveBeenCalled();
    });

    test('should throw error and log when ECRClient.send fails', async () => {
        mockEcrSend.mockRejectedValueOnce(
            new Error('The security token included in the request is invalid'),
        );

        await expect(testEcr.getAuthPull()).rejects.toThrow(
            'The security token included in the request is invalid',
        );
        expect(testEcr.log.error).toHaveBeenCalledWith(
            expect.stringContaining(
                'Failed to get ECR authorization token for pull: The security token included in the request is invalid',
            ),
        );
    });
});

testRegistryProvider(Ecr, {
    accesskeyid: 'accesskeyid',
    secretaccesskey: 'secretaccesskey',
    region: 'region',
});
