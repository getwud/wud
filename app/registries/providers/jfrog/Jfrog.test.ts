import Jfrog from './Jfrog';
import { testRegistryProvider } from '../RegistryTestHelper';

const validConfig = {
    username: 'jfrog-user',
    password: 'jfrog-password',
};

const jfrog = new Jfrog();
jfrog.configuration = validConfig;

test('validateConfiguration should accept empty string', () => {
    expect(() => {
        jfrog.validateConfiguration('' as any);
    }).not.toThrow();
});

test('validateConfiguration should accept username and password config', () => {
    expect(() => {
        jfrog.validateConfiguration(validConfig);
    }).not.toThrow();
});

test('normalizeImage with configuration.url should use configured url', () => {
    const customJfrog = new Jfrog();
    customJfrog.configuration = {
        url: 'https://artifactory.mycorp.internal/artifactory',
    };
    const img = {
        name: 'docker-local/app',
        registry: { url: 'artifactory.mycorp.internal' },
    };
    const res = customJfrog.normalizeImage(img as any);
    expect(res.registry.url).toBe(
        'https://artifactory.mycorp.internal/artifactory/v2',
    );
});

testRegistryProvider(Jfrog, validConfig, {
    matchingUrls: ['myorg.jfrog.io', 'sub.myorg.jfrog.io'],
    nonMatchingUrls: ['docker.io', 'ghcr.io', 'jfrog.com'],
    sampleImage: {
        input: {
            name: 'my-repo/my-app',
            registry: {
                url: 'myorg.jfrog.io/my-repo/my-app',
            },
        },
        expected: {
            name: 'my-repo/my-app',
            registry: {
                url: 'https://myorg.jfrog.io/my-repo/my-app/v2',
            },
        },
    },
    maskConfig: {
        input: {
            username: 'jfrog-user',
            password: 'secret-jfrog-password',
            other: 'clear',
        },
        expected: {
            username: 'jfrog-user',
            password: 's*******************d',
            other: 'clear',
        },
    },
    authPullConfig: {
        input: validConfig,
        expected: {
            username: 'jfrog-user',
            password: 'jfrog-password',
        },
    },
});
