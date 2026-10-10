import fs from 'fs';
import Dockerode from 'dockerode';
import Joi from 'joi';
import JoiCronExpression from 'joi-cron-expression';
const joi = JoiCronExpression(Joi);
import cron from 'node-cron';
import parse from 'parse-docker-image-name';
import debounce from 'just-debounce';
import {
    parse as parseSemver,
    isGreater as isGreaterSemver,
    transform as transformTag,
    extractTagComponents,
    isPrerelease,
    interpolateTagFilter,
} from '../../../tag';
import * as event from '../../../event';
import {
    wudWatch,
    wudTagInclude,
    wudTagExclude,
    wudTagTransform,
    wudWatchDigest,
    wudLinkTemplate,
    wudDisplayName,
    wudDisplayIcon,
    wudTriggerInclude,
    wudTriggerExclude,
    dockerComposeProject,
    wudStack,
    wudWatchDelay,
    wudTagDelay,
} from './label';
import * as storeContainer from '../../../store/container';
import { isOneshot } from '../../../runtime/mode';
import {
    validate as validateContainer,
    fullName,
    Container,
} from '../../../model/container';
import * as registry from '../../../registry';
import {
    findRegistryProvider,
    resolveRegistry,
    isRegistryRegistered,
} from '../../../registries/registryProvider';
import {
    resolveCandidateTag,
    isNonContainerArtifactError,
} from '../../../registries/Registry';
import { getWatchContainerGauge } from '../../../prometheus/watcher';
import Watcher from '../../Watcher';
import { ComponentConfiguration } from '../../../registry/Component';
import { Logger } from 'pino';

export interface DockerWatcherConfiguration extends ComponentConfiguration {
    socket: string;
    host?: string;
    port: number;
    cafile?: string;
    certfile?: string;
    keyfile?: string;
    cron: string;
    jitter: number;
    watchbydefault: boolean;
    watchall: boolean;
    watchdigest?: any;
    watchdigestdefault?: boolean;
    watchevents: boolean;
    watchatstart: boolean;
    delay?: string;
    exclude?: string;
    include?: string;
}

// The delay before starting the watcher when the app is started
const START_WATCHER_DELAY_MS = 1000;

// Debounce delay used when performing a watch after a docker event has been received
const DEBOUNCED_WATCH_CRON_MS = 10000;

/**
 * Return all supported registries
 */
function getRegistries() {
    return registry.getState().registry;
}

/**
 * Format error message with details for logging and error reporting.
 */
export function formatErrorMessage(e: any): string {
    if (!e) {
        return 'Unknown error';
    }
    if (typeof e === 'string') {
        return e.trim() || 'Unknown error';
    }
    // Dockerode / docker-modem error
    if (
        e.json &&
        typeof e.json.message === 'string' &&
        e.json.message.trim() !== ''
    ) {
        return e.json.message.trim();
    }
    if (e.reason && typeof e.reason === 'string' && e.reason.trim() !== '') {
        return e.statusCode
            ? `(${e.statusCode}) ${e.reason.trim()}`
            : e.reason.trim();
    }
    // Axios / HTTP response errors with registry body
    if (e.response?.data) {
        const data = e.response.data;
        if (typeof data === 'string' && data.trim() !== '') {
            return e.message ? `${e.message}: ${data.trim()}` : data.trim();
        }
        if (typeof data.message === 'string' && data.message.trim() !== '') {
            return e.message
                ? `${e.message}: ${data.message.trim()}`
                : data.message.trim();
        }
        if (Array.isArray(data.errors) && data.errors.length > 0) {
            const errDetails = data.errors
                .map(
                    (err: any) =>
                        err.message || err.code || JSON.stringify(err),
                )
                .filter(Boolean)
                .join(', ');
            if (errDetails) {
                return e.message ? `${e.message}: ${errDetails}` : errDetails;
            }
        }
    }
    // Error object message (avoid generic 'Error' or empty string)
    if (
        typeof e.message === 'string' &&
        e.message.trim() !== '' &&
        e.message.trim() !== 'Error'
    ) {
        return e.message.trim();
    }
    if (e.code && typeof e.code === 'string') {
        return `Error ${e.code}`;
    }
    if (e.name && typeof e.name === 'string' && e.name !== 'Error') {
        return e.name;
    }
    if (typeof e.toString === 'function') {
        const str = e.toString();
        if (
            str &&
            str !== '[object Object]' &&
            str !== 'Error' &&
            str !== 'Error: Error'
        ) {
            return str;
        }
    }
    return 'Unknown error';
}

/**
 * Filter candidate tags (based on tag name).
 */
