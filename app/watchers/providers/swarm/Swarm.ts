import fs from 'fs';
import Dockerode from 'dockerode';
import Joi from 'joi';
import JoiCronExpression from 'joi-cron-expression';
const joi = JoiCronExpression(Joi);
import cron from 'node-cron';
import parse from 'parse-docker-image-name';
import { Logger } from 'pino';
import {
    parse as parseSemver,
    isGreater as isGreaterSemver,
    transform as transformTag,
} from '../../../tag';
import * as event from '../../../event';
import {
    dockerStackNamespace,
    dockerStackImage,
    KEY_WATCH,
    KEY_TAG_INCLUDE,
    KEY_TAG_EXCLUDE,
    KEY_TAG_TRANSFORM,
    KEY_WATCH_DIGEST,
    KEY_LINK_TEMPLATE,
    KEY_DISPLAY_NAME,
    KEY_DISPLAY_ICON,
    KEY_TRIGGER_INCLUDE,
    KEY_TRIGGER_EXCLUDE,
    KEY_STACK,
    KEY_WATCH_DELAY,
    KEY_TAG_DELAY,
    getLabelValue,
} from './label';
import * as storeContainer from '../../../store/container';
import {
    validate as validateContainer,
    fullName,
    Container,
} from '../../../model/container';
import * as registry from '../../../registry';
import { getWatchContainerGauge } from '../../../prometheus/watcher';
import Watcher from '../../Watcher';
import { ComponentConfiguration } from '../../../registry/Component';

export interface SwarmWatcherConfiguration extends ComponentConfiguration {
    socket: string;
    host?: string;
    port: number;
    cafile?: string;
    certfile?: string;
    keyfile?: string;
    cron: string;
    jitter: number;
    watchbydefault: boolean;
    watchdigestdefault?: boolean;
    watchatstart: boolean;
    stacks: string[];
}

const START_WATCHER_DELAY_MS = 1000;

export function isServiceToWatch(
    watchLabelValue: string | undefined,
    watchByDefault: boolean,
): boolean {
    if (watchLabelValue !== undefined && watchLabelValue !== '') {
        return watchLabelValue.toLowerCase() === 'true';
    }
    return watchByDefault;
}

export function buildContainerId(
    watcherName: string,
    serviceName: string,
    stack?: string,
): string {
    return stack
        ? `${watcherName}_${stack}_${serviceName}`
        : `${watcherName}_${serviceName}`;
}

export function extractDigestFromImage(imageSpec?: string): string | undefined {
    if (!imageSpec) return undefined;
    const atIndex = imageSpec.indexOf('@sha256:');
    if (atIndex !== -1) {
        return imageSpec.substring(atIndex + 1);
    }
    return undefined;
}

export class Swarm extends Watcher {
    public configuration: SwarmWatcherConfiguration =
        {} as SwarmWatcherConfiguration;
    docker!: Dockerode;
    watchCron: any;
    watchCronTimeout: any;

    getConfigurationSchema() {
        return joi
            .object({
                socket: this.joi.string().default('/var/run/docker.sock'),
                host: this.joi.string().hostname().allow('').optional(),
                port: this.joi.number().port().default(2375),
                cafile: this.joi.string().allow('').optional(),
                certfile: this.joi.string().allow('').optional(),
                keyfile: this.joi.string().allow('').optional(),
                cron: joi.string().cron().default('0 * * * *'),
                jitter: this.joi.number().integer().min(0).default(60000),
                watchbydefault: this.joi.boolean().default(true),
                watchdigestdefault: this.joi.boolean().optional(),
                watchatstart: this.joi.boolean().default(true),
                stacks: this.joi
                    .alternatives([
                        this.joi.array().items(this.joi.string()),
                        this.joi
                            .string()
                            .empty('')
                            .custom((val) =>
                                val.split(',').map((s) => s.trim()),
                            ),
                    ])
                    .default([]),
            })
            .unknown(true);
    }

