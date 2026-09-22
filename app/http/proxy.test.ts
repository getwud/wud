import axios, { AxiosRequestConfig } from 'axios';
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
        test('should create HttpsProxyAgent for http:// proxy url', () => {
            const agent = createProxyAgent('http://proxy.example.com:8080');
            expect(agent).toBeInstanceOf(HttpsProxyAgent);
        });

        test('should create HttpsProxyAgent for https:// proxy url', () => {
            const agent = createProxyAgent('https://proxy.example.com:8443');
            expect(agent).toBeInstanceOf(HttpsProxyAgent);
        });

        test('should create SocksProxyAgent for socks:// proxy url', () => {
            const agent = createProxyAgent('socks://proxy.example.com:1080');
            expect(agent).toBeInstanceOf(SocksProxyAgent);
        });

        test('should create SocksProxyAgent for socks5:// proxy url', () => {
            const agent = createProxyAgent(
                'socks5://user:pass@proxy.example.com:1080',
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
        test('should cache and reuse proxy agent instances for the same URL', () => {
            const url = 'http://cached-proxy:8080';
            const agent1 = getCachedProxyAgent(url);
            const agent2 = getCachedProxyAgent(url);
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

        test('should return HttpsProxyAgent with proxy: false for HTTPS target with HTTP proxy', () => {
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

        test('should respect NO_PROXY environment variable', () => {
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

        test('should return undefined for plain HTTP target with HTTP proxy', () => {
            process.env.HTTP_PROXY = 'http://corp-proxy:3128';
            const config = getAxiosProxyConfig(
                'http://insecure-registry.local/v2/',
            );
            expect(config).toBeUndefined();
        });

        test('should handle relative or unparseable target URL', () => {
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
        test('should apply proxy agent on request via axios interceptor', async () => {
            process.env.HTTPS_PROXY = 'http://corp-proxy:3128';
            const instance = axios.create();
            setupAxiosProxy(instance);

            // Verify interceptor is attached and processes config
            const interceptor = (instance.interceptors.request as any)
                .handlers[0];
            expect(interceptor).toBeDefined();

            const config: AxiosRequestConfig = {
                url: 'https://auth.docker.io/token',
            };
            const modified = await interceptor.fulfilled(config);
            expect(modified.httpsAgent).toBeInstanceOf(HttpsProxyAgent);
            expect(modified.proxy).toBe(false);
        });

        test('should not attach interceptor more than once on the same instance', () => {
            const instance = axios.create();
            setupAxiosProxy(instance);
            const initialCount = (instance.interceptors.request as any).handlers
                .length;
            setupAxiosProxy(instance);
            const afterCount = (instance.interceptors.request as any).handlers
                .length;
            expect(afterCount).toBe(initialCount);
        });

        test('should safely handle axios instance without interceptors', () => {
            expect(() => setupAxiosProxy({} as any)).not.toThrow();
        });

        test('should default to global axios when no instance provided', () => {
            expect(() => setupAxiosProxy()).not.toThrow();
        });
    });
});
