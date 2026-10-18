import joi from 'joi';
import flat from 'flat';
import { snakeCase } from 'snake-case';
import * as tag from '../tag';
const { parse: parseSemver, diff: diffSemver, transform: transformTag } = tag;

export interface ContainerImage {
    id: string;
    registry: {
        name: string;
        url: string;
    };
    name: string;
    tag: {
        value: string;
        semver: boolean;
    };
    digest: {
        watch: boolean;
        value?: string;
        repo?: string;
    };
    architecture: string;
    os: string;
    variant?: string;
    created?: string;
}

export interface ContainerResult {
    tag?: string;
    digest?: string;
    created?: string;
    version?: string;
    link?: string;
    hook?: {
        phase: string;
        parentTrigger: string;
    };
}

export interface ContainerUpdateKind {
    kind: 'tag' | 'digest' | 'unknown';
    localValue?: string;
    remoteValue?: string;
    semverDiff?: 'major' | 'minor' | 'patch' | 'prerelease' | 'unknown';
}

export interface Container {
    id: string;
    name: string;
    displayName: string;
    displayIcon: string;
    status: string;
    watcher: string;
    isOfficial?: boolean;
    documentationUrl?: string;
    changelogUrl?: string;
    upstreamUrl?: string;
    stack?: string;
    delay?: string;
    isCoolingDown?: boolean;
    coolingDownUntil?: number;
    includeTags?: string;
    excludeTags?: string;
    transformTags?: string;
    linkTemplate?: string;
    link?: string;
    triggerInclude?: string;
    triggerExclude?: string;
    image: ContainerImage;
    result?: ContainerResult;
    error?: {
        message: string;
    };
    updateAvailable: boolean;
    updateKind: ContainerUpdateKind;
    labels?: Record<string, string>;
    resultChanged?: (otherContainer: Container | undefined) => boolean;
    snoozedVersion?: string;
    snoozedUntil?: number;
    isSnoozed?: boolean;
}

/**
 * Parse human duration string into milliseconds.
 * Supports units: s (seconds), m (minutes), h (hours), d (days), w (weeks), or raw ms.
 *
 * @param duration string | number | undefined
 * @returns number | undefined
 */
export function parseDurationMs(
    duration: string | number | undefined,
): number | undefined {
    if (duration === undefined || duration === null) {
        return undefined;
    }
    if (typeof duration === 'number') {
        return !isNaN(duration) && duration >= 0 ? duration : undefined;
    }
    const trimmed = String(duration).trim();
    if (trimmed === '') {
        return undefined;
    }
    if (/^\d+$/.test(trimmed)) {
        const parsed = parseInt(trimmed, 10);
        return !isNaN(parsed) && parsed >= 0 ? parsed : undefined;
    }
    const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)$/);
    if (!match) {
        return undefined;
    }
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    switch (unit) {
        case 's':
        case 'sec':
        case 'second':
        case 'seconds':
            return Math.round(value * 1000);
        case 'm':
        case 'min':
        case 'minute':
        case 'minutes':
            return Math.round(value * 60 * 1000);
        case 'h':
        case 'hr':
        case 'hour':
        case 'hours':
            return Math.round(value * 60 * 60 * 1000);
        case 'd':
        case 'day':
        case 'days':
            return Math.round(value * 24 * 60 * 60 * 1000);
        case 'w':
        case 'week':
        case 'weeks':
            return Math.round(value * 7 * 24 * 60 * 60 * 1000);
        case 'ms':
        case 'millis':
        case 'millisecond':
        case 'milliseconds':
            return Math.round(value);
        default:
            return undefined;
    }
}

