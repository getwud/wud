import Ocir from './Ocir';
import { testRegistryProvider } from '../RegistryTestHelper';

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
