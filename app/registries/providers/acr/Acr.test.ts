import Acr from './Acr';
import { testRegistryProvider } from '../RegistryTestHelper';

const validConfig = {
    clientid: 'clientid',
    clientsecret: 'clientsecret',
};

const acr = new Acr();
acr.configuration = validConfig;

test('validatedConfiguration should throw error when configuration item is missing', async () => {
    expect(() => {
        acr.validateConfiguration({});
    }).toThrow('"clientid" is required');
});

test('authenticate should add basic auth', async () => {
    await expect(
        acr.authenticate(undefined as any, { headers: {} }),
    ).resolves.toEqual({
        headers: {
            Authorization: 'Basic Y2xpZW50aWQ6Y2xpZW50c2VjcmV0',
        },
    });
});

testRegistryProvider(Acr, validConfig, {
    matchingUrls: ['test.azurecr.io'],
    nonMatchingUrls: ['est.notme.io'],
    sampleImage: {
        input: {
            name: 'test/image',
            registry: {
                url: 'test.azurecr.io/test/image',
            },
        },
        expected: {
            name: 'test/image',
            registry: {
                url: 'https://test.azurecr.io/test/image/v2',
            },
        },
    },
    maskConfig: {
        input: validConfig,
        expected: {
            clientid: 'clientid',
            clientsecret: 'c**********t',
        },
    },
    authPullConfig: {
        input: validConfig,
        expected: {
            username: 'clientid',
            password: 'clientsecret',
        },
    },
});