// Container data schema
const schema = joi.object({
    id: joi.string().min(1).required(),
    name: joi.string().min(1).required(),
    displayName: joi.string().default(joi.ref('name')),
    displayIcon: joi.string().default('mdi:docker'),
    status: joi.string().default('unknown'),
    watcher: joi.string().min(1).required(),
    isOfficial: joi.boolean().default(false),
    documentationUrl: joi.string().uri().optional().allow(''),
    changelogUrl: joi.string().uri().optional().allow(''),
    upstreamUrl: joi.string().uri().optional().allow(''),
    stack: joi.string().allow('').optional(),
    delay: joi.string().allow('', null).optional(),
    isCoolingDown: joi.boolean().default(false),
    coolingDownUntil: joi.number().optional(),
    includeTags: joi.string(),
    excludeTags: joi.string(),
    transformTags: joi.string(),
    linkTemplate: joi.string(),
    link: joi.string(),
    triggerInclude: joi.string(),
    triggerExclude: joi.string(),
    snoozedVersion: joi.string().allow('', null).optional(),
    snoozedUntil: joi.number().integer().allow(null).optional(),
    isSnoozed: joi.boolean().optional(),
    image: joi
        .object({
            id: joi.string().min(1).required(),
            registry: joi
                .object({
                    name: joi.string().min(1).required(),
                    url: joi.string().min(1).required(),
                })
                .required(),
            name: joi.string().min(1).required(),
            tag: joi
                .object({
                    value: joi.string().min(1).required(),
                    semver: joi.boolean().default(false),
                })
                .required(),
            digest: joi
                .object({
                    watch: joi.boolean().default(false),
                    value: joi.string(),
                    repo: joi.string(),
                })
                .required(),
            architecture: joi.string().min(1).required(),
            os: joi.string().min(1).required(),
            variant: joi.string(),
            created: joi.string().isoDate(),
        })
        .required(),
    result: joi.object({
        tag: joi.string().min(1),
        digest: joi.string(),
        created: joi.string().isoDate(),
        version: joi.string(),
        link: joi.string(),
        hook: joi.object({
            phase: joi.string().valid('pre', 'post'),
            parentTrigger: joi.string(),
        }),
    }),
    error: joi.object({
        message: joi.string().min(1).required(),
    }),
    updateAvailable: joi.boolean().default(false),
    updateKind: joi
        .object({
            kind: joi.string().allow('tag', 'digest', 'unknown').required(),
            localValue: joi.string(),
            remoteValue: joi.string(),
            semverDiff: joi
                .string()
                .allow('major', 'minor', 'patch', 'prerelease', 'unknown'),
        })
        .default({ kind: 'unknown' }),
    resultChanged: joi.function(),
    labels: joi.object(),
});

const CHANGELOG_LABEL_KEYS = [
    'wud.link.changelog',
    'getwud.app/link.changelog',
    'wud/link.changelog',
    'wud.getwud.io/link.changelog',
];
const UPSTREAM_LABEL_KEYS = [
    'wud.link.upstream',
    'getwud.app/link.upstream',
    'wud/link.upstream',
    'wud.getwud.io/link.upstream',
];
const DOC_LABEL_KEYS = [
    'wud.link.doc',
    'getwud.app/link.doc',
    'wud/link.doc',
    'wud.getwud.io/link.doc',
];
const TEMPLATE_LABEL_KEYS = [
    'wud.link.template',
    'getwud.app/link.template',
    'wud/link.template',
    'wud.getwud.io/link.template',
];

function getFirstLabel(
    labels: Record<string, string> | undefined,
    keys: string[],
): string | undefined {
    if (!labels) return undefined;
    for (const key of keys) {
        const val = labels[key];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
            return String(val).trim();
        }
    }
    return undefined;
}

/**
 * Check whether an image is an official Docker Hub image.
 *
 * An image is considered official if:
 * 1. The registry is Docker Hub (registry.name === 'hub' or docker.io).
 * 2. The image name does not include a slash (e.g. postgres, redis, nginx),
 *    OR starts explicitly with library/ (e.g. library/postgres).
 * 3. It does not contain a private registry domain/port.
 *
 * @param image ContainerImage
 * @returns boolean
 */
export function isDockerOfficialImage(image: ContainerImage): boolean {
    if (!image || !image.name) {
        return false;
    }
    const registryName = image.registry?.name?.toLowerCase();
    const registryUrl = image.registry?.url?.toLowerCase() || '';
    const isHub = registryName === 'hub' || registryUrl.includes('docker.io');
    if (!isHub) {
        return false;
    }
    const cleanName = image.name.trim().toLowerCase();
    if (cleanName.startsWith('library/')) {
        const repo = cleanName.slice('library/'.length);
        return repo.length > 0 && !repo.includes('/');
    }
    return cleanName.length > 0 && !cleanName.includes('/');
}

