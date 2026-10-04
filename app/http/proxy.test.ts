import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import {
    applyProxyConfig,
    clearProxyAgentCache,
    createProxyAgent,
    getAxiosProxyConfig,
    getCachedProxyAgent,
    maskProxy,
    setupAxiosProxy,
} from './proxy';

describe('HTTP Proxy Helper', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        clearProxyAgentCache();
        delete process.env.HTTP_PROXY;
        delete process.env.HTTPS_PROXY;
        delete process.env.http_proxy;
        delete process.env.https_proxy;
        delete process.env.NO_PROXY;
        delete process.env.no_proxy;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('createProxyAgent', () => {
        test('should create HttpsProxyAgent for http:// proxy url by default', () => {
            const agent = createProxyAgent('http://proxy.example.com:8080');
            expect(agent).toBeInstanceOf(HttpsProxyAgent);
        });

        test('should create HttpsProxyAgent for https:// proxy url by default', () => {
            const agent = createProxyAgent('https://proxy.example.com:8443');
            expect(agent).toBeInstanceOf(HttpsProxyAgent);
        });

        test('should create HttpProxyAgent for http:// proxy url when target is HTTP', () => {
            const agent = createProxyAgent(
                'http://proxy.example.com:8080',
                false,
            );
            expect(agent).toBeInstanceOf(HttpProxyAgent);
        });

        test('should create HttpProxyAgent for https:// proxy url when target is HTTP', () => {
            const agent = createProxyAgent(
                'https://proxy.example.com:8443',
                'http:',
            );
            expect(agent).toBeInstanceOf(HttpProxyAgent);
        });

        test('should create SocksProxyAgent for socks:// proxy url', () => {
            const agent = createProxyAgent('socks://proxy.example.com:1080');
            expect(agent).toBeInstanceOf(SocksProxyAgent);
        });

        test('should create SocksProxyAgent for socks5:// proxy url regardless of target protocol', () => {
            const agent = createProxyAgent(
                'socks5://user:pass@proxy.example.com:1080',
                false,
            );
            expect(agent).toBeInstanceOf(SocksProxyAgent);
        });

        test('should throw error for unsupported proxy protocol', () => {
            expect(() =>
                createProxyAgent('ftp://proxy.example.com:21'),
            ).toThrow('Unsupported proxy protocol (ftp:) for proxy url');
        });
    });

    describe('getCachedProxyAgent', () => {
        test('should cache and reuse proxy agent instances for the same URL and target protocol', () => {
            const url = 'http://cached-proxy:8080';
            const agent1 = getCachedProxyAgent(url);
            const agent2 = getCachedProxyAgent(url);
            expect(agent1).toBe(agent2);
        });

        test('should return different agents for HTTPS vs HTTP targets on same proxy URL', () => {
            const url = 'http://cached-proxy:8080';
            const httpsAgent = getCachedProxyAgent(url, true);
            const httpAgent = getCachedProxyAgent(url, false);
            expect(httpsAgent).toBeInstanceOf(HttpsProxyAgent);
            expect(httpAgent).toBeInstanceOf(HttpProxyAgent);
            expect(httpsAgent).not.toBe(httpAgent);
        });

        test('should reuse same SocksProxyAgent for both HTTP and HTTPS targets', () => {
            const url = 'socks5://cached-proxy:1080';
            const agent1 = getCachedProxyAgent(url, true);
            const agent2 = getCachedProxyAgent(url, false);
            expect(agent1).toBeInstanceOf(SocksProxyAgent);
            expect(agent1).toBe(agent2);
        });

        test('should create distinct agent instances for different URLs', () => {
            const agent1 = getCachedProxyAgent('http://proxy1:8080');
            const agent2 = getCachedProxyAgent('http://proxy2:8080');
            expect(agent1).not.toBe(agent2);
        });

        test('should clear cache when clearProxyAgentCache is called', () => {
            const url = 'http://proxy-to-clear:8080';
            const agent1 = getCachedProxyAgent(url);
            clearProxyAgentCache();
            const agent2 = getCachedProxyAgent(url);
            expect(agent1).not.toBe(agent2);
        });
    });

    describe('maskProxy', () => {
        test('should return undefined when proxyUrl is undefined or empty', () => {
            expect(maskProxy(undefined)).toBeUndefined();
            expect(maskProxy('')).toBeUndefined();
        });

        test('should mask password in proxy URL', () => {
            expect(
                maskProxy('http://user:secret123@proxy.example.com:8080'),
            ).toBe('http://user:***@proxy.example.com:8080/');
            expect(maskProxy('socks5://admin:mypassword@proxy:1080')).toBe(
                'socks5://admin:***@proxy:1080',
            );
        });

        test('should preserve proxy URL without password', () => {
            expect(maskProxy('http://proxy.example.com:8080')).toBe(
                'http://proxy.example.com:8080/',
            );
        });

        test('should return *** for malformed proxy URL', () => {
            expect(maskProxy('not-a-valid-url')).toBe('***');
        });
    });

    describe('getAxiosProxyConfig', () => {
        test('should return undefined when no proxy is configured and env has no proxy', () => {
            const config = getAxiosProxyConfig(
                'https://registry-1.docker.io/v2/',
            );
            expect(config).toBeUndefined();
        });

        test('should return HttpsProxyAgent with proxy: false for HTTPS target with HTTPS_PROXY', () => {
            process.env.HTTPS_PROXY = 'http://corp-proxy:3128';
            const config = getAxiosProxyConfig(
                'https://registry-1.docker.io/v2/',
            );
            expect(config).toBeDefined();
            expect(config?.httpsAgent).toBeInstanceOf(HttpsProxyAgent);
            expect(config?.proxy).toBe(false);
            expect(config?.httpAgent).toBeUndefined();
        });

        test('should return SocksProxyAgent for both httpAgent and httpsAgent with SOCKS proxy', () => {
            process.env.HTTPS_PROXY = 'socks5://corp-proxy:1080';
            const config = getAxiosProxyConfig(
                'https://registry-1.docker.io/v2/',
            );
            expect(config).toBeDefined();
            expect(config?.httpsAgent).toBeInstanceOf(SocksProxyAgent);
            expect(config?.httpAgent).toBeInstanceOf(SocksProxyAgent);
            expect(config?.proxy).toBe(false);
        });

        test('should prioritize explicit proxy URL over environment variable', () => {
            process.env.HTTPS_PROXY = 'http://env-proxy:3128';
            const config = getAxiosProxyConfig(
                'https://registry-1.docker.io/v2/',
                'http://explicit-proxy:8080',
            );
            expect(config).toBeDefined();
            expect(config?.httpsAgent).toBeInstanceOf(HttpsProxyAgent);
            expect(config?.proxy).toBe(false);
        });

        test('should respect NO_PROXY environment variable with HTTPS_PROXY', () => {
            process.env.HTTPS_PROXY = 'http://corp-proxy:3128';
            process.env.NO_PROXY = '.docker.io,localhost,.local';

            const matchedConfig = getAxiosProxyConfig(
                'https://registry-1.docker.io/v2/',
            );
            expect(matchedConfig).toBeUndefined();

            const unmatchedConfig = getAxiosProxyConfig('https://ghcr.io/v2/');
            expect(unmatchedConfig).toBeDefined();
            expect(unmatchedConfig?.httpsAgent).toBeInstanceOf(HttpsProxyAgent);
        });

        test('should fall back to HTTP_PROXY / http_proxy for HTTPS target when HTTPS_PROXY is not set', () => {
            process.env.HTTP_PROXY = 'http://corp-proxy:3128';

            const config = getAxiosProxyConfig(
                'https://registry-1.docker.io/v2/',
            );
            expect(config).toBeDefined();
            expect(config?.httpsAgent).toBeInstanceOf(HttpsProxyAgent);
            expect(config?.proxy).toBe(false);
            expect(config?.httpAgent).toBeUndefined();
        });

        test('should fall back to lowercase http_proxy for HTTPS target', () => {
            process.env.http_proxy = 'http://corp-proxy:3128';

            const config = getAxiosProxyConfig('https://ghcr.io/v2/');
            expect(config).toBeDefined();
            expect(config?.httpsAgent).toBeInstanceOf(HttpsProxyAgent);
            expect(config?.proxy).toBe(false);
        });

        test('should respect NO_PROXY / no_proxy bypass when falling back to HTTP_PROXY for HTTPS target', () => {
            process.env.HTTP_PROXY = 'http://corp-proxy:3128';
            process.env.NO_PROXY = 'registry-1.docker.io,localhost';

            const excludedConfig = getAxiosProxyConfig(
                'https://registry-1.docker.io/v2/',
            );
            expect(excludedConfig).toBeUndefined();

            const allowedConfig = getAxiosProxyConfig('https://ghcr.io/v2/');
            expect(allowedConfig).toBeDefined();
            expect(allowedConfig?.httpsAgent).toBeInstanceOf(HttpsProxyAgent);
            expect(allowedConfig?.proxy).toBe(false);
        });

        test('should return HttpProxyAgent for plain HTTP target with HTTP_PROXY', () => {
            process.env.HTTP_PROXY = 'http://corp-proxy:3128';
            const config = getAxiosProxyConfig(
                'http://insecure-registry.local/v2/',
            );
            expect(config).toBeDefined();
            expect(config?.httpAgent).toBeInstanceOf(HttpProxyAgent);
            expect(config?.proxy).toBe(false);
            expect(config?.httpsAgent).toBeUndefined();
        });

        test('should return HttpProxyAgent for plain HTTP target with explicit proxy override', () => {
            process.env.HTTP_PROXY = 'http://env-proxy:3128';
            const config = getAxiosProxyConfig(
                'http://insecure-registry.local/v2/',
                'http://explicit-proxy:8080',
            );
            expect(config).toBeDefined();
            expect(config?.httpAgent).toBeInstanceOf(HttpProxyAgent);
            expect(config?.proxy).toBe(false);
        });

        test('should respect NO_PROXY for plain HTTP target with HTTP_PROXY', () => {
            process.env.HTTP_PROXY = 'http://corp-proxy:3128';
            process.env.NO_PROXY = 'insecure-registry.local';

            const config = getAxiosProxyConfig(
                'http://insecure-registry.local/v2/',
            );
            expect(config).toBeUndefined();
        });

        test('should return SocksProxyAgent for plain HTTP target with SOCKS proxy', () => {
            process.env.HTTP_PROXY = 'socks5://corp-proxy:1080';
            const config = getAxiosProxyConfig(
                'http://insecure-registry.local/v2/',
            );
            expect(config).toBeDefined();
            expect(config?.httpAgent).toBeInstanceOf(SocksProxyAgent);
            expect(config?.httpsAgent).toBeInstanceOf(SocksProxyAgent);
            expect(config?.proxy).toBe(false);
        });

        test('should handle relative or unparseable target URL with explicit proxy', () => {
            const config = getAxiosProxyConfig(
                '/v2/',
                'http://corp-proxy:3128',
            );
            expect(config).toBeDefined();
            expect(config?.httpsAgent).toBeInstanceOf(HttpsProxyAgent);
        });
    });

    describe('applyProxyConfig', () => {
        test('should apply proxy config to Axios request when HTTPS_PROXY is set', () => {
            process.env.HTTPS_PROXY = 'http://corp-proxy:3128';
            const requestConfig: AxiosRequestConfig = {
                url: 'https://registry-1.docker.io/v2/',
                method: 'GET',
            };
            const result = applyProxyConfig(requestConfig);
            expect(result.httpsAgent).toBeInstanceOf(HttpsProxyAgent);
            expect(result.proxy).toBe(false);
        });

        test('should apply HttpProxyAgent to Axios request when target is plain HTTP and HTTP_PROXY is set', () => {
            process.env.HTTP_PROXY = 'http://corp-proxy:3128';
            const requestConfig: AxiosRequestConfig = {
                url: 'http://insecure-registry.local/v2/',
                method: 'GET',
            };
            const result = applyProxyConfig(requestConfig);
            expect(result.httpAgent).toBeInstanceOf(HttpProxyAgent);
            expect(result.proxy).toBe(false);
        });

        test('should apply fallback HTTP_PROXY to Axios request when target is HTTPS and HTTPS_PROXY is unset', () => {
            process.env.HTTP_PROXY = 'http://corp-proxy:3128';
            const requestConfig: AxiosRequestConfig = {
                url: 'https://registry-1.docker.io/v2/',
                method: 'GET',
            };
            const result = applyProxyConfig(requestConfig);
            expect(result.httpsAgent).toBeInstanceOf(HttpsProxyAgent);
            expect(result.proxy).toBe(false);
        });

        test('should use baseURL if url is relative', () => {
            process.env.HTTPS_PROXY = 'http://corp-proxy:3128';
            const requestConfig: AxiosRequestConfig = {
                baseURL: 'https://api.github.com',
                url: '/repos/getwud/wud',
            };
            const result = applyProxyConfig(requestConfig);
            expect(result.httpsAgent).toBeInstanceOf(HttpsProxyAgent);
            expect(result.proxy).toBe(false);
        });

        test('should not override httpsAgent if already provided', () => {
            process.env.HTTPS_PROXY = 'http://corp-proxy:3128';
            const customAgent = new HttpsProxyAgent('http://custom-proxy:9999');
            const requestConfig: AxiosRequestConfig = {
                url: 'https://registry-1.docker.io/v2/',
                httpsAgent: customAgent,
            };
            const result = applyProxyConfig(requestConfig);
            expect(result.httpsAgent).toBe(customAgent);
        });

        test('should not override httpAgent if already provided', () => {
            process.env.HTTP_PROXY = 'http://corp-proxy:3128';
            const customAgent = new HttpProxyAgent('http://custom-proxy:9999');
            const requestConfig: AxiosRequestConfig = {
                url: 'http://insecure-registry.local/v2/',
                httpAgent: customAgent,
            };
            const result = applyProxyConfig(requestConfig);
            expect(result.httpAgent).toBe(customAgent);
        });

        test('should not override if proxy is explicitly false and no explicitProxyUrl given', () => {
            process.env.HTTPS_PROXY = 'http://corp-proxy:3128';
            const requestConfig: AxiosRequestConfig = {
                url: 'https://registry-1.docker.io/v2/',
                proxy: false,
            };
            const result = applyProxyConfig(requestConfig);
            expect(result.httpsAgent).toBeUndefined();
            expect(result.proxy).toBe(false);
        });

        test('should override proxy: false when explicitProxyUrl is provided', () => {
            const requestConfig: AxiosRequestConfig = {
                url: 'https://registry-1.docker.io/v2/',
                proxy: false,
            };
            const result = applyProxyConfig(
                requestConfig,
                'http://explicit-proxy:8080',
            );
            expect(result.httpsAgent).toBeInstanceOf(HttpsProxyAgent);
            expect(result.proxy).toBe(false);
        });

        test('should not override if custom proxy object is already configured without explicitProxyUrl', () => {
            process.env.HTTPS_PROXY = 'http://corp-proxy:3128';
            const requestConfig: AxiosRequestConfig = {
                url: 'https://registry-1.docker.io/v2/',
                proxy: { host: 'custom-proxy', port: 8080 },
            };
            const result = applyProxyConfig(requestConfig);
            expect(result.httpsAgent).toBeUndefined();
            expect(result.proxy).toEqual({ host: 'custom-proxy', port: 8080 });
        });

        test('should do nothing if neither url nor explicitProxyUrl is available', () => {
            process.env.HTTPS_PROXY = 'http://corp-proxy:3128';
            const requestConfig: AxiosRequestConfig = {
                method: 'GET',
            };
            const result = applyProxyConfig(requestConfig);
            expect(result.httpsAgent).toBeUndefined();
            expect(result.proxy).toBeUndefined();
        });
    });

    describe('setupAxiosProxy interceptor', () => {
        interface RequestInterceptorHandler {
            fulfilled: (
                config: InternalAxiosRequestConfig,
            ) =>
                | InternalAxiosRequestConfig
                | Promise<InternalAxiosRequestConfig>;
        }

        function getFirstHandler(
            instance: ReturnType<typeof axios.create>,
        ): RequestInterceptorHandler | undefined {
            const interceptorManager = instance.interceptors
                .request as unknown as {
                handlers: Array<RequestInterceptorHandler | null>;
            };
            return interceptorManager.handlers[0] ?? undefined;
        }

        test('should apply proxy agent on request via axios interceptor', async () => {
            process.env.HTTPS_PROXY = 'http://corp-proxy:3128';
            const instance = axios.create();
            setupAxiosProxy(instance);

            const handler = getFirstHandler(instance);
            expect(handler).toBeDefined();

            const config: InternalAxiosRequestConfig = {
                headers: new axios.AxiosHeaders(),
                url: 'https://auth.docker.io/token',
            };
            const modified = await handler!.fulfilled(config);
            expect(modified.httpsAgent).toBeInstanceOf(HttpsProxyAgent);
            expect(modified.proxy).toBe(false);
        });

        test('should apply httpAgent on request via axios interceptor for HTTP target', async () => {
            process.env.HTTP_PROXY = 'http://corp-proxy:3128';
            const instance = axios.create({
                baseURL: 'http://nomad.local:4646',
            });
            setupAxiosProxy(instance);

            const handler = getFirstHandler(instance);
            expect(handler).toBeDefined();

            const config: InternalAxiosRequestConfig = {
                headers: new axios.AxiosHeaders(),
                url: '/v1/jobs',
                baseURL: 'http://nomad.local:4646',
            };
            const modified = await handler!.fulfilled(config);
            expect(modified.httpAgent).toBeInstanceOf(HttpProxyAgent);
            expect(modified.proxy).toBe(false);
        });

        test('should apply proxy agent on axios.create() instance with HTTP_PROXY fallback for HTTPS', async () => {
            process.env.HTTP_PROXY = 'http://corp-proxy:3128';
            const instance = axios.create({
                baseURL: 'https://nomad.local:4646',
            });
            setupAxiosProxy(instance);

            const handler = getFirstHandler(instance);
            expect(handler).toBeDefined();

            const config: InternalAxiosRequestConfig = {
                headers: new axios.AxiosHeaders(),
                url: '/v1/jobs',
                baseURL: 'https://nomad.local:4646',
            };
            const modified = await handler!.fulfilled(config);
            expect(modified.httpsAgent).toBeInstanceOf(HttpsProxyAgent);
            expect(modified.proxy).toBe(false);
        });

        test('should not attach interceptor more than once on the same instance', () => {
            const instance = axios.create();
            setupAxiosProxy(instance);
            const interceptorManager = instance.interceptors
                .request as unknown as {
                handlers: Array<RequestInterceptorHandler | null>;
            };
            const initialCount = interceptorManager.handlers.length;
            setupAxiosProxy(instance);
            const afterCount = interceptorManager.handlers.length;
            expect(afterCount).toBe(initialCount);
        });

        test('should safely handle axios instance without interceptors', () => {
            expect(() =>
                setupAxiosProxy({} as unknown as typeof axios),
            ).not.toThrow();
        });

        test('should default to global axios when no instance provided', () => {
            expect(() => setupAxiosProxy()).not.toThrow();
        });
    });
});
