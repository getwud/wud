import fs from 'fs';
import Dockerode from 'dockerode';
import joiBase from 'joi';
import joiCronExpression from 'joi-cron-expression';
const joi = joiCronExpression(joiBase);
import cron, { ScheduledTask } from 'node-cron';
import parse from 'parse-docker-image-name';
import debounce from 'just-debounce';
import { parse as parseSemver, isGreater as isGreaterSemver, transform as transformTag } from '../../../tag';
import * as event from '../../../event';
import { WUD_LABELS } from './label';
import { deleteContainer, getContainer, getContainers, insertContainer, updateContainer } from '../../../store/container';
import log from '../../../log';
import { Watcher } from '../../Watcher';
import { validate as validateContainer, fullName, Container } from '../../../model/container';
import { getState } from '../../../registry/states';
import { getWatchContainerGauge } from '../../../prometheus/watcher';
import Logger from 'bunyan';

// The delay before starting the watcher when the app is started
const START_WATCHER_DELAY_MS = 1000;

// Debounce delay used when performing a watch after a docker event has been received
const DEBOUNCED_WATCH_CRON_MS = 5000;

/**
 * Return all supported registries
 */
export function getRegistries() {
    return getState().registry;
}

/**
 * Filter candidate tags (based on tag name).
 * @param container
 * @param tags
 * @returns {*}
 */
export function getTagCandidates(container: Container, tags: string[], logContainer: Logger) {
    let filteredTags = tags;

    // Match include tag regex
    if (container.includeTags) {
        const includeTagsRegex = new RegExp(container.includeTags);
        filteredTags = filteredTags.filter((tag) => includeTagsRegex.test(tag));
    }

    // Match exclude tag regex
    if (container.excludeTags) {
        const excludeTagsRegex = new RegExp(container.excludeTags);
        filteredTags = filteredTags.filter(
            (tag) => !excludeTagsRegex.test(tag),
        );
    }

    // Semver image -> find higher semver tag
    if (container.image.tag.semver) {
        if (filteredTags.length === 0) {
            logContainer.warn(
                'No tags found after filtering; check you regex filters',
            );
        }

        // Keep semver only
        filteredTags = filteredTags.filter(
            (tag) =>
                parseSemver(transformTag(container.transformTags, tag)) !==
                null,
        );

        // Keep only greater semver
        filteredTags = filteredTags.filter((tag) =>
            isGreaterSemver(
                transformTag(container.transformTags, tag),
                transformTag(
                    container.transformTags,
                    container.image.tag.value,
                ),
            ),
        );

        // Apply semver sort desc
        filteredTags.sort((t1, t2) => {
            const greater = isGreaterSemver(
                transformTag(container.transformTags, t2),
                transformTag(container.transformTags, t1),
            );
            return greater ? 1 : -1;
        });
    } else {
        // Non semver tag -> do not propose any other registry tag
        filteredTags = [];
    }
    return filteredTags;
}

export function normalizeContainer(container: Container) {
    const containerWithNormalizedImage = container;
    const registryProvider = Object.values(getRegistries()).find((provider) =>
        provider.match(container.image),
    );
    if (!registryProvider) {
        log.warn(`${fullName(container)} - No Registry Provider found`);
        containerWithNormalizedImage.image.registry.name = 'unknown';
    } else {
        containerWithNormalizedImage.image = registryProvider.normalizeImage(
            container.image,
        );
        containerWithNormalizedImage.image.registry.name =
            registryProvider.getId();
    }
    return validateContainer(containerWithNormalizedImage);
}

/**
 * Get the Docker Registry by name.
 * @param registryName
 */
export function getRegistry(registryName: string) {
    const registryToReturn = getRegistries()[registryName];
    if (!registryToReturn) {
        throw new Error(`Unsupported Registry ${registryName}`);
    }
    return registryToReturn;
}

