import axios from 'axios';
import { ContainerImage } from '../../../model/container';
import Dhi from './Dhi';
import { testRegistryProvider } from '../RegistryTestHelper';

jest.mock('axios', () => jest.fn());

const validConfig = {
    username: 'testuser',
    token: 'testtoken',
};

describe('Docker Hardened Images (DHI) Registry tests', () => {
    let dhi: Dhi;

    beforeEach(async () => {
        dhi = new Dhi();
        await dhi.register('registry', 'dhi', 'test', validConfig);
        jest.clearAllMocks();
    });

    test('should match registry URLs', () => {
        expect(dhi.match('dhi.io')).toBe(true);
        expect(dhi.match('sub.dhi.io')).toBe(true);
        expect(dhi.match('docker.io')).toBe(false);
        expect(dhi.match(undefined as any)).toBe(false);
    });

    test('should normalize image properly', () => {
        const image = {
            name: 'alpine',
            registry: { url: 'dhi.io' },
        } as ContainerImage;
        const normalized = dhi.normalizeImage(image);
        expect(normalized.name).toBe('alpine');
        expect(normalized.registry.url).toBe('https://dhi.io/v2');
    });

    test('should map login to username and token to password during init', async () => {
        const customDhi = new Dhi();
        await customDhi.register('registry', 'dhi', 'test', {
            login: 'customuser',
            token: 'customtoken',
        });
        expect(customDhi.configuration.username).toBe('customuser');
        expect(customDhi.configuration.password).toBe('customtoken');
    });

    test('should authenticate with credentials', async () => {
        (axios as unknown as jest.Mock).mockResolvedValue({
            data: { token: 'bearer-token-123' },
        });

        const image = { name: 'alpine' } as ContainerImage;
        const requestOptions = { headers: {} };

        const result = await dhi.authenticate(image, requestOptions);

        expect(axios).toHaveBeenCalledWith({
            method: 'GET',
            url: 'https://dhi.io/token?service=registry.docker.io&scope=repository:alpine:pull&grant_type=password',
            headers: {
                Accept: 'application/json',
                Authorization: `Basic ${Buffer.from('testuser:testtoken').toString('base64')}`,
            },
        });
        expect(result.headers.Authorization).toBe('Bearer bearer-token-123');
    });

    test('should authenticate using access_token if token is not set', async () => {
        (axios as unknown as jest.Mock).mockResolvedValue({
            data: { access_token: 'bearer-access-token-456' },
        });

        const image = { name: 'org/repo' } as ContainerImage;
        const requestOptions = { headers: {} };

        const result = await dhi.authenticate(image, requestOptions);

        expect(result.headers.Authorization).toBe(
            'Bearer bearer-access-token-456',
        );
    });

    test('should validate configuration with credentials', () => {
        expect(() =>
            dhi.validateConfiguration({
                username: 'myuser',
                token: 'mytoken',
            }),
        ).not.toThrow();

        expect(() =>
            dhi.validateConfiguration({
                username: 'myuser',
                password: 'mypassword',
            }),
        ).not.toThrow();

        expect(() =>
            dhi.validateConfiguration({
                login: 'mylogin',
                password: 'mypassword',
            }),
        ).not.toThrow();

        expect(() =>
            dhi.validateConfiguration({
                auth: 'base64auth',
            }),
        ).not.toThrow();
    });

    test('should reject configuration without credentials', () => {
        expect(() => dhi.validateConfiguration({})).toThrow();
        expect(() => dhi.validateConfiguration('' as any)).toThrow();
        expect(() =>
            dhi.validateConfiguration({ username: 'onlyuser' }),
        ).toThrow();
    });

    test('should throw error when token endpoint returns no token', async () => {
        (axios as unknown as jest.Mock).mockResolvedValue({
            data: {},
        });

        const image = { name: 'alpine' } as ContainerImage;
        const requestOptions = { headers: {} };

        await expect(dhi.authenticate(image, requestOptions)).rejects.toThrow(
            'Unable to authenticate to DHI registry: token endpoint response did not contain a token',
        );
    });
});

testRegistryProvider(Dhi, validConfig, {
    matchingUrls: ['dhi.io', 'registry.dhi.io'],
    nonMatchingUrls: ['docker.io', 'ghcr.io'],
    sampleImage: {
        input: {
            name: 'docker/nginx',
            registry: { url: 'dhi.io' },
        },
        expected: {
            name: 'docker/nginx',
            registry: { url: 'https://dhi.io/v2' },
        },
    },
    maskConfig: {
        input: validConfig,
        expected: {
            username: 'testuser',
            token: 't*******n',
        },
    },
    authPullConfig: {
        input: validConfig,
        expected: {
            username: 'testuser',
            password: 'testtoken',
        },
    },
});
