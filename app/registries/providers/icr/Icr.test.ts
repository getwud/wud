import Icr from './Icr';
import { testRegistryProvider } from '../RegistryTestHelper';

const validConfig = {
    apikey: 'ibm-api-key-12345',
};

const icr = new Icr();
icr.configuration = validConfig;

test('validateConfiguration should accept empty string', () => {
    expect(() => {
        icr.validateConfiguration('' as any);
    }).not.toThrow();
});

test('validateConfiguration should accept apikey config', () => {
    expect(() => {
        icr.validateConfiguration(validConfig);
    }).not.toThrow();
});

testRegistryProvider(Icr, validConfig, {
    matchingUrls: [
        'icr.io',
        'us.icr.io',
        'uk.icr.io',
        'de.icr.io',
        'au.icr.io',
    ],
    nonMatchingUrls: ['docker.io', 'ghcr.io', 'ibm.com'],
    sampleImage: {
        input: {
            name: 'my-ns/my-app',
            registry: {
                url: 'us.icr.io/my-ns/my-app',
            },
        },
        expected: {
            name: 'my-ns/my-app',
            registry: {
                url: 'https://us.icr.io/my-ns/my-app/v2',
            },
        },
    },
    maskConfig: {
        input: {
            apikey: 'ibm-secret-api-key-999',
            other: 'clear',
        },
        expected: {
            apikey: 'i********************9',
            other: 'clear',
        },
    },
    authPullConfig: {
        input: validConfig,
        expected: {
            username: 'iamapikey',
            password: 'ibm-api-key-12345',
        },
    },
});