/**
 * Get old containers to prune.
 * @param newContainers
 * @param containersFromTheStore
 */
export function getOldContainers(newContainers: Container[] | undefined, containersFromTheStore: Container[] | undefined) {
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
 * @param newContainers
 * @param containersFromTheStore
 */
function pruneOldContainers(newContainers: Container[], containersFromTheStore: Container[]) {
    const containersToRemove = getOldContainers(
        newContainers,
        containersFromTheStore,
    );
    containersToRemove.forEach((containerToRemove) => {
        deleteContainer(containerToRemove.id);
    });
}

function getContainerName(container: Dockerode.ContainerInfo) {
    let containerName: string = '';
    const names = container.Names;
    if (names && names.length > 0) {
        [containerName] = names;
    }
    // Strip ugly forward slash
    containerName = containerName.replace(/\//, '');
    return containerName;
}

/**
 * Get image repo digest.
 * @param containerImage
 */
function getRepoDigest(containerImage: Dockerode.ImageInspectInfo) {
    if (
        !containerImage.RepoDigests ||
        containerImage.RepoDigests.length === 0
    ) {
        return undefined;
    }
    const fullDigest = containerImage.RepoDigests[0];
    const digestSplit = fullDigest.split('@');
    return digestSplit[1];
}

/**
 * Return true if container must be watched.
 * @param wudWatchLabelValue the value of the wud.watch label
 * @param watchByDefault true if containers must be watched by default
 */
export function isContainerToWatch(wudWatchLabelValue: string, watchByDefault: boolean) {
    return wudWatchLabelValue !== undefined && wudWatchLabelValue !== ''
        ? wudWatchLabelValue.toLowerCase() === 'true'
        : watchByDefault;
}

/**
 * Return true if container digest must be watched.
 * @param wudWatchDigestLabelValue the value of wud.watch.digest label
 * @param isSemver if image is semver
 */
export function isDigestToWatch(wudWatchDigestLabelValue: string, isSemver: boolean) {
    let result = false;
    if (isSemver) {
        if (
            wudWatchDigestLabelValue !== undefined &&
            wudWatchDigestLabelValue !== ''
        ) {
            result = wudWatchDigestLabelValue.toLowerCase() === 'true';
        }
    } else {
        result = true;
        if (
            wudWatchDigestLabelValue !== undefined &&
            wudWatchDigestLabelValue !== ''
        ) {
            result = wudWatchDigestLabelValue.toLowerCase() === 'true';
        }
    }
    return result;
}

export interface DockerConfiguration {
    socket: string;
    host?: string;
    port: number;
    cafile?: string;
    certfile?: string;
    keyfile?: string;
    cron: string;
    watchbydefault: boolean;
    watchall: boolean;
    watchdigest?: any;
    watchevents: boolean;
    watchatstart: boolean;
}

/**
 * Docker Watcher Component.
 */
export class Docker extends Watcher<DockerConfiguration> {
    public dockerApi!: Dockerode;
    private watchCron?: ScheduledTask;
    private watchCronTimeout?: NodeJS.Timeout;
    private watchCronDebounced?: () => void;
    private listenDockerEventsTimeout?: NodeJS.Timeout;

    getConfigurationSchema() {
        return joi.object<DockerConfiguration>().keys({
            socket: this.joi.string().default('/var/run/docker.sock'),
            host: this.joi.string(),
            port: this.joi.number().port().default(2375),
            cafile: this.joi.string(),
            certfile: this.joi.string(),
            keyfile: this.joi.string(),
            cron: joi.string().cron().default('0 * * * *'),
            watchbydefault: this.joi.boolean().default(true),
            watchall: this.joi.boolean().default(false),
            watchdigest: this.joi.any(),
            watchevents: this.joi.boolean().default(true),
            watchatstart: this.joi.boolean().default(true),
        });
    }

    /**
     * Init the Watcher.
     */
    init() {
        this.initWatcher();
        if (this.configuration.watchdigest !== undefined) {
            this.log.warn(
                "WUD_WATCHER_{watcher_name}_WATCHDIGEST environment variable is deprecated and won't be supported in upcoming versions",
            );
        }
        this.log.info(`Cron scheduled (${this.configuration.cron})`);
        this.watchCron = cron.schedule(this.configuration.cron!, () =>
            this.watchFromCron(),
        );

        // Force watchatstart value based on the state store (empty or not)
        this.configuration.watchatstart =
            getContainers().length === 0;

        // watch at startup if enabled (after all components have been registered)
        if (this.configuration.watchatstart) {
            this.watchCronTimeout = setTimeout(
                () => this.watchFromCron(),
                START_WATCHER_DELAY_MS,
            );
        }

        // listen to docker events
        if (this.configuration.watchevents) {
            this.watchCronDebounced = debounce(() => {
                this.watchFromCron();
            }, DEBOUNCED_WATCH_CRON_MS);
            this.listenDockerEventsTimeout = setTimeout(
                () => this.listenDockerEvents(),
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
                ],
            },
        };
        this.dockerApi.getEvents(options, (err, stream) => {
            if (err) {
                this.log.warn(
                    `Unable to listen to Docker events [${err.message}]`,
                );
                this.log.debug(err);
            } else {
                stream!.on('data', (chunk) => this.onDockerEvent(chunk));
            }
        });
    }

    /**
     * Process a docker event.
     */
    async onDockerEvent(dockerEventChunk: string) {
        const dockerEvent = JSON.parse(dockerEventChunk.toString());
        const action = dockerEvent.Action;
        const containerId = dockerEvent.id;

        // If the container was created or destroyed => perform a watch
        if (action === 'destroy' || action === 'create') {
            this.watchCronDebounced!();
        } else {
            // Update container state in db if so
            try {
                const container = await this.dockerApi.getContainer(containerId);
                const containerInspect = await container.inspect();
                const newStatus = containerInspect.State.Status;
                const containerFound = getContainer(containerId);
                if (containerFound) {
                    // Child logger for the container to process
                    const logContainer = this.log.child({
                        container: fullName(containerFound),
                    });
                    const oldStatus = containerFound.status;
                    containerFound.status = newStatus;
                    if (oldStatus !== newStatus) {
                        updateContainer(containerFound);
                        logContainer.info(
                            `Status changed from ${oldStatus} to ${newStatus}`,
                        );
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
            (containerReport) => containerReport.container.error !== undefined,
        ).length;

        const stats = `${containerReportsCount} containers watched, ${containerErrorsCount} errors, ${containerUpdatesCount} available updates`;
        this.log.info(`Cron finished (${stats})`);
        return containerReports;
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
            this.log.warn(
                `Error when trying to get the list of the containers to watch (${e.message})`,
            );
        }
        try {
            const containerReports = await Promise.all(
                containers.map((container) => this.watchContainer(container)),
            );
            event.emitContainerReports(containerReports);
            return containerReports;
        } catch (e: any) {
            this.log.warn(
                `Error when processing some containers (${e.message})`,
            );
            return [];
        } finally {
            // Dispatch event to notify stop watching
            event.emitWatcherStop(this);
        }
    }

    /**
     * Watch a Container.
     * @param container
     */
    async watchContainer(container: Container) {
        // Child logger for the container to process
        const logContainer = this.log.child({ container: fullName(container) });
        const containerWithResult = container;

        // Reset previous results if so
        delete containerWithResult.result;
        delete containerWithResult.error;
        logContainer.debug('Start watching');

        try {
            containerWithResult.result = await this.findNewVersion(
                container,
                logContainer,
            );
        } catch (e: any) {
            logContainer.warn(`Error when processing (${e.message})`);
            logContainer.debug(e);
            containerWithResult.error = {
                message: e.message,
            };
        }

        const containerReport =
            this.mapContainerToContainerReport(containerWithResult);
        event.emitContainerReport(containerReport);
        return containerReport;
    }

    /**
     * Get all containers to watch.
     */
    async getContainers() {
        const listContainersOptions: Dockerode.ContainerListOptions = {};
        if (this.configuration.watchall) {
            listContainersOptions.all = true;
        }
        const containers = await this.dockerApi.listContainers(
            listContainersOptions,
        );

        // Filter on containers to watch
        const filteredContainers = containers.filter((container) =>
            isContainerToWatch(
                container.Labels[WUD_LABELS.wudWatch],
                this.configuration.watchbydefault,
            ),
        );
        const containerPromises = filteredContainers.map((container) =>
            this.addImageDetailsToContainer(
                container,
                container.Labels[WUD_LABELS.wudTagInclude],
                container.Labels[WUD_LABELS.wudTagExclude],
                container.Labels[WUD_LABELS.wudTagTransform],
                container.Labels[WUD_LABELS.wudLinkTemplate],
                container.Labels[WUD_LABELS.wudDisplayName],
                container.Labels[WUD_LABELS.wudDisplayIcon],
                container.Labels[WUD_LABELS.wudTriggerInclude],
                container.Labels[WUD_LABELS.wudTriggerExclude],
            ),
        );
        const containersWithImage = await Promise.all(containerPromises);

        // Return containers to process
        const containersToReturn = containersWithImage.filter(
            (imagePromise) => imagePromise !== undefined,
        );

        // Prune old containers from the store
        try {
            const containersFromTheStore = getContainers({
                watcher: this.name,
            });
            pruneOldContainers(containersToReturn, containersFromTheStore);
        } catch (e: any) {
            this.log.warn(
                `Error when trying to prune the old containers (${e.message})`,
            );
        }
        getWatchContainerGauge()!.set(
            {
                type: this.type,
                name: this.name,
            },
            containersToReturn.length,
        );

        return containersToReturn;
    }

    /**
     * Find new version for a Container.
     */

    async findNewVersion(container: Container, logContainer: Logger) {
        const registryProvider = getRegistry(container.image.registry.name!);
        const result: {
            tag: string;
            digest?: string;
        } = { tag: container.image.tag.value };
        if (!registryProvider) {
            logContainer.error(
                `Unsupported registry (${container.image.registry.name})`,
            );
        } else {
            // Get all available tags
            const tags = await registryProvider.getTags(container.image);

            // Get candidate tags (based on tag name)
            const tagsCandidates = getTagCandidates(
                container,
                tags,
                logContainer,
            );

            // Must watch digest? => Find local/remote digests on registry
            if (container.image.digest.watch && container.image.digest.repo) {
                // If we have a tag candidate BUT we also watch digest
                // (case where local=`mongo:8` and remote=`mongo:8.0.0`),
                // Then get the digest of the tag candidate
                // Else get the digest of the same tag as the local one
                const imageToGetDigestFrom = JSON.parse(
                    JSON.stringify(container.image),
                );
                if (tagsCandidates.length > 0) {
                    [imageToGetDigestFrom.tag.value] = tagsCandidates;
                }

                const remoteDigest =
                    await registryProvider.getImageManifestDigest(
                        imageToGetDigestFrom,
                    );

                result.digest = remoteDigest.digest;

                if (remoteDigest.version === 2) {
                    // Regular v2 manifest => Get manifest digest

                    const digestV2 =
                        await registryProvider.getImageManifestDigest(
                            imageToGetDigestFrom,
                            container.image.digest.repo,
                        );
                    container.image.digest.value = digestV2.digest;
                } else {
                    // Legacy v1 image => take Image digest as reference for comparison
                    const image = await this.dockerApi
                        .getImage(container.image.id)
                        .inspect();
                    container.image.digest.value =
                        image.Config.Image === ''
                            ? undefined
                            : image.Config.Image;
                }
            }

            // The first one in the array is the highest
            if (tagsCandidates && tagsCandidates.length > 0) {
                [result.tag] = tagsCandidates;
            }

            return result;
        }
    }

    /**
     * Add image detail to Container.
     * @param container
     * @param includeTags
     * @param excludeTags
     * @param transformTags
     * @param linkTemplate
     * @param displayName
     * @param displayIcon
     */
    async addImageDetailsToContainer(
        container: Dockerode.ContainerInfo,
        includeTags?: string,
        excludeTags?: string,
        transformTags?: string,
        linkTemplate?: string,
        displayName?: string,
        displayIcon?: string,
        triggerInclude?: string,
        triggerExclude?: string,
    ) {
        const containerId = container.Id;

        // Is container already in store? just return it :)
        const containerInStore = getContainer(containerId);
        if (
            containerInStore !== undefined &&
            containerInStore.error === undefined
        ) {
            this.log.debug(`Container ${containerInStore.id} already in store`);
            return containerInStore;
        }

        // Get container image details
        const dockerImage = this.dockerApi.getImage(container.Image);
        const image = await dockerImage.inspect();

        // Get useful properties
        const containerName = getContainerName(container);
        const status = container.State;
        const architecture = image.Architecture;
        const os = image.Os;
        const variant = image.Variant;
        const created = image.Created;
        const repoDigest = getRepoDigest(image);
        const imageId = image.Id;

        // Parse image to get registry, organization...
        let imageNameToParse = container.Image;
        if (imageNameToParse.includes('sha256:')) {
            if (!image.RepoTags || image.RepoTags.length === 0) {
                this.log.warn(
                    `Cannot get a reliable tag for this image [${imageNameToParse}]`,
                );
                return Promise.resolve();
            }
            // Get the first repo tag (better than nothing ;)
            [imageNameToParse] = image.RepoTags;
        }
        const parsedImage = parse(imageNameToParse);
        const tagName = parsedImage.tag || 'latest';
        const parsedTag = parseSemver(transformTag(transformTags, tagName));
        const isSemver = parsedTag !== null && parsedTag !== undefined;
        const watchDigest = isDigestToWatch(
            container.Labels[WUD_LABELS.wudWatchDigest],
            isSemver,
        );
        if (!isSemver && !watchDigest) {
            this.log.warn(
                "Image is not a semver and digest watching is disabled so wud won't report any update. Please review the configuration to enable digest watching for this container or exclude this container from being watched",
            );
        }
        return normalizeContainer({
            id: containerId,
            name: containerName,
            status,
            watcher: this.name,
            includeTags,
            excludeTags,
            transformTags,
            linkTemplate,
            displayName,
            displayIcon,
            triggerInclude,
            triggerExclude,
            image: {
                id: imageId,
                registry: {
                    url: parsedImage.domain!,
                },
                name: parsedImage.path!,
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
            labels: container.Labels,
            result: {
                tag: tagName,
            },
        });
    }

    /**
     * Process a Container with result and map to a containerReport.
     * @param containerWithResult
     */
    mapContainerToContainerReport(containerWithResult: Container) {
        const logContainer = this.log.child({
            container: fullName(containerWithResult),
        });
        const containerReport: { container: Container, changed?: boolean } = {
            container: containerWithResult,
            changed: false,
        };

        // Find container in db & compare
        const containerInDb = getContainer(
            containerWithResult.id,
        );

        // Not found in DB? => Save it
        if (!containerInDb) {
            logContainer.debug('Container watched for the first time');
            containerReport.container =
                insertContainer(containerWithResult);
            containerReport.changed = true;

            // Found in DB? => update it
        } else {
            containerReport.container = updateContainer(containerWithResult);
            containerReport.changed = containerInDb.resultChanged!(containerReport.container) &&
                containerWithResult.updateAvailable;
        }
        return containerReport;
    }
}