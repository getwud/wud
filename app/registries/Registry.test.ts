// @ts-nocheck
import axios from 'axios';
import log from '../log';

jest.mock('axios');
jest.mock('../prometheus/registry', () => ({
    getSummaryTags: () => ({
        observe: () => {},
    }),
}));

import Registry from './Registry';

const registry = new Registry();
registry.register('registry', 'hub', 'test', {});

test('base64Encode should decode credentials', async () => {
    expect(Registry.base64Encode('username', 'password')).toEqual(
        'dXNlcm5hbWU6cGFzc3dvcmQ=',
    );
});

test('getId should return registry type only', async () => {
    expect(registry.getId()).toStrictEqual('hub.test');
});

test('match should return false when not overridden', async () => {
    expect(registry.match('')).toBeFalsy();
});

test('normalizeImage should return same image when not overridden', async () => {
    expect(registry.normalizeImage({ x: 'x' })).toStrictEqual({ x: 'x' });
});

test('authenticate should return same request options when not overridden', async () => {
    expect(registry.authenticate({}, { x: 'x' })).resolves.toStrictEqual({
        x: 'x',
    });
});

test('getTags should sort tags z -> a', async () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    registryMocked.callRegistry = () => ({
        headers: {},
        data: { tags: ['v1', 'v2', 'v3'] },
    });
    expect(
        registryMocked.getTags({ name: 'test', registry: { url: 'test' } }),
    ).resolves.toStrictEqual(['v3', 'v2', 'v1']);
});

test('getImageManifestDigest should return digest for application/vnd.docker.distribution.manifest.list.v2+json then application/vnd.docker.distribution.manifest.v2+json', async () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    registryMocked.callRegistry = (options) => {
        if (
            options.headers.Accept ===
            'application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json'
        ) {
            return {
                schemaVersion: 2,
                mediaType:
                    'application/vnd.docker.distribution.manifest.list.v2+json',
                manifests: [
                    {
                        platform: {
                            architecture: 'amd64',
                            os: 'linux',
                        },
                        digest: 'digest_x',
                        mediaType:
                            'application/vnd.docker.distribution.manifest.v2+json',
                    },
                    {
                        platform: {
                            architecture: 'armv7',
                            os: 'linux',
                        },
                        digest: 'digest_y',
                        mediaType: 'fail',
                    },
                ],
            };
        }
        if (
            options.headers.Accept ===
            'application/vnd.docker.distribution.manifest.v2+json'
        ) {
            return {
                headers: {
                    'docker-content-digest': '123456789',
                },
            };
        }
        throw new Error('Boom!');
    };
    expect(
        registryMocked.getImageManifestDigest({
            name: 'image',
            architecture: 'amd64',
            os: 'linux',
            tag: {
                value: 'tag',
            },
            registry: {
                url: 'url',
            },
        }),
    ).resolves.toStrictEqual({
        version: 2,
        digest: '123456789',
    });
});

test('getImageManifestDigest should return digest for application/vnd.docker.distribution.manifest.list.v2+json then application/vnd.docker.container.image.v1+json', async () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    registryMocked.callRegistry = (options) => {
        if (
            options.headers.Accept ===
            'application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json'
        ) {
            return {
                schemaVersion: 2,
                mediaType:
                    'application/vnd.docker.distribution.manifest.list.v2+json',
                manifests: [
                    {
                        platform: {
                            architecture: 'amd64',
                            os: 'linux',
                        },
                        digest: 'digest_x',
                        mediaType:
                            'application/vnd.docker.container.image.v1+json',
                    },
                    {
                        platform: {
                            architecture: 'armv7',
                            os: 'linux',
                        },
                        digest: 'digest_y',
                        mediaType: 'fail',
                    },
                ],
            };
        }
        throw new Error('Boom!');
    };
    expect(
        registryMocked.getImageManifestDigest({
            name: 'image',
            architecture: 'amd64',
            os: 'linux',
            tag: {
                value: 'tag',
            },
            registry: {
                url: 'url',
            },
        }),
    ).resolves.toStrictEqual({
        version: 1,
        digest: 'digest_x',
    });
});

