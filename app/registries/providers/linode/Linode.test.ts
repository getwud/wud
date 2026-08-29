import Linode from './Linode';
import { testRegistryProvider } from '../RegistryTestHelper';

const validConfig = {
    url: 'https://registry.mycluster.linode.com',
    username: 'linode-user',
    password: 'linode-password',
};

const linode = new Linode();
linode.configuration = validConfig;

test('validateConfiguration should accept empty string', () => {
    expect(() => {
        linode.validateConfiguration('' as any);
    }).not.toThrow();
});

test('validateConfiguration should accept linode config', () => {
    expect(() => {
        linode.validateConfiguration(validConfig);
    }).not.toThrow();
});

test('normalizeImage with configuration.url should use configured url', () => {
    const customLinode = new Linode();
    customLinode.configuration = {
        url: 'https://registry.lke.linode.com',
    };
    const img = {
        name: 'my-project/service',
        registry: { url: 'registry.lke.linode.com' },
    };
    const res = customLinode.normalizeImage(img as any);
    expect(res.registry.url).toBe('https://registry.lke.linode.com/v2');
});

testRegistryProvider(Linode, validConfig, {
    matchingUrls: ['registry.mycluster.linode.com', 'linode.com'],
    nonMatchingUrls: ['docker.io', 'ghcr.io', 'akamai.org'],
    sampleImage: {
        input: {
            name: 'my-project/service',
            registry: {
                url: 'registry.mycluster.linode.com/my-project/service',
            },
        },
        expected: {
            name: 'my-project/service',
            registry: {
                url: 'https://registry.mycluster.linode.com/v2',
            },
        },
    },
    maskConfig: {
        input: {
            url: 'https://registry.mycluster.linode.com',
            username: 'linode-user',
            password: 'secret-linode-password',
            other: 'clear',
        },
        expected: {
            url: 'https://registry.mycluster.linode.com',
            username: 'linode-user',
            password: 's********************d',
            other: 'clear',
        },
    },
    authPullConfig: {
        input: validConfig,
        expected: {
            username: 'linode-user',
            password: 'linode-password',
        },
    },
});
