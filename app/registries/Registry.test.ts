// @ts-nocheck
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import log from '../log';

jest.mock('axios');
jest.mock('../prometheus/registry', () => ({
    getSummaryTags: () => ({
        observe: () => {},
    }),
}));

import Registry, {
    getUserAgent,
    getHeaderContentType,
    UnsupportedArtifactError,
    isNonContainerArtifact,
    isNonContainerArtifactError,
    resolveCandidateTag,
    parseNextLink,
    resolveNextPageUrl,
} from './Registry';

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
        // Already known from the manifest just fetched, so resolving the image
        // config later costs one request instead of two.
        configDigest: 'config_digest',
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
        configDigest: 'config_digest',
    });
    expect(urlsCalled).toStrictEqual([
        'url/image/manifests/sha256:platformManifestDigest',
        'url/image/manifests/sha256:platformManifestDigest',
    ]);
});

test('getImageManifestDigest should return both leaf digest and indexDigest for a multi-arch index fetched by tag (fixes #1500)', async () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    registryMocked.callRegistry = (options) => {
        if (options.method === 'head') {
            return {
                headers: {
                    'docker-content-digest': 'sha256:leafAmd64Digest',
                },
            };
        }
        return {
            headers: {
                'docker-content-digest': 'sha256:indexDigest123',
            },
            data: {
                schemaVersion: 2,
                mediaType: 'application/vnd.oci.image.index.v1+json',
                manifests: [
                    {
                        digest: 'sha256:leafAmd64Digest',
                        mediaType: 'application/vnd.oci.image.manifest.v1+json',
                        platform: { architecture: 'amd64', os: 'linux' },
                    },
                    {
                        digest: 'sha256:leafArm64Digest',
                        mediaType: 'application/vnd.oci.image.manifest.v1+json',
                        platform: { architecture: 'arm64', os: 'linux' },
                    },
                ],
            },
        };
    };

    await expect(
        registryMocked.getImageManifestDigest({
            name: 'image',
            architecture: 'amd64',
            os: 'linux',
            tag: { value: 'latest' },
            registry: { url: 'url' },
        }),
    ).resolves.toStrictEqual({
        version: 2,
        digest: 'sha256:leafAmd64Digest',
        indexDigest: 'sha256:indexDigest123',
    });
});

test('getImageManifestDigest should return both leaf digest and indexDigest when fetched directly by index digest (fixes #1500)', async () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    registryMocked.callRegistry = (options) => {
        if (options.method === 'head') {
            return {
                headers: {
                    'docker-content-digest': 'sha256:leafArm64Digest',
                },
            };
        }
        return {
            headers: {},
            data: {
                schemaVersion: 2,
                mediaType: 'application/vnd.oci.image.index.v1+json',
                manifests: [
                    {
                        digest: 'sha256:leafAmd64Digest',
                        mediaType: 'application/vnd.oci.image.manifest.v1+json',
                        platform: { architecture: 'amd64', os: 'linux' },
                    },
                    {
                        digest: 'sha256:leafArm64Digest',
                        mediaType: 'application/vnd.oci.image.manifest.v1+json',
                        platform: { architecture: 'arm64', os: 'linux' },
                    },
                ],
            },
        };
    };

    await expect(
        registryMocked.getImageManifestDigest(
            {
                name: 'image',
                architecture: 'arm64',
                os: 'linux',
                tag: { value: 'latest' },
                registry: { url: 'url' },
            },
            'sha256:indexDigestPassedDirectly',
        ),
    ).resolves.toStrictEqual({
        version: 2,
        digest: 'sha256:leafArm64Digest',
        indexDigest: 'sha256:indexDigestPassedDirectly',
    });
});

test('getImageManifestDigest should resolve multi-arch index when mediaType is missing in payload body but present in Content-Type header (fixes #1530)', async () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    registryMocked.callRegistry = (options) => {
        if (options.method === 'head') {
            return {
                headers: {
                    'docker-content-digest': 'sha256:leafAmd64Digest',
                },
            };
        }
        return {
            headers: {
                'content-type': 'application/vnd.oci.image.index.v1+json',
                'docker-content-digest': 'sha256:rootIndexDigest',
            },
            data: {
                schemaVersion: 2,
                // mediaType intentionally omitted in payload (per OCI image index spec / Passbolt issue #1530)
                manifests: [
                    {
                        digest: 'sha256:leafAmd64Digest',
                        mediaType: 'application/vnd.oci.image.manifest.v1+json',
                        platform: { architecture: 'amd64', os: 'linux' },
                    },
                    {
                        digest: 'sha256:leafArm64Digest',
                        mediaType: 'application/vnd.oci.image.manifest.v1+json',
                        platform: { architecture: 'arm64', os: 'linux' },
                    },
                ],
            },
        };
    };

    await expect(
        registryMocked.getImageManifestDigest({
            name: 'passbolt/passbolt',
            architecture: 'amd64',
            os: 'linux',
            tag: { value: '5.17.0-1-ce' },
            registry: { url: 'url' },
        }),
    ).resolves.toStrictEqual({
        version: 2,
        digest: 'sha256:leafAmd64Digest',
        indexDigest: 'sha256:rootIndexDigest',
    });
});

test('getImageManifestDigest should resolve multi-arch index by structural inference when mediaType is missing in payload body and header is generic/missing', async () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    registryMocked.callRegistry = (options) => {
        if (options.method === 'head') {
            return {
                headers: {
                    'docker-content-digest': 'sha256:leafAmd64Digest',
                },
            };
        }
        return {
            headers: {
                'content-type': 'application/json',
            },
            data: {
                schemaVersion: 2,
                // mediaType omitted, manifests array present
                manifests: [
                    {
                        digest: 'sha256:leafAmd64Digest',
                        mediaType: 'application/vnd.oci.image.manifest.v1+json',
                        platform: { architecture: 'amd64', os: 'linux' },
                    },
                ],
            },
        };
    };

    await expect(
        registryMocked.getImageManifestDigest({
            name: 'image',
            architecture: 'amd64',
            os: 'linux',
            tag: { value: 'latest' },
            registry: { url: 'url' },
        }),
    ).resolves.toStrictEqual({
        version: 2,
        digest: 'sha256:leafAmd64Digest',
    });
});

