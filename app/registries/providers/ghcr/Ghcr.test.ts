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

    test('should validate semvercursor configuration', () => {
        const authenticatedDefault = ghcr.validateConfiguration(validConfig);
        expect(authenticatedDefault.semvercursor).toBe(true);

        const authenticatedDisabled = ghcr.validateConfiguration({
            ...validConfig,
            semvercursor: false,
        });
        expect(authenticatedDisabled.semvercursor).toBe(false);

        const anonymousDisabled = ghcr.validateConfiguration({
            semvercursor: false,
        });
        expect(anonymousDisabled.semvercursor).toBe(false);

        expect(() =>
            ghcr.validateConfiguration({
                ...validConfig,
                semvercursor: 'invalid' as any,
            }),
        ).toThrow();
    });
});

describe('getTags with semver cursor optimization', () => {
    let ghcr: Ghcr;
    const testImage = {
        name: 'immich-app/immich-machine-learning',
        registry: { url: 'https://ghcr.io/v2' },
        tag: { value: 'v1.100.0', semver: true },
    } as ContainerImage;

    beforeEach(async () => {
        ghcr = new Ghcr();
        await ghcr.register('registry', 'ghcr', 'test', validConfig);
        ghcr.clearTagCache();
    });

    test('should query with last cursor when semvercursor is enabled and tag is not latest', async () => {
        const getTagsPageSpy = jest
            .spyOn(ghcr, 'getTagsPage')
            .mockResolvedValueOnce({
                data: { tags: ['v1.101.0', 'v1.102.0'] },
                headers: {},
            } as any);

        const tags = await ghcr.getTags(testImage);
        expect(tags).toEqual(['v1.102.0', 'v1.101.0']);
        expect(getTagsPageSpy).toHaveBeenCalledWith(testImage, 'v1.100.0');
    });

    test('should paginate subsequent pages when cursor query returns multiple pages', async () => {
        const getTagsPageSpy = jest
            .spyOn(ghcr, 'getTagsPage')
            .mockResolvedValueOnce({
                data: { tags: ['v1.101.0'] },
                headers: {
                    link: '</v2/immich-app/immich-machine-learning/tags/list?last=v1.101.0>; rel="next"',
                },
            } as any)
            .mockResolvedValueOnce({
                data: { tags: ['v1.102.0'] },
                headers: {},
            } as any);

        const tags = await ghcr.getTags(testImage);
        expect(tags).toEqual(['v1.102.0', 'v1.101.0']);
        expect(getTagsPageSpy).toHaveBeenCalledTimes(2);
    });

    test('should return [currentTag] (up to date) when cursor returns 0 tags and hasTag returns true', async () => {
        jest.spyOn(ghcr, 'getTagsPage').mockResolvedValueOnce({
            data: { tags: [] },
            headers: {},
        } as any);

        const hasTagSpy = jest
            .spyOn(ghcr, 'hasTag')
            .mockResolvedValueOnce(true);

        const tags = await ghcr.getTags(testImage);
        expect(tags).toEqual(['v1.100.0']);
        expect(hasTagSpy).toHaveBeenCalledWith(testImage, 'v1.100.0');
    });

    test('should return [currentTag] when cursor returns null tags and hasTag returns true', async () => {
        jest.spyOn(ghcr, 'getTagsPage').mockResolvedValueOnce({
            data: { tags: null as any },
            headers: {},
        } as any);

        const hasTagSpy = jest
            .spyOn(ghcr, 'hasTag')
            .mockResolvedValueOnce(true);

        const tags = await ghcr.getTags(testImage);
        expect(tags).toEqual(['v1.100.0']);
        expect(hasTagSpy).toHaveBeenCalledWith(testImage, 'v1.100.0');
    });

    test('should fall back to super.getTags (full pagination) when cursor returns 0 tags and hasTag returns false', async () => {
        const getTagsPageSpy = jest
            .spyOn(ghcr, 'getTagsPage')
            .mockResolvedValueOnce({
                data: { tags: [] },
                headers: {},
            } as any)
            .mockResolvedValueOnce({
                data: { tags: ['custom-tag', 'v1.0.0'] },
                headers: {},
            } as any);

        const hasTagSpy = jest
            .spyOn(ghcr, 'hasTag')
            .mockResolvedValueOnce(false);

        const tags = await ghcr.getTags(testImage);
        expect(tags).toEqual(['v1.0.0', 'custom-tag']);
        expect(hasTagSpy).toHaveBeenCalledWith(testImage, 'v1.100.0');
        expect(getTagsPageSpy).toHaveBeenNthCalledWith(
            1,
            testImage,
            'v1.100.0',
        );
        expect(getTagsPageSpy).toHaveBeenNthCalledWith(
            2,
            testImage,
            undefined,
            undefined,
        );
    });

    test('should fall back to super.getTags when getTagsPage with cursor returns 404', async () => {
        const notFoundError: any = new Error('Not Found');
        notFoundError.response = { status: 404 };

        const getTagsPageSpy = jest
            .spyOn(ghcr, 'getTagsPage')
            .mockRejectedValueOnce(notFoundError)
            .mockResolvedValueOnce({
                data: { tags: ['v1.0.0'] },
                headers: {},
            } as any);

        const tags = await ghcr.getTags(testImage);
        expect(tags).toEqual(['v1.0.0']);
        expect(getTagsPageSpy).toHaveBeenNthCalledWith(
            1,
            testImage,
            'v1.100.0',
        );
        expect(getTagsPageSpy).toHaveBeenNthCalledWith(
            2,
            testImage,
            undefined,
            undefined,
        );
    });

    test('should skip cursor and query full tags when tag is latest', async () => {
        const latestImage: ContainerImage = {
            ...testImage,
            tag: { value: 'latest', semver: false },
        };

        const getTagsPageSpy = jest
            .spyOn(ghcr, 'getTagsPage')
            .mockResolvedValueOnce({
                data: { tags: ['latest', 'v1.0.0'] },
                headers: {},
            } as any);

        const tags = await ghcr.getTags(latestImage);
        expect(tags).toEqual(['v1.0.0', 'latest']);
        expect(getTagsPageSpy).toHaveBeenCalledWith(
            latestImage,
            undefined,
            undefined,
        );
    });

    test('should skip cursor and query full tags when semvercursor is false', async () => {
        ghcr.configuration.semvercursor = false;

        const getTagsPageSpy = jest
            .spyOn(ghcr, 'getTagsPage')
            .mockResolvedValueOnce({
                data: { tags: ['v1.0.0', 'v2.0.0'] },
                headers: {},
            } as any);

        const tags = await ghcr.getTags(testImage);
        expect(tags).toEqual(['v2.0.0', 'v1.0.0']);
        expect(getTagsPageSpy).toHaveBeenCalledWith(
            testImage,
            undefined,
            undefined,
        );
    });

    test('should skip cursor when image has no tag', async () => {
        const noTagImage = {
            name: 'immich-app/immich-machine-learning',
            registry: { url: 'https://ghcr.io/v2' },
        } as ContainerImage;

        const getTagsPageSpy = jest
            .spyOn(ghcr, 'getTagsPage')
            .mockResolvedValueOnce({
                data: { tags: ['v1.0.0'] },
                headers: {},
            } as any);

        const tags = await ghcr.getTags(noTagImage);
        expect(tags).toEqual(['v1.0.0']);
        expect(getTagsPageSpy).toHaveBeenCalledWith(
            noTagImage,
            undefined,
            undefined,
        );
    });

    test('should return cached tags on subsequent calls without querying registry', async () => {
        const getTagsPageSpy = jest
            .spyOn(ghcr, 'getTagsPage')
            .mockResolvedValueOnce({
                data: { tags: ['v1.101.0'] },
                headers: {},
            } as any);

        const firstCall = await ghcr.getTags(testImage);
        expect(firstCall).toEqual(['v1.101.0']);
        expect(getTagsPageSpy).toHaveBeenCalledTimes(1);

        const secondCall = await ghcr.getTags(testImage);
        expect(secondCall).toEqual(['v1.101.0']);
        expect(getTagsPageSpy).toHaveBeenCalledTimes(1);
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
