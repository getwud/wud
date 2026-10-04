import axiosImport from 'axios';
import { ContainerImage } from '../../../model/container';
import Custom from './Custom';

// Mock axios
jest.mock('axios', () => jest.fn());

const axios = axiosImport as unknown as jest.MockedFunction<typeof axiosImport>;

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
        icon: 'si-opencontainersinitiative',
        url: 'http://localhost:5000',
        login: 'login',
        password: 'password',
        concurrency: 2,
    });
});

test('validatedConfiguration should require a URL with concurrency', async () => {
    expect(() => {
        custom.validateConfiguration({ concurrency: 2 });
    }).toThrow('"url" is required');
});

test('validatedConfiguration should initialize with a bearer token', async () => {
    expect(
        custom.validateConfiguration({
            url: 'http://localhost:5000',
            token: 'personal-access-token',
        }),
    ).toStrictEqual({
        icon: 'si-opencontainersinitiative',
        url: 'http://localhost:5000',
        token: 'personal-access-token',
        concurrency: 2,
    });
});

test('validatedConfiguration should contain default icon si-opencontainersinitiative', async () => {
    const validated = custom.validateConfiguration({
        url: 'http://localhost:5000',
    });
    expect(validated.icon).toBe('si-opencontainersinitiative');
});

test('validatedConfiguration should accept and validate custom icon', async () => {
    const serverIcon = custom.validateConfiguration({
        url: 'http://localhost:5000',
        icon: 'mdi:server',
    });
    expect(serverIcon.icon).toBe('mdi:server');

    const gitlabIcon = custom.validateConfiguration({
        url: 'http://localhost:5000',
        icon: 'logos:gitlab',
    });
    expect(gitlabIcon.icon).toBe('logos:gitlab');
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

test('maskConfiguration should mask bearer tokens', async () => {
    custom.configuration = {
        url: 'http://localhost:5000',
        token: 'personal-access-token',
    };
    expect(custom.maskConfiguration()).toEqual({
        token: 'p*******************n',
        url: 'http://localhost:5000',
    });
});

test('match should return true when registry url is from custom', async () => {
    expect(custom.match('localhost:5000')).toBeTruthy();
});

test('match should return false when registry url is not from custom', async () => {
    expect(custom.match('est.notme.io')).toBeFalsy();
});

test('normalizeImage should return the proper registry v2 endpoint', async () => {
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

test('authenticate should add basic auth', async () => {
    custom.configuration = {
        login: 'login',
        password: 'password',
        url: 'http://localhost:5000',
    };
    expect(custom.authenticate(undefined, { headers: {} })).resolves.toEqual({
        headers: {
            Authorization: 'Basic bG9naW46cGFzc3dvcmQ=',
        },
    });
});

test('authenticate should add bearer auth for a token', async () => {
    custom.configuration = {
        token: 'personal-access-token',
        url: 'http://localhost:5000',
    };
    expect(custom.authenticate(undefined, { headers: {} })).resolves.toEqual({
        headers: {
            Authorization: 'Bearer personal-access-token',
        },
    });
});

test('getAuthCredentials should return base64 creds when set in configuration', async () => {
    custom.configuration.auth = 'dXNlcm5hbWU6cGFzc3dvcmQ=';
    expect(custom.getAuthCredentials()).toEqual('dXNlcm5hbWU6cGFzc3dvcmQ=');
});

test('getAuthCredentials should return base64 creds when login/password set in configuration', async () => {
    custom.configuration.login = 'username';
    custom.configuration.password = 'password';
    expect(custom.getAuthCredentials()).toEqual('dXNlcm5hbWU6cGFzc3dvcmQ=');
});

test('getAuthCredentials should return undefined when no login/token/auth set in configuration', async () => {
    custom.configuration = {};
    expect(custom.getAuthCredentials()).toBe(undefined);
});

describe('bearer token exchange and direct basic auth fallback', () => {
    const image = { name: 'elasticsearch/elasticsearch' } as ContainerImage;

    beforeEach(() => {
        custom.configuration = { url: 'https://docker.elastic.co' };
        custom.clearBearerTokenCache();
        jest.clearAllMocks();
    });

    describe('authenticated bearer token exchange', () => {
        test('should exchange registry challenge for a bearer token when login and password are configured', async () => {
            custom.configuration = {
                url: 'https://docker.elastic.co',
                login: 'myuser',
                password: 'mypassword',
            };

            axios.mockRejectedValueOnce({
                response: {
                    status: 401,
                    headers: {
                        'www-authenticate':
                            'Bearer realm="https://docker-auth.elastic.co/token",service="token-service"',
                    },
                },
            });
            axios.mockResolvedValueOnce({
                data: { token: 'auth-bearer-token' },
            });

            const result = await custom.authenticate(image, { headers: {} });

            expect(result.headers.Authorization).toBe(
                'Bearer auth-bearer-token',
            );
            expect(axios).toHaveBeenNthCalledWith(
                1,
                expect.objectContaining({
                    method: 'GET',
                    url: 'https://docker.elastic.co/v2/',
                }),
            );
            expect(axios).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({
                    method: 'GET',
                    url: 'https://docker-auth.elastic.co/token?service=token-service&scope=repository%3Aelasticsearch%2Felasticsearch%3Apull',
                    headers: expect.objectContaining({
                        Authorization: 'Basic bXl1c2VyOm15cGFzc3dvcmQ=',
                    }),
                }),
            );
        });

        test('should exchange registry challenge for a bearer token when auth (base64) is configured', async () => {
            custom.configuration = {
                url: 'https://docker.elastic.co',
                auth: 'bXl1c2VyOm15cGFzc3dvcmQ=',
            };

            axios.mockRejectedValueOnce({
                response: {
                    status: 401,
                    headers: {
                        'www-authenticate':
                            'Bearer realm="https://docker-auth.elastic.co/token",service="token-service"',
                    },
                },
            });
            axios.mockResolvedValueOnce({
                data: { access_token: 'auth-access-token' },
            });

            const result = await custom.authenticate(image, { headers: {} });

            expect(result.headers.Authorization).toBe(
                'Bearer auth-access-token',
            );
            expect(axios).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: 'Basic bXl1c2VyOm15cGFzc3dvcmQ=',
                    }),
                }),
            );
        });
    });

    describe('direct basic auth fallback', () => {
        test('should fallback to direct basic auth when registry does not challenge (ping returns 200)', async () => {
            custom.configuration = {
                url: 'https://registry.example.com',
                login: 'login',
                password: 'password',
            };

            axios.mockResolvedValueOnce({ status: 200 });

            const result = await custom.authenticate(image, { headers: {} });

            expect(axios).toHaveBeenCalledTimes(1);
            expect(axios).toHaveBeenCalledWith(
                expect.objectContaining({
                    method: 'GET',
                    url: 'https://registry.example.com/v2/',
                }),
            );
            expect(result.headers.Authorization).toBe(
                'Basic bG9naW46cGFzc3dvcmQ=',
            );
        });

        test('should fallback to direct basic auth when registry challenge is not Bearer (e.g. Basic)', async () => {
            custom.configuration = {
                url: 'https://registry.example.com',
                login: 'login',
                password: 'password',
            };

            axios.mockRejectedValueOnce({
                response: {
                    status: 401,
                    headers: {
                        'www-authenticate': 'Basic realm="registry realm"',
                    },
                },
            });

            const result = await custom.authenticate(image, { headers: {} });

            expect(axios).toHaveBeenCalledTimes(1);
            expect(result.headers.Authorization).toBe(
                'Basic bG9naW46cGFzc3dvcmQ=',
            );
        });
    });

    describe('anonymous bearer token exchange', () => {
        test('should exchange registry challenge for a bearer token when no static credentials are configured', async () => {
            axios.mockRejectedValueOnce({
                response: {
                    status: 401,
                    headers: {
                        'www-authenticate':
                            'Bearer realm="https://docker-auth.elastic.co/token",service="token-service"',
                    },
                },
            });
            axios.mockResolvedValueOnce({
                data: { access_token: 'elastic-token' },
            });

            const result = await custom.authenticate(image, { headers: {} });

            expect(result.headers.Authorization).toBe('Bearer elastic-token');
            expect(axios).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({
                    headers: expect.not.objectContaining({
                        Authorization: expect.anything(),
                    }),
                }),
            );
        });

        test('should leave requestOptions unmodified when registry requires no auth', async () => {
            axios.mockResolvedValueOnce({ status: 200 });

            const result = await custom.authenticate(image, { headers: {} });

            expect(result.headers.Authorization).toBeUndefined();
        });
    });

    describe('static bearer token', () => {
        test('should not attempt a token exchange when a static token is configured', async () => {
            custom.configuration = {
                url: 'https://docker.elastic.co',
                token: 'static-token',
            };

            const result = await custom.authenticate(undefined, {
                headers: {},
            });

            expect(axios).not.toHaveBeenCalled();
            expect(result.headers.Authorization).toBe('Bearer static-token');
        });
    });

    describe('token caching and renewal', () => {
        test('should reuse cached bearer token without invoking axios on subsequent authenticate calls', async () => {
            custom.configuration = {
                url: 'https://docker.elastic.co',
                login: 'user',
                password: 'password',
            };

            axios.mockRejectedValueOnce({
                response: {
                    status: 401,
                    headers: {
                        'www-authenticate':
                            'Bearer realm="https://docker-auth.elastic.co/token",service="token-service"',
                    },
                },
            });
            axios.mockResolvedValueOnce({
                data: { token: 'cached-token-123', expires_in: 300 },
            });

            const firstResult = await custom.authenticate(image, {
                headers: {},
            });
            expect(firstResult.headers.Authorization).toBe(
                'Bearer cached-token-123',
            );
            expect(axios).toHaveBeenCalledTimes(2);

            // Second authenticate call with same image and config should use cache
            const secondResult = await custom.authenticate(image, {
                headers: {},
            });
            expect(secondResult.headers.Authorization).toBe(
                'Bearer cached-token-123',
            );
            expect(axios).toHaveBeenCalledTimes(2);
        });

        test('should renew token when cached token has expired', async () => {
            custom.configuration = {
                url: 'https://docker.elastic.co',
                login: 'user',
                password: 'password',
            };

            const now = Date.now();
            jest.spyOn(Date, 'now').mockReturnValue(now);

            axios.mockRejectedValueOnce({
                response: {
                    status: 401,
                    headers: {
                        'www-authenticate':
                            'Bearer realm="https://docker-auth.elastic.co/token",service="token-service"',
                    },
                },
            });
            axios.mockResolvedValueOnce({
                data: { token: 'token-initial', expires_in: 20 },
            });

            const firstResult = await custom.authenticate(image, {
                headers: {},
            });
            expect(firstResult.headers.Authorization).toBe(
                'Bearer token-initial',
            );

            // Advance time past expiry
            (Date.now as jest.Mock).mockReturnValue(now + 16000);

            axios.mockRejectedValueOnce({
                response: {
                    status: 401,
                    headers: {
                        'www-authenticate':
                            'Bearer realm="https://docker-auth.elastic.co/token",service="token-service"',
                    },
                },
            });
            axios.mockResolvedValueOnce({
                data: { token: 'token-renewed', expires_in: 20 },
            });

            const secondResult = await custom.authenticate(image, {
                headers: {},
            });
            expect(secondResult.headers.Authorization).toBe(
                'Bearer token-renewed',
            );
            expect(axios).toHaveBeenCalledTimes(4);

            (Date.now as jest.Mock).mockRestore();
        });
    });

    describe('error cases', () => {
        test('should leave requestOptions unmodified when realm returns 401 and not fall back to basic auth', async () => {
            custom.configuration = {
                url: 'https://docker.elastic.co',
                login: 'invalid-user',
                password: 'invalid-password',
            };

            axios.mockRejectedValueOnce({
                response: {
                    status: 401,
                    headers: {
                        'www-authenticate':
                            'Bearer realm="https://docker-auth.elastic.co/token",service="token-service"',
                    },
                },
            });
            axios.mockRejectedValueOnce({
                response: { status: 401, data: 'Unauthorized' },
                message: 'Request failed with status code 401',
            });

            const result = await custom.authenticate(image, { headers: {} });

            expect(result.headers.Authorization).toBeUndefined();
            expect(axios).toHaveBeenCalledTimes(2);
        });

        test('should leave requestOptions unmodified when realm fails with network error', async () => {
            custom.configuration = {
                url: 'https://docker.elastic.co',
                login: 'user',
                password: 'password',
            };

            axios.mockRejectedValueOnce({
                response: {
                    status: 401,
                    headers: {
                        'www-authenticate':
                            'Bearer realm="https://docker-auth.elastic.co/token",service="token-service"',
                    },
                },
            });
            axios.mockRejectedValueOnce(new Error('network error'));

            const result = await custom.authenticate(image, { headers: {} });

            expect(result.headers.Authorization).toBeUndefined();
            expect(axios).toHaveBeenCalledTimes(2);
        });
    });
});