    async init() {
        this.initDockerClient();

        this.log.info(`Cron scheduled (${this.configuration.cron})`);
        this.watchCron = cron.schedule(
            this.configuration.cron,
            () => this.watchFromCron(),
            { maxRandomDelay: this.configuration.jitter },
        );

        this.configuration.watchatstart =
            this.configuration.watchatstart &&
            storeContainer.getContainers().length === 0;

        if (this.configuration.watchatstart) {
            this.watchCronTimeout = setTimeout(
                this.watchFromCron.bind(this),
                START_WATCHER_DELAY_MS,
            );
        }
    }

    async deregisterComponent() {
        if (this.watchCron) {
            this.watchCron.stop();
            delete this.watchCron;
        }
        if (this.watchCronTimeout) {
            clearTimeout(this.watchCronTimeout);
        }
    }

    initDockerClient() {
        if (this.configuration.host) {
            const options: Dockerode.DockerOptions = {
                host: this.configuration.host,
                port: this.configuration.port,
                ca: this.configuration.cafile
                    ? fs.readFileSync(this.configuration.cafile)
                    : undefined,
                cert: this.configuration.certfile
                    ? fs.readFileSync(this.configuration.certfile)
                    : undefined,
                key: this.configuration.keyfile
                    ? fs.readFileSync(this.configuration.keyfile)
                    : undefined,
            };
            this.docker = new Dockerode(options);
        } else {
            this.docker = new Dockerode({
                socketPath: this.configuration.socket,
            });
        }
    }

    async getClusterArchitecture(): Promise<string> {
        try {
            const nodes = await this.docker.listNodes();
            if (nodes && nodes.length > 0) {
                const arch = nodes[0]?.Description?.Platform?.Architecture;
                if (arch) {
                    return arch === 'x86_64' ? 'amd64' : arch;
                }
            }
        } catch (e: any) {
            this.log.debug(`Unable to fetch Swarm nodes: ${e.message}`);
        }

        try {
            const info = await this.docker.info();
            if (info?.Architecture) {
                return info.Architecture === 'x86_64'
                    ? 'amd64'
                    : info.Architecture;
            }
        } catch (e: any) {
            this.log.debug(`Unable to fetch Docker info: ${e.message}`);
        }

        return 'amd64';
    }

