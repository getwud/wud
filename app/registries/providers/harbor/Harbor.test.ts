import Harbor from './Harbor';
import { testRegistryProvider } from '../RegistryTestHelper';

const validConfig = {
    url: 'https://harbor.mycompany.org',
    login: 'robot$wud',
    password: 'robot-secret-token',
};

const harbor = new Harbor();
harbor.configuration = validConfig;

test('validateConfiguration should accept empty string', () => {
    expect(() => {
        harbor.validateConfiguration('' as any);
    }).not.toThrow();
});

test('validateConfiguration should accept harbor config', () => {
    expect(() => {
        harbor.validateConfiguration(validConfig);
    }).not.toThrow();
});

test('normalizeImage with configuration.url should use configured url', () => {
    const customHarbor = new Harbor();
    customHarbor.configuration = {
        url: 'https://harbor.internal.net',
    };
    const img = {
        name: 'library/ubuntu',
        registry: { url: 'harbor.internal.net' },
    };
    const res = customHarbor.normalizeImage(img as any);
    expect(res.registry.url).toBe('https://harbor.internal.net/v2');
});

testRegistryProvider(Harbor, validConfig, {
    matchingUrls: ['harbor.mycompany.org'],
    nonMatchingUrls: ['docker.io', 'ghcr.io', 'othercompany.org'],
    sampleImage: {
        input: {
            name: 'library/ubuntu',
            registry: {
                url: 'harbor.mycompany.org/library/ubuntu',
            },
        },
        expected: {
            name: 'library/ubuntu',
            registry: {
                url: 'https://harbor.mycompany.org/v2',
            },
        },
    },
    maskConfig: {
        input: {
            url: 'https://harbor.mycompany.org',
            login: 'robot$wud',
            password: 'secret-robot-token-123',
            other: 'clear',
        },
        expected: {
            url: 'https://harbor.mycompany.org',
            login: 'robot$wud',
            password: 's********************3',
            other: 'clear',
        },
    },
    authPullConfig: {
        input: validConfig,
        expected: {
            username: 'robot$wud',
            password: 'robot-secret-token',
        },
    },
});
