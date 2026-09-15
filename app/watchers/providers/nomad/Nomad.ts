import fs from 'fs';
import https from 'https';
import Joi from 'joi';
import JoiCronExpression from 'joi-cron-expression';
const joi = JoiCronExpression(Joi);
import cron from 'node-cron';
import axios, { AxiosInstance } from 'axios';
import parse from 'parse-docker-image-name';
import { Logger } from 'pino';
import {
    parse as parseSemver,
    isGreater as isGreaterSemver,
    transform as transformTag,
} from '../../../tag';
import * as event from '../../../event';
import {
    wudWatch,
    wudWatchCanonical,
    wudTagInclude,
    wudTagIncludeCanonical,
    wudTagExclude,
    wudTagExcludeCanonical,
    wudTagTransform,
    wudTagTransformCanonical,
    wudWatchDigest,
    wudWatchDigestCanonical,
    wudLinkTemplate,
    wudLinkTemplateCanonical,
    wudDisplayName,
    wudDisplayNameCanonical,
    wudDisplayIcon,
    wudDisplayIconCanonical,
    wudTriggerInclude,
    wudTriggerIncludeCanonical,
    wudTriggerExclude,
    wudTriggerExcludeCanonical,
    wudStack,
    wudStackCanonical,
    getMetaValue,
} from './annotation';
import * as storeContainer from '../../../store/container';
import {
    validate as validateContainer,
    fullName,
    Container,
} from '../../../model/container';
import * as registry from '../../../registry';
import { getWatchContainerGauge } from '../../../prometheus/watcher';
import Watcher from '../../Watcher';
import Component, { ComponentConfiguration } from '../../../registry/Component';

// ─── Types & constants ────────────────────────────────────────────────────────

export interface NomadWatcherConfiguration extends ComponentConfiguration {
    url: string;
    token?: string;
    namespace: string;
    cron: string;
    jitter: number;
    watchbydefault: boolean;
    watchdigestdefault?: boolean;
    watchatstart: boolean;
    cafile?: string;
    certfile?: string;
    keyfile?: string;
    drivers: string[];
}

export interface NomadJobSummary {
    ID: string;
    Name: string;
    Namespace?: string;
    Type: string;
    Status: string;
    Stop: boolean;
}

export interface NomadJob {
    ID: string;
    Name: string;
    Namespace?: string;
    Type: string;
    Status: string;
    Stop: boolean;
    Meta?: Record<string, string> | null;
    TaskGroups?: NomadTaskGroup[] | null;
}

export interface NomadTaskGroup {
    Name: string;
    Count?: number;
    Meta?: Record<string, string> | null;
    Tasks?: NomadTask[] | null;
}

export interface NomadTask {
    Name: string;
    Driver: string;
    Config?: {
        image?: string;
        [key: string]: any;
    } | null;
    Meta?: Record<string, string> | null;
}

const START_WATCHER_DELAY_MS = 1000;

// ─── Pure helper functions ───────────────────────────────────────────────────

/**
 * Return all supported registries from the WUD registry state.
 */
function getRegistries() {
    return registry.getState().registry;
}

/**
 * Determine if a task should be watched based on the meta value and watchByDefault.
 */
export function isTaskToWatch(
    watchMetaValue: string | undefined,
    watchByDefault: boolean,
): boolean {
    if (watchMetaValue !== undefined && watchMetaValue !== '') {
        return watchMetaValue.toLowerCase() === 'true';
    }
    return watchByDefault;
}

/**
 * Build a unique WUD container ID for a Nomad task.
 * Format: {namespace}_{jobName}_{groupName}_{taskName} (lowercased, sanitized).
 */
export function buildContainerId(
    namespace: string,
    jobName: string,
    groupName: string,
    taskName: string,
): string {
    const raw =
        `${namespace}_${jobName}_${groupName}_${taskName}`.toLowerCase();
    return raw.replace(/[^a-z0-9_-]/g, '_');
}

/**
 * Extract sha256 digest from image string if specified with @sha256:...
 */
