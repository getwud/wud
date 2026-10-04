import axiosImport from 'axios';
import { ContainerImage } from '../model/container';
import DockerRegistryV2 from './DockerRegistryV2';

// Mock axios
jest.mock('axios', () => jest.fn());

const axios = axiosImport as unknown as jest.MockedFunction<typeof axiosImport>;

class TestRegistry extends DockerRegistryV2 {
    public registryPattern = /^.*\.?testreg\.io$/;

    getConfigurationSchema() {
        return this.joi.object();
    }
}

describe('DockerRegistryV2 base class tests', () => {
    let registry: TestRegistry;

    beforeEach(() => {
        registry = new TestRegistry();
    });

    describe('match', () => {
        test('should return false for empty or falsy imageUrl', () => {
            expect(registry.match('')).toBe(false);
            expect(registry.match(undefined as any)).toBe(false);
        });

        test('should match using registryPattern', () => {
            expect(registry.match('testreg.io')).toBe(true);
            expect(registry.match('sub.testreg.io')).toBe(true);
            expect(registry.match('other.io')).toBe(false);
        });

        test('should match using configuration.url if pattern not defined', () => {
            const noPatternRegistry = new (class extends DockerRegistryV2 {
                getConfigurationSchema() {
                    return this.joi.object();
                }
            })();
            noPatternRegistry.configuration = {
                url: 'https://registry.example.com',
            };

            expect(noPatternRegistry.match('registry.example.com')).toBe(true);
            expect(noPatternRegistry.match('other.com')).toBe(false);
        });

        test('should return false if neither pattern nor configuration.url is present', () => {
            const bareRegistry = new (class extends DockerRegistryV2 {
                getConfigurationSchema() {
                    return this.joi.object();
                }
            })();
            expect(bareRegistry.match('test.io')).toBe(false);
        });

        test('should support matchUrlPattern helper', () => {
            expect(
                registry.matchUrlPattern('my-image.io', /^.*\.?my-image\.io$/),
            ).toBe(true);
            expect(
                registry.matchUrlPattern('other.io', /^.*\.?my-image\.io$/),
            ).toBe(false);
        });
    });

    describe('normalizeImage', () => {
        test('should prepend https and append /v2 if missing', () => {
            const image: ContainerImage = {
                name: 'app/service',
                registry: { url: 'testreg.io/app/service' },
            } as any;

            const normalized = registry.normalizeImage(image);
            expect(normalized.registry.url).toBe(
                'https://testreg.io/app/service/v2',
            );
        });

        test('should not prepend https if already present', () => {
            const image: ContainerImage = {
                name: 'app/service',
                registry: { url: 'https://testreg.io/app/service/v2' },
            } as any;

            const normalized = registry.normalizeImage(image);
            expect(normalized.registry.url).toBe(
                'https://testreg.io/app/service/v2',
            );
        });

        test('should support normalizeImageUrl with custom registryUrl', () => {
            const image: ContainerImage = {
                name: 'app/service',
                registry: { url: 'old.io' },
            } as any;

            const normalized = registry.normalizeImageUrl(image, 'custom.io');
            expect(normalized.registry.url).toBe('https://custom.io/v2');
        });
    });

    describe('maskConfiguration', () => {
        test('should return empty object if configuration is not object or empty', () => {
            registry.configuration = '' as any;
            expect(registry.maskConfiguration()).toEqual({});

            registry.configuration = undefined as any;
            expect(registry.maskConfiguration()).toEqual({});
        });

        test('should mask default sensitive fields and keep others clear', () => {
            registry.configuration = {
                url: 'https://testreg.io',
                login: 'admin',
                username: 'user',
                password: 'supersecretpassword',
                token: 'secrettoken',
                auth: 'c2VjcmV0',
                clientid: 'cid',
                clientsecret: 'csecret',
                accesskeyid: 'myaccesskey',
                secretaccesskey: 'mysecretkey',
                privatekey: 'myprivatekey',
            };

            const masked = registry.maskConfiguration();
            expect(masked.url).toBe('https://testreg.io');
            expect(masked.login).toBe('admin');
            expect(masked.username).toBe('user');
            expect(masked.clientid).toBe('cid');
            expect(masked.password).toBe('s*****************d');
            expect(masked.token).toBe('s*********n');
            expect(masked.auth).toBe('c******0');
            expect(masked.clientsecret).toBe('c*****t');
            expect(masked.accesskeyid).toBe('m*********y');
            expect(masked.secretaccesskey).toBe('m*********y');
            expect(masked.privatekey).toBe('m**********y');
        });

        test('should mask proxy password in configuration', () => {
            registry.configuration = {
                url: 'https://testreg.io',
                proxy: 'http://user:supersecret@proxy:8080',
            };

            const masked = registry.maskConfiguration();
            expect(masked.proxy).toBe('http://user:***@proxy:8080/');
        });

        test('should support maskSensitiveFields helper', () => {
            registry.configuration = {
                customField: 'secretvalue',
                normalField: 'clearvalue',
            };
            const masked = registry.maskSensitiveFields(['customField']);
            expect(masked.customField).toBe('s*********e');
            expect(masked.normalField).toBe('clearvalue');
        });
    });

    describe('Authentication', () => {
        test('authenticateBasic should set Basic authorization header', async () => {
            const result = await registry.authenticateBasic(
                { headers: {} },
                'dXNlcjpwYXNz',
            );
            expect(result.headers.Authorization).toBe('Basic dXNlcjpwYXNz');
        });

        test('authenticateBasic should not modify header when credentials missing', async () => {
            const result = await registry.authenticateBasic({ headers: {} });
            expect(result.headers.Authorization).toBeUndefined();
        });

        test('authenticateBearer should set Bearer authorization header', async () => {
            const result = await registry.authenticateBearer(
                { headers: {} },
                'mytoken',
            );
            expect(result.headers.Authorization).toBe('Bearer mytoken');
        });

        test('authenticateBearer should not modify header when token missing', async () => {
            const result = await registry.authenticateBearer({ headers: {} });
            expect(result.headers.Authorization).toBeUndefined();
        });

        test('authenticate should use getAuthCredentials when available', async () => {
            registry.configuration = { login: 'user', password: 'password' };
            const result = await registry.authenticate({} as any, {
                headers: {},
            });
            expect(result.headers.Authorization).toBe(
                'Basic dXNlcjpwYXNzd29yZA==',
            );
        });

        test('authenticate should return requestOptions unmodified when no credentials', async () => {
            registry.configuration = {};
            const result = await registry.authenticate({} as any, {
                headers: {},
            });
            expect(result.headers.Authorization).toBeUndefined();
        });
    });

    describe('getAuthCredentials', () => {
        test('should return undefined when no configuration', () => {
            registry.configuration = undefined as any;
            expect(registry.getAuthCredentials()).toBeUndefined();
        });

        test('should return auth if provided', () => {
            registry.configuration = { auth: 'dXNlcjpwYXNz' };
            expect(registry.getAuthCredentials()).toBe('dXNlcjpwYXNz');
        });

        test('should encode login and password', () => {
            registry.configuration = { login: 'user', password: 'password' };
            expect(registry.getAuthCredentials()).toBe('dXNlcjpwYXNzd29yZA==');
        });

        test('should encode login and token', () => {
            registry.configuration = { login: 'user', token: 'token' };
            expect(registry.getAuthCredentials()).toBe('dXNlcjp0b2tlbg==');
        });

        test('should encode username and password', () => {
            registry.configuration = { username: 'user', password: 'password' };
            expect(registry.getAuthCredentials()).toBe('dXNlcjpwYXNzd29yZA==');
        });

        test('should encode username and token', () => {
            registry.configuration = { username: 'user', token: 'token' };
            expect(registry.getAuthCredentials()).toBe('dXNlcjp0b2tlbg==');
        });

        test('should encode clientid and clientsecret', () => {
            registry.configuration = { clientid: 'cid', clientsecret: 'csec' };
            expect(registry.getAuthCredentials()).toBe('Y2lkOmNzZWM=');
        });

        test('should encode namespace, account and token', () => {
            registry.configuration = {
                namespace: 'ns',
                account: 'acc',
                token: 'tok',
            };
            expect(registry.getAuthCredentials()).toBe('bnMrYWNjOnRvaw==');
        });

        test('should encode apikey with default iamapikey user', () => {
            registry.configuration = { apikey: 'mykey' };
            expect(registry.getAuthCredentials()).toBe('aWFtYXBpa2V5Om15a2V5');
        });

        test('should encode secretkey with default nologin user', () => {
            registry.configuration = { secretkey: 'mysecret' };
            expect(registry.getAuthCredentials()).toBe(
                'bm9sb2dpbjpteXNlY3JldA==',
            );
        });

        test('should return undefined when no matching credential fields', () => {
            registry.configuration = { url: 'https://testreg.io' };
            expect(registry.getAuthCredentials()).toBeUndefined();
        });
    });

    describe('parseBearerChallenge', () => {
        test('should return undefined when header is missing', () => {
            expect(DockerRegistryV2.parseBearerChallenge(undefined)).toBe(
                undefined,
            );
        });

        test('should return undefined when header is not a Bearer challenge', () => {
            expect(
                DockerRegistryV2.parseBearerChallenge('Basic realm="test"'),
            ).toBe(undefined);
        });

        test('should parse realm, service and scope', () => {
            expect(
                DockerRegistryV2.parseBearerChallenge(
                    'Bearer realm="https://auth.example.com/token",service="registry.example.com",scope="repository:foo/bar:pull"',
                ),
            ).toEqual({
                realm: 'https://auth.example.com/token',
                service: 'registry.example.com',
                scope: 'repository:foo/bar:pull',
            });
        });

        test('should parse realm without scope', () => {
            expect(
                DockerRegistryV2.parseBearerChallenge(
                    'Bearer realm="https://auth.example.com/token",service="registry.example.com"',
                ),
            ).toEqual({
                realm: 'https://auth.example.com/token',
                service: 'registry.example.com',
            });
        });

        test('should return undefined when realm is missing', () => {
            expect(
                DockerRegistryV2.parseBearerChallenge(
                    'Bearer service="registry.example.com"',
                ),
            ).toBe(undefined);
        });
    });

    describe('getBearerChallenge', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('should return undefined when the registry requires no auth (200 OK)', async () => {
            axios.mockResolvedValueOnce({ status: 200 });

            const challenge = await registry.getBearerChallenge(
                'https://registry.example.com',
            );
            expect(challenge).toBeUndefined();
        });

        test('should return undefined when ping fails with non-401 error', async () => {
            axios.mockRejectedValueOnce({ response: { status: 500 } });

            const challenge = await registry.getBearerChallenge(
                'https://registry.example.com',
            );
            expect(challenge).toBeUndefined();
        });

        test('should return undefined when 401 has no challenge header', async () => {
            axios.mockRejectedValueOnce({
                response: { status: 401, headers: {} },
            });

            const challenge = await registry.getBearerChallenge(
                'https://registry.example.com',
            );
            expect(challenge).toBeUndefined();
        });

        test('should return undefined when challenge is not Bearer (e.g. Basic)', async () => {
            axios.mockRejectedValueOnce({
                response: {
                    status: 401,
                    headers: {
                        'www-authenticate': 'Basic realm="registry realm"',
                    },
                },
            });

            const challenge = await registry.getBearerChallenge(
                'https://registry.example.com',
            );
            expect(challenge).toBeUndefined();
        });

        test('should parse Bearer challenge from lowercased header', async () => {
            axios.mockRejectedValueOnce({
                response: {
                    status: 401,
                    headers: {
                        'www-authenticate':
                            'Bearer realm="https://auth.example.com/token",service="registry.example.com",scope="repository:foo/bar:pull"',
                    },
                },
            });

            const challenge = await registry.getBearerChallenge(
                'https://registry.example.com',
            );
            expect(challenge).toEqual({
                realm: 'https://auth.example.com/token',
                service: 'registry.example.com',
                scope: 'repository:foo/bar:pull',
            });
        });

        test('should parse Bearer challenge from capitalized header', async () => {
            axios.mockRejectedValueOnce({
                response: {
                    status: 401,
                    headers: {
                        'WWW-Authenticate':
                            'Bearer realm="https://auth.example.com/token",service="registry.example.com"',
                    },
                },
            });

            const challenge = await registry.getBearerChallenge(
                'https://registry.example.com',
            );
            expect(challenge).toEqual({
                realm: 'https://auth.example.com/token',
                service: 'registry.example.com',
            });
        });
    });

    describe('getBearerToken', () => {
        const image = { name: 'foo/bar' } as ContainerImage;
        const credentials = 'dXNlcjpwYXNzd29yZA==';

        beforeEach(() => {
            jest.clearAllMocks();
            registry.clearBearerTokenCache();
        });

        test('should return undefined when registry requires no auth (200 OK)', async () => {
            axios.mockResolvedValueOnce({ status: 200 });

            const token = await registry.getBearerToken(
                image,
                'https://registry.example.com',
                credentials,
            );
            expect(token).toBeUndefined();
        });

        test('should return undefined when challenge is not Bearer', async () => {
            axios.mockRejectedValueOnce({
                response: {
                    status: 401,
                    headers: {
                        'www-authenticate': 'Basic realm="registry"',
                    },
                },
            });

            const token = await registry.getBearerToken(
                image,
                'https://registry.example.com',
                credentials,
            );
            expect(token).toBeUndefined();
        });

        test('should exchange challenge for token with Basic Auth when credentials are provided', async () => {
            axios.mockRejectedValueOnce({
                response: {
                    status: 401,
                    headers: {
                        'www-authenticate':
                            'Bearer realm="https://auth.example.com/token",service="registry.example.com"',
                    },
                },
            });
            axios.mockResolvedValueOnce({ data: { token: 'auth-token' } });

            const token = await registry.getBearerToken(
                image,
                'https://registry.example.com',
                credentials,
            );

            expect(token).toBe('auth-token');
            expect(axios).toHaveBeenNthCalledWith(
                1,
                expect.objectContaining({
                    method: 'GET',
                    url: 'https://registry.example.com/v2/',
                }),
            );
            expect(axios).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({
                    method: 'GET',
                    url: 'https://auth.example.com/token?service=registry.example.com&scope=repository%3Afoo%2Fbar%3Apull',
                    headers: expect.objectContaining({
                        Accept: 'application/json',
                        Authorization: `Basic ${credentials}`,
                    }),
                }),
            );
        });

        test('should exchange challenge for token without Authorization header when credentials are omitted', async () => {
            axios.mockRejectedValueOnce({
                response: {
                    status: 401,
                    headers: {
                        'www-authenticate':
                            'Bearer realm="https://auth.example.com/token",service="registry.example.com"',
                    },
                },
            });
            axios.mockResolvedValueOnce({ data: { token: 'anon-token' } });

            const token = await registry.getBearerToken(
                image,
                'https://registry.example.com',
            );

            expect(token).toBe('anon-token');
            expect(axios).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({
                    headers: expect.not.objectContaining({
                        Authorization: expect.anything(),
                    }),
                }),
            );
        });

        test('should accept non-conformant access_token field', async () => {
            axios.mockRejectedValueOnce({
                response: {
                    status: 401,
                    headers: {
                        'www-authenticate':
                            'Bearer realm="https://auth.example.com/token"',
                    },
                },
            });
            axios.mockResolvedValueOnce({
                data: { access_token: 'alt-access-token' },
            });

            const token = await registry.getBearerToken(
                image,
                'https://registry.example.com',
                credentials,
            );
            expect(token).toBe('alt-access-token');
        });

        test('should cache token and return it on subsequent calls without making HTTP requests', async () => {
            axios.mockRejectedValueOnce({
                response: {
                    status: 401,
                    headers: {
                        'www-authenticate':
                            'Bearer realm="https://auth.example.com/token",service="registry.example.com"',
                    },
                },
            });
            axios.mockResolvedValueOnce({
                data: { token: 'cached-token', expires_in: 300 },
            });

            const firstToken = await registry.getBearerToken(
                image,
                'https://registry.example.com',
                credentials,
            );
            expect(firstToken).toBe('cached-token');
            expect(axios).toHaveBeenCalledTimes(2);

            // Second call with same parameters should return cached token immediately
            const secondToken = await registry.getBearerToken(
                image,
                'https://registry.example.com',
                credentials,
            );
            expect(secondToken).toBe('cached-token');
            expect(axios).toHaveBeenCalledTimes(2);
        });

        test('should renew token when cached token has expired', async () => {
            const now = Date.now();
            jest.spyOn(Date, 'now').mockReturnValue(now);

            axios.mockRejectedValueOnce({
                response: {
                    status: 401,
                    headers: {
                        'www-authenticate':
                            'Bearer realm="https://auth.example.com/token",service="registry.example.com"',
                    },
                },
            });
            axios.mockResolvedValueOnce({
                data: { token: 'token-1', expires_in: 20 },
            });

            const firstToken = await registry.getBearerToken(
                image,
                'https://registry.example.com',
                credentials,
            );
            expect(firstToken).toBe('token-1');

            // Advance time past expiry (20 - 5 = 15s)
            (Date.now as jest.Mock).mockReturnValue(now + 16000);

            axios.mockRejectedValueOnce({
                response: {
                    status: 401,
                    headers: {
                        'www-authenticate':
                            'Bearer realm="https://auth.example.com/token",service="registry.example.com"',
                    },
                },
            });
            axios.mockResolvedValueOnce({
                data: { token: 'token-2', expires_in: 20 },
            });

            const secondToken = await registry.getBearerToken(
                image,
                'https://registry.example.com',
                credentials,
            );
            expect(secondToken).toBe('token-2');
            expect(axios).toHaveBeenCalledTimes(4);

            (Date.now as jest.Mock).mockRestore();
        });

        test('should return undefined when realm request fails with 401', async () => {
            axios.mockRejectedValueOnce({
                response: {
                    status: 401,
                    headers: {
                        'www-authenticate':
                            'Bearer realm="https://auth.example.com/token",service="registry.example.com"',
                    },
                },
            });
            axios.mockRejectedValueOnce({
                response: { status: 401, data: 'Unauthorized' },
                message: 'Request failed with status code 401',
            });

            const token = await registry.getBearerToken(
                image,
                'https://registry.example.com',
                credentials,
            );
            expect(token).toBeUndefined();
        });

        test('should return undefined when realm request fails with network error', async () => {
            axios.mockRejectedValueOnce({
                response: {
                    status: 401,
                    headers: {
                        'www-authenticate':
                            'Bearer realm="https://auth.example.com/token",service="registry.example.com"',
                    },
                },
            });
            axios.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));

            const token = await registry.getBearerToken(
                image,
                'https://registry.example.com',
                credentials,
            );
            expect(token).toBeUndefined();
        });

        test('should use provided challenge directly without pinging registry', async () => {
            axios.mockResolvedValueOnce({
                data: { token: 'direct-challenge-token' },
            });

            const challenge = {
                realm: 'https://auth.example.com/token',
                service: 'registry.example.com',
                scope: 'repository:foo/bar:pull',
            };

            const token = await registry.getBearerToken(
                image,
                'https://registry.example.com',
                credentials,
                challenge,
            );

            expect(token).toBe('direct-challenge-token');
            expect(axios).toHaveBeenCalledTimes(1);
            expect(axios).toHaveBeenCalledWith(
                expect.objectContaining({
                    method: 'GET',
                    url: 'https://auth.example.com/token?service=registry.example.com&scope=repository%3Afoo%2Fbar%3Apull',
                    headers: expect.objectContaining({
                        Authorization: `Basic ${credentials}`,
                    }),
                }),
            );
        });

        test('should properly append query string when realm already has parameters', async () => {
            axios.mockResolvedValueOnce({
                data: { token: 'token-with-existing-query' },
            });

            const challenge = {
                realm: 'https://auth.example.com/token?client=docker',
                service: 'registry.example.com',
            };

            const token = await registry.getBearerToken(
                image,
                'https://registry.example.com',
                credentials,
                challenge,
            );

            expect(token).toBe('token-with-existing-query');
            expect(axios).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: 'https://auth.example.com/token?client=docker&service=registry.example.com&scope=repository%3Afoo%2Fbar%3Apull',
                }),
            );
        });
    });

    describe('getAnonymousBearerToken', () => {
        const image = { name: 'foo/bar' } as ContainerImage;

        beforeEach(() => {
            jest.clearAllMocks();
            registry.clearBearerTokenCache();
        });

        test('should return undefined when the registry requires no auth', async () => {
            axios.mockResolvedValueOnce({ status: 200 });

            const token = await registry.getAnonymousBearerToken(
                image,
                'https://registry.example.com',
            );
            expect(token).toBe(undefined);
        });

        test('should return undefined when the ping fails with a non-401 error', async () => {
            axios.mockRejectedValueOnce({ response: { status: 500 } });

            const token = await registry.getAnonymousBearerToken(
                image,
                'https://registry.example.com',
            );
            expect(token).toBe(undefined);
        });

        test('should return undefined when the 401 has no usable challenge', async () => {
            axios.mockRejectedValueOnce({
                response: { status: 401, headers: {} },
            });

            const token = await registry.getAnonymousBearerToken(
                image,
                'https://registry.example.com',
            );
            expect(token).toBe(undefined);
        });

        test('should exchange the challenge for a token (token field)', async () => {
            axios.mockRejectedValueOnce({
                response: {
                    status: 401,
                    headers: {
                        'www-authenticate':
                            'Bearer realm="https://auth.example.com/token",service="registry.example.com"',
                    },
                },
            });
            axios.mockResolvedValueOnce({ data: { token: 'my-token' } });

            const token = await registry.getAnonymousBearerToken(
                image,
                'https://registry.example.com',
            );

            expect(token).toBe('my-token');
            expect(axios).toHaveBeenNthCalledWith(
                1,
                expect.objectContaining({
                    method: 'GET',
                    url: 'https://registry.example.com/v2/',
                    headers: {
                        'User-Agent': expect.stringMatching(/^wud\/.+/),
                    },
                }),
            );
            expect(axios).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({
                    method: 'GET',
                    url: 'https://auth.example.com/token?service=registry.example.com&scope=repository%3Afoo%2Fbar%3Apull',
                    headers: {
                        Accept: 'application/json',
                        'User-Agent': expect.stringMatching(/^wud\/.+/),
                    },
                }),
            );
        });

        test('should accept the non-conformant access_token field', async () => {
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

            const token = await registry.getAnonymousBearerToken(
                image,
                'https://docker.elastic.co',
            );

            expect(token).toBe('elastic-token');
        });

        test('should return undefined when the token exchange fails', async () => {
            axios.mockRejectedValueOnce({
                response: {
                    status: 401,
                    headers: {
                        'www-authenticate':
                            'Bearer realm="https://auth.example.com/token",service="registry.example.com"',
                    },
                },
            });
            axios.mockRejectedValueOnce(new Error('network error'));

            const token = await registry.getAnonymousBearerToken(
                image,
                'https://registry.example.com',
            );
            expect(token).toBe(undefined);
        });
    });

    describe('getAuthPull', () => {
        test('should return undefined when no configuration', async () => {
            registry.configuration = undefined as any;
            await expect(registry.getAuthPull()).resolves.toBeUndefined();
        });

        test('should return login and password', async () => {
            registry.configuration = { login: 'user', password: 'password' };
            await expect(registry.getAuthPull()).resolves.toEqual({
                username: 'user',
                password: 'password',
            });
        });

        test('should return username and password', async () => {
            registry.configuration = { username: 'user', password: 'password' };
            await expect(registry.getAuthPull()).resolves.toEqual({
                username: 'user',
                password: 'password',
            });
        });

        test('should return username and token', async () => {
            registry.configuration = { username: 'user', token: 'token' };
            await expect(registry.getAuthPull()).resolves.toEqual({
                username: 'user',
                password: 'token',
            });
        });

        test('should return clientid and clientsecret', async () => {
            registry.configuration = { clientid: 'cid', clientsecret: 'csec' };
            await expect(registry.getAuthPull()).resolves.toEqual({
                username: 'cid',
                password: 'csec',
            });
        });

        test('should return clientemail and privatekey', async () => {
            registry.configuration = {
                clientemail: 'email',
                privatekey: 'key',
            };
            await expect(registry.getAuthPull()).resolves.toEqual({
                username: 'email',
                password: 'key',
            });
        });

        test('should return accesskeyid and secretaccesskey', async () => {
            registry.configuration = {
                accesskeyid: 'aid',
                secretaccesskey: 'skey',
            };
            await expect(registry.getAuthPull()).resolves.toEqual({
                username: 'aid',
                password: 'skey',
            });
        });

        test('should return namespace+account and token', async () => {
            registry.configuration = {
                namespace: 'ns',
                account: 'acc',
                token: 'tok',
            };
            await expect(registry.getAuthPull()).resolves.toEqual({
                username: 'ns+acc',
                password: 'tok',
            });
        });

        test('should return apikey with default iamapikey username', async () => {
            registry.configuration = { apikey: 'mykey' };
            await expect(registry.getAuthPull()).resolves.toEqual({
                username: 'iamapikey',
                password: 'mykey',
            });
        });

        test('should return secretkey with default nologin username', async () => {
            registry.configuration = { secretkey: 'mysecret' };
            await expect(registry.getAuthPull()).resolves.toEqual({
                username: 'nologin',
                password: 'mysecret',
            });
        });

        test('should return undefined when no credentials configured', async () => {
            registry.configuration = { url: 'https://testreg.io' };
            await expect(registry.getAuthPull()).resolves.toBeUndefined();
        });
    });
});