    async getContainers(): Promise<Container[]> {
        let services: any[] = [];
        try {
            services = await this.docker.listServices();
        } catch (e: any) {
            if (
                e.message &&
                e.message.toLowerCase().includes('not a swarm manager')
            ) {
                this.log.warn(
                    `Docker node is not a Swarm manager (${e.message}). Skipping Swarm watcher cycle.`,
                );
                return [];
            }
            throw new Error(`Failed to list Swarm services: ${e.message}`);
        }

        const architecture = await this.getClusterArchitecture();
        const currentContainers: Container[] = [];

        for (const service of services) {
            const serviceName = service.Spec?.Name;
            if (!serviceName) continue;

            const serviceLabels: Record<string, string> =
                service.Spec?.Labels || {};
            const containerLabels: Record<string, string> =
                service.Spec?.TaskTemplate?.ContainerSpec?.Labels || {};

            // Merged labels: container labels override service labels
            const mergedLabels = {
                ...serviceLabels,
                ...containerLabels,
            };

            const stack =
                mergedLabels[dockerStackNamespace] ||
                getLabelValue(mergedLabels, KEY_STACK) ||
                '';

            // Filter by stack if configured
            if (
                this.configuration.stacks &&
                this.configuration.stacks.length > 0 &&
                (!stack || !this.configuration.stacks.includes(stack))
            ) {
                this.log.debug(
                    `Service ${serviceName} skipped (stack '${stack}' not in configured stacks)`,
                );
                continue;
            }

            const watchVal = getLabelValue(mergedLabels, KEY_WATCH);
            if (
                !isServiceToWatch(watchVal, this.configuration.watchbydefault)
            ) {
                this.log.debug(`Service ${serviceName} is not to be watched`);
                continue;
            }

            // Determine image name, tag, and digest
            const fullImageSpec: string =
                service.Spec?.TaskTemplate?.ContainerSpec?.Image || '';
            if (!fullImageSpec) {
                this.log.warn(`Service ${serviceName} has no image specified`);
                continue;
            }

            // Digest can be pinned directly in the image spec
            const pinnedDigest = extractDigestFromImage(fullImageSpec);

            // User's original stack image (if deployed with docker stack deploy)
            const stackOriginalImage = serviceLabels[dockerStackImage];

            // Image string without @sha256:
            const imageWithoutDigest = fullImageSpec.split('@')[0];
            const imageToParse = stackOriginalImage || imageWithoutDigest;

            let parsedImage = parse(imageToParse);
            const tagName =
                parsedImage && parsedImage.tag ? parsedImage.tag : 'latest';

            if (!parsedImage) {
                parsedImage = {
                    domain: '',
                    path: imageToParse,
                    tag: tagName,
                };
            }

            const containerId = buildContainerId(
                this.name,
                serviceName,
                stack || undefined,
            );

            const containerInStore = storeContainer.getContainer(containerId);
            if (
                containerInStore !== undefined &&
                containerInStore.error === undefined
            ) {
                currentContainers.push(containerInStore);
                continue;
            }

            const includeTags = getLabelValue(mergedLabels, KEY_TAG_INCLUDE);
            const excludeTags = getLabelValue(mergedLabels, KEY_TAG_EXCLUDE);
            const transformTags = getLabelValue(
                mergedLabels,
                KEY_TAG_TRANSFORM,
            );
            const linkTemplate = getLabelValue(mergedLabels, KEY_LINK_TEMPLATE);
            const displayName = getLabelValue(mergedLabels, KEY_DISPLAY_NAME);
            const displayIcon =
                getLabelValue(mergedLabels, KEY_DISPLAY_ICON) || 'mdi:docker';
            const triggerInclude = getLabelValue(
                mergedLabels,
                KEY_TRIGGER_INCLUDE,
            );
            const triggerExclude = getLabelValue(
                mergedLabels,
                KEY_TRIGGER_EXCLUDE,
            );
            const delay =
                getLabelValue(mergedLabels, KEY_WATCH_DELAY) ||
                getLabelValue(mergedLabels, KEY_TAG_DELAY);

            const parsedTag = parseSemver(transformTag(transformTags, tagName));
            const isSemver = parsedTag !== null && parsedTag !== undefined;

            const watchDigestLabel = getLabelValue(
                mergedLabels,
                KEY_WATCH_DIGEST,
            );
            let watchDigest = false;
            if (!isSemver) {
                if (watchDigestLabel !== undefined) {
                    watchDigest = watchDigestLabel.toLowerCase() === 'true';
                } else if (
                    this.configuration.watchdigestdefault !== undefined
                ) {
                    watchDigest = this.configuration.watchdigestdefault;
                }
            }

            const rawContainer: any = {
                id: containerId,
                name: serviceName,
                watcher: this.name,
                includeTags,
                excludeTags,
                transformTags,
                linkTemplate,
                displayName: displayName || serviceName,
                displayIcon,
                triggerInclude,
                triggerExclude,
                delay,
                image: {
                    id: fullImageSpec,
                    name: parsedImage.path,
                    registry: {
                        url: parsedImage.domain || 'registry-1.docker.io',
                        name: 'unknown',
                    },
                    tag: {
                        value: tagName,
                        semver: isSemver,
                    },
                    digest: {
                        watch: watchDigest,
                        repo: pinnedDigest,
                        value: pinnedDigest,
                    },
                    architecture,
                    os: 'linux',
                },
                labels: mergedLabels,
                stack: stack || undefined,
                snoozedVersion: containerInStore?.snoozedVersion,
                snoozedUntil: containerInStore?.snoozedUntil,
                result: containerInStore?.result ?? { tag: tagName },
                updateAvailable: false,
                updateKind: { kind: 'unknown' },
            };

            const normalized = this.normalizeContainer(rawContainer);
            const validated = validateContainer(normalized);
            currentContainers.push(validated);
        }

        // Prune removed services from container store
        const currentContainerIds = new Set(currentContainers.map((c) => c.id));
        const storedContainers = storeContainer.getContainers({
            watcher: this.name,
        });

        for (const stored of storedContainers) {
            if (!currentContainerIds.has(stored.id)) {
                this.log.info(
                    `Service ${stored.name} no longer exists in Swarm; pruning from store`,
                );
                storeContainer.deleteContainer(stored.id);
            }
        }

        return currentContainers;
    }