export function extractDigestFromImage(image: string): string | undefined {
    if (!image) return undefined;
    const atIndex = image.lastIndexOf('@');
    if (atIndex === -1) return undefined;
    const digestPart = image.substring(atIndex + 1);
    if (digestPart.startsWith('sha256:')) return digestPart;
    return undefined;
}

/**
 * Get old containers (present in store but no longer discovered) to prune.
 */
function getOldContainers(
    newContainers: Container[],
    containersFromTheStore: Container[],
): Container[] {
    if (!containersFromTheStore || !newContainers) return [];
    return containersFromTheStore.filter((containerFromStore) => {
        const isStillToWatch = newContainers.find(
            (newContainer) => newContainer.id === containerFromStore.id,
        );
        return isStillToWatch === undefined;
    });
}

/**
 * Prune containers that are no longer watched from the store.
 */
function pruneOldContainers(
    newContainers: Container[],
    containersFromTheStore: Container[],
): void {
    const containersToRemove = getOldContainers(
        newContainers,
        containersFromTheStore,
    );
    containersToRemove.forEach((containerToRemove) => {
        storeContainer.deleteContainer(containerToRemove.id);
    });
}

// ─── Main Class ──────────────────────────────────────────────────────────────

/**
 * HashiCorp Nomad Watcher Component.
 *
 * Watches Nomad jobs and task groups running container images (Docker, Podman)
 * and reports update availability using the WUD pipeline.
 */
export class Nomad extends Watcher {
    public configuration: NomadWatcherConfiguration =
        {} as NomadWatcherConfiguration;

    public apiClient!: AxiosInstance;
    public watchCron: any;
    public watchCronTimeout: any;

    // ─── Configuration Schema ─────────────────────────────────────────────────

    getConfigurationSchema() {
        return joi.object().keys({
            /** Nomad HTTP API URL. */
            url: this.joi
                .string()
                .uri({ scheme: ['http', 'https'] })
                .default('http://localhost:4646'),

            /** Nomad ACL secret token (optional). */
            token: this.joi.string().allow('').default(''),

            /** Nomad namespace to watch ('*' for all namespaces, or a specific namespace). */
            namespace: this.joi.string().default('*'),

            /** Cron schedule for periodic polling. */
            cron: joi.string().cron().default('0 * * * *'),

            /** Random jitter in ms applied to the cron schedule. */
            jitter: this.joi.number().integer().min(0).default(60000),

            /** If true, watch all tasks by default (unless wud.watch=false). */
            watchbydefault: this.joi.boolean().default(true),

            /** If true, watch image digest by default for non-semver images. */
            watchdigestdefault: this.joi.boolean().optional(),

            /** If true, run a watch cycle at start if the store is empty. */
            watchatstart: this.joi.boolean().default(true),

            /** Optional CA certificate path for HTTPS. */
            cafile: this.joi.string().allow('').default(''),

            /** Optional client certificate path for mTLS. */
            certfile: this.joi.string().allow('').default(''),

            /** Optional client key path for mTLS. */
            keyfile: this.joi.string().allow('').default(''),

            /** List of task drivers to inspect for container images. */
            drivers: this.joi
                .array()
                .items(this.joi.string())
                .default(['docker', 'podman']),
        });
    }

