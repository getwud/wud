const joi = require('joi');
const flat = require('flat');
const { snakeCase } = require('snake-case');
const { parse: parseSemver, diff: diffSemver } = require('../tag');
const { transform: transformTag } = require('../tag');

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
    image: joi.object({
        id: joi.string().min(1).required(),
        registry: joi.object({
            name: joi.string().min(1).required(),
            url: joi.string().min(1).required(),
        }).required(),
        name: joi.string().min(1).required(),
        tag: joi.object({
            value: joi.string().min(1).required(),
            semver: joi.boolean().default(false),
        }).required(),
        digest: joi.object({
            watch: joi.boolean().default(false),
            value: joi.string(),
            repo: joi.string(),
        }).required(),
        architecture: joi.string().min(1).required(),
        os: joi.string().min(1).required(),
        variant: joi.string(),
        created: joi.string().isoDate(),
    }).required(),
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
    updateKind: joi.object({
        kind: joi.string().allow('tag', 'digest', 'unknown').required(),
        localValue: joi.string(),
        remoteValue: joi.string(),
        semverDiff: joi.string().allow('major', 'minor', 'patch', 'prerelease', 'unknown'),
    }).default({ kind: 'unknown' }),
    resultChanged: joi.function(),
});

/**
 * Render Link template.
 * @param linkTemplate
 * @param tagValue
 * @param isSemver
 * @returns {undefined|*}
 */
function getLink(linkTemplate, tagValue, isSemver) {
    if (!linkTemplate) {
        return undefined;
    }
    const raw = tagValue;
    let link = linkTemplate;
    link = link.replace(/\${\s*raw\s*}/g, raw);
    if (isSemver) {
        const versionSemver = parseSemver(tagValue);
        const {
            major, minor, patch, prerelease,
        } = versionSemver;
        link = link.replace(/\${\s*major\s*}/g, major);
        link = link.replace(/\${\s*minor\s*}/g, minor);
        link = link.replace(/\${\s*patch\s*}/g, patch);
        link = link.replace(/\${\s*prerelease\s*}/g, prerelease && prerelease.length > 0 ? prerelease[0] : '');
    }
    return link;
}

/**
 * Computed function to check whether there is an update.
 * @param container
 * @returns {boolean}
 */
function addUpdateAvailableProperty(container) {
    Object.defineProperty(
        container,
        'updateAvailable',
        {
            enumerable: true,
            get() {
                if (this.image === undefined || this.result === undefined) {
                    return false;
                }

                // Compare digests if we have them
                if (this.image.digest.watch
                    && this.image.digest.value !== undefined
                    && this.result.digest !== undefined
                ) {
                    return this.image.digest.value !== this.result.digest;
                }

                // Compare tags otherwise
                let updateAvailable = false;
                const localTag = transformTag(container.transformTags, this.image.tag.value);
                const remoteTag = transformTag(container.transformTags, this.result.tag);
                updateAvailable = localTag !== remoteTag;

                // Fallback to image created date (especially for legacy v1 manifests)
                if (this.image.created !== undefined && this.result.created !== undefined) {
                    const createdDate = new Date(this.image.created).getTime();
                    const createdDateResult = new Date(this.result.created).getTime();

                    updateAvailable = updateAvailable
                        || createdDate !== createdDateResult;
                }
                return updateAvailable;
            },
        },
    );
}

/**
 * Computed link property.
 * @param container
 * @returns {undefined|*}
 */
function addLinkProperty(container) {
    if (container.linkTemplate) {
        Object.defineProperty(container, 'link', {
            enumerable: true,
            get() {
                return getLink(
                    container.linkTemplate,
                    transformTag(container.transformTags, container.image.tag.value),
                    container.image.tag.semver,
                );
            },
        });

        if (container.result) {
            Object.defineProperty(container.result, 'link', {
                enumerable: true,
                get() {
                    return getLink(
                        container.linkTemplate,
                        transformTag(container.transformTags, container.result.tag),
                        container.image.tag.semver,
                    );
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
function addUpdateKindProperty(container) {
    Object.defineProperty(
        container,
        'updateKind',
        {
            enumerable: true,
            get() {
                const updateKind = {
                    kind: 'unknown',
                    localValue: undefined,
                    remoteValue: undefined,
                    semverDiff: undefined,
                };
                if (container.image === undefined || container.result === undefined) {
                    return updateKind;
                }
                if (!container.updateAvailable) {
                    return updateKind;
                }

                if (container.image !== undefined
                    && container.result !== undefined
                    && container.updateAvailable
                ) {
                    if (container.image.tag.value !== container.result.tag) {
                        updateKind.kind = 'tag';
                        let semverDiffWud = 'unknown';
                        const isSemver = container.image.tag.semver;
                        if (isSemver) {
                            const semverDiff = diffSemver(
                                transformTag(container.transformTags, container.image.tag.value),
                                transformTag(container.transformTags, container.result.tag),
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
                    } else if (container.image.digest
                        && container.image.digest.value !== container.result.digest
                    ) {
                        updateKind.kind = 'digest';
                        updateKind.localValue = container.image.digest.value;
                        updateKind.remoteValue = container.result.digest;
                    }
                }
                return updateKind;
            },
        },
    );
}

/**
 * Computed function to check whether the result is different.
 * @param otherContainer
 * @returns {boolean}
 */
function resultChangedFunction(otherContainer) {
    return otherContainer === undefined
        || this.result.tag !== otherContainer.result.tag
        || this.result.digest !== otherContainer.result.digest
        || this.result.created !== otherContainer.result.created;
}

/**
 * Add computed function to check whether the result is different.
 * @param container
 * @returns {*}
 */
function addResultChangedFunction(container) {
    const containerWithResultChanged = container;
    containerWithResultChanged.resultChanged = resultChangedFunction;
    return containerWithResultChanged;
}

/**
 * Apply validation to the container object.
 * @param container
 * @returns {*}
 */
function validate(container) {
    const validation = schema.validate(container);
    if (validation.error) {
        throw new Error(`Error when validating container properties ${validation.error}`);
    }
    const containerValidated = validation.value;

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
function flatten(container) {
    const containerFlatten = flat(container, {
        delimiter: '_',
        transformKey: (key) => snakeCase(key),
    });
    delete containerFlatten.result_changed;
    return containerFlatten;
}

/**
 * Build the business id of the container.
 * @param container
 * @returns {string}
 */
function fullName(container) {
    return `${container.watcher}_${container.name}`;
}

module.exports = {
    validate,
    flatten,
    fullName,
};
