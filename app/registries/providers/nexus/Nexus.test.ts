import Nexus from './Nexus';
import { testRegistryProvider } from '../RegistryTestHelper';

const validConfig = {
    url: 'https://nexus.mycompany.org:8443',
    username: 'admin',
    password: 'admin123password',
};

const nexus = new Nexus();
nexus.configuration = validConfig;

test('validateConfiguration should accept empty string', () => {
    expect(() => {
        nexus.validateConfiguration('' as any);
    }).not.toThrow();
});

test('validateConfiguration should accept nexus config', () => {
    expect(() => {
        nexus.validateConfiguration(validConfig);
    }).not.toThrow();
});

test('normalizeImage with configuration.url should use configured url', () => {
    const customNexus = new Nexus();
    customNexus.configuration = {
        url: 'https://nexus.internal.net:5000',
    };
    const img = {
        name: 'repository/service',
        registry: { url: 'nexus.internal.net:5000' },
    };
    const res = customNexus.normalizeImage(img as any);
    expect(res.registry.url).toBe('https://nexus.internal.net:5000/v2');
});

testRegistryProvider(Nexus, validConfig, {
    matchingUrls: ['nexus.mycompany.org:8443'],
    nonMatchingUrls: ['docker.io', 'ghcr.io', 'othercompany.org'],
    sampleImage: {
        input: {
            name: 'repository/service',
            registry: {
                url: 'nexus.mycompany.org:8443/repository/service',
            },
        },
        expected: {
            name: 'repository/service',
            registry: {
                url: 'https://nexus.mycompany.org:8443/v2',
            },
        },
    },
    maskConfig: {
        input: {
            url: 'https://nexus.mycompany.org:8443',
            username: 'admin',
            password: 'supersecretpassword',
            other: 'clear',
        },
        expected: {
            url: 'https://nexus.mycompany.org:8443',
            username: 'admin',
            password: 's*****************d',
            other: 'clear',
        },
    },
    authPullConfig: {
        input: validConfig,
        expected: {
            username: 'admin',
            password: 'admin123password',
        },
    },
});
