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

function readLabel(
    labels: Record<string, unknown> | undefined,
    key: string,
): string | undefined {
    const value = labels?.[key];
    return typeof value === 'string' && value.trim() !== ''
        ? value.trim()
        : undefined;
}

/**
 * Return the upstream image reference declared on a container, if any.
 * The WUD label (container labels only) wins over the OCI base image
 * annotation, which is read from the container labels first and then from
 * the image config labels (Docker copies image labels onto the container,
 * but an annotation may only be present on the image config).
 */
export function getUpstreamImageRef(
    labels: Record<string, unknown> | undefined,
    imageLabels?: Record<string, unknown> | undefined,
): UpstreamImageRef | undefined {
    for (const key of UPSTREAM_IMAGE_LABEL_KEYS) {
        const value = readLabel(labels, key);
        if (value) {
            return { ref: value, source: 'label' };
        }
    }
    const ociValue =
        readLabel(labels, OCI_BASE_IMAGE_LABEL) ??
        readLabel(imageLabels, OCI_BASE_IMAGE_LABEL);
    if (ociValue) {
        return { ref: ociValue, source: 'oci' };
    }
    return undefined;
}

/**
 * Same as getUpstreamImageRef but only returns a reference WUD can actually
 * use (parsable image reference). An invalid declaration is ignored by the
 * watcher, so it must not influence digest watching or cache invalidation.
 */
export function getValidUpstreamImageRef(
    labels: Record<string, unknown> | undefined,
    imageLabels?: Record<string, unknown> | undefined,
): UpstreamImageRef | undefined {
    const ref = getUpstreamImageRef(labels, imageLabels);
    if (!ref || !parseUpstreamImageRef(ref.ref)) {
        return undefined;
    }
    return ref;
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