    async findNewVersion(
        container: Container,
        logContainer: any = this.log.child({ container: fullName(container) }),
    ): Promise<any> {
        const registryProvider =
            registry.getState().registry[container.image.registry.name];
        const result: any = { tag: container.image.tag.value };

        if (!registryProvider) {
            throw new Error(
                `Unsupported registry (${container.image.registry.name})`,
            );
        }

        const watchDigest =
            !container.image.tag.semver &&
            registryProvider.shouldWatchDigest(
                getLabelValue(container.labels, KEY_WATCH_DIGEST),
                container.image.name,
                this.configuration.watchdigestdefault,
            );

        if (!container.image.tag.semver && !watchDigest) {
            logContainer.warn(
                `Image ${container.image.name} is not semver and digest watching is disabled. ` +
                    `Configure getwud.app/watch.digest=true on the service or set watchdigestdefault.`,
            );
        }

        const tags =
            container.image.tag.semver || container.includeTags
                ? await registryProvider.getTags(container.image)
                : [];

        const tagsCandidates = this.getTagCandidates(
            container,
            tags,
            logContainer,
        );

        if (tagsCandidates.length > 0) {
            result.tag = tagsCandidates[0];
        }

        if (watchDigest && container.image.digest.repo) {
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
            result.created = remoteDigest.created;

            if (remoteDigest.version === 2) {
                const digestV2 = await registryProvider.getImageManifestDigest(
                    imageToGetDigestFrom,
                    container.image.digest.repo,
                );
                container.image.digest.value = digestV2.digest;
            } else {
                container.image.digest.value = container.image.digest.repo;
            }
        }

        return result;
    }

    async watchContainer(container: Container) {
        const logContainer = this.log.child({
            container: fullName(container),
        }) as Logger;
        const containerWithResult = container;

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
            containerWithResult.error = { message: e.message };
        }

