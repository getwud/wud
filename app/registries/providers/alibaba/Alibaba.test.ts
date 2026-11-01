import Alibaba from './Alibaba';
import { ContainerImage } from '../../../model/container';
import { testRegistryProvider } from '../RegistryTestHelper';

jest.mock('axios', () => jest.fn());
import axios from 'axios';

const mockedAxios = axios as jest.MockedFunction<typeof axios>;

const validConfig = {
    username: 'aliyun-user',
    password: 'aliyun-password',
};

const alibaba = new Alibaba();
alibaba.configuration = validConfig;

test('validateConfiguration should accept empty string', () => {
    expect(() => {
        alibaba.validateConfiguration('' as any);
    }).not.toThrow();
});

test('validateConfiguration should accept username and password config', () => {
    expect(() => {
        alibaba.validateConfiguration(validConfig);
    }).not.toThrow();
});

test('validateConfiguration should accept username and token config', () => {
    expect(() => {
        alibaba.validateConfiguration({
            username: 'aliyun-user',
            token: 'aliyun-token',
        });
    }).not.toThrow();
});

test('validateConfiguration should accept auth config', () => {
    expect(() => {
        alibaba.validateConfiguration({
            auth: 'YWxpeXVuLXVzZXI6YWxpeXVuLXBhc3N3b3Jk',
        });
    }).not.toThrow();
});

test('validateConfiguration should accept token-only config', () => {
    expect(() => {
        alibaba.validateConfiguration({
            token: 'direct-bearer-token',
        });
    }).not.toThrow();
});

