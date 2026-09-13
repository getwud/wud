import Joi from 'joi';
import JoiCronExpression from 'joi-cron-expression';
const joi = JoiCronExpression(Joi);
import cron from 'node-cron';
import parse from 'parse-docker-image-name';
import { Logger } from 'pino';
import {
    KubeConfig,
    AppsV1Api,
    CoreV1Api,
    BatchV1Api,
} from '@kubernetes/client-node';
import {
    parse as parseSemver,
    isGreater as isGreaterSemver,
    transform as transformTag,
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
    wudStack,
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
import { ComponentConfiguration } from '../../../registry/Component';

// ─── Types & constants ────────────────────────────────────────────────────────

export type WorkloadKind =
    | 'Deployment'
    | 'StatefulSet'
    | 'DaemonSet'
    | 'CronJob';

export interface KubernetesWatcherConfiguration extends ComponentConfiguration {
    kubeconfig?: string;
    namespace: string;
    cron: string;
    jitter: number;
    watchbydefault: boolean;
    watchdigestdefault?: boolean;
    watchatstart: boolean;
    workloadtypes: WorkloadKind[];
}

/** Internal representation of a K8s workload before WUD mapping. */
export interface K8sWorkload {
    kind: WorkloadKind;
    namespace: string;
    name: string;
    annotations: Record<string, string>;
    containers: K8sContainerSpec[];
}

/** Per-container spec extracted from the workload. */
export interface K8sContainerSpec {
    name: string;
    image: string; // e.g. "nginx:1.27" or "docker.io/library/nginx:1.27"
    imageID?: string; // from Pod status.containerStatuses[].imageID (if available)
}

const START_WATCHER_DELAY_MS = 1000;

// ─── Pure helper functions (module-level, testable in isolation) ───────────────

/**
 * Return all supported registries from the WUD registry state.
 */
function getRegistries() {
    return registry.getState().registry;
}

/**
 * Determine if a workload should be watched based on the wud.getwud.io/watch
 * annotation value and the watchByDefault configuration option.
 */
export function isWorkloadToWatch(
    wudWatchAnnotationValue: string | undefined,
    watchByDefault: boolean,
): boolean {
    if (
        wudWatchAnnotationValue !== undefined &&
        wudWatchAnnotationValue !== ''
    ) {
        return wudWatchAnnotationValue.toLowerCase() === 'true';
    }
    return watchByDefault;
}

/**
 * Extract the sha256 digest from a K8s imageID.
 *
 * K8s imageID format examples:
 *   docker-pullable://docker.io/library/nginx@sha256:abc123
 *   docker.io/library/nginx@sha256:abc123
 *   sha256:abc123
 *
 * Returns the "sha256:..." string, or undefined if not parseable.
 */
export function extractDigestFromImageID(
    imageID: string | undefined,
): string | undefined {
    if (!imageID) return undefined;
    const atIndex = imageID.lastIndexOf('@');
    if (atIndex === -1) return undefined;
    const digestPart = imageID.substring(atIndex + 1);
    if (digestPart.startsWith('sha256:')) return digestPart;
    return undefined;
}

/**
 * Build the unique WUD container id for a K8s workload container.
 * Format: {namespace}_{kind}_{workloadName}_{containerName}
 * All lowercased to match WUD conventions.
 */
export function buildContainerId(
    namespace: string,
    kind: string,
    workloadName: string,
    containerName: string,
): string {
    return `${namespace}_${kind.toLowerCase()}_${workloadName}_${containerName}`;
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

// ─── Main class ────────────────────────────────────────────────────────────────

/**
 * Kubernetes Watcher Component.
 *
 * Watches Kubernetes workloads (Deployments, StatefulSets, DaemonSets, CronJobs) and reports
 * image update availability using the same pipeline as the Docker watcher.
 */
export class Kubernetes extends Watcher {
    public configuration: KubernetesWatcherConfiguration =
        {} as KubernetesWatcherConfiguration;

    /** K8s clients */
    public appsV1Api!: AppsV1Api;
    public coreV1Api!: CoreV1Api;
    public batchV1Api!: BatchV1Api;

    /** Cron job handle */
    public watchCron: any;
    public watchCronTimeout: any;

    // ─── Configuration Schema ─────────────────────────────────────────────────

    getConfigurationSchema() {
        return joi.object().keys({
            /**
             * Path to a kubeconfig file.
             * If omitted, in-cluster config (ServiceAccount) is used.
             */
            kubeconfig: this.joi.string().optional(),

            /**
             * Kubernetes namespace to watch.
             * Empty string (default) means all namespaces.
             */
            namespace: this.joi.string().allow('').default(''),

            /** Cron schedule for periodic polling. */
            cron: joi.string().cron().default('0 * * * *'),

            /** Random jitter in ms applied to the cron schedule. */
            jitter: this.joi.number().integer().min(0).default(60000),

            /** If true, watch all workloads by default (no annotation required). */
            watchbydefault: this.joi.boolean().default(true),

            /** If true, watch image digest by default for non-semver images. */
            watchdigestdefault: this.joi.boolean().optional(),

            /** If true, trigger an initial watch cycle at startup. */
            watchatstart: this.joi.boolean().default(true),

            /** Supported workload types to discover. */
            workloadtypes: this.joi
                .array()
                .items(
                    this.joi
                        .string()
                        .valid(
                            'Deployment',
                            'StatefulSet',
                            'DaemonSet',
                            'CronJob',
                        ),
                )
                .default(['Deployment', 'StatefulSet', 'DaemonSet', 'CronJob']),
        });
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    /**
     * Initialize the K8s API clients and schedule the cron.
     */
    async init() {
        this.initK8sClient();

        this.log.info(`Cron scheduled (${this.configuration.cron})`);
        this.watchCron = cron.schedule(
            this.configuration.cron,
            () => this.watchFromCron(),
            { maxRandomDelay: this.configuration.jitter },
        );

        // Only run at start if the store is empty
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

    /**
     * Build and configure K8s API clients from kubeconfig or in-cluster config.
     */
    initK8sClient() {
        const kc = new KubeConfig();
        if (this.configuration.kubeconfig) {
            this.log.info(
                `Loading kubeconfig from file: ${this.configuration.kubeconfig}`,
            );
            kc.loadFromFile(this.configuration.kubeconfig);
        } else {
            this.log.info('Loading in-cluster kubeconfig');
            kc.loadFromCluster();
        }
        this.appsV1Api = kc.makeApiClient(AppsV1Api);
        this.coreV1Api = kc.makeApiClient(CoreV1Api);
        this.batchV1Api = kc.makeApiClient(BatchV1Api);
    }

    /**
     * Deregister the component: stop cron and clear timeouts.
     */
    async deregisterComponent() {
        if (this.watchCron) {
            this.watchCron.stop();
            delete this.watchCron;
        }
        if (this.watchCronTimeout) {
            clearTimeout(this.watchCronTimeout);
        }
    }

    // ─── Watch ────────────────────────────────────────────────────────────────

    /**
     * Called by the cron schedule. Runs watch() and logs statistics.
     */
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

    /**
     * Main watch method. Discovers all workloads, maps them to WUD Containers,
     * then calls watchContainer() on each.
     */
    async watch() {
        let containers: Container[] = [];

        event.emitWatcherStart(this);

        try {
            containers = await this.getContainers();
        } catch (e: any) {
            this.log.warn(
                `Error when trying to get the list of workloads to watch (${e.message})`,
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
            event.emitWatcherStop(this);
        }
    }

    /**
     * Watch a single WUD Container (find new version, update store).
     */
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

    // ─── Workload Discovery ───────────────────────────────────────────────────

    /**
     * Discover all K8s workloads and convert them to WUD Container objects.
     */
    async getContainers(): Promise<Container[]> {
        const workloads = await this.listWorkloads();

        const filtered = workloads.filter((w) =>
            isWorkloadToWatch(
                w.annotations[wudWatch],
                this.configuration.watchbydefault,
            ),
        );

        // Resolve node architecture once per watch cycle
        const architecture = await this.getClusterArchitecture();

        const containerPromises = filtered.flatMap((workload) =>
            workload.containers.map((containerSpec) =>
                this.mapWorkloadContainerToWudContainer(
                    workload,
                    containerSpec,
                    architecture,
                ).catch((e) => {
                    this.log.warn(
                        `Failed to map workload container ${workload.namespace}/${workload.name}/${containerSpec.name}: ${e.message}`,
                    );
                    return e;
                }),
            ),
        );

        const containersWithImage = (
            await Promise.all(containerPromises)
        ).filter(
            (result) => !(result instanceof Error) && result !== undefined,
        );

        // Prune old containers from the store
        try {
            const containersFromStore = storeContainer.getContainers({
                watcher: this.name,
            });
            pruneOldContainers(containersWithImage, containersFromStore);
        } catch (e: any) {
            this.log.warn(
                `Error when trying to prune the old containers (${e.message})`,
            );
        }

        this.updatePrometheusGauge(containersWithImage);
        return containersWithImage;
    }

    /**
     * List workloads from K8s API based on configured workloadtypes.
     * Returns them as normalized K8sWorkload objects.
     */
    async listWorkloads(): Promise<K8sWorkload[]> {
        const workloads: K8sWorkload[] = [];
        const kinds = this.configuration.workloadtypes ?? [
            'Deployment',
            'StatefulSet',
            'DaemonSet',
            'CronJob',
        ];
        const namespace = this.configuration.namespace;

        const listPromises: Array<Promise<K8sWorkload[]>> = [];

        if (kinds.includes('Deployment')) {
            listPromises.push(this.listDeployments(namespace));
        }
        if (kinds.includes('StatefulSet')) {
            listPromises.push(this.listStatefulSets(namespace));
        }
        if (kinds.includes('DaemonSet')) {
            listPromises.push(this.listDaemonSets(namespace));
        }
        if (kinds.includes('CronJob')) {
            listPromises.push(this.listCronJobs(namespace));
        }

        const results = await Promise.allSettled(listPromises);
        for (const result of results) {
            if (result.status === 'fulfilled') {
                workloads.push(...result.value);
            } else {
                this.log.warn(
                    `Failed to list some workloads: ${result.reason?.message}`,
                );
            }
        }
        return workloads;
    }

    private async listDeployments(namespace: string): Promise<K8sWorkload[]> {
        let response: any;
        if (namespace) {
            response = await this.appsV1Api.listNamespacedDeployment({
                namespace,
            });
        } else {
            response = await this.appsV1Api.listDeploymentForAllNamespaces();
        }
        return this.mapDeploymentItems(response?.items ?? []);
    }

    private async mapDeploymentItems(items: any[]): Promise<K8sWorkload[]> {
        const workloads: K8sWorkload[] = [];
        for (const d of items) {
            if (!d.spec?.template?.spec) continue;
            const ns = d.metadata?.namespace ?? 'default';
            const statusMap = await this.getImageIDsFromPods(
                ns,
                d.spec?.selector?.matchLabels ?? {},
            );
            workloads.push({
                kind: 'Deployment',
                namespace: ns,
                name: d.metadata?.name ?? '',
                annotations: d.metadata?.annotations ?? {},
                containers: (d.spec.template.spec.containers ?? []).map(
                    (c: any) => ({
                        name: c.name,
                        image: c.image ?? '',
                        imageID: statusMap.get(c.name),
                    }),
                ),
            });
        }
        return workloads;
    }

    private async listStatefulSets(namespace: string): Promise<K8sWorkload[]> {
        let response: any;
        if (namespace) {
            response = await this.appsV1Api.listNamespacedStatefulSet({
                namespace,
            });
        } else {
            response = await this.appsV1Api.listStatefulSetForAllNamespaces();
        }
        const workloads: K8sWorkload[] = [];
        for (const s of response?.items ?? []) {
            if (!s.spec?.template?.spec) continue;
            const ns = s.metadata?.namespace ?? 'default';
            const statusMap = await this.getImageIDsFromPods(
                ns,
                s.spec?.selector?.matchLabels ?? {},
            );
            workloads.push({
                kind: 'StatefulSet',
                namespace: ns,
                name: s.metadata?.name ?? '',
                annotations: s.metadata?.annotations ?? {},
                containers: (s.spec.template.spec.containers ?? []).map(
                    (c: any) => ({
                        name: c.name,
                        image: c.image ?? '',
                        imageID: statusMap.get(c.name),
                    }),
                ),
            });
        }
        return workloads;
    }

    private async listDaemonSets(namespace: string): Promise<K8sWorkload[]> {
        let response: any;
        if (namespace) {
            response = await this.appsV1Api.listNamespacedDaemonSet({
                namespace,
            });
        } else {
            response = await this.appsV1Api.listDaemonSetForAllNamespaces();
        }
        return (response?.items ?? [])
            .filter((ds: any) => ds.spec?.template?.spec)
            .map((ds: any) => ({
                kind: 'DaemonSet' as WorkloadKind,
                namespace: ds.metadata?.namespace ?? 'default',
                name: ds.metadata?.name ?? '',
                annotations: ds.metadata?.annotations ?? {},
                // DaemonSet: no single Pod to query imageID from -> imageID undefined
                containers: (ds.spec.template.spec.containers ?? []).map(
                    (c: any) => ({
                        name: c.name,
                        image: c.image ?? '',
                        imageID: undefined,
                    }),
                ),
            }));
    }

    private async listCronJobs(namespace: string): Promise<K8sWorkload[]> {
        let response: any;
        if (namespace) {
            response = await this.batchV1Api.listNamespacedCronJob({
                namespace,
            });
        } else {
            response = await this.batchV1Api.listCronJobForAllNamespaces();
        }
        return (response?.items ?? [])
            .filter((cj: any) => cj.spec?.jobTemplate?.spec?.template?.spec)
            .map((cj: any) => ({
                kind: 'CronJob' as WorkloadKind,
                namespace: cj.metadata?.namespace ?? 'default',
                name: cj.metadata?.name ?? '',
                annotations: cj.metadata?.annotations ?? {},
                // CronJob: containers are not running -> no imageID
                containers: (
                    cj.spec.jobTemplate.spec.template.spec.containers ?? []
                ).map((c: any) => ({
                    name: c.name,
                    image: c.image ?? '',
                    imageID: undefined,
                })),
            }));
    }

    /**
     * List Pods matching a label selector and extract imageIDs per container name.
     * Returns a Map<containerName, imageID>.
     * On error, returns an empty Map (graceful degradation — digest watching disabled).
     */
    public async getImageIDsFromPods(
        namespace: string,
        matchLabels: Record<string, string>,
    ): Promise<Map<string, string>> {
        const statusMap = new Map<string, string>();
        try {
            const labelSelector = Object.entries(matchLabels)
                .map(([k, v]) => `${k}=${v}`)
                .join(',');

            if (!labelSelector) return statusMap;

            const podResponse = await this.coreV1Api.listNamespacedPod({
                namespace,
                labelSelector,
            });

            // Take the first Running pod's container statuses
            const runningPod = (podResponse.items ?? []).find(
                (pod: any) => pod.status?.phase === 'Running',
            );
            if (!runningPod) return statusMap;

            const containerStatuses =
                runningPod.status?.containerStatuses ?? [];
            for (const cs of containerStatuses) {
                if (cs.name && cs.imageID) {
                    statusMap.set(cs.name, cs.imageID);
                }
            }
        } catch (e: any) {
            this.log.debug(
                `Unable to get Pod statuses for imageID extraction (${e.message}). Digest watching will be disabled for this workload.`,
            );
        }
        return statusMap;
    }

    /**
     * Map a single K8s workload + container spec to a WUD Container object.
     */
    async mapWorkloadContainerToWudContainer(
        workload: K8sWorkload,
        containerSpec: K8sContainerSpec,
        architecture: string,
    ): Promise<Container> {
        const annotations = workload.annotations;

        // Annotation helpers (per-container suffix or workload-level)
        const getAnnotation = (base: string): string | undefined =>
            annotations[`${base}.${containerSpec.name}`] ?? annotations[base];

        const includeTags = getAnnotation(wudTagInclude);
        const excludeTags = getAnnotation(wudTagExclude);
        const transformTags = getAnnotation(wudTagTransform);
        const linkTemplate = getAnnotation(wudLinkTemplate);
        const displayName = getAnnotation(wudDisplayName);
        const displayIcon = getAnnotation(wudDisplayIcon);
        const triggerInclude = getAnnotation(wudTriggerInclude);
        const triggerExclude = getAnnotation(wudTriggerExclude);
        const stack = annotations[wudStack] ?? workload.namespace;

        const containerId = buildContainerId(
            workload.namespace,
            workload.kind,
            workload.name,
            containerSpec.name,
        );

        // Check if already in store (skip API call for image details)
        const containerInStore = storeContainer.getContainer(containerId);
        if (
            containerInStore !== undefined &&
            containerInStore.error === undefined
        ) {
            this.log.debug(`Container ${containerId} already in store`);
            return containerInStore;
        }

        // Parse image name
        const imageName = containerSpec.image;
        if (!imageName) {
            throw new Error(`Empty image for ${containerId}`);
        }

        let parsedImage = parse(imageName);
        const tagName =
            parsedImage && parsedImage.tag ? parsedImage.tag : 'latest';

        if (!parsedImage) {
            parsedImage = { domain: '', path: imageName, tag: tagName };
        }

        // Determine if semver
        const parsedTag = parseSemver(transformTag(transformTags, tagName));
        const isSemver = parsedTag !== null && parsedTag !== undefined;

        // Determine digest watching
        const watchDigestAnnotation = getAnnotation(wudWatchDigest);
        let watchDigest = false;
        if (!isSemver) {
            if (watchDigestAnnotation !== undefined) {
                watchDigest = watchDigestAnnotation.toLowerCase() === 'true';
            } else if (this.configuration.watchdigestdefault !== undefined) {
                watchDigest = this.configuration.watchdigestdefault;
            }
        }

        // Extract current digest from K8s imageID (from Pod status)
        const currentDigest = extractDigestFromImageID(containerSpec.imageID);

        // The imageID itself is the "local image id" equivalent
        const imageId = containerSpec.imageID ?? imageName;

        return this.normalizeContainer({
            id: containerId,
            name: `${workload.namespace}_${workload.kind.toLowerCase()}_${workload.name}_${containerSpec.name}`,
            displayName:
                displayName ?? `${workload.name} / ${containerSpec.name}`,
            displayIcon: displayIcon ?? 'mdi:kubernetes',
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
                id: imageId,
                registry: {
                    name: 'unknown', // Overwritten by normalizeContainer
                    url: parsedImage.domain || 'registry-1.docker.io',
                },
                name: parsedImage.path,
                tag: { value: tagName, semver: isSemver },
                digest: {
                    watch: watchDigest,
                    repo: currentDigest, // pullable digest of current image
                    value: currentDigest, // local digest for comparison
                },
                architecture,
                os: 'linux',
            },
            labels: annotations,
            snoozedVersion: containerInStore?.snoozedVersion,
            snoozedUntil: containerInStore?.snoozedUntil,
            result: containerInStore?.result ?? { tag: tagName },
            updateAvailable: false,
            updateKind: { kind: 'unknown' },
        } as Container);
    }

    // ─── Version lookup ───────────────────────────────────────────────────────

    /**
     * Find a new version for a container using the WUD registry pipeline.
     * Mirrors Docker.findNewVersion().
     */
    async findNewVersion(container: Container, logContainer: any) {
        const registries = getRegistries();
        const registryProvider = registries[container.image.registry.name];
        const result: any = { tag: container.image.tag.value };

        if (!registryProvider) {
            throw new Error(
                `Unsupported registry (${container.image.registry.name})`,
            );
        }

        const watchDigest =
            !container.image.tag.semver &&
            registryProvider.shouldWatchDigest(
                container.labels?.[wudWatchDigest],
                container.image.name,
                this.configuration.watchdigestdefault,
            );

        if (!container.image.tag.semver && !watchDigest) {
            this.log.warn(
                `Image ${container.image.name} is not semver and digest watching is disabled. ` +
                    `Configure wud.getwud.io/watch.digest=true on the workload or set watchdigestdefault.`,
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

    // ─── Tag candidate filtering ──────────────────────────────────────────────

    /**
     * Filter and sort tag candidates for a container.
     */
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
        } else {
            filteredTags = filteredTags.filter((tag) => !tag.startsWith('sha'));
        }

        if (container.excludeTags) {
            const excludeTagsRegex = new RegExp(container.excludeTags);
            filteredTags = filteredTags.filter(
                (tag) => !excludeTagsRegex.test(tag),
            );
        }

        filteredTags = filteredTags.filter((tag) => !tag.endsWith('.sig'));

        if (container.image.tag.semver) {
            if (filteredTags.length === 0) {
                logContainer.warn(
                    'No tags found after filtering; check your regex filters',
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

    // ─── Normalisation & Store ─────────────────────────────────────────────────

    /**
     * Normalize a container (resolve registry, validate).
     * Mirrors Docker.normalizeContainer().
     */
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

    /**
     * Compare with DB, insert or update.
     * Mirrors Docker.mapContainerToContainerReport().
     */
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

    // ─── Infrastructure helpers ───────────────────────────────────────────────

    /**
     * Get the architecture of the cluster nodes.
     * Returns the architecture of the first node, or 'amd64' as fallback.
     */
    async getClusterArchitecture(): Promise<string> {
        try {
            const response = await this.coreV1Api.listNode();
            const nodes = response.items ?? [];
            if (nodes.length > 0) {
                const arch =
                    nodes[0].metadata?.labels?.['kubernetes.io/arch'] ??
                    nodes[0].status?.nodeInfo?.architecture ??
                    'amd64';
                return arch;
            }
        } catch (e: any) {
            this.log.warn(
                `Unable to list K8s nodes to get architecture (${e.message}). Defaulting to 'amd64'.`,
            );
        }
        return 'amd64';
    }

    /**
     * Update the Prometheus gauge for the number of watched containers.
     */
    private updatePrometheusGauge(containers: Container[]) {
        const gauge = getWatchContainerGauge();
        if (gauge) {
            gauge.set({ type: this.type, name: this.name }, containers.length);
        }
    }
}

export default Kubernetes;
