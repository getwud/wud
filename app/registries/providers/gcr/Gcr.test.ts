import { ContainerImage } from '../../../model/container';
import Gcr from './Gcr';
import { testRegistryProvider } from '../RegistryTestHelper';

jest.mock('axios', () =>
    jest.fn().mockImplementation(() => ({
        data: { token: 'xxxxx' },
    })),
);

const validConfig = {
    clientemail: 'accesskeyid',
    privatekey: 'secretaccesskey',
};

const gcr = new Gcr();
gcr.configuration = validConfig;

test('validatedConfiguration should throw error when configuration is missing', async () => {
    expect(() => {
        gcr.validateConfiguration({});
    }).toThrow('"clientemail" is required');
});

test('authenticate should call ecr auth endpoint', async () => {
    await expect(
        gcr.authenticate({} as ContainerImage, { headers: {} }),
    ).resolves.toEqual({
        headers: {
            Authorization: 'Bearer xxxxx',
        },
    });
});

test('authenticate should return requestOptions when clientemail is empty', async () => {
    const anonymousGcr = new Gcr();
    anonymousGcr.configuration = {};
    await expect(
        anonymousGcr.authenticate({} as ContainerImage, { headers: {} }),
    ).resolves.toEqual({ headers: {} });
});

testRegistryProvider(Gcr, validConfig, {
    matchingUrls: ['gcr.io', 'us.gcr.io', 'eu.gcr.io', 'asia.gcr.io'],
    nonMatchingUrls: ['grr.io'],
    sampleImage: {
        input: {
            name: 'test/image',
            registry: {
                url: 'eu.gcr.io/test/image',
            },
        },
        expected: {
            name: 'test/image',
            registry: {
                url: 'https://eu.gcr.io/test/image/v2',
            },
        },
    },
    maskConfig: {
        input: validConfig,
        expected: {
            clientemail: 'accesskeyid',
            privatekey: 's*************y',
        },
    },
    authPullConfig: {
        input: validConfig,
        expected: {
            username: 'accesskeyid',
            password: 'secretaccesskey',
        },
    },
});
