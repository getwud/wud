import Ocir from './Ocir';
import { ContainerImage } from '../../../model/container';
import { testRegistryProvider } from '../RegistryTestHelper';

jest.mock('axios', () => jest.fn());
import axios from 'axios';

const mockedAxios = axios as jest.MockedFunction<typeof axios>;

const validConfig = {
    username: 'mytenancy/myuser',
    password: 'auth-token-xyz',
};

const ocir = new Ocir();
ocir.configuration = validConfig;

test('validateConfiguration should accept empty string', () => {
    expect(() => {
        ocir.validateConfiguration('' as any);
    }).not.toThrow();
});

test('validateConfiguration should accept username and password config', () => {
    expect(() => {
        ocir.validateConfiguration(validConfig);
    }).not.toThrow();
});

describe('OCIR Bearer authentication', () => {
    const image = {
        name: 'mytenancy/my-app',
        registry: { url: 'https://fra.ocir.io/v2' },
    } as ContainerImage;

    beforeEach(() => {
        jest.clearAllMocks();
        ocir.clearBearerTokenCache();
        ocir.configuration = validConfig;
    });

    test('should exchange the OCIR challenge for a Bearer token', async () => {
        mockedAxios.mockRejectedValueOnce({
            response: {
                status: 401,
                headers: {
                    'www-authenticate':
                        'Bearer realm="https://fra.ocir.io/20180419/docker/token",service="fra.ocir.io",scope=""',
                },
            },
        });
        mockedAxios.mockResolvedValueOnce({ data: { token: 'ocir-token' } });

        const result = await ocir.authenticate(image, { headers: {} });

        // The challenge probe must hit /v2/ once (WUD normalizes registry
        // URLs with a trailing /v2 already; probing /v2/v2/ yields 404).
        expect(mockedAxios).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                method: 'GET',
                url: 'https://fra.ocir.io/v2/',
            }),
        );
        expect(result.headers.Authorization).toBe('Bearer ocir-token');
    });

    test('should fall back to Basic when no token is obtainable', async () => {
        mockedAxios.mockResolvedValueOnce({ status: 200 });

        const result = await ocir.authenticate(image, { headers: {} });

        expect(result.headers.Authorization).toBe(
            `Basic ${Buffer.from('mytenancy/myuser:auth-token-xyz', 'utf-8').toString('base64')}`,
        );
    });
});

testRegistryProvider(Ocir, validConfig, {
    matchingUrls: ['iad.ocir.io', 'fra.ocir.io', 'phx.ocir.io', 'ocir.io'],
    nonMatchingUrls: ['docker.io', 'ghcr.io', 'oracle.com'],
    sampleImage: {
        input: {
            name: 'mytenancy/my-app',
            registry: {
                url: 'iad.ocir.io/mytenancy/my-app',
            },
        },
        expected: {
            name: 'mytenancy/my-app',
            registry: {
                url: 'https://iad.ocir.io/mytenancy/my-app/v2',
            },
        },
    },
    maskConfig: {
        input: {
            username: 'mytenancy/myuser',
            password: 'secret-auth-token-123',
            other: 'clear',
        },
        expected: {
            username: 'mytenancy/myuser',
            password: 's*******************3',
            other: 'clear',
        },
    },
    authPullConfig: {
        input: validConfig,
        expected: {
            username: 'mytenancy/myuser',
            password: 'auth-token-xyz',
        },
    },
});