test('getImageManifestDigest should fallback child manifest mediaType when missing in index manifest descriptor', async () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    let headAcceptHeader: string | undefined;
    registryMocked.callRegistry = (options) => {
        if (options.method === 'head') {
            headAcceptHeader = options.headers?.Accept;
            return {
                headers: {
                    'docker-content-digest': 'sha256:leafAmd64Digest',
                },
            };
        }
        return {
            headers: {
                'content-type': 'application/vnd.oci.image.index.v1+json',
            },
            data: {
                schemaVersion: 2,
                manifests: [
                    {
                        digest: 'sha256:leafAmd64Digest',
                        // mediaType omitted on child descriptor
                        platform: { architecture: 'amd64', os: 'linux' },
                    },
                ],
            },
        };
    };

    await expect(
        registryMocked.getImageManifestDigest({
            name: 'image',
            architecture: 'amd64',
            os: 'linux',
            tag: { value: 'latest' },
            registry: { url: 'url' },
        }),
    ).resolves.toStrictEqual({
        version: 2,
        digest: 'sha256:leafAmd64Digest',
    });
    expect(headAcceptHeader).toBe('application/vnd.oci.image.manifest.v1+json');
});

test('getImageManifestDigest should resolve single-platform manifest when mediaType is missing in payload body but present in Content-Type header', async () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    let headAcceptHeader: string | undefined;
    registryMocked.callRegistry = (options) => {
        if (options.method === 'head') {
            headAcceptHeader = options.headers?.Accept;
            return {
                headers: {
                    'docker-content-digest': 'sha256:singlePlatformDigest',
                },
            };
        }
        return {
            headers: {
                'content-type': 'application/vnd.oci.image.manifest.v1+json',
            },
            data: {
                schemaVersion: 2,
                // mediaType omitted in body
                config: {
                    digest: 'sha256:configDigest',
                    mediaType: 'application/vnd.oci.image.config.v1+json',
                },
                layers: [],
            },
        };
    };

    await expect(
        registryMocked.getImageManifestDigest({
            name: 'image',
            architecture: 'amd64',
            os: 'linux',
            tag: { value: 'latest' },
            registry: { url: 'url' },
        }),
    ).resolves.toStrictEqual({
        version: 2,
        digest: 'sha256:singlePlatformDigest',
        configDigest: 'sha256:configDigest',
    });
    expect(headAcceptHeader).toBe('application/vnd.oci.image.manifest.v1+json');
});

test('getImageManifestDigest should resolve single-platform manifest by structural inference when mediaType is missing in payload body and headers', async () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    let headAcceptHeader: string | undefined;
    registryMocked.callRegistry = (options) => {
        if (options.method === 'head') {
            headAcceptHeader = options.headers?.Accept;
            return {
                headers: {
                    'docker-content-digest': 'sha256:singlePlatformDigest',
                },
            };
        }
        // Direct object payload with no headers
        return {
            schemaVersion: 2,
            config: {
                digest: 'sha256:configDigest',
                mediaType: 'application/vnd.oci.image.config.v1+json',
            },
            layers: [],
        };
    };

    await expect(
        registryMocked.getImageManifestDigest({
            name: 'image',
            architecture: 'amd64',
            os: 'linux',
            tag: { value: 'latest' },
            registry: { url: 'url' },
        }),
    ).resolves.toStrictEqual({
        version: 2,
        digest: 'sha256:singlePlatformDigest',
        configDigest: 'sha256:configDigest',
    });
    expect(headAcceptHeader).toBe('application/vnd.oci.image.manifest.v1+json');
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

test('getUserAgent should return wud formatted user agent', () => {
    expect(getUserAgent()).toMatch(/^wud\/.+/);
    expect(Registry.getUserAgent()).toEqual(getUserAgent());
});

const imageConfigImage = {
    name: 'image',
    architecture: 'amd64',
    os: 'linux',
    tag: {
        value: 'tag',
    },
    registry: {
        url: 'url',
    },
};

test('getImageConfig should return the created date and version label from the config blob', async () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    const urlsCalled: string[] = [];
    registryMocked.callRegistry = (options) => {
        urlsCalled.push(options.url);
        if (options.url === 'url/image/manifests/manifest_digest') {
            return {
                schemaVersion: 2,
                mediaType: 'application/vnd.oci.image.manifest.v1+json',
                config: {
                    digest: 'config_digest',
                    mediaType: 'application/vnd.oci.image.config.v1+json',
                },
            };
        }
        if (options.url === 'url/image/blobs/config_digest') {
            return {
                created: '2026-09-02T05:35:35.550810335Z',
                config: {
                    Labels: {
                        'org.opencontainers.image.version': '2.3.7',
                    },
                },
            };
        }
        throw new Error('Boom!');
    };
    await expect(
        registryMocked.getImageConfig(imageConfigImage, 'manifest_digest'),
    ).resolves.toStrictEqual({
        created: '2026-09-02T05:35:35.550810335Z',
        version: '2.3.7',
    });
    // The manifest is fetched by its own digest, then the config blob it points at.
    expect(urlsCalled).toStrictEqual([
        'url/image/manifests/manifest_digest',
        'url/image/blobs/config_digest',
    ]);
});

test('getImageConfig should not request an index media type (a manifest digest never resolves to an index)', async () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    let acceptUsed;
    registryMocked.callRegistry = (options) => {
        if (options.url === 'url/image/manifests/manifest_digest') {
            acceptUsed = options.headers.Accept;
            return { config: { digest: 'config_digest' } };
        }
        return {};
    };
    await registryMocked.getImageConfig(imageConfigImage, 'manifest_digest');
    expect(acceptUsed).toStrictEqual(
        'application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json',
    );
});

test('getImageConfig should return undefined version when the image carries no version label', async () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    registryMocked.callRegistry = (options) => {
        if (options.url === 'url/image/manifests/manifest_digest') {
            return { config: { digest: 'config_digest' } };
        }
        return {
            created: '2026-09-02T05:35:35.550810335Z',
            config: { Labels: { maintainer: 'someone' } },
        };
    };
    await expect(
        registryMocked.getImageConfig(imageConfigImage, 'manifest_digest'),
    ).resolves.toStrictEqual({
        created: '2026-09-02T05:35:35.550810335Z',
        version: undefined,
    });
});

test('getImageConfig should return undefined values when the config blob is empty', async () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    registryMocked.callRegistry = (options) => {
        if (options.url === 'url/image/manifests/manifest_digest') {
            return { config: { digest: 'config_digest' } };
        }
        return {};
    };
    await expect(
        registryMocked.getImageConfig(imageConfigImage, 'manifest_digest'),
    ).resolves.toStrictEqual({
        created: undefined,
        version: undefined,
    });
});