    /**
     * Mask sensitive values in configuration logs.
     */
    maskConfiguration(
        configuration?: ComponentConfiguration,
    ): ComponentConfiguration {
        const conf = { ...(configuration || this.configuration) };
        if (conf.token) {
            conf.token = Component.mask(conf.token);
        }
        return conf;
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    async init() {
        this.initApiClient();

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

    initApiClient() {
        let httpsAgent: https.Agent | undefined;
        if (
            this.configuration.cafile ||
            this.configuration.certfile ||
            this.configuration.keyfile
        ) {
            httpsAgent = new https.Agent({
                ca: this.configuration.cafile
                    ? fs.readFileSync(this.configuration.cafile)
                    : undefined,
                cert: this.configuration.certfile
                    ? fs.readFileSync(this.configuration.certfile)
                    : undefined,
                key: this.configuration.keyfile
                    ? fs.readFileSync(this.configuration.keyfile)
                    : undefined,
                rejectUnauthorized: true,
            });
        }

        const headers: Record<string, string> = {};
        if (this.configuration.token) {
            headers['X-Nomad-Token'] = this.configuration.token;
        }

        this.apiClient = axios.create({
            baseURL: this.configuration.url.replace(/\/$/, ''),
            headers,
            httpsAgent,
            timeout: 10000,
        });
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

    // ─── Watch execution ──────────────────────────────────────────────────────

    async watchFromCron() {
        if (!this.log || typeof this.log.info !== 'function') return [];

        this.log.info(`Cron started (${this.configuration.cron})`);
        const containerReports = await this.watch();

        const total = containerReports.length;
        const updates = containerReports.filter(
            (r) => r.container.updateAvailable,
        ).length;
        const errors = containerReports.filter(
            (r) => r.container.error !== undefined,
        ).length;

        this.log.info(
            `Cron finished (${total} containers watched, ${errors} errors, ${updates} available updates)`,
        );
        return containerReports;
    }

    async watch() {
        let containers: Container[] = [];

        event.emitWatcherStart(this);

        try {
            containers = await this.getContainers();
        } catch (e: any) {
            this.log.warn(
                `Error when trying to get the list of Nomad workloads to watch (${e.message})`,
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
                `Error when processing some Nomad containers (${e.message})`,
            );
            return [];
        } finally {
            event.emitWatcherStop(this);
        }
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

    // ─── Discovery & Mapping ──────────────────────────────────────────────────

    async getContainers(): Promise<Container[]> {
        const jobs = await this.listJobs();
        const architecture = await this.getClusterArchitecture();

        const containerPromises: Promise<Container>[] = [];

        for (const job of jobs) {
            const jobNamespace = job.Namespace || 'default';
            const taskGroups = job.TaskGroups || [];

            for (const group of taskGroups) {
                const tasks = group.Tasks || [];

                for (const task of tasks) {
                    const isSupportedDriver =
                        !task.Driver ||
                        this.configuration.drivers.includes(task.Driver) ||
                        Boolean(task.Config?.image);

                    const imageName = task.Config?.image;
                    if (!isSupportedDriver || !imageName) {
                        continue;
                    }

                    // Resolve metadata with cascading priority: Task > TaskGroup > Job
                    const mergedMeta: Record<string, string> = {
                        ...(job.Meta || {}),
                        ...(group.Meta || {}),
                        ...(task.Meta || {}),
                    };

                    const watchVal = getMetaValue(
                        mergedMeta,
                        wudWatch,
                        wudWatchCanonical,
                        task.Name,
                    );

                    if (
                        !isTaskToWatch(
                            watchVal,
                            this.configuration.watchbydefault,
                        )
                    ) {
                        continue;
                    }

                    containerPromises.push(
                        this.mapNomadTaskToWudContainer({
                            job,
                            group,
                            task,
                            namespace: jobNamespace,
                            imageName,
                            mergedMeta,
                            architecture,
                        }),
                    );
                }
            }
        }

        const resolvedContainers = (
            await Promise.all(
                containerPromises.map((p) =>
                    p.catch((e) => {
                        this.log.warn(
                            `Failed to map Nomad container: ${e.message}`,
                        );
                        return undefined;
                    }),
                ),
            )
        ).filter(
            (c): c is Container => c !== undefined && !(c instanceof Error),
        );

        // Prune old containers from store
        try {
            const containersFromStore = storeContainer.getContainers({
                watcher: this.name,
            });
            pruneOldContainers(resolvedContainers, containersFromStore);
        } catch (e: any) {
            this.log.warn(
                `Error when trying to prune old containers (${e.message})`,
            );
        }

        this.updatePrometheusGauge(resolvedContainers);
        return resolvedContainers;
    }

    /**
     * Fetch all active jobs from Nomad API.
     */
    async listJobs(): Promise<NomadJob[]> {
        const queryParams = new URLSearchParams();
        if (this.configuration.namespace) {
            queryParams.append('namespace', this.configuration.namespace);
        }

        const url = `/v1/jobs?${queryParams.toString()}`;
        const response = await this.apiClient.get<NomadJobSummary[]>(url);
        const summaries = response.data || [];

        // Filter out stopped/dead jobs
        const activeSummaries = summaries.filter(
            (j) => !j.Stop && j.Status !== 'dead',
        );

        // Fetch full definition for each job
        const jobPromises = activeSummaries.map(async (summary) => {
            const ns = summary.Namespace || 'default';
            try {
                const jobUrl = `/v1/job/${encodeURIComponent(summary.ID)}?namespace=${encodeURIComponent(ns)}`;
                const jobRes = await this.apiClient.get<NomadJob>(jobUrl);
                return jobRes.data;
            } catch (e: any) {
                this.log.warn(
                    `Failed to fetch details for Nomad job ${summary.ID} (${e.message})`,
                );
                return undefined;
            }
        });

        const detailedJobs = await Promise.all(jobPromises);
        return detailedJobs.filter((j): j is NomadJob => j !== undefined);
    }

    /**
     * Map a Nomad task to a normalized WUD Container.
     */
    async mapNomadTaskToWudContainer({
        job,
        group,
        task,
        namespace,
        imageName,
        mergedMeta,
        architecture,
    }: {
        job: NomadJob;
        group: NomadTaskGroup;
        task: NomadTask;
        namespace: string;
        imageName: string;
        mergedMeta: Record<string, string>;
        architecture: string;
    }): Promise<Container> {
        const getMeta = (base: string, canonical: string) =>
            getMetaValue(mergedMeta, base, canonical, task.Name);

        const includeTags = getMeta(wudTagInclude, wudTagIncludeCanonical);
        const excludeTags = getMeta(wudTagExclude, wudTagExcludeCanonical);
        const transformTags = getMeta(
            wudTagTransform,
            wudTagTransformCanonical,
        );
        const linkTemplate = getMeta(wudLinkTemplate, wudLinkTemplateCanonical);
        const displayName = getMeta(wudDisplayName, wudDisplayNameCanonical);
        const displayIcon = getMeta(wudDisplayIcon, wudDisplayIconCanonical);
        const triggerInclude = getMeta(
            wudTriggerInclude,
            wudTriggerIncludeCanonical,
        );
        const triggerExclude = getMeta(
            wudTriggerExclude,
            wudTriggerExcludeCanonical,
        );
        const stack =
            getMeta(wudStack, wudStackCanonical) ??
            (namespace !== 'default' ? namespace : job.Name);

        const containerId = buildContainerId(
            namespace,
            job.Name,
            group.Name,
            task.Name,
        );

        const containerInStore = storeContainer.getContainer(containerId);
        if (
            containerInStore !== undefined &&
            containerInStore.error === undefined
        ) {
            this.log.debug(`Container ${containerId} already in store`);
            return containerInStore;
        }

        let parsedImage = parse(imageName);
        const tagName =
            parsedImage && parsedImage.tag ? parsedImage.tag : 'latest';

        if (!parsedImage) {
            parsedImage = { domain: '', path: imageName, tag: tagName };
        }

        const parsedTag = parseSemver(transformTag(transformTags, tagName));
        const isSemver = parsedTag !== null && parsedTag !== undefined;

        const watchDigestMeta = getMeta(
            wudWatchDigest,
            wudWatchDigestCanonical,
        );
        let watchDigest = false;
        if (watchDigestMeta !== undefined && watchDigestMeta !== '') {
            watchDigest = watchDigestMeta.toLowerCase() === 'true';
        } else if (
            !isSemver &&
            this.configuration.watchdigestdefault !== undefined
        ) {
            watchDigest = this.configuration.watchdigestdefault;
        }

        const currentDigest = extractDigestFromImage(imageName);

        return this.normalizeContainer({
            id: containerId,
            name: `${namespace}_${job.Name}_${group.Name}_${task.Name}`.toLowerCase(),
            displayName:
                displayName ?? `${job.Name} / ${group.Name} / ${task.Name}`,
            displayIcon: displayIcon ?? 'cib:nomad',
            status: 'running',
            watcher: this.name,
            stack,
            includeTags,
            excludeTags,
            transformTags,
            linkTemplate,
            triggerInclude,
            triggerExclude,
            image: {
                id: imageName,
                registry: {
                    name: 'unknown',
                    url: parsedImage.domain || 'registry-1.docker.io',
                },
                name: parsedImage.path,
                tag: { value: tagName, semver: isSemver },
                digest: {
                    watch: watchDigest,
                    repo: currentDigest,
                    value: currentDigest,
                },
                architecture,
                os: 'linux',
            },
            labels: mergedMeta,
            snoozedVersion: containerInStore?.snoozedVersion,
            snoozedUntil: containerInStore?.snoozedUntil,
            result: containerInStore?.result ?? { tag: tagName },
            updateAvailable: false,
            updateKind: { kind: 'unknown' },
        } as Container);
    }

    // ─── Version lookup & Tag filtering ───────────────────────────────────────

    async findNewVersion(container: Container, logContainer: any) {
        const registries = getRegistries();
        const registryProvider = registries[container.image.registry.name];
        const result: any = { tag: container.image.tag.value };

        if (!registryProvider) {
            throw new Error(
                `Unsupported registry (${container.image.registry.name})`,
            );
        }

        const watchDigestMeta =
            container.labels?.[wudWatchDigest] ??
            container.labels?.[wudWatchDigestCanonical];
        let watchDigest = false;
        if (watchDigestMeta !== undefined && watchDigestMeta !== '') {
            watchDigest = watchDigestMeta.toLowerCase() === 'true';
        } else if (container.image.digest?.watch !== undefined) {
            watchDigest = container.image.digest.watch;
        } else if (!container.image.tag.semver) {
            watchDigest = registryProvider.shouldWatchDigest(
                undefined,
                container.image.name,
                this.configuration.watchdigestdefault,
            );
        }

        if (!container.image.tag.semver && !watchDigest) {
            this.log.warn(
                `Image ${container.image.name} is not semver and digest watching is disabled. ` +
                    `Configure wud.watch.digest=true on the task/job or set watchdigestdefault.`,
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

        if (tagsCandidates && tagsCandidates.length > 0) {
            [result.tag] = tagsCandidates;
        }
        return result;
    }

    private getTagCandidates(
        container: Container,
        tags: string[],
        logContainer: any,
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
        const registryProvider = Object.values(getRegistries()).find(
            (provider) => provider.match(container.image.registry.url),
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

    async getClusterArchitecture(): Promise<string> {
        try {
            const response = await this.apiClient.get('/v1/nodes');
            const nodes = response.data || [];
            if (Array.isArray(nodes) && nodes.length > 0) {
                const firstNodeId = nodes[0].ID;
                if (firstNodeId) {
                    const nodeDetails = await this.apiClient.get(
                        `/v1/node/${encodeURIComponent(firstNodeId)}`,
                    );
                    const arch = nodeDetails.data?.Attributes?.['kernel.arch'];
                    if (arch) {
                        if (arch === 'x86_64' || arch === 'amd64')
                            return 'amd64';
                        if (arch === 'aarch64' || arch === 'arm64')
                            return 'arm64';
                        if (arch.startsWith('arm')) return 'arm';
                        return arch;
                    }
                }
            }
        } catch (e: any) {
            this.log.warn(
                `Unable to query Nomad nodes for architecture (${e.message}). Defaulting to 'amd64'.`,
            );
        }
        return 'amd64';
    }

    private updatePrometheusGauge(containers: Container[]) {
        const gauge = getWatchContainerGauge();
        if (gauge) {
            gauge.set({ type: this.type, name: this.name }, containers.length);
        }
    }
}

export default Nomad;