        const containerReport =
            this.mapContainerToContainerReport(containerWithResult);
        event.emitContainerReport(containerReport);
        return containerReport;
    }

    mapContainerToContainerReport(containerWithResult: Container) {
        const logContainer = this.log.child({
            container: fullName(containerWithResult),
        });
        const containerReport = {
            container: containerWithResult,
            changed: false,
        };

        const containerInDb = storeContainer.getContainer(
            containerWithResult.id,
        );

        if (!containerInDb) {
            logContainer.debug('Container watched for the first time');
            containerReport.container =
                storeContainer.insertContainer(containerWithResult);
            containerReport.changed = true;
        } else {
            containerReport.container =
                storeContainer.updateContainer(containerWithResult);
            containerReport.changed =
                containerInDb.resultChanged(containerReport.container) &&
                containerWithResult.updateAvailable;
        }
        return containerReport;
    }

    async watch() {
        let containers: Container[] = [];
        event.emitWatcherStart(this);

        try {
            containers = await this.getContainers();
        } catch (e: any) {
            this.log.warn(`Error getting Swarm services: ${e.message}`);
        }

        try {
            const containerReports = await Promise.all(
                containers.map((container) => this.watchContainer(container)),
            );
            event.emitContainerReports(containerReports);
            this.updatePrometheusGauge(containers);
            return containerReports;
        } catch (e: any) {
            this.log.warn(
                `Error when processing some Swarm containers (${e.message})`,
            );
            return [];
        } finally {
            event.emitWatcherStop(this);
        }
    }

    async watchFromCron() {
        if (!this.log || typeof this.log.info !== 'function') return [];
        this.log.info(`Cron started (${this.configuration.cron})`);
        const containerReports = await this.watch();
        const total = containerReports.length;
        const errors = containerReports.filter(
            (report) => report.container.error !== undefined,
        ).length;
        const updates = containerReports.filter(
            (report) => report.container.updateAvailable,
        ).length;
        this.log.info(
            `Cron finished (${total} containers watched, ${errors} errors, ${updates} available updates)`,
        );
        return containerReports;
    }

    private getTagCandidates(
        container: Container,
        tags: string[],
        logContainer: Logger,
    ): string[] {
        let filteredTags = tags;

        if (container.includeTags) {
            const includeTagsRegex = new RegExp(container.includeTags);
            filteredTags = filteredTags.filter((tag) =>
                includeTagsRegex.test(tag),
            );
        }

        if (container.excludeTags) {
            const excludeTagsRegex = new RegExp(container.excludeTags);
            filteredTags = filteredTags.filter(
                (tag) => !excludeTagsRegex.test(tag),
            );
        }

        if (container.image.tag.semver) {
            if (filteredTags.length === 0) {
                logContainer.warn(
                    'No tags found on remote registry; check your regex filters',
                );
            }

            if (!container.includeTags) {
                const currentTag = container.image.tag.value;
                const match = currentTag.match(/^(.*?)(\d+.*)$/);
                const currentPrefix = match ? match[1] : '';

                if (currentPrefix) {
                    filteredTags = filteredTags.filter((tag) =>
                        tag.startsWith(currentPrefix),
                    );
                } else {
                    filteredTags = filteredTags.filter((tag) =>
                        /^\d/.test(tag),
                    );
                }

                if (filteredTags.length === 0) {
                    logContainer.warn(
                        currentPrefix
                            ? `No tags found with existing prefix: '${currentPrefix}'; check your regex filters`
                            : 'No tags found starting with a number (no prefix); check your regex filters',
                    );
                }
            }

            filteredTags = filteredTags.filter(
                (tag) =>
                    parseSemver(transformTag(container.transformTags, tag)) !==
                    null,
            );

            const numericPart =
                container.image.tag.value.match(/(\d+(\.\d+)*)/);
            if (numericPart) {
                const referenceGroups = numericPart[0].split('.').length;
                filteredTags = filteredTags.filter((tag) => {
                    const tagNumericPart = tag.match(/(\d+(\.\d+)*)/);
                    if (!tagNumericPart) return false;
                    return (
                        tagNumericPart[0].split('.').length === referenceGroups
                    );
                });
            }

            filteredTags = filteredTags.filter((tag) => {
                const tagTransformed = transformTag(
                    container.transformTags,
                    tag,
                );
                const currentTransformed = transformTag(
                    container.transformTags,
                    container.image.tag.value,
                );
                return (
                    tagTransformed !== currentTransformed &&
                    isGreaterSemver(tagTransformed, currentTransformed)
                );
            });

            filteredTags.sort((t1, t2) => {
                const greater = isGreaterSemver(
                    transformTag(container.transformTags, t2),
                    transformTag(container.transformTags, t1),
                );
                return greater ? 1 : -1;
            });
        } else {
            filteredTags = [];
        }

        return filteredTags;
    }

    private normalizeContainer(container: Container): Container {
        const containerWithNormalizedImage = container;
        const registryProvider = Object.values(
            registry.getState().registry,
        ).find((provider) => provider.match(container.image.registry.url));
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

    private updatePrometheusGauge(containers: Container[]) {
        const gauge = getWatchContainerGauge();
        if (gauge) {
            gauge.set({ type: this.type, name: this.name }, containers.length);
        }
    }
}

export default Swarm;
