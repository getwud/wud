import Alibaba from './Alibaba';
import { testRegistryProvider } from '../RegistryTestHelper';

const validConfig = {
    username: 'aliyun-user',
    password: 'aliyun-password',
};

const alibaba = new Alibaba();
alibaba.configuration = validConfig;

test('validateConfiguration should accept empty string', () => {
    expect(() => {
        alibaba.validateConfiguration('' as any);
    }).not.toThrow();
});

test('validateConfiguration should accept username and password config', () => {
    expect(() => {
        alibaba.validateConfiguration(validConfig);
    }).not.toThrow();
});

testRegistryProvider(Alibaba, validConfig, {
    matchingUrls: [
        'registry.cn-hangzhou.aliyuncs.com',
        'registry.ap-southeast-1.aliyuncs.com',
        'my-ns.aliyuncs.com',
    ],
    nonMatchingUrls: ['docker.io', 'ghcr.io', 'aliyun.com'],
    sampleImage: {
        input: {
            name: 'my-ns/my-app',
            registry: {
                url: 'registry.cn-hangzhou.aliyuncs.com/my-ns/my-app',
            },
        },
        expected: {
            name: 'my-ns/my-app',
            registry: {
                url: 'https://registry.cn-hangzhou.aliyuncs.com/my-ns/my-app/v2',
            },
        },
    },
    maskConfig: {
        input: {
            username: 'aliyun-user',
            password: 'secret-password-1234',
            other: 'clear',
        },
        expected: {
            username: 'aliyun-user',
            password: 's******************4',
            other: 'clear',
        },
    },
    authPullConfig: {
        input: validConfig,
        expected: {
            username: 'aliyun-user',
            password: 'aliyun-password',
        },
    },
});
