import Lscr from './Lscr';
import { testRegistryProvider } from '../RegistryTestHelper';

const validConfig = {
    username: 'user',
    token: 'token',
};

const lscr = new Lscr();
lscr.configuration = validConfig;

test('validatedConfiguration should throw error when configuration is missing', async () => {
    expect(() => {
        lscr.validateConfiguration({});
    }).toThrow('"username" is required');
});

testRegistryProvider(Lscr, validConfig, {
    matchingUrls: ['lscr.io'],
    nonMatchingUrls: ['wrong.io'],
    sampleImage: {
        input: {
            name: 'test/image',
            registry: {
                url: 'lscr.io/test/image',
            },
        },
        expected: {
            name: 'test/image',
            registry: {
                url: 'https://lscr.io/test/image/v2',
            },
        },
    },
    maskConfig: {
        input: validConfig,
        expected: {
            username: 'user',
            token: 't***n',
        },
    },
    authPullConfig: {
        input: validConfig,
        expected: {
            username: 'user',
            password: 'token',
        },
    },
});