export function getTagCandidates(
    container: Container,
    tags: string[],
    logContainer: any,
) {
    let filteredTags = (tags || []).filter(
        (tag) => typeof tag === 'string' && tag.trim() !== '',
    );

    // Match include tag regex
    if (container.includeTags) {
        try {
            const includePattern = interpolateTagFilter(
                container.includeTags,
                container,
            );
            const includeTagsRegex = new RegExp(includePattern);
            filteredTags = filteredTags.filter((tag) =>
                includeTagsRegex.test(tag),
            );
        } catch (e: any) {
            if (logContainer && typeof logContainer.warn === 'function') {
                logContainer.warn(
                    `Invalid includeTags regex (${container.includeTags}): ${e.message}`,
                );
            }
        }
    } else {
        // If no includeTags, filter out tags starting with "sha"
        filteredTags = filteredTags.filter((tag) => !tag.startsWith('sha'));
    }

    // Match exclude tag regex
    if (container.excludeTags) {
        try {
            const excludePattern = interpolateTagFilter(
                container.excludeTags,
                container,
            );
            const excludeTagsRegex = new RegExp(excludePattern);
            filteredTags = filteredTags.filter(
                (tag) => !excludeTagsRegex.test(tag),
            );
        } catch (e: any) {
            if (logContainer && typeof logContainer.warn === 'function') {
                logContainer.warn(
                    `Invalid excludeTags regex (${container.excludeTags}): ${e.message}`,
                );
            }
        }
    }

    // Always filter out tags ending with ".sig"
    filteredTags = filteredTags.filter((tag) => !tag.endsWith('.sig'));

    // Semver image -> find higher semver tag
    if (container.image.tag.semver) {
        if (filteredTags.length === 0) {
            logContainer.warn(
                'No tags found after filtering; check your regex filters',
            );
        }

        const currentTag = container.image.tag.value;
        const currentComponents = extractTagComponents(currentTag);

        // If user has not specified custom include regex:
        if (!container.includeTags) {
            // Retain prefix consistency
            if (currentComponents.prefix) {
                filteredTags = filteredTags.filter((tag) =>
                    tag.startsWith(currentComponents.prefix),
                );
            } else {
                // Retain only tags that start with a number (no prefix)
                filteredTags = filteredTags.filter((tag) => /^\d/.test(tag));
            }

            // Exclude pre-releases if current tag is a stable release
            if (!currentComponents.isPrerelease) {
                filteredTags = filteredTags.filter((tag) => !isPrerelease(tag));
            }

            // Default flavor/suffix matching:
            // if current tag has no flavor/distro suffix (e.g. 8, 18), only match candidate tags that also have no suffix (or matching suffix).
            if (!currentComponents.flavor) {
                filteredTags = filteredTags.filter((tag) => {
                    const tagComp = extractTagComponents(tag);
                    return !tagComp.flavor;
                });
            } else {
                filteredTags = filteredTags.filter((tag) => {
                    const tagComp = extractTagComponents(tag);
                    return tagComp.flavor === currentComponents.flavor;
                });
            }

            // Ensure we throw good errors when we've prefix-related issues
            if (filteredTags.length === 0) {
                if (currentComponents.prefix) {
                    logContainer.warn(
                        "No tags found with existing prefix: '" +
                            currentComponents.prefix +
                            "'; check your regex filters",
                    );
                } else {
                    logContainer.warn(
                        'No tags found matching current channel; check your regex filters',
                    );
                }
            }
        }

        // Keep semver only
        filteredTags = filteredTags.filter((tag) => {
            try {
                return (
                    parseSemver(
                        transformTag(container.transformTags, tag, container),
                    ) !== null
                );
            } catch {
                return false;
            }
        });

        // Keep only tags with the same number of numeric segments
        if (currentComponents.version) {
            const referenceGroups = currentComponents.version.split('.').length;

            filteredTags = filteredTags.filter((tag) => {
                const tagComp = extractTagComponents(tag);
                if (!tagComp.version) return false;
                const tagGroups = tagComp.version.split('.').length;
                return tagGroups === referenceGroups;
            });
        }

        // Keep only greater semver (strict). A tag that transforms to the
        // same version as the current one (for example a rebuild suffix stripped
        // by the transform formula) is not an upgrade and must be excluded.
        filteredTags = filteredTags.filter((tag) => {
            try {
                const tagTransformed = transformTag(
                    container.transformTags,
                    tag,
                    container,
                );
                const currentTransformed = transformTag(
                    container.transformTags,
                    container.image.tag.value,
                    container,
                );
                return (
                    tagTransformed !== currentTransformed &&
                    isGreaterSemver(tagTransformed, currentTransformed)
                );
            } catch (e: any) {
                if (logContainer && typeof logContainer.debug === 'function') {
                    logContainer.debug(
                        `Error comparing semver tag ${tag}: ${e.message}`,
                    );
                }
                return false;
            }
        });

        // Apply semver sort desc
        filteredTags.sort((t1, t2) => {
            try {
                const greater = isGreaterSemver(
                    transformTag(container.transformTags, t2, container),
                    transformTag(container.transformTags, t1, container),
                );
                return greater ? 1 : -1;
            } catch {
                return 0;
            }
        });
    } else {
        // Non semver tag -> do not propose any other registry tag
        filteredTags = [];
    }
    return filteredTags;
}

/**
 * Get the Docker Registry by name.
 */
export function getRegistry(registryName: string) {
    return resolveRegistry(registryName, getRegistries());
}

/**
 * Check if a registry is supported / registered.
 */
export function hasRegistry(registryName?: string) {
    return isRegistryRegistered(registryName, getRegistries());
}

/**
 * Get old containers to prune.
 */
function getOldContainers(
    newContainers: Container[],
    containersFromTheStore: Container[],
) {
    if (!containersFromTheStore || !newContainers) {
        return [];
    }
    return containersFromTheStore.filter((containerFromStore) => {
        const isContainerStillToWatch = newContainers.find(
            (newContainer) => newContainer.id === containerFromStore.id,
        );
        return isContainerStillToWatch === undefined;
    });
}

/**
 * Prune old containers from the store.
 */
function pruneOldContainers(
    newContainers: Container[],
    containersFromTheStore: Container[],
) {
    const containersToRemove = getOldContainers(
        newContainers,
        containersFromTheStore,
    );
    containersToRemove.forEach((containerToRemove) => {
        storeContainer.deleteContainer(containerToRemove.id);
    });
}