describe('Alibaba ACR Bearer authentication', () => {
    const image = {
        name: 'my-ns/my-app',
        registry: { url: 'https://registry.cn-hangzhou.aliyuncs.com/v2' },
    } as ContainerImage;

    beforeEach(() => {
        jest.clearAllMocks();
        alibaba.clearBearerTokenCache();
        alibaba.configuration = validConfig;
    });

    test('should exchange the ACR challenge for a Bearer token with username/password', async () => {
        mockedAxios.mockRejectedValueOnce({
            response: {
                status: 401,
                headers: {
                    'www-authenticate':
                        'Bearer realm="https://auth.aliyuncs.com/token",service="registry.cn-hangzhou.aliyuncs.com"',
                },
            },
        });
        mockedAxios.mockResolvedValueOnce({
            data: { token: 'acr-bearer-token' },
        });

        const result = await alibaba.authenticate(image, { headers: {} });

        // Probing /v2/ must normalize the registry URL (no double /v2/v2/)
        expect(mockedAxios).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                method: 'GET',
                url: 'https://registry.cn-hangzhou.aliyuncs.com/v2/',
            }),
        );
        // Token exchange request sent to realm with Basic auth
        expect(mockedAxios).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                method: 'GET',
                url: 'https://auth.aliyuncs.com/token?service=registry.cn-hangzhou.aliyuncs.com&scope=repository%3Amy-ns%2Fmy-app%3Apull',
                headers: expect.objectContaining({
                    Authorization: `Basic ${Buffer.from('aliyun-user:aliyun-password', 'utf-8').toString('base64')}`,
                }),
            }),
        );
        expect(result.headers.Authorization).toBe('Bearer acr-bearer-token');
    });

    test('should exchange the ACR challenge for a Bearer token with username/token', async () => {
        alibaba.configuration = {
            username: 'aliyun-user',
            token: 'aliyun-token',
        };

        mockedAxios.mockRejectedValueOnce({
            response: {
                status: 401,
                headers: {
                    'www-authenticate':
                        'Bearer realm="https://auth.aliyuncs.com/token",service="registry.cn-hangzhou.aliyuncs.com"',
                },
            },
        });
        mockedAxios.mockResolvedValueOnce({
            data: { token: 'acr-bearer-from-token' },
        });

        const result = await alibaba.authenticate(image, { headers: {} });

        expect(mockedAxios).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: `Basic ${Buffer.from('aliyun-user:aliyun-token', 'utf-8').toString('base64')}`,
                }),
            }),
        );
        expect(result.headers.Authorization).toBe(
            'Bearer acr-bearer-from-token',
        );
    });

    test('should exchange the ACR challenge for a Bearer token with auth string', async () => {
        const rawAuth = Buffer.from('aliyun-user:auth-pass', 'utf-8').toString(
            'base64',
        );
        alibaba.configuration = { auth: rawAuth };

        mockedAxios.mockRejectedValueOnce({
            response: {
                status: 401,
                headers: {
                    'www-authenticate':
                        'Bearer realm="https://auth.aliyuncs.com/token",service="registry.cn-hangzhou.aliyuncs.com"',
                },
            },
        });
        mockedAxios.mockResolvedValueOnce({
            data: { token: 'acr-bearer-from-auth' },
        });

        const result = await alibaba.authenticate(image, { headers: {} });

        expect(mockedAxios).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: `Basic ${rawAuth}`,
                }),
            }),
        );
        expect(result.headers.Authorization).toBe(
            'Bearer acr-bearer-from-auth',
        );
    });

    test('should support anonymous token exchange for public repos when no credentials are configured', async () => {
        alibaba.configuration = {};

        mockedAxios.mockRejectedValueOnce({
            response: {
                status: 401,
                headers: {
                    'www-authenticate':
                        'Bearer realm="https://auth.aliyuncs.com/token",service="registry.cn-hangzhou.aliyuncs.com"',
                },
            },
        });
        mockedAxios.mockResolvedValueOnce({
            data: { token: 'anonymous-acr-token' },
        });

        const result = await alibaba.authenticate(image, { headers: {} });

        expect(mockedAxios).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                method: 'GET',
                url: 'https://auth.aliyuncs.com/token?service=registry.cn-hangzhou.aliyuncs.com&scope=repository%3Amy-ns%2Fmy-app%3Apull',
            }),
        );
        // Anonymous request must NOT send Authorization header to token endpoint
        const tokenCallHeaders = (mockedAxios.mock.calls[1][0] as any).headers;
        expect(tokenCallHeaders.Authorization).toBeUndefined();
        expect(result.headers.Authorization).toBe('Bearer anonymous-acr-token');
    });

    test('should use static Bearer token directly when configured without username', async () => {
        alibaba.configuration = {
            token: 'pre-issued-bearer-token',
        };

        const result = await alibaba.authenticate(image, { headers: {} });

        expect(mockedAxios).not.toHaveBeenCalled();
        expect(result.headers.Authorization).toBe(
            'Bearer pre-issued-bearer-token',
        );
    });

    test('should cache Bearer token and reuse it on subsequent calls', async () => {
        mockedAxios.mockRejectedValueOnce({
            response: {
                status: 401,
                headers: {
                    'www-authenticate':
                        'Bearer realm="https://auth.aliyuncs.com/token",service="registry.cn-hangzhou.aliyuncs.com"',
                },
            },
        });
        mockedAxios.mockResolvedValueOnce({
            data: { token: 'cached-acr-token', expires_in: 3600 },
        });

        const firstResult = await alibaba.authenticate(image, { headers: {} });
        expect(firstResult.headers.Authorization).toBe(
            'Bearer cached-acr-token',
        );
        expect(mockedAxios).toHaveBeenCalledTimes(2);

        // Second call should return cached token without invoking axios
        const secondResult = await alibaba.authenticate(image, { headers: {} });
        expect(secondResult.headers.Authorization).toBe(
            'Bearer cached-acr-token',
        );
        expect(mockedAxios).toHaveBeenCalledTimes(2);
    });

    test('should support access_token field in token response', async () => {
        mockedAxios.mockRejectedValueOnce({
            response: {
                status: 401,
                headers: {
                    'www-authenticate':
                        'Bearer realm="https://auth.aliyuncs.com/token",service="registry.cn-hangzhou.aliyuncs.com"',
                },
            },
        });
        mockedAxios.mockResolvedValueOnce({
            data: { access_token: 'acr-access-token' },
        });

        const result = await alibaba.authenticate(image, { headers: {} });
        expect(result.headers.Authorization).toBe('Bearer acr-access-token');
    });

    test('should fall back to Basic when Bearer token exchange fails and credentials exist', async () => {
        // Ping succeeds (no 401 challenge)
        mockedAxios.mockResolvedValueOnce({ status: 200 });

        const result = await alibaba.authenticate(image, { headers: {} });

        expect(result.headers.Authorization).toBe(
            `Basic ${Buffer.from('aliyun-user:aliyun-password', 'utf-8').toString('base64')}`,
        );
    });

    test('should return unauthenticated request options when Bearer exchange fails without credentials', async () => {
        alibaba.configuration = {};
        mockedAxios.mockResolvedValueOnce({ status: 200 });

        const result = await alibaba.authenticate(image, { headers: {} });

        expect(result.headers.Authorization).toBeUndefined();
    });

    test('should handle registry URL without protocol or trailing /v2', async () => {
        const rawImage = {
            name: 'my-ns/my-app',
            registry: { url: 'registry.cn-hangzhou.aliyuncs.com' },
        } as ContainerImage;

        mockedAxios.mockRejectedValueOnce({
            response: {
                status: 401,
                headers: {
                    'www-authenticate':
                        'Bearer realm="https://auth.aliyuncs.com/token",service="registry.cn-hangzhou.aliyuncs.com"',
                },
            },
        });
        mockedAxios.mockResolvedValueOnce({
            data: { token: 'raw-url-token' },
        });

        const result = await alibaba.authenticate(rawImage, { headers: {} });

        expect(mockedAxios).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                method: 'GET',
                url: 'https://registry.cn-hangzhou.aliyuncs.com/v2/',
            }),
        );
        expect(result.headers.Authorization).toBe('Bearer raw-url-token');
    });

    test('should fall back gracefully when image or registry url is missing', async () => {
        const result = await alibaba.authenticate(undefined as any, {
            headers: {},
        });
        expect(result.headers.Authorization).toBe(
            `Basic ${Buffer.from('aliyun-user:aliyun-password', 'utf-8').toString('base64')}`,
        );
    });
});

testRegistryProvider(Alibaba, validConfig, {
    matchingUrls: [
        'registry.cn-hangzhou.aliyuncs.com',
        'registry.ap-southeast-1.aliyuncs.com',
        'my-ns.aliyuncs.com',
    ],
    nonMatchingUrls: ['docker.io', 'ghcr.io', 'aliyun.com'],
    sampleImage: {
        input: {
            name: 'my-ns/my-app',
            registry: {
                url: 'registry.cn-hangzhou.aliyuncs.com/my-ns/my-app',
            },
        },
        expected: {
            name: 'my-ns/my-app',
            registry: {
                url: 'https://registry.cn-hangzhou.aliyuncs.com/my-ns/my-app/v2',
            },
        },
    },
    maskConfig: {
        input: {
            username: 'aliyun-user',
            password: 'secret-password-1234',
            other: 'clear',
        },
        expected: {
            username: 'aliyun-user',
            password: 's******************4',
            other: 'clear',
        },
    },
    authPullConfig: {
        input: validConfig,
        expected: {
            username: 'aliyun-user',
            password: 'aliyun-password',
        },
    },
});