test('getImageManifestDigest should return the manifest digest (not the config digest) for a single-platform application/vnd.docker.distribution.manifest.v2+json response', async () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    const urlsCalled: string[] = [];
    registryMocked.callRegistry = (options) => {
        urlsCalled.push(options.url);
        if (
            options.headers.Accept ===
            'application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json'
        ) {
            // Realistic single-platform manifest: config.mediaType is a *config*
            // media type, never the manifest's own media type.
            return {
                schemaVersion: 2,
                mediaType:
                    'application/vnd.docker.distribution.manifest.v2+json',
                config: {
                    digest: 'config_digest',
                    mediaType: 'application/vnd.docker.container.image.v1+json',
                },
            };
        }
        if (
            options.headers.Accept ===
            'application/vnd.docker.distribution.manifest.v2+json'
        ) {
            return {
                headers: {
                    'docker-content-digest': 'manifest_digest',
                },
            };
        }
        throw new Error('Boom!');
    };
    await expect(
        registryMocked.getImageManifestDigest({
            name: 'image',
            architecture: 'amd64',
            os: 'linux',
            tag: {
                value: 'tag',
            },
            registry: {
                url: 'url',
            },
        }),
    ).resolves.toStrictEqual({
        version: 2,
        digest: 'manifest_digest',
    });
    // The confirmation request must be made against the reference we already
    // fetched the manifest by (the tag here), never against the config digest.
    expect(urlsCalled).toStrictEqual([
        'url/image/manifests/tag',
        'url/image/manifests/tag',
    ]);
});

test('getImageManifestDigest should resolve a manifest fetched directly by its own digest to that same digest', async () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    const urlsCalled: string[] = [];
    registryMocked.callRegistry = (options) => {
        urlsCalled.push(options.url);
        if (
            options.headers.Accept ===
            'application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json'
        ) {
            return {
                schemaVersion: 2,
                mediaType: 'application/vnd.oci.image.manifest.v1+json',
                config: {
                    digest: 'config_digest',
                    mediaType: 'application/vnd.oci.image.config.v1+json',
                },
            };
        }
        if (
            options.headers.Accept ===
            'application/vnd.oci.image.manifest.v1+json'
        ) {
            return {
                headers: {
                    'docker-content-digest': 'sha256:platformManifestDigest',
                },
            };
        }
        throw new Error('Boom!');
    };
    // This mirrors what Docker.ts does when re-resolving the container's local
    // RepoDigest: it's already a leaf manifest digest, not a manifest-list digest.
    await expect(
        registryMocked.getImageManifestDigest(
            {
                name: 'image',
                architecture: 'arm64',
                os: 'linux',
                tag: { value: 'latest' },
                registry: { url: 'url' },
            },
            'sha256:platformManifestDigest',
        ),
    ).resolves.toStrictEqual({
        version: 2,
        digest: 'sha256:platformManifestDigest',
    });
    expect(urlsCalled).toStrictEqual([
        'url/image/manifests/sha256:platformManifestDigest',
        'url/image/manifests/sha256:platformManifestDigest',
    ]);
});

test('getImageManifestDigest should return digest for application/vnd.docker.container.image.v1+json', async () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    registryMocked.callRegistry = (options) => {
        if (
            options.headers.Accept ===
            'application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json'
        ) {
            return {
                schemaVersion: 1,
                history: [
                    {
                        v1Compatibility: JSON.stringify({
                            config: {
                                Image: 'xxxxxxxxxx',
                            },
                        }),
                    },
                ],
            };
        }
        throw new Error('Boom!');
    };
    expect(
        registryMocked.getImageManifestDigest({
            name: 'image',
            architecture: 'amd64',
            os: 'linux',
            tag: {
                value: 'tag',
            },
            registry: {
                url: 'url',
            },
        }),
    ).resolves.toStrictEqual({
        version: 1,
        digest: 'xxxxxxxxxx',
        created: undefined,
    });
});

test('getImageManifestDigest should throw when no digest found', async () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    registryMocked.callRegistry = () => ({});
    expect(
        registryMocked.getImageManifestDigest({
            name: 'image',
            architecture: 'amd64',
            os: 'linux',
            tag: {
                value: 'tag',
            },
            registry: {
                url: 'url',
            },
        }),
    ).rejects.toEqual(new Error('Unexpected error; no manifest found'));
});