/**
 * Render a link template string with container variables.
 *
 * @param template string | undefined
 * @param container Container
 * @param originalTagValue string
 * @returns string | undefined
 */
export function renderLinkTemplate(
    template: string | undefined,
    container: Container,
    originalTagValue?: string,
): string | undefined {
    if (!template || typeof template !== 'string') {
        return undefined;
    }
    const trimmed = template.trim();
    if (!trimmed.includes('${')) {
        return trimmed;
    }

    const currentTag =
        originalTagValue !== undefined
            ? originalTagValue
            : container.image?.tag?.value || '';

    // Export vars for dynamic template interpolation
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const raw = currentTag; // deprecated, kept for backward compatibility
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const original = currentTag;
    const transformed =
        container.transformTags && currentTag
            ? transformTag(container.transformTags, currentTag, container)
            : currentTag;
    let major = '';
    let minor = '';
    let patch = '';
    let prerelease = '';

    if (container.image?.tag?.semver && transformed) {
        const versionSemver = parseSemver(transformed);
        if (versionSemver) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            major = String(versionSemver.major);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            minor = String(versionSemver.minor);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            patch = String(versionSemver.patch);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            prerelease =
                versionSemver.prerelease && versionSemver.prerelease.length > 0
                    ? String(versionSemver.prerelease[0])
                    : '';
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const image = container.image;

    try {
        return eval('`' + trimmed + '`');
    } catch {
        return trimmed;
    }
}

/**
 * Resolve container rich metadata adhering to precedence:
 * 1) Explicit local container labels / annotations
 * 2) Standalone defaults (official Docker Hub images)
 * 3) Backward-compatibility link fallback
 */
export function resolveContainerMetadata(container: Container): Container {
    if (!container) {
        return container;
    }
    const labels = container.labels || {};
    const image = container.image;

    // 1. isOfficial resolution
    let isOfficial = false;
    if (container.isOfficial) {
        isOfficial = true;
    } else if (image) {
        isOfficial = isDockerOfficialImage(image);
    }
    container.isOfficial = isOfficial;

    // 2. changelogUrl resolution
    const rawChangelog =
        container.changelogUrl || getFirstLabel(labels, CHANGELOG_LABEL_KEYS);
    const resolvedChangelog = renderLinkTemplate(rawChangelog, container);
    container.changelogUrl = resolvedChangelog || undefined;

    // 3. upstreamUrl resolution
    const rawUpstream =
        container.upstreamUrl || getFirstLabel(labels, UPSTREAM_LABEL_KEYS);
    const resolvedUpstream = renderLinkTemplate(rawUpstream, container);
    container.upstreamUrl = resolvedUpstream || undefined;

    // 4. documentationUrl resolution
    const rawDoc =
        container.documentationUrl ||
        getFirstLabel(labels, DOC_LABEL_KEYS) ||
        getFirstLabel(labels, TEMPLATE_LABEL_KEYS) ||
        container.linkTemplate;
    let resolvedDoc = renderLinkTemplate(rawDoc, container);
    if (!resolvedDoc && container.isOfficial && image?.name) {
        const repoName = image.name.trim().replace(/^library\//, '');
        if (repoName) {
            resolvedDoc = `https://hub.docker.com/_/${repoName}`;
        }
    }
    container.documentationUrl = resolvedDoc || undefined;

    // 5. Historical link fallback: documentationUrl || upstreamUrl || link
    if (!container.linkTemplate) {
        const descriptor = Object.getOwnPropertyDescriptor(container, 'link');
        if (!descriptor || descriptor.writable || descriptor.set) {
            container.link =
                container.documentationUrl ||
                container.upstreamUrl ||
                container.link;
        }
    }

    return container;
}

/**
 * Render Link template.
 * @param container
 * @returns {undefined|*}
 */
function getLink(container: Container, originalTagValue: string) {
    if (!container || !container.linkTemplate) {
        return undefined;
    }
    return renderLinkTemplate(
        container.linkTemplate,
        container,
        originalTagValue,
    );
}

/**
 * Computed isSnoozed property.
 * @param container
 */
function addIsSnoozedProperty(container: Container) {
    Object.defineProperty(container, 'isSnoozed', {
        enumerable: true,
        get(this: Container) {
            if (!this.snoozedVersion || !this.result) {
                return false;
            }
            const candidateMatches =
                this.snoozedVersion === this.result.tag ||
                this.snoozedVersion === this.result.digest;
            const timeValid =
                !this.snoozedUntil || Date.now() < this.snoozedUntil;
            return Boolean(candidateMatches && timeValid);
        },
    });
}

/**
 * Check whether a candidate update exists (different tag, digest, or created date).
 * @param container
 * @returns {boolean}
 */
function isCandidateUpdateAvailable(container: Container): boolean {
    if (container.image === undefined || container.result === undefined) {
        return false;
    }

    // Compare digests if we have them
    if (
        container.image.digest.watch &&
        container.image.digest.value !== undefined &&
        container.result.digest !== undefined
    ) {
        return container.image.digest.value !== container.result.digest;
    }

    // Compare tags otherwise
    let updateAvailable = false;
    if (
        container.result.tag !== undefined &&
        container.result.tag !== null &&
        container.result.tag !== ''
    ) {
        const localTag = transformTag(
            container.transformTags,
            container.image.tag.value,
            container,
        );
        const remoteTag = transformTag(
            container.transformTags,
            container.result.tag,
            container,
        );
        updateAvailable = localTag !== remoteTag;
    }

    // Fallback to image created date (especially for legacy v1 manifests)
    if (
        container.image.created !== undefined &&
        container.result.created !== undefined
    ) {
        const createdDate = new Date(container.image.created).getTime();
        const createdDateResult = new Date(container.result.created!).getTime();

        updateAvailable = updateAvailable || createdDate !== createdDateResult;
    }
    return updateAvailable;
}

/**
 * Computed function to check whether there is an update.
 * @param container
 * @returns {boolean}
 */
function addUpdateAvailableProperty(container: Container) {
    Object.defineProperty(container, 'coolingDownUntil', {
        enumerable: true,
        get(this: Container) {
            if (!this.delay || !this.result?.created) {
                return undefined;
            }
            const delayMs = parseDurationMs(this.delay);
            if (delayMs === undefined) {
                return undefined;
            }
            const createdDate = new Date(this.result.created).getTime();
            if (isNaN(createdDate)) {
                return undefined;
            }
            return createdDate + delayMs;
        },
    });

    Object.defineProperty(container, 'isCoolingDown', {
        enumerable: true,
        get(this: Container) {
            if (this.coolingDownUntil === undefined) {
                return false;
            }
            if (Date.now() >= this.coolingDownUntil) {
                return false;
            }
            return isCandidateUpdateAvailable(this);
        },
    });

    Object.defineProperty(container, 'updateAvailable', {
        enumerable: true,
        get(this: Container) {
            if (this.isCoolingDown) {
                return false;
            }
            if (this.isSnoozed) {
                return false;
            }
            return isCandidateUpdateAvailable(this);
        },
    });
}

/**
 * Computed link property.
 * @param container
 * @returns {undefined|*}
 */
function addLinkProperty(container: Container) {
    if (container.linkTemplate) {
        Object.defineProperty(container, 'link', {
            enumerable: true,
            configurable: true,
            get(this: Container) {
                return (
                    getLink(container, container.image?.tag?.value || '') ||
                    this.documentationUrl ||
                    this.upstreamUrl
                );
            },
            set(_val: string) {
                // No-op setter to avoid 'only a getter' errors
            },
        });

        if (container.result) {
            Object.defineProperty(container.result, 'link', {
                enumerable: true,
                configurable: true,
                get() {
                    return getLink(container, container.result?.tag ?? '');
                },
                set(_val: string) {
                    // No-op setter to avoid 'only a getter' errors
                },
            });
        }
    } else if (!container.link) {
        container.link = container.documentationUrl || container.upstreamUrl;
    }
}

/**
 * Computed updateKind property.
 * @param container
 * @returns {{semverDiff: undefined, kind: string, remoteValue: undefined, localValue: undefined}}
 */
function addUpdateKindProperty(container: Container) {
    Object.defineProperty(container, 'updateKind', {
        enumerable: true,
        get(this: Container) {
            const updateKind: ContainerUpdateKind = {
                kind: 'unknown',
                localValue: undefined,
                remoteValue: undefined,
                semverDiff: undefined,
            };
            if (
                container.image === undefined ||
                container.result === undefined
            ) {
                return updateKind;
            }
            if (!container.updateAvailable) {
                return updateKind;
            }

            if (
                container.image !== undefined &&
                container.result !== undefined &&
                container.updateAvailable
            ) {
                if (
                    container.result.tag !== undefined &&
                    container.result.tag !== null &&
                    container.result.tag !== '' &&
                    container.image.tag.value !== container.result.tag
                ) {
                    updateKind.kind = 'tag';
                    let semverDiffWud: ContainerUpdateKind['semverDiff'] =
                        'unknown';
                    const isSemver = container.image.tag.semver;
                    if (isSemver) {
                        const semverDiff = diffSemver(
                            transformTag(
                                container.transformTags,
                                container.image.tag.value,
                                container,
                            ),
                            transformTag(
                                container.transformTags,
                                container.result.tag,
                                container,
                            ),
                        );
                        switch (semverDiff) {
                            case 'major':
                            case 'premajor':
                                semverDiffWud = 'major';
                                break;
                            case 'minor':
                            case 'preminor':
                                semverDiffWud = 'minor';
                                break;
                            case 'patch':
                            case 'prepatch':
                                semverDiffWud = 'patch';
                                break;
                            case 'prerelease':
                                semverDiffWud = 'prerelease';
                                break;
                            default:
                                semverDiffWud = 'unknown';
                        }
                    }
                    updateKind.localValue = container.image.tag.value;
                    updateKind.remoteValue = container.result.tag;
                    updateKind.semverDiff = semverDiffWud;
                } else if (
                    container.image.digest &&
                    container.image.digest.value !== container.result.digest
                ) {
                    updateKind.kind = 'digest';
                    updateKind.localValue = container.image.digest.value;
                    updateKind.remoteValue = container.result.digest;
                }
            }
            return updateKind;
        },
    });
}

/**
 * Computed function to check whether the result is different.
 * @param otherContainer
 * @returns {boolean}
 */
function resultChangedFunction(
    this: Container,
    otherContainer: Container | undefined,
) {
    return (
        otherContainer === undefined ||
        this.result?.tag !== otherContainer.result?.tag ||
        this.result?.digest !== otherContainer.result?.digest ||
        this.result?.created !== otherContainer.result?.created
    );
}

/**
 * Add computed function to check whether the result is different.
 * @param container
 * @returns {*}
 */
function addResultChangedFunction(container: Container) {
    const containerWithResultChanged = container;
    containerWithResultChanged.resultChanged = resultChangedFunction;
    return containerWithResultChanged;
}

/**
 * Apply validation to the container object.
 * @param container
 * @returns {*}
 */
export function validate(container: any): Container {
    if (container && typeof container === 'object') {
        resolveContainerMetadata(container as Container);
    }
    const validation = schema.validate(container);
    if (validation.error) {
        throw new Error(
            `Error when validating container properties ${validation.error}`,
        );
    }
    const containerValidated = validation.value as Container;

    // Add computed properties
    addIsSnoozedProperty(containerValidated);
    addUpdateAvailableProperty(containerValidated);
    addUpdateKindProperty(containerValidated);
    addLinkProperty(containerValidated);

    // Add computed functions
    addResultChangedFunction(containerValidated);
    return containerValidated;
}

/**
 * Flatten the container object (useful for k/v based integrations).
 * @param container
 * @returns {*}
 */
export function flatten(container: Container) {
    const containerFlatten: any = flat(container, {
        delimiter: '_',
        transformKey: (key: string) => snakeCase(key),
    });
    delete containerFlatten.result_changed;
    return containerFlatten;
}

/**
 * Build the business id of the container.
 * @param container
 * @returns {string}
 */
export function fullName(container: Container) {
    return `${container.watcher}_${container.name}`;
}

// The following exports are meant for testing only
export {
    getLink as testable_getLink,
    addUpdateKindProperty as testable_addUpdateKindProperty,
};
