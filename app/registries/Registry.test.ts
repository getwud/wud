import request from 'request';
import log from '../log';
import { ContainerImage } from '../model/container';
import { Registry } from './Registry';
import { RequestPromiseOptions } from 'request-promise-native';

jest.mock('request-promise-native');
jest.mock('../prometheus/registry', () => ({
    getSummaryTags: () => ({
        observe: () => { },
    }),
}));


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
    expect(registry.match({} as ContainerImage)).toBeFalsy();
});

test('normalizeImage should return same image when not overridden', () => {
    expect(registry.normalizeImage({ x: 'x' } as unknown as ContainerImage)).toStrictEqual({ x: 'x' });
});

test('authenticate should return same request options when not overridden', () => {
    expect(registry.authenticate({} as ContainerImage, { x: 'x' } as RequestPromiseOptions)).resolves.toStrictEqual({
        x: 'x',
    });
});

test('getTags should sort tags z -> a', () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    registryMocked.callRegistry = <T>() => Promise.resolve({
        headers: {},
        body: { tags: ['v1', 'v2', 'v3'] },
    } as T);
    expect(
        registryMocked.getTags({ name: 'test', registry: { url: 'test' } } as ContainerImage),
    ).resolves.toStrictEqual(['v3', 'v2', 'v1']);
});

test('getImageManifestDigest should return digest for application/vnd.docker.distribution.manifest.list.v2+json then application/vnd.docker.distribution.manifest.v2+json', () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    registryMocked.callRegistry = <T>(options: any): Promise<T> => {
        if (
            options.headers.Accept ===
            'application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json'
        ) {
            return Promise.resolve({
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
            } as T);
        }
        if (
            options.headers.Accept ===
            'application/vnd.docker.distribution.manifest.v2+json'
        ) {
            return Promise.resolve({
                headers: {
                    'docker-content-digest': '123456789',
                },
            } as T);
        }
        return Promise.reject(new Error('Boom!'));
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
        } as ContainerImage),
    ).resolves.toStrictEqual({
        version: 2,
        digest: '123456789',
    });
});

test('getImageManifestDigest should return digest for application/vnd.docker.distribution.manifest.list.v2+json then application/vnd.docker.container.image.v1+json', () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    registryMocked.callRegistry = <T>(options: any): Promise<T> => {
        if (
            options.headers.Accept ===
            'application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json'
        ) {
            return Promise.resolve({
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
            } as T);
        }
        return Promise.reject(new Error('Boom!'));
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
        } as ContainerImage),
    ).resolves.toStrictEqual({
        version: 1,
        digest: 'digest_x',
    });
});

test('getImageManifestDigest should return digest for application/vnd.docker.distribution.manifest.v2+json', () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    registryMocked.callRegistry = <T>(options: any): Promise<T> => {
        if (
            options.headers.Accept ===
            'application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json'
        ) {
            return Promise.resolve({
                schemaVersion: 2,
                mediaType:
                    'application/vnd.docker.distribution.manifest.v2+json',
                config: {
                    digest: 'digest_x',
                    mediaType:
                        'application/vnd.docker.distribution.manifest.v2+json',
                },
            } as T);
        }
        if (
            options.headers.Accept ===
            'application/vnd.docker.distribution.manifest.v2+json'
        ) {
            return Promise.resolve({
                headers: {
                    'docker-content-digest': '123456789',
                },
            } as T);
        }
        return Promise.reject(new Error('Boom!'));
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
        } as ContainerImage),
    ).resolves.toStrictEqual({
        version: 2,
        digest: '123456789',
    });
});

test('getImageManifestDigest should return digest for application/vnd.docker.container.image.v1+json', () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    registryMocked.callRegistry = <T>(options: any): Promise<T> => {
        if (
            options.headers.Accept ===
            'application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json'
        ) {
            return Promise.resolve({
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
            } as T);
        }
        return Promise.reject(new Error('Boom!'));
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
        } as ContainerImage),
    ).resolves.toStrictEqual({
        version: 1,
        digest: 'xxxxxxxxxx',
        created: undefined,
    });
});

test('getImageManifestDigest should throw when no digest found', () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    registryMocked.callRegistry = <T>() => ({} as unknown as Promise<T>);
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
        } as ContainerImage),
    ).rejects.toEqual(new Error('Unexpected error; no manifest found'));
});

test('callRegistry should call authenticate', () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    const spyAuthenticate = jest.spyOn(registryMocked, 'authenticate');
    registryMocked.callRegistry({
        image: {} as ContainerImage,
        url: 'url',
        method: 'get',
    });
    expect(spyAuthenticate).toHaveBeenCalledTimes(1);
});