test('getImageConfig should treat an empty version label as undefined', async () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    registryMocked.callRegistry = (options) => {
        if (options.url === 'url/image/manifests/manifest_digest') {
            return { config: { digest: 'config_digest' } };
        }
        // Built with `ARG VERSION` + `LABEL ...version=$VERSION` and no build arg.
        return {
            created: '2026-09-02T05:35:35.550810335Z',
            config: { Labels: { 'org.opencontainers.image.version': '' } },
        };
    };
    // Must be undefined, not '': the container schema rejects an empty string
    // and the resulting throw would abort the whole watch cycle.
    await expect(
        registryMocked.getImageConfig(imageConfigImage, 'manifest_digest'),
    ).resolves.toStrictEqual({
        created: '2026-09-02T05:35:35.550810335Z',
        version: undefined,
    });
});

test('getImageConfig should skip the manifest request when the config digest is already known', async () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    const urlsCalled: string[] = [];
    registryMocked.callRegistry = (options) => {
        urlsCalled.push(options.url);
        return {
            created: '2026-09-02T05:35:35.550810335Z',
            config: { Labels: { 'org.opencontainers.image.version': '2.3.7' } },
        };
    };
    await expect(
        registryMocked.getImageConfig(
            imageConfigImage,
            'manifest_digest',
            'config_digest',
        ),
    ).resolves.toStrictEqual({
        created: '2026-09-02T05:35:35.550810335Z',
        version: '2.3.7',
    });
    // Only the blob is fetched; the manifest was already read by the caller.
    expect(urlsCalled).toStrictEqual(['url/image/blobs/config_digest']);
});

test('getImageConfig should throw when the manifest has no config digest', async () => {
    const registryMocked = new Registry();
    registryMocked.log = log;
    registryMocked.callRegistry = () => ({ schemaVersion: 2 });
    await expect(
        registryMocked.getImageConfig(imageConfigImage, 'manifest_digest'),
    ).rejects.toEqual(
        new Error('No config digest found in manifest manifest_digest'),
    );
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

test('callRegistry should send User-Agent header with wud version', async () => {
    axios.mockResolvedValue({ data: {} });
    const registryMocked = new Registry();
    registryMocked.log = log;
    await registryMocked.callRegistry({
        image: {},
        url: 'https://registry.example.com/v2/',
        method: 'get',
    });
    expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
            headers: expect.objectContaining({
                'User-Agent': getUserAgent(),
            }),
        }),
    );
});

