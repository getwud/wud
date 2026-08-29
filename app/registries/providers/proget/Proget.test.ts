import Proget from './Proget';
import { testRegistryProvider } from '../RegistryTestHelper';

const validConfig = {
    url: 'https://proget.mycompany.org',
    username: 'api-user',
    password: 'api-secret-key',
};

const proget = new Proget();
proget.configuration = validConfig;

test('validateConfiguration should accept empty string', () => {
    expect(() => {
        proget.validateConfiguration('' as any);
    }).not.toThrow();
});

test('validateConfiguration should accept proget config', () => {
    expect(() => {
        proget.validateConfiguration(validConfig);
    }).not.toThrow();
});

test('normalizeImage with configuration.url should use configured url', () => {
    const customProget = new Proget();
    customProget.configuration = {
        url: 'https://proget.internal.net',
    };
    const img = {
        name: 'containers/app',
        registry: { url: 'proget.internal.net' },
    };
    const res = customProget.normalizeImage(img as any);
    expect(res.registry.url).toBe('https://proget.internal.net/v2');
});

testRegistryProvider(Proget, validConfig, {
    matchingUrls: ['proget.mycompany.org'],
    nonMatchingUrls: ['docker.io', 'ghcr.io', 'othercompany.org'],
    sampleImage: {
        input: {
            name: 'containers/app',
            registry: {
                url: 'proget.mycompany.org/containers/app',
            },
        },
        expected: {
            name: 'containers/app',
            registry: {
                url: 'https://proget.mycompany.org/v2',
            },
        },
    },
    maskConfig: {
        input: {
            url: 'https://proget.mycompany.org',
            username: 'api-user',
            password: 'secret-proget-key-123',
            other: 'clear',
        },
        expected: {
            url: 'https://proget.mycompany.org',
            username: 'api-user',
            password: 's*******************3',
            other: 'clear',
        },
    },
    authPullConfig: {
        input: validConfig,
        expected: {
            username: 'api-user',
            password: 'api-secret-key',
        },
    },
});
