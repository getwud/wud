import Docr from './Docr';
import { testRegistryProvider } from '../RegistryTestHelper';

const validConfig = {
    token: 'dop_v1_xxxxxxxxxxxx',
};

const docr = new Docr();
docr.configuration = validConfig;

test('validateConfiguration should accept empty string', () => {
    expect(() => {
        docr.validateConfiguration('' as any);
    }).not.toThrow();
});

test('validateConfiguration should accept token config', () => {
    expect(() => {
        docr.validateConfiguration(validConfig);
    }).not.toThrow();
});

testRegistryProvider(Docr, validConfig, {
    matchingUrls: [
        'registry.digitalocean.com',
        'my-registry.registry.digitalocean.com',
    ],
    nonMatchingUrls: ['docker.io', 'ghcr.io', 'digitalocean.com'],
    sampleImage: {
        input: {
            name: 'my-registry/my-app',
            registry: {
                url: 'registry.digitalocean.com/my-registry/my-app',
            },
        },
        expected: {
            name: 'my-registry/my-app',
            registry: {
                url: 'https://registry.digitalocean.com/my-registry/my-app/v2',
            },
        },
    },
    maskConfig: {
        input: {
            token: 'dop_v1_1234567890abcdef',
            other: 'clear',
        },
        expected: {
            token: 'd*********************f',
            other: 'clear',
        },
    },
    authPullConfig: {
        input: validConfig,
        expected: {
            username: 'dop_v1_xxxxxxxxxxxx',
            password: 'dop_v1_xxxxxxxxxxxx',
        },
    },
});
