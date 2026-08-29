import Scaleway from './Scaleway';
import { testRegistryProvider } from '../RegistryTestHelper';

const validConfig = {
    secretkey: '00000000-0000-0000-0000-000000000000',
};

const scaleway = new Scaleway();
scaleway.configuration = validConfig;

test('validateConfiguration should accept empty string', () => {
    expect(() => {
        scaleway.validateConfiguration('' as any);
    }).not.toThrow();
});

test('validateConfiguration should accept secretkey config', () => {
    expect(() => {
        scaleway.validateConfiguration(validConfig);
    }).not.toThrow();
});

testRegistryProvider(Scaleway, validConfig, {
    matchingUrls: [
        'rg.fr-par.scw.cloud',
        'rg.nl-ams.scw.cloud',
        'rg.pl-waw.scw.cloud',
        'my-reg.scw.cloud',
    ],
    nonMatchingUrls: ['docker.io', 'ghcr.io', 'scaleway.com'],
    sampleImage: {
        input: {
            name: 'my-namespace/my-app',
            registry: {
                url: 'rg.fr-par.scw.cloud/my-namespace/my-app',
            },
        },
        expected: {
            name: 'my-namespace/my-app',
            registry: {
                url: 'https://rg.fr-par.scw.cloud/my-namespace/my-app/v2',
            },
        },
    },
    maskConfig: {
        input: {
            secretkey: '12345678-abcd-ef01-2345-6789abcdef01',
            other: 'clear',
        },
        expected: {
            secretkey: '1**********************************1',
            other: 'clear',
        },
    },
    authPullConfig: {
        input: validConfig,
        expected: {
            username: 'nologin',
            password: '00000000-0000-0000-0000-000000000000',
        },
    },
});
