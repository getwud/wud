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
