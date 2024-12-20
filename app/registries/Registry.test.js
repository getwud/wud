const log = require('../log');

jest.mock('request-promise-native');
jest.mock('../prometheus/registry', () => ({
    getSummaryTags: () => ({
        observe: () => {},
    }),
}));

const Registry = require('./Registry');

const registry = new Registry();
registry.register('registry', 'hub', 'test', {});

test('base64Encode should decode credentials', () => {
    expect(Registry.base64Encode('username', 'password')).toEqual(
        'dXNlcm5hbWU6cGFzc3dvcmQ=',
    );
});

test('getId should return registry type only', () => {
    expect(registry.getId()).toStrictEqual('hub.test');
});

test('match should return false when not overridden', () => {
    expect(registry.match({})).toBeFalsy();
});

test('normalizeImage should return same image when not overridden', () => {
    expect(registry.normalizeImage({ x: 'x' })).toStrictEqual({ x: 'x' });
});

test('authenticate should return same request options when not overridden', () => {
    expect(registry.authenticate({}, { x: 'x' })).resolves.toStrictEqual({
        x: 'x',
    });
});

test('getTags should sort tags z -> a', () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    registryMocked.callRegistry = () => ({
        headers: {},
        body: { tags: ['v1', 'v2', 'v3'] },
    });
    expect(
        registryMocked.getTags({ name: 'test', registry: { url: 'test' } }),
    ).resolves.toStrictEqual(['v3', 'v2', 'v1']);
});

test('getImageManifestDigest should return digest for application/vnd.docker.distribution.manifest.list.v2+json then application/vnd.docker.distribution.manifest.v2+json', () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    registryMocked.callRegistry = (options) => {
        if (
            options.headers.Accept ===
            'application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.index.v1+json'
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

test('getImageManifestDigest should return digest for application/vnd.docker.distribution.manifest.list.v2+json then application/vnd.docker.container.image.v1+json', () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    registryMocked.callRegistry = (options) => {
        if (
            options.headers.Accept ===
            'application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.index.v1+json'
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

test('getImageManifestDigest should return digest for application/vnd.docker.distribution.manifest.v2+json', () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    registryMocked.callRegistry = (options) => {
        if (
            options.headers.Accept ===
            'application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.index.v1+json'
        ) {
            return {
                schemaVersion: 2,
                mediaType:
                    'application/vnd.docker.distribution.manifest.v2+json',
                config: {
                    digest: 'digest_x',
                    mediaType:
                        'application/vnd.docker.distribution.manifest.v2+json',
                },
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

test('getImageManifestDigest should return digest for application/vnd.docker.container.image.v1+json', () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    registryMocked.callRegistry = (options) => {
        if (
            options.headers.Accept ===
            'application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.index.v1+json'
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

test('getImageManifestDigest should throw when no digest found', () => {
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

test('callRegistry should call authenticate', () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    const spyAuthenticate = jest.spyOn(registryMocked, 'authenticate');
    registryMocked.callRegistry({
        image: {},
        url: 'url',
        method: 'get',
    });
    expect(spyAuthenticate).toHaveBeenCalledTimes(1);
});
