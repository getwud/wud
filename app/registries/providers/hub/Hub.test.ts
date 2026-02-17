// @ts-nocheck
import Hub from './Hub';

// Mock axios
jest.mock('axios', () => jest.fn());

describe('Docker Hub Registry', () => {
    let hub;

    beforeEach(async () => {
        hub = new Hub();
        await hub.register('registry', 'hub', 'test', {});
        jest.clearAllMocks();
    });

    test('should create instance', async () => {
        expect(hub).toBeDefined();
        expect(hub).toBeInstanceOf(Hub);
    });

    test('should have correct registry url after init', async () => {
        expect(hub.configuration.url).toBe('https://registry-1.docker.io');
    });

    test('should match registry', async () => {
        expect(hub.match({ registry: { url: 'registry-1.docker.io' } })).toBe(
            true,
        );
        expect(hub.match({ registry: { url: 'docker.io' } })).toBe(true);
        expect(hub.match({ registry: { url: undefined } })).toBe(true);
        expect(hub.match({ registry: { url: 'other.registry.com' } })).toBe(
            false,
        );
    });

    test('should normalize image name for official images', async () => {
        const image = { name: 'nginx', registry: {} };
        const normalized = hub.normalizeImage(image);
        expect(normalized.name).toBe('library/nginx');
        expect(normalized.registry.url).toBe('https://registry-1.docker.io/v2');
    });

    test('should not normalize image name for user images', async () => {
        const image = { name: 'user/nginx', registry: {} };
        const normalized = hub.normalizeImage(image);
        expect(normalized.name).toBe('user/nginx');
        expect(normalized.registry.url).toBe('https://registry-1.docker.io/v2');
    });

    test('should mask configuration with token', async () => {
        hub.configuration = { login: 'testuser', token: 'secret_token' };
        const masked = hub.maskConfiguration();
        expect(masked.login).toBe('testuser');
        expect(masked.token).toBe('s**********n');
    });

    test('should get image full name without registry prefix', async () => {
        const image = {
            name: 'library/nginx',
            registry: { url: 'https://registry-1.docker.io/v2' },
        };
        const fullName = hub.getImageFullName(image, '1.0.0');
        expect(fullName).toBe('nginx:1.0.0');
    });

    test('should get image full name for user images', async () => {
        const image = {
            name: 'user/nginx',
            registry: { url: 'https://registry-1.docker.io/v2' },
        };
        const fullName = hub.getImageFullName(image, '1.0.0');
        expect(fullName).toBe('user/nginx:1.0.0');
    });

    test('should initialize with token as password', async () => {
        const hubWithToken = new Hub();
        await hubWithToken.register('registry', 'hub', 'test', {
            token: 'mytoken',
        });
        expect(hubWithToken.configuration.password).toBe('mytoken');
    });

    test('should authenticate with credentials', async () => {
        const { default: axios } = await import('axios');
        axios.mockResolvedValue({ data: { token: 'auth-token' } });

        hub.getAuthCredentials = jest.fn().mockReturnValue('base64credentials');

        const image = { name: 'library/nginx' };
        const requestOptions = { headers: {} };

        const result = await hub.authenticate(image, requestOptions);

        expect(axios).toHaveBeenCalledWith({
            method: 'GET',
            url: 'https://auth.docker.io/token?service=registry.docker.io&scope=repository:library/nginx:pull&grant_type=password',
            headers: {
                Accept: 'application/json',
                Authorization: 'Basic base64credentials',
            },
        });
        expect(result.headers.Authorization).toBe('Bearer auth-token');
    });

    test('should authenticate without credentials', async () => {
        const { default: axios } = await import('axios');
        axios.mockResolvedValue({ data: { token: 'public-token' } });

        hub.getAuthCredentials = jest.fn().mockReturnValue(null);

        const image = { name: 'library/nginx' };
        const requestOptions = { headers: {} };

        const result = await hub.authenticate(image, requestOptions);

        expect(axios).toHaveBeenCalledWith({
            method: 'GET',
            url: 'https://auth.docker.io/token?service=registry.docker.io&scope=repository:library/nginx:pull&grant_type=password',
            headers: {
                Accept: 'application/json',
            },
        });
        expect(result.headers.Authorization).toBe('Bearer public-token');
    });

    test('should validate string configuration', async () => {
        expect(() => hub.validateConfiguration('')).not.toThrow();
        expect(() => hub.validateConfiguration('some-string')).not.toThrow();
    });

    test('should validate object configuration with auth', async () => {
        const config = {
            login: 'user',
            password: 'pass',
            auth: Buffer.from('user:pass').toString('base64'),
        };
        expect(() => hub.validateConfiguration(config)).not.toThrow();
    });

    test('should mask all configuration fields', async () => {
        hub.configuration = {
            url: 'https://registry-1.docker.io',
            login: 'testuser',
            password: 'testpass',
            token: 'testtoken',
            auth: 'dGVzdDp0ZXN0',
        };
        const masked = hub.maskConfiguration();
        expect(masked).toEqual({
            url: 'https://registry-1.docker.io',
            login: 'testuser',
            password: 't******s',
            token: 't*******n',
            auth: 'd**********0',
        });
    });
});
