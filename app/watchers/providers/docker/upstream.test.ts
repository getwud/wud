import {
    getUpstreamImageRef,
    parseUpstreamImageRef,
    OCI_BASE_IMAGE_LABEL,
} from './upstream';

describe('getUpstreamImageRef', () => {
    test('returns undefined without labels', () => {
        expect(getUpstreamImageRef(undefined)).toBeUndefined();
        expect(getUpstreamImageRef({})).toBeUndefined();
    });

    test('reads the wud label', () => {
        expect(getUpstreamImageRef({ 'wud.image.name': ' caddy ' })).toEqual({
            ref: 'caddy',
            source: 'label',
        });
    });

    test('reads the orchestrator-prefixed label', () => {
        expect(
            getUpstreamImageRef({ 'getwud.app/image.name': 'ghcr.io/foo/bar' }),
        ).toEqual({ ref: 'ghcr.io/foo/bar', source: 'label' });
    });

    test('falls back to the OCI base image annotation', () => {
        expect(
            getUpstreamImageRef({
                [OCI_BASE_IMAGE_LABEL]: 'docker.io/library/caddy:2.9.1-alpine',
            }),
        ).toEqual({
            ref: 'docker.io/library/caddy:2.9.1-alpine',
            source: 'oci',
        });
    });

    test('prefers the wud label over the OCI annotation', () => {
        expect(
            getUpstreamImageRef({
                [OCI_BASE_IMAGE_LABEL]: 'docker.io/library/caddy:2.9.1-alpine',
                'wud.image.name': 'caddy',
            }),
        ).toEqual({ ref: 'caddy', source: 'label' });
    });

    test('ignores empty or non-string values', () => {
        expect(
            getUpstreamImageRef({
                'wud.image.name': '  ',
                [OCI_BASE_IMAGE_LABEL]: 42 as unknown as string,
            }),
        ).toBeUndefined();
    });
});

describe('parseUpstreamImageRef', () => {
    test('parses a bare image name', () => {
        expect(parseUpstreamImageRef('caddy')).toEqual({
            domain: '',
            path: 'caddy',
            tag: undefined,
        });
    });

    test('parses name and tag', () => {
        expect(parseUpstreamImageRef('caddy:2.9.1-alpine')).toEqual({
            domain: '',
            path: 'caddy',
            tag: '2.9.1-alpine',
        });
    });

    test('parses a fully qualified reference', () => {
        expect(
            parseUpstreamImageRef('docker.io/library/caddy:2.9.1-alpine'),
        ).toEqual({
            domain: 'docker.io',
            path: 'library/caddy',
            tag: '2.9.1-alpine',
        });
    });

    test('parses a registry with port', () => {
        expect(parseUpstreamImageRef('localhost:5000/x/y:1')).toEqual({
            domain: 'localhost:5000',
            path: 'x/y',
            tag: '1',
        });
    });

    test('drops a pinned digest', () => {
        expect(
            parseUpstreamImageRef('ghcr.io/foo/bar:1.2@sha256:abcdef'),
        ).toEqual({ domain: 'ghcr.io', path: 'foo/bar', tag: '1.2' });
        expect(parseUpstreamImageRef('ghcr.io/foo/bar@sha256:abcdef')).toEqual({
            domain: 'ghcr.io',
            path: 'foo/bar',
            tag: undefined,
        });
    });

    test('returns undefined for unparsable input', () => {
        expect(parseUpstreamImageRef('')).toBeUndefined();
        expect(parseUpstreamImageRef('   ')).toBeUndefined();
        expect(parseUpstreamImageRef('@sha256:abc')).toBeUndefined();
        expect(
            parseUpstreamImageRef(undefined as unknown as string),
        ).toBeUndefined();
    });
});
