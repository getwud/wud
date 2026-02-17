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
    link?: string;
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
}

// Container data schema
const schema = joi.object({
    id: joi.string().min(1).required(),
    name: joi.string().min(1).required(),
    displayName: joi.string().default(joi.ref('name')),
    displayIcon: joi.string().default('mdi:docker'),
    status: joi.string().default('unknown'),
    watcher: joi.string().min(1).required(),
    includeTags: joi.string(),
    excludeTags: joi.string(),
    transformTags: joi.string(),
    linkTemplate: joi.string(),
    link: joi.string(),
    triggerInclude: joi.string(),
    triggerExclude: joi.string(),
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
        link: joi.string(),
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

/**
 * Render Link template.
 * @param container
 * @returns {undefined|*}
 */
function getLink(container: Container, originalTagValue: string) {
    if (!container || !container.linkTemplate) {
        return undefined;
    }

    // Export vars for dynamic template interpolation
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const raw = originalTagValue; // deprecated, kept for backward compatibility
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const original = originalTagValue;
    const transformed = container.transformTags
        ? transformTag(container.transformTags, originalTagValue)
        : originalTagValue;
    let major = '';
    let minor = '';
    let patch = '';
    let prerelease = '';

    if (container.image.tag.semver) {
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

    return eval('`' + container.linkTemplate + '`');
}

/**
 * Computed function to check whether there is an update.
 * @param container
 * @returns {boolean}
 */
function addUpdateAvailableProperty(container: Container) {
    Object.defineProperty(container, 'updateAvailable', {
        enumerable: true,
        get(this: Container) {
            if (this.image === undefined || this.result === undefined) {
                return false;
            }

            // Compare digests if we have them
            if (
                this.image.digest.watch &&
                this.image.digest.value !== undefined &&
                this.result.digest !== undefined
            ) {
                return this.image.digest.value !== this.result.digest;
            }

            // Compare tags otherwise
            let updateAvailable = false;
            const localTag = transformTag(
                container.transformTags,
                this.image.tag.value,
            );
            const remoteTag = transformTag(
                container.transformTags,
                this.result.tag,
            );
            updateAvailable = localTag !== remoteTag;

            // Fallback to image created date (especially for legacy v1 manifests)
            if (
                this.image.created !== undefined &&
                this.result.created !== undefined
            ) {
                const createdDate = new Date(this.image.created).getTime();
                const createdDateResult = new Date(
                    this.result.created!,
                ).getTime();

                updateAvailable =
                    updateAvailable || createdDate !== createdDateResult;
            }
            return updateAvailable;
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
            get(this: Container) {
                return getLink(container, container.image.tag.value);
            },
        });

        if (container.result) {
            Object.defineProperty(container.result, 'link', {
                enumerable: true,
                get() {
                    return getLink(container, container.result.tag ?? '');
                },
            });
        }
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
                if (container.image.tag.value !== container.result.tag) {
                    updateKind.kind = 'tag';
                    let semverDiffWud: ContainerUpdateKind['semverDiff'] =
                        'unknown';
                    const isSemver = container.image.tag.semver;
                    if (isSemver) {
                        const semverDiff = diffSemver(
                            transformTag(
                                container.transformTags,
                                container.image.tag.value,
                            ),
                            transformTag(
                                container.transformTags,
                                container.result.tag,
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
    const validation = schema.validate(container);
    if (validation.error) {
        throw new Error(
            `Error when validating container properties ${validation.error}`,
        );
    }
    const containerValidated = validation.value as Container;

    // Add computed properties
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
