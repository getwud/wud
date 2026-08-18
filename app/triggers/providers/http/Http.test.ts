// @ts-nocheck
import Http from './Http';

// Mock axios
jest.mock('axios', () => jest.fn());

describe('HTTP Trigger', () => {
    let http;

    beforeEach(async () => {
        http = new Http();
        jest.clearAllMocks();
    });

    test('should create instance', async () => {
        expect(http).toBeDefined();
        expect(http).toBeInstanceOf(Http);
    });

    test('should have correct configuration schema', async () => {
        const schema = http.getConfigurationSchema();
        expect(schema).toBeDefined();
    });

    test('should validate configuration with URL', async () => {
        const config = {
            url: 'https://example.com/webhook',
        };

        expect(() => http.validateConfiguration(config)).not.toThrow();
    });

    test('should throw error when URL is missing', async () => {
        const config = {};

        expect(() => http.validateConfiguration(config)).toThrow();
    });

    test('should mask sensitive configuration data', async () => {
        http.configuration = {
            url: 'https://example.com/hooks/http-url-canary',
            auth: {
                type: 'BEARER',
                user: 'http-user-canary',
                password: 'http-password-canary',
                bearer: 'http-bearer-canary',
            },
            proxy: 'https://http-proxy-canary@example.com:8080',
        };

        const masked = http.maskConfiguration();

        expect(masked).toEqual({
            url: Http.mask(http.configuration.url),
            auth: {
                type: 'BEARER',
                user: Http.mask(http.configuration.auth.user),
                password: Http.mask(http.configuration.auth.password),
                bearer: Http.mask(http.configuration.auth.bearer),
            },
            proxy: Http.mask(http.configuration.proxy),
        });
        const serialized = JSON.stringify(masked);
        expect(serialized).not.toContain('http-url-canary');
        expect(serialized).not.toContain('http-user-canary');
        expect(serialized).not.toContain('http-password-canary');
        expect(serialized).not.toContain('http-bearer-canary');
        expect(serialized).not.toContain('http-proxy-canary');
    });

    test('should mask configuration without optional authentication', async () => {
        http.configuration = {
            url: 'https://example.com/hooks/secret',
        };

        expect(http.maskConfiguration()).toEqual({
            url: Http.mask(http.configuration.url),
            auth: undefined,
            proxy: undefined,
        });
    });

    test('should trigger with container', async () => {
        const { default: axios } = await import('axios');
        axios.mockResolvedValue({ data: {} });
        await http.register('trigger', 'http', 'test', {
            url: 'https://example.com/webhook',
        });
        const container = { name: 'test' };

        await http.trigger(container);
        expect(axios).toHaveBeenCalledWith({
            method: 'POST',
            url: 'https://example.com/webhook',
            data: container,
        });
    });

    test('should trigger batch with containers', async () => {
        const { default: axios } = await import('axios');
        axios.mockResolvedValue({ data: {} });
        await http.register('trigger', 'http', 'test', {
            url: 'https://example.com/webhook',
        });
        const containers = [{ name: 'test1' }, { name: 'test2' }];

        await http.triggerBatch(containers);
        expect(axios).toHaveBeenCalledWith({
            method: 'POST',
            url: 'https://example.com/webhook',
            data: containers,
        });
    });

    test('should use GET method with query string', async () => {
        const { default: axios } = await import('axios');
        axios.mockResolvedValue({ data: {} });
        await http.register('trigger', 'http', 'test', {
            url: 'https://example.com/webhook',
            method: 'GET',
        });
        const container = { name: 'test' };

        await http.trigger(container);
        expect(axios).toHaveBeenCalledWith({
            method: 'GET',
            url: 'https://example.com/webhook',
            params: container,
        });
    });

    test('should use BASIC auth', async () => {
        const { default: axios } = await import('axios');
        axios.mockResolvedValue({ data: {} });
        await http.register('trigger', 'http', 'test', {
            url: 'https://example.com/webhook',
            auth: { type: 'BASIC', user: 'user', password: 'pass' },
        });
        const container = { name: 'test' };

        await http.trigger(container);
        expect(axios).toHaveBeenCalledWith({
            method: 'POST',
            url: 'https://example.com/webhook',
            data: container,
            auth: { username: 'user', password: 'pass' },
        });
    });

    test('should use BEARER auth', async () => {
        const { default: axios } = await import('axios');
        axios.mockResolvedValue({ data: {} });
        await http.register('trigger', 'http', 'test', {
            url: 'https://example.com/webhook',
            auth: { type: 'BEARER', bearer: 'token' },
        });
        const container = { name: 'test' };

        await http.trigger(container);
        expect(axios).toHaveBeenCalledWith({
            method: 'POST',
            url: 'https://example.com/webhook',
            data: container,
            headers: { Authorization: 'Bearer token' },
        });
    });

    test('should use proxy', async () => {
        const { default: axios } = await import('axios');
        axios.mockResolvedValue({ data: {} });
        await http.register('trigger', 'http', 'test', {
            url: 'https://example.com/webhook',
            proxy: 'http://proxy:8080',
        });
        const container = { name: 'test' };

        await http.trigger(container);
        expect(axios).toHaveBeenCalledWith({
            method: 'POST',
            url: 'https://example.com/webhook',
            data: container,
            proxy: { host: 'proxy', port: '8080' },
        });
    });
});