describe('proxy handling', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        delete process.env.HTTP_PROXY;
        delete process.env.HTTPS_PROXY;
        delete process.env.http_proxy;
        delete process.env.https_proxy;
        delete process.env.NO_PROXY;
        delete process.env.no_proxy;
        axios.mockClear();
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    test('callRegistry should use HttpsProxyAgent when registry has proxy configured', async () => {
        axios.mockResolvedValue({ data: {} });
        const registryMocked = new Registry();
        registryMocked.log = log;
        registryMocked.configuration = {
            proxy: 'http://custom-proxy:3128',
        };
        await registryMocked.callRegistry({
            image: {},
            url: 'https://registry-1.docker.io/v2/',
            method: 'get',
        });
        expect(axios).toHaveBeenCalledWith(
            expect.objectContaining({
                httpsAgent: expect.any(HttpsProxyAgent),
                proxy: false,
            }),
        );
    });

    test('callRegistry should use HttpsProxyAgent when HTTPS_PROXY environment variable is set', async () => {
        process.env.HTTPS_PROXY = 'http://corp-proxy:3128';
        axios.mockResolvedValue({ data: {} });
        const registryMocked = new Registry();
        registryMocked.log = log;
        await registryMocked.callRegistry({
            image: {},
            url: 'https://registry-1.docker.io/v2/',
            method: 'get',
        });
        expect(axios).toHaveBeenCalledWith(
            expect.objectContaining({
                httpsAgent: expect.any(HttpsProxyAgent),
                proxy: false,
            }),
        );
    });

    test('callRegistry should use SocksProxyAgent when proxy URL is socks', async () => {
        process.env.HTTPS_PROXY = 'socks5://corp-proxy:1080';
        axios.mockResolvedValue({ data: {} });
        const registryMocked = new Registry();
        registryMocked.log = log;
        await registryMocked.callRegistry({
            image: {},
            url: 'https://registry-1.docker.io/v2/',
            method: 'get',
        });
        expect(axios).toHaveBeenCalledWith(
            expect.objectContaining({
                httpsAgent: expect.any(SocksProxyAgent),
                httpAgent: expect.any(SocksProxyAgent),
                proxy: false,
            }),
        );
    });

    test('callRegistry should not use proxy when NO_PROXY matches registry URL', async () => {
        process.env.HTTPS_PROXY = 'http://corp-proxy:3128';
        process.env.NO_PROXY = '.docker.io,localhost';
        axios.mockResolvedValue({ data: {} });
        const registryMocked = new Registry();
        registryMocked.log = log;
        await registryMocked.callRegistry({
            image: {},
            url: 'https://registry-1.docker.io/v2/',
            method: 'get',
        });
        expect(axios).toHaveBeenCalledWith(
            expect.not.objectContaining({
                proxy: false,
            }),
        );
    });
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

    test('should validate optional proxy configuration', () => {
        const registryMocked = new Registry();

        expect(
            registryMocked.validateConfiguration({
                proxy: 'http://proxy.example.com:8080',
            }),
        ).toEqual({
            concurrency: 2,
            proxy: 'http://proxy.example.com:8080',
        });
        expect(() =>
            registryMocked.validateConfiguration({ proxy: 'invalid-url' }),
        ).toThrow();
    });

    test('maskConfiguration should mask proxy password and webhook token', () => {
        const registryMocked = new Registry();
        registryMocked.configuration = {
            webhook: { token: 'my-secret-token' },
            proxy: 'http://user:supersecret@proxy.example.com:8080',
        };
        const masked = registryMocked.maskConfiguration();
        expect(masked.webhook.token).toBe('m*************n');
        expect(masked.proxy).toBe('http://user:***@proxy.example.com:8080/');
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

    test('should return watchDigestDefault if passed', () => {
        expect(registry.shouldWatchDigest(undefined, 'image/name', false)).toBe(
            false,
        );
        expect(registry.shouldWatchDigest(undefined, 'image/name', true)).toBe(
            true,
        );
    });
});

describe('isNonContainerArtifact', () => {
    test('should return false for null or undefined', () => {
        expect(isNonContainerArtifact(null)).toBe(false);
        expect(isNonContainerArtifact(undefined)).toBe(false);
    });

    test('should identify Helm chart with config.mediaType application/vnd.cncf.helm.config.v1+json', () => {
        const manifest = {
            schemaVersion: 2,
            mediaType: 'application/vnd.oci.image.manifest.v1+json',
            config: {
                mediaType: 'application/vnd.cncf.helm.config.v1+json',
                digest: 'sha256:123',
            },
        };
        expect(isNonContainerArtifact(manifest)).toBe(true);
    });

    test('should identify Helm chart with artifactType application/vnd.cncf.helm.chart.v1+json', () => {
        const manifest = {
            schemaVersion: 2,
            mediaType: 'application/vnd.oci.image.manifest.v1+json',
            artifactType: 'application/vnd.cncf.helm.chart.v1+json',
            config: {
                mediaType: 'application/vnd.oci.empty.v1+json',
                digest: 'sha256:empty',
            },
        };
        expect(isNonContainerArtifact(manifest)).toBe(true);
    });

    test('should identify Helm chart with layer mediaType application/vnd.cncf.helm.chart.content.v1.tar+gzip', () => {
        const manifest = {
            schemaVersion: 2,
            mediaType: 'application/vnd.oci.image.manifest.v1+json',
            config: {
                mediaType: 'application/vnd.oci.empty.v1+json',
                digest: 'sha256:empty',
            },
            layers: [
                {
                    mediaType:
                        'application/vnd.cncf.helm.chart.content.v1.tar+gzip',
                    digest: 'sha256:content',
                },
            ],
        };
        expect(isNonContainerArtifact(manifest)).toBe(true);
    });

    test('should identify generic non-container OCI artifact with non-container config.mediaType', () => {
        const manifest = {
            schemaVersion: 2,
            mediaType: 'application/vnd.oci.image.manifest.v1+json',
            config: {
                mediaType: 'application/vnd.oci.empty.v1+json',
                digest: 'sha256:empty',
            },
        };
        expect(isNonContainerArtifact(manifest)).toBe(true);
    });

    test('should identify generic non-container OCI artifact with artifactType set', () => {
        const manifest = {
            schemaVersion: 2,
            mediaType: 'application/vnd.oci.image.manifest.v1+json',
            artifactType: 'application/spdx+json',
        };
        expect(isNonContainerArtifact(manifest)).toBe(true);
    });

    test('should return true for index where all manifests are Helm artifacts', () => {
        const manifest = {
            schemaVersion: 2,
            mediaType: 'application/vnd.oci.image.index.v1+json',
            manifests: [
                {
                    artifactType: 'application/vnd.cncf.helm.chart.v1+json',
                    mediaType: 'application/vnd.oci.image.manifest.v1+json',
                    digest: 'sha256:helm1',
                },
                {
                    mediaType:
                        'application/vnd.cncf.helm.chart.content.v1.tar+gzip',
                    digest: 'sha256:helm2',
                },
            ],
        };
        expect(isNonContainerArtifact(manifest)).toBe(true);
    });

    test('should return false for multi-arch container manifest list', () => {
        const manifest = {
            schemaVersion: 2,
            mediaType:
                'application/vnd.docker.distribution.manifest.list.v2+json',
            manifests: [
                {
                    platform: { architecture: 'amd64', os: 'linux' },
                    mediaType:
                        'application/vnd.docker.distribution.manifest.v2+json',
                    digest: 'sha256:amd64',
                },
            ],
        };
        expect(isNonContainerArtifact(manifest)).toBe(false);
    });

    test('should return false for single-platform container image with docker image config', () => {
        const manifest = {
            schemaVersion: 2,
            mediaType: 'application/vnd.docker.distribution.manifest.v2+json',
            config: {
                mediaType: 'application/vnd.docker.container.image.v1+json',
                digest: 'sha256:config',
            },
        };
        expect(isNonContainerArtifact(manifest)).toBe(false);
    });

    test('should return false for single-platform container image with OCI image config', () => {
        const manifest = {
            schemaVersion: 2,
            mediaType: 'application/vnd.oci.image.manifest.v1+json',
            config: {
                mediaType: 'application/vnd.oci.image.config.v1+json',
                digest: 'sha256:config',
            },
        };
        expect(isNonContainerArtifact(manifest)).toBe(false);
    });

    test('should return false for legacy schemaVersion 1 image', () => {
        const manifest = {
            schemaVersion: 1,
            history: [{ v1Compatibility: '{}' }],
        };
        expect(isNonContainerArtifact(manifest)).toBe(false);
    });
});

describe('getImageManifestDigest with non-container OCI artifacts', () => {
    test('should throw UnsupportedArtifactError when manifest is a Helm chart via config mediaType', async () => {
        const registryMocked = new Registry();
        registryMocked.log = log;
        registryMocked.callRegistry = () => ({
            schemaVersion: 2,
            mediaType: 'application/vnd.oci.image.manifest.v1+json',
            config: {
                mediaType: 'application/vnd.cncf.helm.config.v1+json',
                digest: 'sha256:helmconfig',
            },
            layers: [
                {
                    mediaType:
                        'application/vnd.cncf.helm.chart.content.v1.tar+gzip',
                    digest: 'sha256:layer',
                },
            ],
        });

        await expect(
            registryMocked.getImageManifestDigest({
                name: 'helm-repo',
                architecture: 'amd64',
                os: 'linux',
                tag: { value: '0.1.0' },
                registry: { url: 'https://registry.example.com' },
            }),
        ).rejects.toThrow(UnsupportedArtifactError);
    });

    test('should throw UnsupportedArtifactError when manifest has Helm artifactType', async () => {
        const registryMocked = new Registry();
        registryMocked.log = log;
        registryMocked.callRegistry = () => ({
            schemaVersion: 2,
            mediaType: 'application/vnd.oci.image.manifest.v1+json',
            artifactType: 'application/vnd.cncf.helm.chart.v1+json',
            config: {
                mediaType: 'application/vnd.oci.empty.v1+json',
                digest: 'sha256:empty',
            },
        });

        await expect(
            registryMocked.getImageManifestDigest({
                name: 'helm-repo',
                architecture: 'amd64',
                os: 'linux',
                tag: { value: '0.1.0' },
                registry: { url: 'https://registry.example.com' },
            }),
        ).rejects.toThrow(UnsupportedArtifactError);
    });

    test('should throw UnsupportedArtifactError when index only contains Helm artifacts', async () => {
        const registryMocked = new Registry();
        registryMocked.log = log;
        registryMocked.callRegistry = () => ({
            schemaVersion: 2,
            mediaType: 'application/vnd.oci.image.index.v1+json',
            manifests: [
                {
                    artifactType: 'application/vnd.cncf.helm.chart.v1+json',
                    mediaType: 'application/vnd.oci.image.manifest.v1+json',
                    digest: 'sha256:helm1',
                },
            ],
        });

        await expect(
            registryMocked.getImageManifestDigest({
                name: 'helm-repo',
                architecture: 'amd64',
                os: 'linux',
                tag: { value: '0.1.0' },
                registry: { url: 'https://registry.example.com' },
            }),
        ).rejects.toThrow(UnsupportedArtifactError);
    });

    test('should filter out Helm artifacts in multi-arch index and find valid container manifest', async () => {
        const registryMocked = new Registry();
        registryMocked.log = log;
        registryMocked.callRegistry = (options) => {
            if (options.method === 'head') {
                return {
                    headers: {
                        'docker-content-digest':
                            'sha256:containerManifestDigest',
                    },
                };
            }
            return {
                schemaVersion: 2,
                mediaType: 'application/vnd.oci.image.index.v1+json',
                manifests: [
                    {
                        artifactType: 'application/vnd.cncf.helm.chart.v1+json',
                        mediaType: 'application/vnd.oci.image.manifest.v1+json',
                        digest: 'sha256:helmDigest',
                    },
                    {
                        platform: { architecture: 'amd64', os: 'linux' },
                        mediaType:
                            'application/vnd.docker.distribution.manifest.v2+json',
                        digest: 'sha256:containerDigest',
                    },
                ],
            };
        };

        const result = await registryMocked.getImageManifestDigest({
            name: 'mixed-repo',
            architecture: 'amd64',
            os: 'linux',
            tag: { value: '1.0.0' },
            registry: { url: 'https://registry.example.com' },
        });

        expect(result).toEqual({
            digest: 'sha256:containerManifestDigest',
            version: 2,
        });
    });
});

describe('getImageConfig with non-container OCI artifacts', () => {
    test('should throw UnsupportedArtifactError when config manifest is non-container artifact', async () => {
        const registryMocked = new Registry();
        registryMocked.log = log;
        registryMocked.callRegistry = () => ({
            schemaVersion: 2,
            mediaType: 'application/vnd.oci.image.manifest.v1+json',
            config: {
                mediaType: 'application/vnd.cncf.helm.config.v1+json',
                digest: 'sha256:helmconfig',
            },
        });

        await expect(
            registryMocked.getImageConfig(
                {
                    name: 'helm-repo',
                    registry: { url: 'https://registry.example.com' },
                },
                'sha256:manifestDigest',
            ),
        ).rejects.toThrow(UnsupportedArtifactError);
    });
});

describe('resolveCandidateTag', () => {
    const mockImage = {
        name: 'my-app',
        architecture: 'amd64',
        os: 'linux',
        tag: { value: '1.0.0' },
        registry: { url: 'https://registry.example.com' },
    };

    test('should return immediately with first candidate when candidate is a container image', async () => {
        const registryMocked = new Registry();
        registryMocked.getImageManifestDigest = jest.fn().mockResolvedValue({
            digest: 'sha256:containerDigest',
            version: 2,
        });

        const result = await resolveCandidateTag(registryMocked, mockImage, [
            '1.2.0',
            '1.1.0',
        ]);

        expect(result).toEqual({
            tag: '1.2.0',
            remoteDigest: {
                digest: 'sha256:containerDigest',
                version: 2,
            },
        });
        expect(registryMocked.getImageManifestDigest).toHaveBeenCalledTimes(1);
    });

    test('should skip Helm chart candidate tag and return next valid container tag', async () => {
        const registryMocked = new Registry();
        const logMock = { info: jest.fn(), warn: jest.fn(), debug: jest.fn() };

        registryMocked.getImageManifestDigest = jest
            .fn()
            .mockRejectedValueOnce(
                new UnsupportedArtifactError('Helm chart detected'),
            )
            .mockResolvedValueOnce({
                digest: 'sha256:validContainerDigest',
                version: 2,
            });

        const result = await resolveCandidateTag(
            registryMocked,
            mockImage,
            ['2.0.0', '1.9.0'],
            logMock,
        );

        expect(result).toEqual({
            tag: '1.9.0',
            remoteDigest: {
                digest: 'sha256:validContainerDigest',
                version: 2,
            },
        });
        expect(registryMocked.getImageManifestDigest).toHaveBeenCalledTimes(2);
        expect(logMock.info).toHaveBeenCalledWith(
            'Candidate tag 2.0.0 is a non-container OCI artifact, skipping',
        );
    });

    test('should return empty object when all candidate tags are Helm charts', async () => {
        const registryMocked = new Registry();
        const logMock = { info: jest.fn() };

        registryMocked.getImageManifestDigest = jest
            .fn()
            .mockRejectedValue(
                new UnsupportedArtifactError('Helm chart detected'),
            );

        const result = await resolveCandidateTag(
            registryMocked,
            mockImage,
            ['2.0.0', '1.9.0'],
            logMock,
        );

        expect(result).toEqual({});
        expect(registryMocked.getImageManifestDigest).toHaveBeenCalledTimes(2);
    });

    test('should return empty object when tagsCandidates is empty', async () => {
        const registryMocked = new Registry();
        registryMocked.getImageManifestDigest = jest.fn();

        const result = await resolveCandidateTag(registryMocked, mockImage, []);

        expect(result).toEqual({});
        expect(registryMocked.getImageManifestDigest).not.toHaveBeenCalled();
    });

    test('should fallback to candidate tag if registry does not implement getImageManifestDigest', async () => {
        const mockRegistryNoDigest = {};

        const result = await resolveCandidateTag(
            mockRegistryNoDigest,
            mockImage,
            ['2.0.0', '1.9.0'],
        );

        expect(result).toEqual({ tag: '2.0.0' });
    });

    test('should rethrow unexpected errors', async () => {
        const registryMocked = new Registry();
        registryMocked.getImageManifestDigest = jest
            .fn()
            .mockRejectedValue(new Error('Network error'));

        await expect(
            resolveCandidateTag(registryMocked, mockImage, ['2.0.0']),
        ).rejects.toThrow('Network error');
    });

    test('should invoke resolveCandidateTag via Registry method', async () => {
        const registryMocked = new Registry();
        registryMocked.getImageManifestDigest = jest.fn().mockResolvedValue({
            digest: 'sha256:digest1',
            version: 2,
        });

        const result = await registryMocked.resolveCandidateTag(mockImage, [
            '2.0.0',
        ]);

        expect(result).toEqual({
            tag: '2.0.0',
            remoteDigest: {
                digest: 'sha256:digest1',
                version: 2,
            },
        });
    });
});

describe('registry pull throttling', () => {
    const blockedPull = () => {
        let release;
        const done = new Promise((resolve) => {
            release = resolve;
        });
        return { run: () => done, release };
    };

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should validate an optional pull concurrency', () => {
        const registryMocked = new Registry();

        expect(
            registryMocked.validateConfiguration({ pullconcurrency: '2' }),
        ).toEqual({ concurrency: 2, pullconcurrency: 2 });
        expect(() =>
            registryMocked.validateConfiguration({ pullconcurrency: 0 }),
        ).toThrow();
        expect(() =>
            registryMocked.validateConfiguration({ pullconcurrency: 1.5 }),
        ).toThrow();
    });

    test('should run one pull at a time by default, in FIFO order', async () => {
        const registryMocked = new Registry();
        await registryMocked.register('registry', 'test', 'test', {});
        const started = [];
        const pulls = { first: blockedPull(), second: blockedPull() };
        const third = jest.fn().mockResolvedValue('third');

        const running = [
            registryMocked.withPullPermit(() => {
                started.push('first');
                return pulls.first.run();
            }),
            registryMocked.withPullPermit(() => {
                started.push('second');
                return pulls.second.run();
            }),
            registryMocked.withPullPermit(() => {
                started.push('third');
                return third();
            }),
        ];
        await new Promise(setImmediate);
        expect(started).toEqual(['first']);

        pulls.first.release();
        await new Promise(setImmediate);
        expect(started).toEqual(['first', 'second']);

        pulls.second.release();
        await Promise.all(running);
        expect(started).toEqual(['first', 'second', 'third']);
    });

    test('should honor a configured pull concurrency', async () => {
        const registryMocked = new Registry();
        await registryMocked.register('registry', 'test', 'test', {
            pullconcurrency: 2,
        });
        const pull = blockedPull();
        const started = jest.fn(() => pull.run());

        const running = [1, 2, 3].map(() =>
            registryMocked.withPullPermit(started),
        );
        await new Promise(setImmediate);
        expect(started).toHaveBeenCalledTimes(2);

        pull.release();
        await Promise.all(running);
        expect(started).toHaveBeenCalledTimes(3);
    });

    test('should hold back pulls while deferred, without shortening a deferral', async () => {
        const registryMocked = new Registry();
        await registryMocked.register('registry', 'test', 'test', {});
        jest.spyOn(Date, 'now').mockReturnValue(1000);
        const timeout = jest
            .spyOn(global, 'setTimeout')
            .mockImplementation((callback) => {
                callback();
                return 0;
            });

        registryMocked.deferPulls(5000);
        registryMocked.deferPulls(2000);
        await registryMocked.withPullPermit(async () => undefined);

        expect(timeout).toHaveBeenCalledWith(expect.any(Function), 5000);
    });

    test('should not wait when pulls are not deferred', async () => {
        const registryMocked = new Registry();
        await registryMocked.register('registry', 'test', 'test', {});
        const timeout = jest.spyOn(global, 'setTimeout');

        await expect(
            registryMocked.withPullPermit(async () => 'pulled'),
        ).resolves.toBe('pulled');
        expect(timeout).not.toHaveBeenCalled();
    });

    test('should release the pull slot when a pull fails', async () => {
        const registryMocked = new Registry();
        await registryMocked.register('registry', 'test', 'test', {});
        const failure = new Error('pull failed');

        await expect(
            registryMocked.withPullPermit(() => Promise.reject(failure)),
        ).rejects.toBe(failure);
        await expect(
            registryMocked.withPullPermit(async () => 'next'),
        ).resolves.toBe('next');
    });
});

