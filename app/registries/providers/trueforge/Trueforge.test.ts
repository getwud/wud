import Trueforge from './Trueforge';
import { testRegistryProvider } from '../RegistryTestHelper';

const validConfig = {
    username: 'user',
    token: 'token',
};

const trueforge = new Trueforge();
trueforge.configuration = validConfig;

test('validatedConfiguration should throw error when configuration is missing', async () => {
    expect(() => {
        trueforge.validateConfiguration({});
    }).toThrow('"username" is required');
});

testRegistryProvider(Trueforge, validConfig, {
    matchingUrls: ['oci.trueforge.org'],
    nonMatchingUrls: ['wrong.io'],
    sampleImage: {
        input: {
            name: 'test/image',
            registry: {
                url: 'oci.trueforge.org/test/image',
            },
        },
        expected: {
            name: 'test/image',
            registry: {
                url: 'https://oci.trueforge.org/test/image/v2',
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
