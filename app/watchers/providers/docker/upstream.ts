import parse from 'parse-docker-image-name';

/**
 * Label keys (by precedence) a user can set to point WUD at the upstream
 * image a locally built container derives from.
 */
export const UPSTREAM_IMAGE_LABEL_KEYS = [
    'wud.image.name',
    'getwud.app/image.name',
    'wud/image.name',
    'wud.getwud.io/image.name',
];

/**
 * Standard OCI annotation describing the base image an image was built from.
 * Used as a fallback when no WUD label is set.
 */
export const OCI_BASE_IMAGE_LABEL = 'org.opencontainers.image.base.name';

export type UpstreamImageSource = 'label' | 'oci';

export interface UpstreamImageRef {
    /** Raw image reference as found on the container. */
    ref: string;
    /** Where the reference comes from. */
    source: UpstreamImageSource;
}

export interface ParsedUpstreamImage {
    /** Registry domain (empty string when implicit, e.g. Docker Hub). */
    domain: string;
    /** Repository path (e.g. `library/caddy`). */
    path: string;
    /** Tag when the reference carries one. */
    tag?: string;
}

/**
 * Return the upstream image reference declared on a container, if any.
 * The WUD label wins over the OCI base image annotation.
 */
export function getUpstreamImageRef(
    labels: Record<string, unknown> | undefined,
): UpstreamImageRef | undefined {
    if (!labels) {
        return undefined;
    }
    for (const key of UPSTREAM_IMAGE_LABEL_KEYS) {
        const value = labels[key];
        if (typeof value === 'string' && value.trim() !== '') {
            return { ref: value.trim(), source: 'label' };
        }
    }
    const ociValue = labels[OCI_BASE_IMAGE_LABEL];
    if (typeof ociValue === 'string' && ociValue.trim() !== '') {
        return { ref: ociValue.trim(), source: 'oci' };
    }
    return undefined;
}

/**
 * Parse an upstream image reference into registry domain, path and tag.
 * A pinned digest (`@sha256:...`) is dropped: WUD looks the upstream up by
 * tag, not by digest. Returns undefined when the reference is not parsable.
 */
export function parseUpstreamImageRef(
    ref: string,
): ParsedUpstreamImage | undefined {
    if (!ref || typeof ref !== 'string') {
        return undefined;
    }
    let reference = ref.trim();
    const atIndex = reference.indexOf('@');
    if (atIndex !== -1) {
        reference = reference.substring(0, atIndex);
    }
    if (reference === '') {
        return undefined;
    }
    const parsed = parse(reference) as
        | { domain?: string; path?: string; tag?: string }
        | undefined;
    if (!parsed || !parsed.path) {
        return undefined;
    }
    return {
        domain: parsed.domain || '',
        path: parsed.path,
        tag: parsed.tag || undefined,
    };
}