describe('getHeaderContentType', () => {
    test('should return undefined when headers is not provided or not an object', () => {
        expect(getHeaderContentType(undefined)).toBeUndefined();
        expect(getHeaderContentType(null)).toBeUndefined();
        expect(getHeaderContentType('string')).toBeUndefined();
    });

    test('should return undefined when Content-Type header is missing', () => {
        expect(getHeaderContentType({})).toBeUndefined();
        expect(
            getHeaderContentType({ 'x-other-header': 'val' }),
        ).toBeUndefined();
    });

    test('should extract lowercase content type regardless of header casing', () => {
        expect(
            getHeaderContentType({
                'content-type': 'application/vnd.oci.image.index.v1+json',
            }),
        ).toBe('application/vnd.oci.image.index.v1+json');
        expect(
            getHeaderContentType({
                'Content-Type': 'APPLICATION/VND.OCI.IMAGE.INDEX.V1+JSON',
            }),
        ).toBe('application/vnd.oci.image.index.v1+json');
    });

    test('should strip parameters like charset from content type', () => {
        expect(
            getHeaderContentType({
                'content-type':
                    'application/vnd.oci.image.index.v1+json; charset=utf-8',
            }),
        ).toBe('application/vnd.oci.image.index.v1+json');
    });

    test('should handle array header values', () => {
        expect(
            getHeaderContentType({
                'content-type': ['application/vnd.oci.image.manifest.v1+json'],
            }),
        ).toBe('application/vnd.oci.image.manifest.v1+json');
    });
});

