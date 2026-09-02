import { ContainerImage } from '../../../model/container';
import Ghcr from './Ghcr';
import { testRegistryProvider } from '../RegistryTestHelper';

const validConfig = {
    username: 'testuser',
    token: 'testtoken',
};

describe('GitHub Container Registry specific tests', () => {
    let ghcr: Ghcr;

    beforeEach(async () => {
        ghcr = new Ghcr();
        await ghcr.register('registry', 'ghcr', 'test', validConfig);
    });

    test('should authenticate with token', async () => {
        ghcr.configuration = { token: 'test-token' };
        const image = { name: 'user/repo' } as ContainerImage;
        const requestOptions = { headers: {} };

        const result = await ghcr.authenticate(image, requestOptions);

        const expectedBearer = Buffer.from('test-token', 'utf-8').toString(
            'base64',
        );
        expect(result.headers.Authorization).toBe(`Bearer ${expectedBearer}`);
    });

    test('should authenticate without token', async () => {
        ghcr.configuration = {};
        const image = { name: 'user/repo' } as ContainerImage;
        const requestOptions = { headers: {} };

        const result = await ghcr.authenticate(image, requestOptions);

        const expectedBearer = Buffer.from(':', 'utf-8').toString('base64');
        expect(result.headers.Authorization).toBe(`Bearer ${expectedBearer}`);
    });

    test('should apply registry concurrency configuration', async () => {
        const authenticated = new Ghcr();
        await authenticated.register('registry', 'ghcr', 'authenticated', {
            username: 'testuser',
            token: 'testtoken',
            concurrency: '2',
        });
        expect(authenticated.configuration.concurrency).toBe(2);

        const anonymous = new Ghcr();
        await anonymous.register('registry', 'ghcr', 'public', {
            concurrency: '3',
        });
        expect(anonymous.configuration).toEqual({ concurrency: 3 });
    });

    test.each([0, -1, 1.5, 'many'])(
        'should reject invalid concurrency %s',
        (concurrency) => {
            expect(() =>
                ghcr.validateConfiguration({
                    username: 'testuser',
                    token: 'testtoken',
                    concurrency,
                }),
            ).toThrow();
        },
    );

    test('should return undefined auth pull when missing username', async () => {
        ghcr.configuration = { token: 'test-token' };
        const auth = await ghcr.getAuthPull();
        expect(auth).toBeUndefined();
    });

    test('should return undefined auth pull when missing token', async () => {
        ghcr.configuration = { username: 'testuser' };
        const auth = await ghcr.getAuthPull();
        expect(auth).toBeUndefined();
    });

    test('should return undefined auth pull when no credentials', async () => {
        ghcr.configuration = {};
        const auth = await ghcr.getAuthPull();
        expect(auth).toBeUndefined();
    });
});

testRegistryProvider(Ghcr, validConfig, {
    matchingUrls: ['ghcr.io'],
    nonMatchingUrls: ['docker.io'],
    sampleImage: {
        input: {
            name: 'user/repo',
            registry: { url: 'ghcr.io' },
        },
        expected: {
            name: 'user/repo',
            registry: { url: 'https://ghcr.io/v2' },
        },
    },
    maskConfig: {
        input: validConfig,
        expected: {
            username: 'testuser',
            token: 't*******n',
        },
    },
    authPullConfig: {
        input: validConfig,
        expected: {
            username: 'testuser',
            password: 'testtoken',
        },
    },
});
