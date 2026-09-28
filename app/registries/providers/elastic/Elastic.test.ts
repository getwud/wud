import axiosImport from 'axios';
import Elastic from './Elastic';
import { ContainerImage } from '../../../model/container';
import { testRegistryProvider } from '../RegistryTestHelper';

jest.mock('axios', () => jest.fn());

const axios = axiosImport as unknown as jest.MockedFunction<typeof axiosImport>;

describe('Elastic Provider', () => {
    let elastic: Elastic;

    beforeEach(async () => {
        jest.clearAllMocks();
        elastic = new Elastic();
    });

    describe('URL Matching', () => {
        test('should match docker.elastic.co and subdomains', () => {
            expect(elastic.match('docker.elastic.co')).toBe(true);
            expect(elastic.match('sub.docker.elastic.co')).toBe(true);
            expect(elastic.match('test.sub.docker.elastic.co')).toBe(true);
        });

        test('should not match other domains', () => {
            expect(elastic.match('elastic.co')).toBe(false);
            expect(elastic.match('docker.io')).toBe(false);
            expect(elastic.match('ghcr.io')).toBe(false);
            expect(elastic.match('my-docker.elastic.co.attacker.com')).toBe(
                false,
            );
            expect(elastic.match('')).toBe(false);
        });
    });

    describe('Initialization', () => {
        test('should default url to https://docker.elastic.co when registering with empty string', async () => {
            await elastic.register('registry', 'elastic', 'public', '' as any);
            expect(elastic.configuration.url).toBe('https://docker.elastic.co');
        });

        test('should default url to https://docker.elastic.co when registering with empty object', async () => {
            await elastic.register('registry', 'elastic', 'public', {});
            expect(elastic.configuration.url).toBe('https://docker.elastic.co');
        });

        test('should preserve custom url when provided in configuration', async () => {
            await elastic.register('registry', 'elastic', 'custom', {
                url: 'https://custom.elastic.co',
            });
            expect(elastic.configuration.url).toBe('https://custom.elastic.co');
        });
    });

    describe('Configuration Schema Validation', () => {
        test('should accept anonymous empty string configuration', () => {
            const schema = elastic.getConfigurationSchema();
            const { error, value } = schema.validate('');
            expect(error).toBeUndefined();
            expect(value).toBe('');
        });

        test('should accept full valid object configuration', () => {
            const schema = elastic.getConfigurationSchema();
            const config = {
                url: 'https://docker.elastic.co',
                login: 'elastic-user',
                password: 'elastic-password',
                token: 'elastic-token',
                auth: Buffer.from('user:pass').toString('base64'),
                proxy: 'http://proxy.example.com:8080',
            };
            const { error, value } = schema.validate(config);
            expect(error).toBeUndefined();
            expect(value).toEqual(config);
        });

        test('should fail when url is not a valid URI', () => {
            const schema = elastic.getConfigurationSchema();
            const { error } = schema.validate({ url: 'not-a-valid-uri' });
            expect(error).toBeDefined();
        });

        test('should fail when auth is not base64', () => {
            const schema = elastic.getConfigurationSchema();
            const { error } = schema.validate({ auth: '***not-base64***' });
            expect(error).toBeDefined();
        });
    });

    describe('Authentication', () => {
        const image = {
            name: 'elasticsearch/elasticsearch',
            registry: { url: 'https://docker.elastic.co/v2' },
        } as ContainerImage;

        test('should use static token when configured', async () => {
            await elastic.register('registry', 'elastic', 'auth_token', {
                token: 'my-static-token',
            });

            const result = await elastic.authenticate(image, { headers: {} });
            expect(result.headers.Authorization).toBe('Bearer my-static-token');
            expect(axios).not.toHaveBeenCalled();
        });

        test('should use basic auth when login and password are configured', async () => {
            await elastic.register('registry', 'elastic', 'auth_basic', {
                login: 'myuser',
                password: 'mypassword',
            });

            const result = await elastic.authenticate(image, { headers: {} });
            const expectedAuth =
                Buffer.from('myuser:mypassword').toString('base64');
            expect(result.headers.Authorization).toBe(`Basic ${expectedAuth}`);
            expect(axios).not.toHaveBeenCalled();
        });

        test('should use basic auth when auth base64 is configured', async () => {
            const base64Auth = Buffer.from('user:secret').toString('base64');
            await elastic.register('registry', 'elastic', 'auth_base64', {
                auth: base64Auth,
            });

            const result = await elastic.authenticate(image, { headers: {} });
            expect(result.headers.Authorization).toBe(`Basic ${base64Auth}`);
            expect(axios).not.toHaveBeenCalled();
        });

        test('should fall back to anonymous bearer token exchange when no static credentials configured', async () => {
            await elastic.register('registry', 'elastic', 'public', '' as any);

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
                data: { access_token: 'elastic-dynamic-token' },
            });

            const result = await elastic.authenticate(image, { headers: {} });
            expect(result.headers.Authorization).toBe(
                'Bearer elastic-dynamic-token',
            );
        });

        test('should leave requestOptions unchanged when anonymous exchange returns no token', async () => {
            await elastic.register('registry', 'elastic', 'public', '' as any);

            axios.mockResolvedValueOnce({ status: 200 });

            const result = await elastic.authenticate(image, { headers: {} });
            expect(result.headers.Authorization).toBeUndefined();
        });
    });
});

testRegistryProvider(
    Elastic,
    {
        url: 'https://docker.elastic.co',
        login: 'user',
        password: 'password',
    },
    {
        matchingUrls: ['docker.elastic.co', 'mirror.docker.elastic.co'],
        nonMatchingUrls: ['hub.docker.com', 'elastic.co'],
        maskConfig: {
            input: {
                login: 'user',
                password: 'password',
                token: 'token',
            },
            expected: {
                login: 'user',
                password: 'p******d',
                token: 't***n',
            },
        },
    },
);