test('callRegistry should call authenticate', async () => {
    axios.mockResolvedValue({ data: {} });
    const registryMocked = new Registry();
    registryMocked.log = log;
    const spyAuthenticate = jest.spyOn(registryMocked, 'authenticate');
    await registryMocked.callRegistry({
        image: {},
        url: 'url',
        method: 'get',
    });
    expect(spyAuthenticate).toHaveBeenCalledTimes(1);
});

describe('registry request throttling', () => {
    const request = (registryMocked: Registry, url = 'url') =>
        registryMocked.callRegistry({
            image: {},
            url,
            method: 'get',
        });
    const rateLimitError = (retryAfter?: string) => ({
        response: {
            status: 429,
            headers: { get: () => retryAfter },
        },
    });
    const runTimeoutsImmediately = () =>
        jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
            callback();
            return 0;
        });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should default concurrency to two and validate overrides', () => {
        const registryMocked = new Registry();

        expect(registryMocked.validateConfiguration({})).toEqual({
            concurrency: 2,
        });
        expect(
            registryMocked.validateConfiguration({ concurrency: '2' }),
        ).toEqual({ concurrency: 2 });
        expect(() =>
            registryMocked.validateConfiguration({ concurrency: 0 }),
        ).toThrow();
        expect(() =>
            registryMocked.validateConfiguration({ concurrency: 1.5 }),
        ).toThrow();
    });

    test('should limit concurrent requests', async () => {
        const registryMocked = new Registry();
        await registryMocked.register('registry', 'test', 'test', {
            concurrency: 2,
        });
        let active = 0;
        let maximumActive = 0;
        let releaseRequests;
        const requestsBlocked = new Promise((resolve) => {
            releaseRequests = resolve;
        });
        axios.mockImplementation(async () => {
            active += 1;
            maximumActive = Math.max(maximumActive, active);
            await requestsBlocked;
            active -= 1;
            return { data: {} };
        });

        const requests = [
            request(registryMocked),
            request(registryMocked),
            request(registryMocked),
        ];
        await new Promise(setImmediate);

        expect(axios).toHaveBeenCalledTimes(2);
        releaseRequests();
        await Promise.all(requests);
        expect(axios).toHaveBeenCalledTimes(3);
        expect(maximumActive).toBe(2);
    });

    test('should start queued requests in FIFO order', async () => {
        const registryMocked = new Registry();
        await registryMocked.register('registry', 'test', 'test', {
            concurrency: 1,
        });
        const started = [];
        const releases = {};
        axios.mockImplementation(
            (options) =>
                new Promise((resolve) => {
                    started.push(options.url);
                    releases[options.url] = () => resolve({ data: {} });
                }),
        );

        const requests = [
            request(registryMocked, 'first'),
            request(registryMocked, 'second'),
            request(registryMocked, 'third'),
        ];
        await new Promise(setImmediate);
        expect(started).toEqual(['first']);

        releases.first();
        await new Promise(setImmediate);
        expect(started).toEqual(['first', 'second']);

        releases.second();
        await new Promise(setImmediate);
        expect(started).toEqual(['first', 'second', 'third']);

        releases.third();
        await Promise.all(requests);
    });

    test('should isolate concurrency limits by registry instance', async () => {
        const firstRegistry = new Registry();
        const secondRegistry = new Registry();
        await firstRegistry.register('registry', 'test', 'first', {
            concurrency: 1,
        });
        await secondRegistry.register('registry', 'test', 'second', {
            concurrency: 1,
        });
        let maximumActive = 0;
        let active = 0;
        let releaseRequests;
        const requestsBlocked = new Promise((resolve) => {
            releaseRequests = resolve;
        });
        axios.mockImplementation(async () => {
            active += 1;
            maximumActive = Math.max(maximumActive, active);
            await requestsBlocked;
            active -= 1;
            return { data: {} };
        });

        const requests = [
            request(firstRegistry, 'first-1'),
            request(firstRegistry, 'first-2'),
            request(secondRegistry, 'second-1'),
            request(secondRegistry, 'second-2'),
        ];
        await new Promise(setImmediate);

        expect(axios.mock.calls.map(([options]) => options.url)).toEqual([
            'first-1',
            'second-1',
        ]);
        expect(maximumActive).toBe(2);

        releaseRequests();
        await Promise.all(requests);
        expect(axios).toHaveBeenCalledTimes(4);
    });

    test('should honor Retry-After seconds and reuse authentication', async () => {
        const registryMocked = new Registry();
        const error = rateLimitError('2');
        axios.mockRejectedValueOnce(error).mockResolvedValueOnce({
            data: { ok: true },
        });
        const timeout = runTimeoutsImmediately();
        const authenticate = jest.spyOn(registryMocked, 'authenticate');

        await expect(request(registryMocked)).resolves.toEqual({ ok: true });

        expect(timeout).toHaveBeenCalledWith(expect.any(Function), 2000);
        expect(axios).toHaveBeenCalledTimes(2);
        expect(authenticate).toHaveBeenCalledTimes(1);
    });

    test('should honor an HTTP-date Retry-After header', async () => {
        const registryMocked = new Registry();
        const now = Date.parse('2026-08-20T12:00:00Z');
        jest.spyOn(Date, 'now').mockReturnValue(now);
        axios
            .mockRejectedValueOnce(
                rateLimitError(new Date(now + 5000).toUTCString()),
            )
            .mockResolvedValueOnce({ data: {} });
        const timeout = runTimeoutsImmediately();

        await request(registryMocked);

        expect(timeout).toHaveBeenCalledWith(expect.any(Function), 5000);
    });

    test('should use exponential backoff with jitter without Retry-After', async () => {
        const registryMocked = new Registry();
        axios
            .mockRejectedValueOnce(rateLimitError())
            .mockRejectedValueOnce(rateLimitError())
            .mockResolvedValueOnce({ data: {} });
        jest.spyOn(Math, 'random').mockReturnValue(0.5);
        const timeout = runTimeoutsImmediately();

        await request(registryMocked);

        expect(timeout.mock.calls.map((call) => call[1])).toEqual([1500, 3000]);
        expect(axios).toHaveBeenCalledTimes(3);
    });

    test('should stop after two retries and preserve the original error', async () => {
        const registryMocked = new Registry();
        const error = rateLimitError();
        axios.mockRejectedValue(error);
        runTimeoutsImmediately();

        await expect(request(registryMocked)).rejects.toBe(error);

        expect(axios).toHaveBeenCalledTimes(3);
    });

    test('should not retry non-429 errors or a Retry-After over one minute', async () => {
        const registryMocked = new Registry();
        const timeout = jest.spyOn(global, 'setTimeout');
        const serverError = { response: { status: 500, headers: {} } };
        axios.mockRejectedValueOnce(serverError);

        await expect(request(registryMocked)).rejects.toBe(serverError);
        expect(axios).toHaveBeenCalledTimes(1);

        const longRateLimit = rateLimitError('61');
        axios.mockRejectedValueOnce(longRateLimit);
        await expect(request(registryMocked)).rejects.toBe(longRateLimit);
        expect(axios).toHaveBeenCalledTimes(2);
        expect(timeout).not.toHaveBeenCalled();
    });

    test('should release the permit while a throttled request waits', async () => {
        const registryMocked = new Registry();
        await registryMocked.register('registry', 'test', 'test', {
            concurrency: 1,
        });
        let releaseRetry;
        jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
            releaseRetry = callback;
            return 0;
        });
        axios.mockImplementation((options) => {
            if (options.url === 'throttled' && axios.mock.calls.length === 1) {
                return Promise.reject(rateLimitError());
            }
            return Promise.resolve({ data: { url: options.url } });
        });

        const throttled = request(registryMocked, 'throttled');
        const successful = request(registryMocked, 'successful');
        await expect(successful).resolves.toEqual({ url: 'successful' });
        expect(axios.mock.calls.map(([options]) => options.url)).toEqual([
            'throttled',
            'successful',
        ]);

        releaseRetry();
        await expect(throttled).resolves.toEqual({ url: 'throttled' });
    });
});

describe('shouldWatchDigest', () => {
    test('should return true when label is true', () => {
        const result = registry.shouldWatchDigest('true', 'image/name');
        expect(result).toBe(true);
    });

    test('should return true when label is TRUE (case insensitive)', () => {
        const result = registry.shouldWatchDigest('TRUE', 'image/name');
        expect(result).toBe(true);
    });

    test('should return true without label', () => {
        const result = registry.shouldWatchDigest(undefined, 'image/name');
        expect(result).toBe(true);
    });

    test('should return true with empty label', () => {
        const result = registry.shouldWatchDigest('', 'image/name');
        expect(result).toBe(true);
    });
});