describe('parseNextLink', () => {
    test('should return undefined when link header is not provided or not a string', () => {
        expect(parseNextLink(undefined)).toBeUndefined();
        expect(parseNextLink(null as any)).toBeUndefined();
        expect(parseNextLink('')).toBeUndefined();
        expect(parseNextLink(123 as any)).toBeUndefined();
    });

    test('should parse standard RFC 5988 link header with rel="next"', () => {
        const link = '</v2/org/repo/tags/list?last=v1.0.0&n=1000>; rel="next"';
        expect(parseNextLink(link)).toBe(
            '/v2/org/repo/tags/list?last=v1.0.0&n=1000',
        );
    });

    test('should parse unquoted rel=next attribute', () => {
        const link = '<https://ghcr.io/v2/tags?last=abc>; rel=next';
        expect(parseNextLink(link)).toBe('https://ghcr.io/v2/tags?last=abc');
    });

    test('should extract rel="next" when multiple comma-separated links exist', () => {
        const link =
            '<https://example.com/v2/tags?page=1>; rel="first", <https://example.com/v2/tags?page=3>; rel="next", <https://example.com/v2/tags?page=5>; rel="last"';
        expect(parseNextLink(link)).toBe('https://example.com/v2/tags?page=3');
    });

    test('should return undefined when link header has no rel="next"', () => {
        const link =
            '<https://example.com/v2/tags?page=1>; rel="first", <https://example.com/v2/tags?page=1>; rel="prev"';
        expect(parseNextLink(link)).toBeUndefined();
    });

    test('should return undefined for malformed link header', () => {
        expect(parseNextLink('malformed header')).toBeUndefined();
        expect(parseNextLink('<https://example.com/tags>')).toBeUndefined();
    });

    test('should handle array of link headers', () => {
        const links = [
            '<https://example.com/prev>; rel="prev"',
            '<https://example.com/next>; rel="next"',
        ];
        expect(parseNextLink(links)).toBe('https://example.com/next');
    });

    test('should handle link with additional parameters', () => {
        const link =
            '</v2/tags?last=v2>; rel="next"; title="Next Page"; type="application/json"';
        expect(parseNextLink(link)).toBe('/v2/tags?last=v2');
    });
});