export function getContainerName(container: any) {
    if (!container) {
        return '';
    }
    let containerName = '';
    const names = container.Names;
    if (names && names.length > 0) {
        [containerName] = names;
    } else if (container.Name) {
        containerName = container.Name;
    } else if (container.name) {
        containerName = container.name;
    }
    // Strip ugly forward slash
    containerName = containerName.replace(/\//, '');
    return containerName;
}

/**
 * Get image repo digest.
 */
export function getRepoDigest(containerImage: any): string | undefined {
    if (
        containerImage?.RepoDigests &&
        Array.isArray(containerImage.RepoDigests) &&
        containerImage.RepoDigests.length > 0
    ) {
        for (const fullDigest of containerImage.RepoDigests) {
            if (typeof fullDigest === 'string') {
                if (fullDigest.includes('@')) {
                    const digest = fullDigest.split('@')[1];
                    if (digest) {
                        if (digest.startsWith('sha256:')) {
                            return digest;
                        }
                        if (/^[a-f0-9]{64}$/i.test(digest)) {
                            return `sha256:${digest}`;
                        }
                    }
                } else if (fullDigest.startsWith('sha256:')) {
                    return fullDigest;
                } else if (/^[a-f0-9]{64}$/i.test(fullDigest)) {
                    return `sha256:${fullDigest}`;
                }
            }
        }
    }
    // Podman inspect provides Digest at image top level
    if (containerImage?.Digest && typeof containerImage.Digest === 'string') {
        if (containerImage.Digest.startsWith('sha256:')) {
            return containerImage.Digest;
        }
        if (/^[a-f0-9]{64}$/i.test(containerImage.Digest)) {
            return `sha256:${containerImage.Digest}`;
        }
    }
    return undefined;
}

export const ROLLBACK_ARCHIVE_REGEX = /-wud-old-\d+$/;

/**
 * Return true if container is a rollback archive container.
 */
export function isRollbackArchive(name?: string): boolean {
    return Boolean(name && ROLLBACK_ARCHIVE_REGEX.test(name));
}

/**
 * Helper to match a filter pattern against container name or container labels.
 * If filter starts with 'label:', pattern is tested against label key, key=value, and key:value.
 * Otherwise, pattern is tested against container name.
 */
function matchFilter(
    filter?: string,
    containerName?: string,
    containerLabels: Record<string, string> = {},
    log?: Pick<Logger, 'warn'>,
): boolean {
    if (!filter) {
        return false;
    }
    const isLabelFilter = filter.startsWith('label:');
    const pattern = isLabelFilter ? filter.slice(6) : filter;
    try {
        const regex = new RegExp(pattern);
        if (isLabelFilter) {
            if (!containerLabels || typeof containerLabels !== 'object') {
                return false;
            }
            return Object.entries(containerLabels).some(([key, value]) => {
                return (
                    regex.test(key) ||
                    regex.test(`${key}=${value}`) ||
                    regex.test(`${key}:${value}`)
                );
            });
        }
        return containerName ? regex.test(containerName) : false;
    } catch (e: any) {
        if (log && typeof log.warn === 'function') {
            log.warn(`Invalid regex pattern '${pattern}': ${e.message}`);
        }
        return false;
    }
}

/**
 * Return true if container must be watched.
 * Priority order:
 * 0. If container name matches rollback archive pattern (/-wud-old-\d+$/), container is NEVER watched (return false).
 * 1. If container label wud.watch is defined and not empty, its value takes precedence (wud.watch.toLowerCase() === 'true').
 * 2. Else, if an exclude filter is configured on the watcher and the container matches it, container is NOT watched (return false).
 * 3. Else, if an include filter is configured on the watcher, container is watched if it matches (return true), otherwise NOT watched (return false).
 * 4. Else, watchByDefault applies.
 * @param wudWatchLabelValue the value of the wud.watch label
 * @param watchByDefault true if containers must be watched by default
 * @param containerName the name of the container
 * @param containerLabels the container labels
 * @param excludeFilter optional pattern to exclude containers by name or label (prefixed with label:)
 * @param includeFilter optional pattern to include containers by name or label (prefixed with label:)
 * @param log optional logger to log invalid regex warnings
 */
export function isContainerToWatch(
    wudWatchLabelValue?: string,
    watchByDefault = true,
    containerName?: string,
    containerLabels: Record<string, string> = {},
    excludeFilter?: string,
    includeFilter?: string,
    log?: Pick<Logger, 'warn'>,
) {
    if (containerName && ROLLBACK_ARCHIVE_REGEX.test(containerName)) {
        return false;
    }
    if (wudWatchLabelValue !== undefined && wudWatchLabelValue !== '') {
        return wudWatchLabelValue.toLowerCase() === 'true';
    }
    if (
        excludeFilter &&
        matchFilter(excludeFilter, containerName, containerLabels, log)
    ) {
        return false;
    }
    if (includeFilter !== undefined && includeFilter !== '') {
        return matchFilter(includeFilter, containerName, containerLabels, log);
    }
    return watchByDefault;
}

export const isContainerIncluded = isContainerToWatch;

/**
 * Docker Watcher Component.
 */
export class Docker extends Watcher {
    public configuration: DockerWatcherConfiguration =
        {} as DockerWatcherConfiguration;
    public dockerApi: Dockerode;
    public watchCron: any;
    public watchCronTimeout: any;
    public watchCronDebounced: any;
    public listenDockerEventsTimeout: any;
    public dockerEventsStream: any;
    private isWatching = false;

    getConfigurationSchema() {
        return joi.object().keys({
            socket: this.joi.string().default('/var/run/docker.sock'),
            host: this.joi.string(),
            port: this.joi.number().port().default(2375),
            cafile: this.joi.string(),
            certfile: this.joi.string(),
            keyfile: this.joi.string(),
            cron: joi.string().cron().default('0 * * * *'),
            jitter: this.joi.number().integer().min(0).default(60000),
            watchbydefault: this.joi.boolean().default(true),
            watchall: this.joi.boolean().default(false),
            watchdigest: this.joi.any(),
            watchdigestdefault: this.joi.boolean().optional(),
            watchevents: this.joi.boolean().default(true),
            watchatstart: this.joi.boolean().default(true),
            delay: this.joi.string().optional(),
            exclude: this.joi.string().optional(),
            include: this.joi.string().optional(),
        });
    }

    /**
     * Init the Watcher.
     */
    async init() {
        this.initWatcher();
        if (this.configuration.watchdigest !== undefined) {
            this.log.warn(
                "WUD_WATCHER_{watcher_name}_WATCHDIGEST environment variable is deprecated and won't be supported in upcoming versions",
            );
        }

        // One-shot mode: run a single scan, never schedule background tasks
        if (isOneshot()) {
            this.log.info(
                'One-shot mode: cron, watch at start and docker events are disabled',
            );
            return;
        }

        this.log.info(`Cron scheduled (${this.configuration.cron})`);
        this.watchCron = cron.schedule(
            this.configuration.cron,
            () => this.watchFromCron(),
            { maxRandomDelay: this.configuration.jitter },
        );

        // Only watch at start if the feature is enabled AND the state store is empty
        this.configuration.watchatstart =
            this.configuration.watchatstart &&
            storeContainer.getContainers().length === 0;

        // watch at startup if enabled (after all components have been registered)
        if (this.configuration.watchatstart) {
            this.watchCronTimeout = setTimeout(
                this.watchFromCron.bind(this),
                START_WATCHER_DELAY_MS,
            );
        }

        // listen to docker events
        if (this.configuration.watchevents) {
            this.watchCronDebounced = debounce(
                this.watchFromCron.bind(this),
                DEBOUNCED_WATCH_CRON_MS,
            );
            this.listenDockerEventsTimeout = setTimeout(
                this.listenDockerEvents.bind(this),
                START_WATCHER_DELAY_MS,
            );
        }
    }

    initWatcher() {
        const options: Dockerode.DockerOptions = {};
        if (this.configuration.host) {
            options.host = this.configuration.host;
            options.port = this.configuration.port;
            if (this.configuration.cafile) {
                options.ca = fs.readFileSync(this.configuration.cafile);
            }
            if (this.configuration.certfile) {
                options.cert = fs.readFileSync(this.configuration.certfile);
            }
            if (this.configuration.keyfile) {
                options.key = fs.readFileSync(this.configuration.keyfile);
            }
        } else {
            options.socketPath = this.configuration.socket;
        }
        this.dockerApi = new Dockerode(options);
    }

    /**
     * Deregister the component.
     */
    async deregisterComponent() {
        if (this.watchCron) {
            this.watchCron.stop();
            delete this.watchCron;
        }
        if (this.watchCronTimeout) {
            clearTimeout(this.watchCronTimeout);
        }
        if (this.listenDockerEventsTimeout) {
            clearTimeout(this.listenDockerEventsTimeout);
            delete this.watchCronDebounced;
        }
    }

    /**
     * Listen and react to docker events.
     */
    async listenDockerEvents() {
        if (!this.log || typeof this.log.info !== 'function') {
            return;
        }
        this.log.info('Listening to docker events');
        const options: Dockerode.GetEventsOptions = {
            filters: {
                type: ['container'],
                event: [
                    'create',
                    'destroy',
                    'start',
                    'stop',
                    'pause',
                    'unpause',
                    'die',
                    'update',
                    'rename',
                ],
            },
        };
        this.dockerApi.getEvents(options, (err, stream) => {
            if (err) {
                if (this.log && typeof this.log.warn === 'function') {
                    this.log.warn(
                        `Unable to listen to Docker events [${err.message}]`,
                    );
                    this.log.debug(err);
                }
            } else {
                let chunks: Buffer[] = [];
                const collectChunks = (chunk: Buffer) => {
                    chunks.push(chunk);
                    if (chunk.toString().endsWith('\n')) {
                        const dockerEventChunk = Buffer.concat(chunks);
                        this.onDockerEvent(dockerEventChunk);
                        chunks = [];
                    }
                };
                stream.on('data', collectChunks);
            }
        });
    }

    /**
     * Process a docker event.
     */
    async onDockerEvent(dockerEventChunk: any) {
        let dockerEvent;
        try {
            dockerEvent = JSON.parse(dockerEventChunk.toString());
        } catch (e) {
            this.log.warn(
                `Unable to parse Docker event (${e.message}): ${dockerEventChunk.toString()}`,
            );
            return;
        }
        const action = dockerEvent.Action;
        const containerId = dockerEvent.Actor?.ID || dockerEvent.id;
        const eventName = dockerEvent.Actor?.Attributes?.name
            ? dockerEvent.Actor.Attributes.name.replace(/\//, '')
            : undefined;

        // Rollback archive containers and self-update helper should never be processed or indexed
        if (
            eventName &&
            (ROLLBACK_ARCHIVE_REGEX.test(eventName) ||
                eventName === 'wud-self-update')
        ) {
            return;
        }

        const eventLabels = dockerEvent.Actor?.Attributes || {};
        const wudWatchAttr = eventLabels[wudWatch] || eventLabels['wud.watch'];
        if (
            wudWatchAttr !== undefined &&
            wudWatchAttr.toLowerCase() === 'false'
        ) {
            return;
        }

        // If the container was created or destroyed => perform a watch
        if (action === 'destroy' || action === 'create') {
            if (typeof this.watchCronDebounced === 'function') {
                await this.watchCronDebounced();
            }
        } else {
            // Update container state in db if so
            try {
                const container =
                    await this.dockerApi.getContainer(containerId);
                const containerInspect = await container.inspect();
                const newStatus = containerInspect.State?.Status;
                const newName =
                    getContainerName(containerInspect) ||
                    (dockerEvent.Actor?.Attributes?.name
                        ? dockerEvent.Actor.Attributes.name.replace(/\//, '')
                        : undefined);

                if (newName && ROLLBACK_ARCHIVE_REGEX.test(newName)) {
                    return;
                }
                const containerFound = storeContainer.getContainer(containerId);
                if (containerFound) {
                    // Child logger for the container to process
                    const logContainer = this.log.child({
                        container: fullName(containerFound),
                    });
                    const oldStatus = containerFound.status;
                    const oldName = containerFound.name;
                    const oldDisplayName = containerFound.displayName;
                    let isUpdated = false;

                    if (newStatus && oldStatus !== newStatus) {
                        containerFound.status = newStatus;
                        logContainer.info(
                            `Status changed from ${oldStatus} to ${newStatus}`,
                        );
                        isUpdated = true;
                    }

                    const inspectLabels =
                        containerInspect.Config?.Labels ||
                        (containerInspect as any).Labels;
                    const explicitDisplayName =
                        inspectLabels?.[wudDisplayName] ||
                        (inspectLabels === undefined
                            ? containerFound.labels?.[wudDisplayName]
                            : undefined);

                    if (newName && oldName !== newName) {
                        containerFound.name = newName;
                        logContainer.info(
                            `Name changed from ${oldName} to ${newName}`,
                        );
                        isUpdated = true;
                    }

                    if (explicitDisplayName) {
                        if (
                            containerFound.displayName !== explicitDisplayName
                        ) {
                            containerFound.displayName = explicitDisplayName;
                            isUpdated = true;
                        }
                    } else if (newName) {
                        if (
                            oldName !== newName ||
                            oldDisplayName === oldName ||
                            (oldDisplayName !== undefined &&
                                oldDisplayName !== newName)
                        ) {
                            if (containerFound.displayName !== newName) {
                                containerFound.displayName = newName;
                                isUpdated = true;
                            }
                        }
                    }

                    if (inspectLabels) {
                        containerFound.labels = inspectLabels;
                    }

                    if (isUpdated) {
                        storeContainer.updateContainer(containerFound);
                    }
                }
            } catch (e: any) {
                this.log.debug(
                    `Unable to get container details for container id=[${containerId}] (${e.message})`,
                );
            }
        }
    }

    /**
     * Watch containers (called by cron scheduled tasks).
     */
    async watchFromCron() {
        if (!this.log || typeof this.log.info !== 'function') {
            return [];
        }
        if (this.isWatching) {
            this.log.info('Watcher is already watching => skip watchFromCron');
            return [];
        }
        this.isWatching = true;
        try {
            this.log.info(`Cron started (${this.configuration.cron})`);

            // Get container reports
            const containerReports = await this.watch();

            // Count container reports
            const containerReportsCount = containerReports.length;

            // Count container available updates
            const containerUpdatesCount = containerReports.filter(
                (containerReport) => containerReport.container.updateAvailable,
            ).length;

            // Count container errors
            const containerErrorsCount = containerReports.filter(
                (containerReport) =>
                    containerReport.container.error !== undefined,
            ).length;

            const stats = `${containerReportsCount} containers watched, ${containerErrorsCount} errors, ${containerUpdatesCount} available updates`;
            if (this.log && typeof this.log.info === 'function') {
                this.log.info(`Cron finished (${stats})`);
            }
            return containerReports;
        } finally {
            this.isWatching = false;
        }
    }

    /**
     * Watch main method.
     */
    async watch() {
        let containers: Container[] = [];

        // Dispatch event to notify start watching
        event.emitWatcherStart(this);

        // List images to watch
        try {
            containers = await this.getContainers();
        } catch (e: any) {
            const errorMessage = formatErrorMessage(e);
            this.log.warn(
                `Error when trying to get the list of the containers to watch (${errorMessage})`,
            );
            if (this.log && typeof this.log.debug === 'function') {
                this.log.debug(e);
            }
        }
        try {
            const containerReports =
                await this.processWatchContainers(containers);
            event.emitContainerReports(containerReports);
            return containerReports;
        } catch (e: any) {
            const errorMessage = formatErrorMessage(e);
            this.log.warn(
                `Error when processing some containers (${errorMessage})`,
            );
            if (this.log && typeof this.log.debug === 'function') {
                this.log.debug(e);
            }
            return [];
        } finally {
            // Dispatch event to notify stop watching
            event.emitWatcherStop(this);
        }
    }

    /**
     * Watch a Container.
     */
    protected async checkContainer(container: Container) {
        // Child logger for the container to process
        const logContainer = this.log.child({ container: fullName(container) });
        const containerWithResult = container;

        // Reset previous error if so
        delete containerWithResult.error;
        if (logContainer && typeof logContainer.debug === 'function') {
            logContainer.debug('Start watching');
        }

        try {
            containerWithResult.result = await this.findNewVersion(
                container,
                logContainer,
            );
        } catch (e: any) {
            const errorMessage = formatErrorMessage(e);
            logContainer.warn(`Error when processing (${errorMessage})`);
            if (logContainer && typeof logContainer.debug === 'function') {
                logContainer.debug(e);
            }
            containerWithResult.error = {
                message: errorMessage,
            };
        }

        try {
            const containerReport =
                this.mapContainerToContainerReport(containerWithResult);
            event.emitContainerReport(containerReport);
            return containerReport;
        } catch (e: any) {
            const errorMessage = formatErrorMessage(e);
            logContainer.warn(
                `Error when saving container report (${errorMessage})`,
            );
            if (logContainer && typeof logContainer.debug === 'function') {
                logContainer.debug(e);
            }
            containerWithResult.error = {
                message: errorMessage,
            };
            return {
                container: containerWithResult,
                changed: false,
            };
        }
    }

    /**
     * Get all containers to watch.
     */
    async getContainers(): Promise<Container[]> {
        const listContainersOptions: Dockerode.ContainerListOptions = {};
        if (this.configuration.watchall) {
            listContainersOptions.all = true;
        }
        const containers = await this.dockerApi.listContainers(
            listContainersOptions,
        );

        // Filter on containers to watch
        const filteredContainers = (containers || []).filter((container) =>
            isContainerToWatch(
                container.Labels ? container.Labels[wudWatch] : undefined,
                this.configuration.watchbydefault,
                this.getContainerName(container),
                container.Labels || {},
                this.configuration.exclude,
                this.configuration.include,
                this.log,
            ),
        );
        const containerPromises = filteredContainers.map((container) => {
            const containerLabels =
                container.Labels || (container as any).labels || {};
            return this.addImageDetailsToContainer(
                container,
                containerLabels[wudTagInclude],
                containerLabels[wudTagExclude],
                containerLabels[wudTagTransform],
                containerLabels[wudLinkTemplate],
                containerLabels[wudDisplayName],
                containerLabels[wudDisplayIcon],
                containerLabels[wudTriggerInclude],
                containerLabels[wudTriggerExclude],
            ).catch((e) => {
                const containerName =
                    this.getContainerName(container) || container.Id;
                const errorDetail = formatErrorMessage(e);
                this.log.warn(
                    `Failed to fetch image detail for container ${containerName} (${container.Id}): ${errorDetail}`,
                );
                if (this.log && typeof this.log.debug === 'function') {
                    this.log.debug(e);
                }
                return e;
            });
        });
        const containersWithImage = (
            await Promise.all(containerPromises)
        ).filter((result) => !(result instanceof Error));

        // Return containers to process
        const containersToReturn = containersWithImage.filter(
            (imagePromise) => imagePromise !== undefined,
        );

        // Prune old containers from the store (never in one-shot mode:
        // the store is not initialized and there is no previous state)
        if (!isOneshot()) {
            try {
                const containersFromTheStore = storeContainer.getContainers({
                    watcher: this.name,
                });
                pruneOldContainers(containersToReturn, containersFromTheStore);
            } catch (e: any) {
                const errorDetail = formatErrorMessage(e);
                this.log.warn(
                    `Error when trying to prune the old containers (${errorDetail})`,
                );
                if (this.log && typeof this.log.debug === 'function') {
                    this.log.debug(e);
                }
            }
        }
        this.updatePrometheusGauge(containersToReturn);

        return containersToReturn;
    }

    private updatePrometheusGauge(containersToReturn: any[]) {
        const containerGauge = getWatchContainerGauge();
        if (containerGauge) {
            getWatchContainerGauge().set(
                {
                    type: this.type,
                    name: this.name,
                },
                containersToReturn.length,
            );
        }
    }

    /**
     * Find new version for a Container.
     */

    async findNewVersion(container: Container, logContainer: Logger) {
        const registryProvider = getRegistry(container.image.registry.name);
        const result: any = { tag: container.image.tag.value };
        if (!registryProvider) {
            logContainer.error(
                `Unsupported registry (${container.image.registry.name})`,
            );
            return result;
        } else {
            const watchDigestLabel = container.labels?.[wudWatchDigest];
            let watchDigest = false;
            if (watchDigestLabel !== undefined && watchDigestLabel !== '') {
                watchDigest = watchDigestLabel.toLowerCase() === 'true';
            } else if (!container.image.tag.semver) {
                watchDigest = registryProvider.shouldWatchDigest(
                    undefined,
                    container.image.name,
                    this.configuration.watchdigestdefault,
                );
            }
            if (container.image.digest) {
                container.image.digest.watch = watchDigest;
            } else {
                container.image.digest = { watch: watchDigest };
            }

            if (!container.image.tag.semver && !watchDigest) {
                this.log.warn(
                    `Image ${container.image.name} is not a semver and digest watching is disabled so wud won't report any update. Please review the configuration to enable digest watching for this container or exclude this container from being watched`,
                );
            }

            // Get all available tags for semver update checks
            let tags: string[] = [];
            if (container.image.tag.semver || container.includeTags) {
                try {
                    tags = await registryProvider.getTags(container.image);
                } catch (e: any) {
                    const errorDetail = formatErrorMessage(e);
                    logContainer.warn(
                        `Failed to fetch tags for image ${container.image.name} from registry ${container.image.registry.name} (${errorDetail})`,
                    );
                    if (
                        logContainer &&
                        typeof logContainer.debug === 'function'
                    ) {
                        logContainer.debug(e);
                    }
                    if (!watchDigest) {
                        throw new Error(
                            `Failed to fetch tags from registry (${errorDetail})`,
                        );
                    }
                }
            }

            // Get candidate tags (based on tag name)
            const tagsCandidates = getTagCandidates(
                container,
                tags,
                logContainer,
            );

            let candidateTag: string | undefined;
            let candidateRemoteDigest: any;
            if (tagsCandidates.length > 0) {
                try {
                    const resolution = await resolveCandidateTag(
                        registryProvider,
                        container.image,
                        tagsCandidates,
                        logContainer,
                    );
                    candidateTag = resolution.tag;
                    candidateRemoteDigest = resolution.remoteDigest;
                } catch (e: any) {
                    const errorDetail = formatErrorMessage(e);
                    logContainer.warn(
                        `Failed to resolve candidate tags for image ${container.image.name} (${errorDetail})`,
                    );
                    if (
                        logContainer &&
                        typeof logContainer.debug === 'function'
                    ) {
                        logContainer.debug(e);
                    }
                    if (!watchDigest) {
                        throw new Error(
                            `Failed to resolve candidate tags (${errorDetail})`,
                        );
                    }
                }
            }

            // Must watch digest? => Find local/remote digests on registry
            if (watchDigest && container.image.digest?.repo) {
                // If we have a tag candidate BUT we also watch digest
                // (case where local=`mongo:8` and remote=`mongo:8.0.0`),
                // Then get the digest of the tag candidate
                // Else get the digest of the same tag as the local one
                const imageToGetDigestFrom = JSON.parse(
                    JSON.stringify(container.image),
                );
                if (candidateTag) {
                    imageToGetDigestFrom.tag.value = candidateTag;
                }

                let remoteDigest = candidateRemoteDigest;
                if (!remoteDigest) {
                    try {
                        remoteDigest =
                            await registryProvider.getImageManifestDigest(
                                imageToGetDigestFrom,
                            );
                    } catch (e: any) {
                        if (isNonContainerArtifactError(e)) {
                            logContainer.warn(
                                `Image ${imageToGetDigestFrom.name}:${imageToGetDigestFrom.tag.value} is a non-container OCI artifact`,
                            );
                            return result;
                        }
                        const errorDetail = formatErrorMessage(e);
                        logContainer.warn(
                            `Failed to fetch remote image manifest for ${imageToGetDigestFrom.name}:${imageToGetDigestFrom.tag.value} (${errorDetail})`,
                        );
                        if (
                            logContainer &&
                            typeof logContainer.debug === 'function'
                        ) {
                            logContainer.debug(e);
                        }
                        throw new Error(
                            `Failed to fetch remote image manifest (${errorDetail})`,
                        );
                    }
                }

                if (remoteDigest?.digest) {
                    result.digest = remoteDigest.digest;
                    result.created = remoteDigest.created;
                }

                if (remoteDigest?.version !== 1) {
                    // Regular v2 manifest => Get manifest digest
                    try {
                        const digestV2 =
                            await registryProvider.getImageManifestDigest(
                                imageToGetDigestFrom,
                                container.image.digest.repo,
                            );
                        container.image.digest.value =
                            digestV2?.digest || container.image.digest.repo;
                    } catch (e: any) {
                        const errorDetail = formatErrorMessage(e);
                        if (
                            logContainer &&
                            typeof logContainer.debug === 'function'
                        ) {
                            logContainer.debug(
                                `Unable to resolve manifest digest for local repo digest ${container.image.digest.repo} (${errorDetail}), falling back to repo digest`,
                            );
                        }
                        container.image.digest.value =
                            container.image.digest.repo;
                    }
                } else {
                    // Legacy v1 image => take Image digest as reference for comparison.
                    // Config.Image is empty on most modern images (deprecated since
                    // Docker moved to content-addressable image storage), so fall back
                    // to the local image Id, which is the config digest Docker itself
                    // uses to identify this image.
                    try {
                        const image = await this.dockerApi
                            .getImage(container.image.id)
                            .inspect();
                        const rawId = image.Config?.Image || image.Id;
                        container.image.digest.value =
                            rawId && /^[a-f0-9]{64}$/i.test(rawId)
                                ? `sha256:${rawId}`
                                : rawId;
                    } catch (e: any) {
                        const errorDetail = formatErrorMessage(e);
                        if (
                            logContainer &&
                            typeof logContainer.debug === 'function'
                        ) {
                            logContainer.debug(
                                `Cannot inspect local image ${container.image.id} (${errorDetail}), falling back to image id`,
                            );
                        }
                        const rawId = container.image.id;
                        container.image.digest.value =
                            rawId && /^[a-f0-9]{64}$/i.test(rawId)
                                ? `sha256:${rawId}`
                                : rawId;
                    }
                }

                // An update was found? Resolve what is actually IN it.
                // A digest-only update is unreadable on its own ("sha A -> sha B"),
                // but the remote version label and build date both live in the
                // image config blob.
                if (
                    remoteDigest?.version !== 1 &&
                    result.digest !== undefined &&
                    container.image.digest.value !== result.digest
                ) {
                    // A pending update stays pending until the user applies it,
                    // so resolve each remote digest ONCE and reuse it afterwards.
                    // Without this, every scan would re-request the config of an
                    // update that is already known -- unwanted traffic against
                    // registries that rate limit anonymous pulls (Docker Hub
                    // allows 100 per 6h per IP, and manifest GETs count).
                    const previousResult = storeContainer.getContainer(
                        container.id,
                    )?.result;
                    if (previousResult?.digest === result.digest) {
                        result.created = previousResult.created;
                        result.version = previousResult.version;
                    } else {
                        try {
                            const remoteConfig =
                                await registryProvider.getImageConfig(
                                    imageToGetDigestFrom,
                                    result.digest,
                                    remoteDigest.configDigest,
                                );
                            result.created =
                                remoteConfig.created ?? result.created;
                            result.version = remoteConfig.version;
                        } catch (e: any) {
                            if (
                                logContainer &&
                                typeof logContainer.debug === 'function'
                            ) {
                                logContainer.debug(
                                    `Cannot get remote image config (${e.message})`,
                                );
                            }
                        }
                    }
                }
            }

            if (candidateTag) {
                result.tag = candidateTag;
            }
        }
        return result;
    }

    /**
     * Get container name.
     */
    getContainerName(container: any) {
        return getContainerName(container);
    }

    /**
     * Add image detail to Container.
     */
    async addImageDetailsToContainer(
        container: any,
        includeTags: string,
        excludeTags: string,
        transformTags: string,
        linkTemplate: string,
        displayName: string,
        displayIcon: string,
        triggerInclude: string,
        triggerExclude: string,
    ) {
        const containerId = container.Id || container.id;
        const containerLabels = container.Labels || container.labels || {};
        const effectiveTransformTags =
            transformTags ?? containerLabels[wudTagTransform];
        const stack =
            containerLabels[wudStack] ||
            containerLabels[dockerComposeProject] ||
            containerLabels['com.docker.compose.project'] ||
            undefined;
        const delay =
            containerLabels[wudWatchDelay] ||
            containerLabels[wudTagDelay] ||
            this.configuration.delay;

        // Is container already in store? just return it :)
        // One-shot mode: never read from the store (not initialized).
        // stack/delay are never re-read from a previous state.
        const containerInStore = isOneshot()
            ? undefined
            : storeContainer.getContainer(containerId);
        if (
            containerInStore !== undefined &&
            containerInStore.error === undefined
        ) {
            const storeRegistryName = containerInStore.image?.registry?.name;
            if (storeRegistryName && !hasRegistry(storeRegistryName)) {
                if (this.log && typeof this.log.info === 'function') {
                    this.log.info(
                        `Container ${containerInStore.id} registry (${storeRegistryName}) is no longer registered, re-evaluating container`,
                    );
                }
            } else {
                this.log.debug(
                    `Container ${containerInStore.id} already in store`,
                );
                let isUpdated = false;
                if (containerInStore.watcher !== this.name) {
                    containerInStore.watcher = this.name;
                    isUpdated = true;
                }
                if (storeRegistryName) {
                    const resolvedRegistry = getRegistry(storeRegistryName);
                    if (
                        resolvedRegistry?.getId &&
                        typeof resolvedRegistry.getId === 'function' &&
                        containerInStore.image.registry.name !==
                            resolvedRegistry.getId()
                    ) {
                        containerInStore.image.registry.name =
                            resolvedRegistry.getId();
                        isUpdated = true;
                    }
                }
                if (stack && !containerInStore.stack) {
                    containerInStore.stack = stack;
                    isUpdated = true;
                }
                if (delay && containerInStore.delay !== delay) {
                    containerInStore.delay = delay;
                    isUpdated = true;
                }
                const currentContainerName = this.getContainerName(container);
                const oldName = containerInStore.name;
                const oldDisplayName = containerInStore.displayName;
                if (currentContainerName && oldName !== currentContainerName) {
                    if (this.log && typeof this.log.info === 'function') {
                        this.log.info(
                            `Container ${containerInStore.id} renamed from ${oldName} to ${currentContainerName}`,
                        );
                    }
                    containerInStore.name = currentContainerName;
                    isUpdated = true;
                }

                const explicitDisplayName =
                    displayName ||
                    containerLabels[wudDisplayName] ||
                    (container.Labels === undefined &&
                    container.labels === undefined
                        ? containerInStore.labels?.[wudDisplayName]
                        : undefined);

                if (explicitDisplayName) {
                    if (containerInStore.displayName !== explicitDisplayName) {
                        containerInStore.displayName = explicitDisplayName;
                        isUpdated = true;
                    }
                } else if (currentContainerName) {
                    if (
                        oldName !== currentContainerName ||
                        oldDisplayName === oldName ||
                        (oldDisplayName !== undefined &&
                            oldDisplayName !== currentContainerName)
                    ) {
                        if (
                            containerInStore.displayName !==
                            currentContainerName
                        ) {
                            containerInStore.displayName = currentContainerName;
                            isUpdated = true;
                        }
                    }
                }

                if (container.Labels || container.labels) {
                    containerInStore.labels = containerLabels;
                }

                const watchDigestLabel = containerLabels[wudWatchDigest];
                let watchDigest = false;
                if (watchDigestLabel !== undefined && watchDigestLabel !== '') {
                    watchDigest = watchDigestLabel.toLowerCase() === 'true';
                } else if (!containerInStore.image?.tag?.semver) {
                    const registryProvider = findRegistryProvider(
                        containerInStore.image?.registry?.url,
                        getRegistries(),
                    );
                    if (registryProvider) {
                        watchDigest = registryProvider.shouldWatchDigest(
                            undefined,
                            containerInStore.image?.name,
                            this.configuration.watchdigestdefault,
                        );
                    } else if (
                        this.configuration.watchdigestdefault !== undefined
                    ) {
                        watchDigest = this.configuration.watchdigestdefault;
                    }
                }
                if (
                    containerInStore.image?.digest &&
                    containerInStore.image.digest.watch !== watchDigest
                ) {
                    containerInStore.image.digest.watch = watchDigest;
                    isUpdated = true;
                }

                if (isUpdated) {
                    storeContainer.updateContainer(containerInStore);
                }
                return containerInStore;
            }
        }

        // Get container image details
        const image = await this.dockerApi.getImage(container.Image).inspect();

        // Get useful properties
        const containerName = getContainerName(container);
        if (
            displayIcon &&
            (displayIcon.startsWith('hl:') || displayIcon.startsWith('hl-'))
        ) {
            this.log.warn(
                `Container ${containerName} uses deprecated icon prefix '${displayIcon}'. Please migrate to 'selfhst:' (e.g. 'selfhst:${displayIcon.replace(/^hl[:-]/, '')}') or any standard Iconify format.`,
            );
        }
        const status = container.State;
        const architecture = image.Architecture;
        const os = image.Os;
        const variant = image.Variant;
        const created = image.Created;
        const imageId = image.Id;

        // Parse image to get registry, organization...
        let imageNameToParse = container.Image;
        let pinnedDigest: string | undefined;

        const rawNameToParse = (imageNameToParse || '').replace(/^sha256:/, '');
        const rawImageId = (image.Id || '').replace(/^sha256:/, '');
        const isImageId =
            typeof imageNameToParse === 'string' &&
            (imageNameToParse.startsWith('sha256:') ||
                /^[a-f0-9]{64}$/i.test(imageNameToParse) ||
                (rawImageId !== '' &&
                    rawNameToParse.length >= 12 &&
                    /^[a-f0-9]+$/i.test(rawNameToParse) &&
                    rawImageId.startsWith(rawNameToParse)));

        if (isImageId) {
            const validRepoTags = (image.RepoTags || []).filter(
                (tag: string) =>
                    tag && tag !== '<none>:<none>' && !tag.endsWith(':<none>'),
            );
            if (validRepoTags.length === 0) {
                this.log.warn(
                    `Cannot get a reliable tag for this image [${imageNameToParse}]`,
                );
                return Promise.resolve();
            }
            // Get the first repo tag (better than nothing ;)
            [imageNameToParse] = validRepoTags;
        }

        if (imageNameToParse.includes('@')) {
            const [imageRef, digest] = imageNameToParse.split('@');
            imageNameToParse = imageRef;
            if (digest && digest.includes(':')) {
                pinnedDigest = digest;
            }
        }

        const repoDigest = pinnedDigest || getRepoDigest(image);

        let parsedImage = parse(imageNameToParse);
        const tagName =
            parsedImage && parsedImage.tag ? parsedImage.tag : 'latest';

        if (!parsedImage) {
            parsedImage = {
                domain: '',
                path: imageNameToParse,
                tag: tagName,
            };
        }

        const registryProvider = findRegistryProvider(
            parsedImage.domain,
            getRegistries(),
        );

        if (!registryProvider) {
            this.log.warn(
                `${container.Image} - ${parsedImage.domain} - No Registry Provider found`,
            );
        }
        const parsedTag = parseSemver(
            transformTag(effectiveTransformTags, tagName, containerName),
        );
        const isSemver = parsedTag !== null && parsedTag !== undefined;
        const watchDigestLabel = containerLabels[wudWatchDigest];
        let watchDigest = false;

        if (watchDigestLabel !== undefined && watchDigestLabel !== '') {
            watchDigest = watchDigestLabel.toLowerCase() === 'true';
        } else if (!isSemver) {
            if (registryProvider) {
                watchDigest = registryProvider.shouldWatchDigest(
                    undefined,
                    parsedImage.path,
                    this.configuration.watchdigestdefault,
                );
            } else {
                watchDigest = this.configuration.watchdigestdefault;
            }
        }

        return this.normalizeContainer({
            id: containerId,
            name: containerName,
            status,
            watcher: this.name,
            stack,
            delay,
            includeTags,
            excludeTags,
            transformTags: effectiveTransformTags,
            linkTemplate,
            displayName,
            displayIcon,
            triggerInclude,
            triggerExclude,
            image: {
                id: imageId,
                registry: {
                    name: 'unknown', // Will be overwritten by normalizeContainer
                    url: parsedImage.domain,
                },
                name: parsedImage.path,
                tag: {
                    value: tagName,
                    semver: isSemver,
                },
                digest: {
                    watch: watchDigest,
                    repo: repoDigest,
                },
                architecture,
                os,
                variant,
                created,
            },
            labels: containerLabels,
            snoozedVersion: containerInStore?.snoozedVersion,
            snoozedUntil: containerInStore?.snoozedUntil,
            result: containerInStore?.result ?? {
                tag: tagName,
            },
            updateAvailable: false,
            updateKind: { kind: 'unknown' },
        } as Container);
    }

    /**
     * Process a Container with result and map to a containerReport.
     */
    mapContainerToContainerReport(containerWithResult: Container) {
        // One-shot mode: stateless, no store read/write.
        // changed === updateAvailable ("update available right now").
        if (isOneshot()) {
            return {
                container: containerWithResult,
                changed: containerWithResult.updateAvailable,
            };
        }

        const logContainer = this.log.child({
            container: fullName(containerWithResult),
        });
        const containerReport = {
            container: containerWithResult,
            changed: false,
        };

        // Find container in db & compare
        const containerInDb = storeContainer.getContainer(
            containerWithResult.id,
        );

        // Not found in DB? => Save it
        if (!containerInDb) {
            logContainer.debug('Container watched for the first time');
            containerReport.container =
                storeContainer.insertContainer(containerWithResult);
            containerReport.changed = true;

            // Found in DB? => update it
        } else {
            containerReport.container =
                storeContainer.updateContainer(containerWithResult);
            containerReport.changed =
                containerInDb.resultChanged(containerReport.container) &&
                containerWithResult.updateAvailable;
        }
        return containerReport;
    }

    private normalizeContainer(container: Container) {
        const containerWithNormalizedImage = container;
        const registryProvider = findRegistryProvider(
            container.image.registry.url,
            getRegistries(),
        );
        if (!registryProvider) {
            this.log.warn(
                `${fullName(container)} - No Registry Provider found`,
            );
            containerWithNormalizedImage.image.registry.name = 'unknown';
        } else {
            containerWithNormalizedImage.image =
                registryProvider.normalizeImage(container.image);
            containerWithNormalizedImage.image.registry.name =
                registryProvider.getId();
        }
        return validateContainer(containerWithNormalizedImage);
    }
}

export default Docker;