describe('resolveNextPageUrl', () => {
    const registryBaseUrl = 'https://ghcr.io/v2';
    const imageName = 'org/app';

    test('should resolve absolute http and https URLs', () => {
        expect(
            resolveNextPageUrl(
                registryBaseUrl,
                imageName,
                'https://ghcr.io/v2/org/app/tags/list?last=v1.0.0',
            ),
        ).toBe('https://ghcr.io/v2/org/app/tags/list?last=v1.0.0');

        expect(
            resolveNextPageUrl(
                'http://localhost:5000/v2',
                imageName,
                'http://localhost:5000/v2/org/app/tags/list?last=v1.0.0',
            ),
        ).toBe('http://localhost:5000/v2/org/app/tags/list?last=v1.0.0');
    });

    test('should resolve absolute paths with registry origin', () => {
        expect(
            resolveNextPageUrl(
                registryBaseUrl,
                imageName,
                '/v2/org/app/tags/list?last=v1.0.0&n=1000',
            ),
        ).toBe('https://ghcr.io/v2/org/app/tags/list?last=v1.0.0&n=1000');
    });

    test('should resolve query string parameters', () => {
        expect(
            resolveNextPageUrl(
                registryBaseUrl,
                imageName,
                '?last=v1.0.0&n=1000',
            ),
        ).toBe('https://ghcr.io/v2/org/app/tags/list?last=v1.0.0&n=1000');
    });

    test('should extract and resolve Link header wrapped in angle brackets', () => {
        expect(
            resolveNextPageUrl(
                registryBaseUrl,
                imageName,
                '</v2/org/app/tags/list?last=v1.0.0>; rel="next"',
            ),
        ).toBe('https://ghcr.io/v2/org/app/tags/list?last=v1.0.0');
    });

    test('should resolve relative path suffix', () => {
        expect(resolveNextPageUrl(registryBaseUrl, imageName, 'page2')).toBe(
            'https://ghcr.io/v2/org/app/tags/list/page2',
        );
    });
});

describe('hasTag', () => {
    let registryMocked: Registry;
    const testImage = {
        name: 'test/repo',
        registry: { url: 'https://registry.example.com/v2' },
    };

    beforeEach(() => {
        registryMocked = new Registry();
        registryMocked.log = log;
    });

    test('should return true when HEAD request succeeds with 200', async () => {
        registryMocked.callRegistry = jest.fn().mockResolvedValue({
            status: 200,
            headers: {},
        });

        const exists = await registryMocked.hasTag(testImage as any, 'v1.2.3');
        expect(exists).toBe(true);
        expect(registryMocked.callRegistry).toHaveBeenCalledWith(
            expect.objectContaining({
                method: 'head',
                url: 'https://registry.example.com/v2/test/repo/manifests/v1.2.3',
            }),
        );
    });

    test('should return false when HEAD request returns 404', async () => {
        const notFoundError: any = new Error('Not Found');
        notFoundError.response = { status: 404 };
        registryMocked.callRegistry = jest
            .fn()
            .mockRejectedValue(notFoundError);

        const exists = await registryMocked.hasTag(
            testImage as any,
            'unknown-tag',
        );
        expect(exists).toBe(false);
    });

    test('should rethrow on unexpected errors (e.g. 500, network error)', async () => {
        const serverError: any = new Error('Internal Server Error');
        serverError.response = { status: 500 };
        registryMocked.callRegistry = jest.fn().mockRejectedValue(serverError);

        await expect(
            registryMocked.hasTag(testImage as any, 'v1.0.0'),
        ).rejects.toThrow('Internal Server Error');
    });
});

describe('validateConfiguration for pagination, throttle, and cache options', () => {
    let registryMocked: Registry;

    beforeEach(() => {
        registryMocked = new Registry();
    });

    test('should validate valid maxpages, pagethrottle, and tagcachettl', () => {
        const validated = registryMocked.validateConfiguration({
            maxpages: 10,
            pagethrottle: 200,
            tagcachettl: 600,
        });

        expect(validated).toEqual({
            concurrency: 2,
            maxpages: 10,
            pagethrottle: 200,
            tagcachettl: 600,
        });
    });

    test('should allow zero for pagethrottle and tagcachettl', () => {
        const validated = registryMocked.validateConfiguration({
            pagethrottle: 0,
            tagcachettl: 0,
        });

        expect(validated).toEqual({
            concurrency: 2,
            pagethrottle: 0,
            tagcachettl: 0,
        });
    });

    test.each([0, -1, 1.5, 'invalid'])(
        'should reject invalid maxpages %s',
        (maxpages) => {
            expect(() =>
                registryMocked.validateConfiguration({ maxpages }),
            ).toThrow();
        },
    );

    test.each([-1, 1.5, 'invalid'])(
        'should reject invalid pagethrottle %s',
        (pagethrottle) => {
            expect(() =>
                registryMocked.validateConfiguration({ pagethrottle }),
            ).toThrow();
        },
    );

    test.each([-1, 1.5, 'invalid'])(
        'should reject invalid tagcachettl %s',
        (tagcachettl) => {
            expect(() =>
                registryMocked.validateConfiguration({ tagcachettl }),
            ).toThrow();
        },
    );
});

describe('getTags resilient pagination, caching, and rate limiting', () => {
    let registryMocked: Registry;
    const testImage = {
        name: 'test/repo',
        registry: { url: 'https://registry.example.com/v2' },
    };

    beforeEach(() => {
        registryMocked = new Registry();
        registryMocked.log = log;
        registryMocked.clearTagCache();
    });

    test('should follow RFC 5988 Link headers across multiple pages', async () => {
        let callCount = 0;
        registryMocked.getTagsPage = jest.fn().mockImplementation(() => {
            callCount += 1;
            if (callCount === 1) {
                return Promise.resolve({
                    data: { tags: ['v1.0.0', 'v1.1.0'] },
                    headers: {
                        link: '</v2/test/repo/tags/list?last=v1.1.0>; rel="next"',
                    },
                });
            }
            if (callCount === 2) {
                return Promise.resolve({
                    data: { tags: ['v1.2.0', 'v1.3.0'] },
                    headers: {},
                });
            }
            return Promise.resolve({ data: { tags: [] }, headers: {} });
        });

        const tags = await registryMocked.getTags(testImage as any);
        expect(callCount).toBe(2);
        expect(tags).toEqual(['v1.3.0', 'v1.2.0', 'v1.1.0', 'v1.0.0']);
    });

    test('should honor maxpages configuration ceiling', async () => {
        registryMocked.configuration = { maxpages: 2 };
        let callCount = 0;
        registryMocked.getTagsPage = jest.fn().mockImplementation(() => {
            callCount += 1;
            return Promise.resolve({
                data: { tags: [`v${callCount}.0.0`] },
                headers: {
                    link: `</v2/test/repo/tags/list?last=v${callCount}.0.0>; rel="next"`,
                },
            });
        });

        const tags = await registryMocked.getTags(testImage as any);
        expect(callCount).toBe(2);
        expect(tags).toEqual(['v2.0.0', 'v1.0.0']);
    });

    test('should apply pagethrottle delay between page requests', async () => {
        registryMocked.configuration = { pagethrottle: 50 };
        const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

        let callCount = 0;
        registryMocked.getTagsPage = jest.fn().mockImplementation(() => {
            callCount += 1;
            if (callCount === 1) {
                return Promise.resolve({
                    data: { tags: ['v1'] },
                    headers: {
                        link: '</v2/tags?last=v1>; rel="next"',
                    },
                });
            }
            return Promise.resolve({
                data: { tags: ['v2'] },
                headers: {},
            });
        });

        await registryMocked.getTags(testImage as any);
        expect(callCount).toBe(2);
        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 50);
        setTimeoutSpy.mockRestore();
    });

    test('should recover partial tags when 429 occurs on page 2+ after retries exhausted', async () => {
        const warnSpy = jest.spyOn(registryMocked.log, 'warn');
        let callCount = 0;
        registryMocked.getTagsPage = jest.fn().mockImplementation(() => {
            callCount += 1;
            if (callCount === 1) {
                return Promise.resolve({
                    data: { tags: ['v1.0.0', 'v1.1.0'] },
                    headers: {
                        link: '</v2/tags?last=v1.1.0>; rel="next"',
                    },
                });
            }
            const rateLimitError: any = new Error('Too Many Requests');
            rateLimitError.response = { status: 429 };
            return Promise.reject(rateLimitError);
        });

        const tags = await registryMocked.getTags(testImage as any);
        expect(tags).toEqual(['v1.1.0', 'v1.0.0']);
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining(
                'Rate limit reached for test/repo after 1 pages; returning 2 partial tags',
            ),
        );
    });

    test('should rethrow 429 error when failure occurs on page 1 (zero tags collected)', async () => {
        const rateLimitError: any = new Error('Too Many Requests');
        rateLimitError.response = { status: 429 };
        registryMocked.getTagsPage = jest
            .fn()
            .mockRejectedValue(rateLimitError);

        await expect(registryMocked.getTags(testImage as any)).rejects.toThrow(
            'Too Many Requests',
        );
    });

    test('should cache tags and return from cache on subsequent call within TTL', async () => {
        registryMocked.configuration = { tagcachettl: 300 };
        const getTagsPageMock = jest.fn().mockResolvedValue({
            data: { tags: ['v1.0.0', 'v2.0.0'] },
            headers: {},
        });
        registryMocked.getTagsPage = getTagsPageMock;

        const firstCall = await registryMocked.getTags(testImage as any);
        expect(firstCall).toEqual(['v2.0.0', 'v1.0.0']);
        expect(getTagsPageMock).toHaveBeenCalledTimes(1);

        // Second call should hit the cache without calling getTagsPage
        const secondCall = await registryMocked.getTags(testImage as any);
        expect(secondCall).toEqual(['v2.0.0', 'v1.0.0']);
        expect(getTagsPageMock).toHaveBeenCalledTimes(1);
    });

    test('should refetch tags after tag cache TTL expires', async () => {
        registryMocked.configuration = { tagcachettl: 10 };
        const getTagsPageMock = jest.fn().mockResolvedValue({
            data: { tags: ['v1.0.0'] },
            headers: {},
        });
        registryMocked.getTagsPage = getTagsPageMock;

        const dateNowSpy = jest.spyOn(Date, 'now');
        dateNowSpy.mockReturnValue(1000000);
        await registryMocked.getTags(testImage as any);
        expect(getTagsPageMock).toHaveBeenCalledTimes(1);

        // Advance beyond TTL (10s = 10000ms)
        dateNowSpy.mockReturnValue(1000000 + 15000);
        await registryMocked.getTags(testImage as any);
        expect(getTagsPageMock).toHaveBeenCalledTimes(2);

        dateNowSpy.mockRestore();
    });

    test('should clear cache when clearTagCache() is called', async () => {
        registryMocked.configuration = { tagcachettl: 300 };
        const getTagsPageMock = jest.fn().mockResolvedValue({
            data: { tags: ['v1.0.0'] },
            headers: {},
        });
        registryMocked.getTagsPage = getTagsPageMock;

        await registryMocked.getTags(testImage as any);
        expect(getTagsPageMock).toHaveBeenCalledTimes(1);

        registryMocked.clearTagCache();

        await registryMocked.getTags(testImage as any);
        expect(getTagsPageMock).toHaveBeenCalledTimes(2);
    });
});
