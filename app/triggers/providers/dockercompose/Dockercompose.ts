import fs from 'fs/promises';
import path from 'path';
import yaml, { isMap, isScalar, Scalar } from 'yaml';
import Docker, { DockerConfiguration } from '../docker/Docker';
import Trigger, { TriggerConfiguration } from '../Trigger';
import { getState } from '../../../registry';
import { fullName, Container } from '../../../model/container';
import Registry from '../../../registries/Registry';
import { HookManager } from '../../hooks/HookManager';
import * as event from '../../../event';
import { performProjectTransaction } from './rollback';
import { isSelfContainer } from '../docker/self';
import { waitForHealthy } from '../docker/health';
import { projectMutex } from './mutex';

interface ComposeImageUpdate {
    service?: string;
    current?: string;
    update: string;
}

interface ImageReplacement {
    start: number;
    end: number;
    text: string;
}

interface FileMetadata {
    mode: number;
    uid: number;
    gid: number;
}

/**
 * Locate the Scalar node corresponding to the target image in the YAML AST.
 */
function findImageNode(
    doc: yaml.Document,
    service?: string,
    current?: string,
    matchedNodes?: Set<Scalar>,
): Scalar | undefined {
    if (service) {
        const candidate = doc.getIn(['services', service, 'image'], true);
        if (isScalar(candidate) && !matchedNodes?.has(candidate)) {
            return candidate;
        }
        const v1Candidate = doc.getIn([service, 'image'], true);
        if (isScalar(v1Candidate) && !matchedNodes?.has(v1Candidate)) {
            return v1Candidate;
        }
    }

    if (current) {
        const services = doc.get('services', true);
        if (isMap(services)) {
            for (const item of services.items) {
                if (isMap(item.value)) {
                    const imgNode = item.value.get('image', true);
                    if (
                        isScalar(imgNode) &&
                        String(imgNode.value) === current &&
                        !matchedNodes?.has(imgNode)
                    ) {
                        return imgNode;
                    }
                }
            }
        }

        if (isMap(doc.contents)) {
            for (const item of doc.contents.items) {
                if (isMap(item.value)) {
                    const imgNode = item.value.get('image', true);
                    if (
                        isScalar(imgNode) &&
                        String(imgNode.value) === current &&
                        !matchedNodes?.has(imgNode)
                    ) {
                        return imgNode;
                    }
                }
            }
            const rootImgNode = doc.get('image', true);
            if (
                isScalar(rootImgNode) &&
                String(rootImgNode.value) === current &&
                !matchedNodes?.has(rootImgNode)
            ) {
                return rootImgNode;
            }
        }
    }

    return undefined;
}

/**
 * Format image replacement text, preserving double or single quote style of the original token.
 */
function formatImageReplacement(
    node: Scalar,
    rawSlice: string,
    newImage: string,
): string {
    const isDoubleQuoted =
        node.type === 'QUOTE_DOUBLE' ||
        (rawSlice.startsWith('"') && rawSlice.endsWith('"'));
    const isSingleQuoted =
        node.type === 'QUOTE_SINGLE' ||
        (rawSlice.startsWith("'") && rawSlice.endsWith("'"));

    const alreadyQuoted =
        (newImage.startsWith('"') && newImage.endsWith('"')) ||
        (newImage.startsWith("'") && newImage.endsWith("'"));

    if (alreadyQuoted) {
        return newImage;
    }
    if (isDoubleQuoted) {
        return `"${newImage}"`;
    }
    if (isSingleQuoted) {
        return `'${newImage}'`;
    }
    return newImage;
}

/**
 * Match a compose service image against a container image, supporting:
 * - standard images (repo:tag)
 * - digest-pinned images with tag (repo:tag@sha256:...)
 * - digest-pinned images without tag (repo@sha256:...)
 * - implied latest tags (repo)
 */
function isMatchingServiceImage(
    serviceImage: string,
    container: Container,
    registry?: Registry,
): boolean {
    if (!serviceImage || typeof serviceImage !== 'string') {
        return false;
    }

    const currentImage = registry?.getImageFullName
        ? registry.getImageFullName(
              container.image,
              container.image?.tag?.value,
          )
        : undefined;

    if (currentImage && serviceImage.includes(currentImage)) {
        return true;
    }

    // Handle digest-pinned image: e.g. "repo:tag@sha256:..." or "repo@sha256:..."
    const atIndex = serviceImage.indexOf('@');
    if (atIndex !== -1) {
        const imageWithoutDigest = serviceImage.substring(0, atIndex);
        const digest = serviceImage.substring(atIndex + 1);

        if (
            currentImage &&
            imageWithoutDigest &&
            imageWithoutDigest.includes(currentImage)
        ) {
            return true;
        }

        // Check if imageWithoutDigest has no tag (e.g. "repo" or "host:5000/repo")
        const lastSlash = imageWithoutDigest.lastIndexOf('/');
        const lastPart =
            lastSlash !== -1
                ? imageWithoutDigest.substring(lastSlash + 1)
                : imageWithoutDigest;

        if (!lastPart.includes(':')) {
            // Implied :latest
            const imageWithLatest = `${imageWithoutDigest}:latest`;
            if (currentImage && imageWithLatest.includes(currentImage)) {
                return true;
            }
        }

        // Check matching by repository name and/or digest
        const repoFullName = registry?.getImageFullName
            ? registry.getImageFullName(container.image, '').replace(/:$/, '')
            : container.image?.name;

        if (repoFullName && imageWithoutDigest.includes(repoFullName)) {
            if (
                digest &&
                (digest === container.image?.digest?.repo ||
                    digest === container.image?.digest?.value)
            ) {
                return true;
            }
            if (!lastPart.includes(':')) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Find the compose service key corresponding to a container.
 * Priority:
 * 1. Docker compose service label ('com.docker.compose.service')
 * 2. Service definition container_name matching container name
 * 3. Service definition key matching container name
 * 4. Fallback to any service whose image matches the container image (only if no label specified)
 *
 * @param compose
 * @param container
 * @param processedServices - Optional Set to skip already-processed services
 * @returns {string|undefined}
 */
function findServiceKeyForContainer(
    compose,
    container,
    processedServices = undefined,
) {
    if (!compose || !compose.services || typeof compose.services !== 'object') {
        return undefined;
    }

    const registry = getState().registry[container.image?.registry?.name];
    if (!registry) {
        return undefined;
    }

    const serviceKeys = Object.keys(compose.services);
    const containerName = container.name
        ? container.name.replace(/^\//, '')
        : '';

    // 1. Check com.docker.compose.service label
    const labelService =
        container.labels && container.labels['com.docker.compose.service'];
    if (labelService) {
        if (compose.services[labelService]) {
            const service = compose.services[labelService];
            if (
                Boolean(service.image) &&
                isMatchingServiceImage(service.image, container, registry)
            ) {
                if (
                    !processedServices ||
                    !processedServices.has(labelService)
                ) {
                    return labelService;
                }
            }
        }
        return undefined;
    }

    // 2. Check service.container_name matching container name
    if (containerName) {
        for (const key of serviceKeys) {
            const service = compose.services[key];
            const serviceContainerName = service?.container_name
                ? service.container_name.replace(/^\//, '')
                : '';
            if (
                serviceContainerName &&
                serviceContainerName === containerName
            ) {
                if (
                    Boolean(service.image) &&
                    isMatchingServiceImage(service.image, container, registry)
                ) {
                    if (!processedServices || !processedServices.has(key)) {
                        return key;
                    }
                    return undefined;
                }
            }
        }
    }

    // 3. Check service key matching container name
    if (containerName) {
        for (const key of serviceKeys) {
            if (key === containerName) {
                const service = compose.services[key];
                if (
                    Boolean(service.image) &&
                    isMatchingServiceImage(service.image, container, registry)
                ) {
                    if (!processedServices || !processedServices.has(key)) {
                        return key;
                    }
                    return undefined;
                }
            }
        }
    }

    // 4. Fallback only if container has no compose service label
    if (!labelService) {
        for (const key of serviceKeys) {
            const service = compose.services[key];
            if (
                Boolean(service.image) &&
                isMatchingServiceImage(service.image, container, registry)
            ) {
                if (!processedServices || !processedServices.has(key)) {
                    return key;
                }
            }
        }
    }

    return undefined;
}

/**
 * Return true if the container belongs to the compose file.
 * @param compose
 * @param container
 * @returns true/false
 */
function doesContainerBelongToCompose(compose, container) {
    return Boolean(findServiceKeyForContainer(compose, container));
}

/**
 * One `depends_on` entry of a compose service.
 */
interface ServiceDependency {
    name: string;
    condition?: string;
}

/**
 * Read the `depends_on` entries of a compose service (short list syntax or
 * long map syntax with `{ condition }`).
 */
function getServiceDependencies(service: unknown): ServiceDependency[] {
    if (!service || typeof service !== 'object') {
        return [];
    }
    const dependsOn = (service as { depends_on?: unknown }).depends_on;
    if (Array.isArray(dependsOn)) {
        return dependsOn
            .filter((dep): dep is string => typeof dep === 'string')
            .map((name) => ({ name }));
    }
    if (dependsOn && typeof dependsOn === 'object') {
        return Object.entries(dependsOn as Record<string, unknown>).map(
            ([name, spec]) => ({
                name,
                condition:
                    spec && typeof spec === 'object'
                        ? (spec as { condition?: string }).condition
                        : undefined,
            }),
        );
    }
    return [];
}

/**
 * How the containers of a compose file must be recreated.
 */
export interface RecreationPlan {
    /** Recreation waves: dependencies first, dependents last, WUD itself last of all. */
    waves: Container[][];
    /** Services involved in a `depends_on` cycle (recreated together, last). */
    cyclicServices: string[];
    /** Services a later wave waits on with `condition: service_healthy`. */
    healthyDependencies: Set<string>;
}

/**
 * Plan the recreation of the containers of a compose file honoring
 * `depends_on`: the dependency graph is built over all the services of the
 * file (so a dependency through a service that is not updated still orders
 * the updated ones), then the containers to update are projected onto the
 * topological levels. Services of the same wave have no dependency relation
 * and can be recreated in parallel.
 *
 * A dependency cycle is reported and its services are recreated together in
 * the last regular wave. The container WUD itself runs in, when present, is
 * isolated in a final wave so WUD does not stop itself mid-batch.
 */
function orderContainersByDependencies(
    compose,
    containers: Container[],
    isSelf: (container: Container) => boolean = () => false,
): RecreationPlan {
    const services: Record<string, unknown> =
        compose && compose.services && typeof compose.services === 'object'
            ? compose.services
            : {};

    // Topological levels over the whole file (Kahn).
    const pendingDeps = new Map<string, Set<string>>();
    Object.keys(services).forEach((serviceKey) => {
        const deps = getServiceDependencies(services[serviceKey])
            .map((dep) => dep.name)
            .filter((dep) => dep !== serviceKey && dep in services);
        pendingDeps.set(serviceKey, new Set(deps));
    });
    const levelOfService = new Map<string, number>();
    const cyclicServices: string[] = [];
    let level = 0;
    while (pendingDeps.size > 0) {
        let ready = [...pendingDeps.entries()]
            .filter(([, deps]) => deps.size === 0)
            .map(([serviceKey]) => serviceKey);
        if (ready.length === 0) {
            // Cycle: whatever is left is recreated together.
            ready = [...pendingDeps.keys()];
            cyclicServices.push(...ready);
        }
        ready.forEach((serviceKey) => {
            levelOfService.set(serviceKey, level);
            pendingDeps.delete(serviceKey);
        });
        pendingDeps.forEach((deps) =>
            ready.forEach((serviceKey) => deps.delete(serviceKey)),
        );
        level += 1;
    }

    // Project the containers to update onto the levels.
    const serviceOfContainer = new Map<Container, string | undefined>();
    const updatedServices = new Set<string>();
    const selfContainers: Container[] = [];
    const containersByLevel = new Map<number, Container[]>();
    containers.forEach((container) => {
        if (isSelf(container)) {
            selfContainers.push(container);
            return;
        }
        const serviceKey = findServiceKeyForContainer(compose, container);
        serviceOfContainer.set(container, serviceKey);
        if (serviceKey) {
            updatedServices.add(serviceKey);
        }
        // Unknown services cannot be ordered: recreate them first.
        const containerLevel = serviceKey
            ? (levelOfService.get(serviceKey) ?? 0)
            : 0;
        if (!containersByLevel.has(containerLevel)) {
            containersByLevel.set(containerLevel, []);
        }
        containersByLevel.get(containerLevel).push(container);
    });
    const waves = [...containersByLevel.keys()]
        .sort((a, b) => a - b)
        .map((containerLevel) => containersByLevel.get(containerLevel));
    if (selfContainers.length > 0) {
        waves.push(selfContainers);
    }

    // Updated services that an updated dependent waits on for health.
    const healthyDependencies = new Set<string>();
    updatedServices.forEach((serviceKey) => {
        getServiceDependencies(services[serviceKey])
            .filter(
                (dep) =>
                    dep.condition === 'service_healthy' &&
                    dep.name !== serviceKey &&
                    updatedServices.has(dep.name),
            )
            .forEach((dep) => healthyDependencies.add(dep.name));
    });

    return {
        waves,
        cyclicServices: cyclicServices.filter((serviceKey) =>
            updatedServices.has(serviceKey),
        ),
        healthyDependencies,
    };
}

export interface DockercomposeConfiguration extends DockerConfiguration {
    file?: string;
    pathmapping?: {
        host: string;
        container: string;
    };
    backup?: boolean;
    composeFileLabel?: string;
    strict_digest?: boolean;
    recreate?: boolean;
}

/**
 * Update a Docker compose stack with an updated one.
 */
class Dockercompose extends Docker {
    declare public configuration: DockercomposeConfiguration;

    constructor() {
        super();
        this.type = 'dockercompose';
    }
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        const schemaDocker = super.getConfigurationSchema();
        return schemaDocker.append({
            // Make file optional since we now support per-container compose files
            file: this.joi.string().optional(),
            pathmapping: this.joi
                .object()
                .keys({
                    host: this.joi.string().required(),
                    container: this.joi.string().required(),
                })
                .optional(),
            backup: this.joi.boolean().default(false),
            // Add configuration for the label name to look for
            composeFileLabel: this.joi.string().default('wud.compose.file'),
            strict_digest: this.joi.boolean().default(false),
            // When false, only the compose file is rewritten; services are
            // left for the operator to recreate (`docker compose up -d`).
            recreate: this.joi.boolean().default(true),
        });
    }

    validateConfiguration(
        configuration: TriggerConfiguration,
    ): DockercomposeConfiguration {
        const conf = { ...configuration } as Record<string, unknown>;
        const strictObj = conf.strict as Record<string, unknown> | undefined;
        if (strictObj && strictObj.digest !== undefined) {
            conf.strict_digest = strictObj.digest;
            delete conf.strict;
        } else if (conf.strictdigest !== undefined) {
            conf.strict_digest = conf.strictdigest;
            delete conf.strictdigest;
        }
        return super.validateConfiguration(
            conf as TriggerConfiguration,
        ) as DockercomposeConfiguration;
    }

    /**
     * Return true if strict digest mode is enabled for this container.
     * When enabled, updates to digest-pinned services will fail if no replacement digest is available.
     */
    isStrictDigestEnabled(container?: Container): boolean {
        const defaultStrict = Boolean(this.configuration.strict_digest);
        if (!container) {
            return defaultStrict;
        }
        const labels = container.labels as Record<string, unknown> | undefined;
        if (!labels) {
            return defaultStrict;
        }

        const suffixes = ['strict_digest', 'strict-digest', 'strictdigest'];

        for (const suffix of suffixes) {
            if (this.type && this.name) {
                const instanceVal = Trigger.parseBooleanLabel(
                    Trigger.findLabelValue(
                        labels,
                        `trigger.${this.type}.${this.name}.${suffix}`,
                    ),
                );
                if (instanceVal !== undefined) {
                    return instanceVal;
                }
            }

            if (this.type) {
                const typeVal = Trigger.parseBooleanLabel(
                    Trigger.findLabelValue(
                        labels,
                        `trigger.${this.type}.${suffix}`,
                    ),
                );
                if (typeVal !== undefined) {
                    return typeVal;
                }
            }

            const genericVal = Trigger.parseBooleanLabel(
                Trigger.findLabelValue(labels, `trigger.${suffix}`),
            );
            if (genericVal !== undefined) {
                return genericVal;
            }
        }

        return defaultStrict;
    }

    async initTrigger() {
        // Force mode=batch to avoid docker-compose concurrent operations
        this.configuration.mode = 'batch';

        // Check default docker-compose file exists if specified and not templated
        if (
            this.configuration.file &&
            !this.configuration.file.includes('${')
        ) {
            const filePathToCheck = this.mapPath(this.configuration.file);
            try {
                await fs.access(filePathToCheck);
            } catch (e) {
                this.log.error(
                    `The default file ${filePathToCheck} does not exist`,
                );
                throw e;
            }
        }
    }

    /**
     * Map host path to container path if pathmapping is configured.
     * Handles Windows backslashes and case-insensitive Windows drive letters.
     * @param filePath
     * @returns {string}
     */
    mapPath(filePath: string): string {
        if (!this.configuration.pathmapping || !filePath) {
            return filePath;
        }
        const { host, container } = this.configuration.pathmapping;

        const normalizedFilePath = filePath.replace(/\\/g, '/');
        const normalizedHost = host.replace(/\\/g, '/');
        const normalizedContainer = container.replace(/\\/g, '/');

        // Check if both paths start with a Windows drive letter (e.g. C: or D:)
        const isWindowsPath = /^[a-zA-Z]:(\/|$)/.test(normalizedFilePath);
        const isWindowsHost = /^[a-zA-Z]:(\/|$)/.test(normalizedHost);

        let cleanHost = normalizedHost.replace(/\/+$/, '');
        if (cleanHost === '' && normalizedHost.startsWith('/')) {
            cleanHost = '/';
        }

        let match = false;
        let matchLength = cleanHost.length;

        if (isWindowsPath && isWindowsHost) {
            // Compare Windows drive letter and path case-insensitively
            const driveMatch =
                normalizedFilePath[0].toLowerCase() ===
                cleanHost[0].toLowerCase();
            if (driveMatch) {
                const restFilePath = normalizedFilePath.substring(2);
                const restHost = cleanHost.substring(2);

                if (restFilePath.toLowerCase() === restHost.toLowerCase()) {
                    match = true;
                } else if (
                    restFilePath
                        .toLowerCase()
                        .startsWith(restHost.toLowerCase() + '/')
                ) {
                    match = true;
                } else if (restHost === '' && restFilePath.startsWith('/')) {
                    match = true;
                }
            }
        } else {
            if (normalizedFilePath === cleanHost) {
                match = true;
            } else if (cleanHost === '/') {
                if (normalizedFilePath.startsWith('/')) {
                    match = true;
                    matchLength = 1;
                }
            } else if (normalizedFilePath.startsWith(cleanHost + '/')) {
                match = true;
            }
        }

        if (match) {
            const relativePath = normalizedFilePath
                .substring(matchLength)
                .replace(/^\/+/, '');
            return path.posix.join(normalizedContainer, relativePath);
        }

        return filePath;
    }

    /**
     * Get the compose file path for a specific container.
     * Priority:
     * 1. Container label override (e.g. wud.compose.file)
     * 2. Configured template file (this.configuration.file)
     * 3. Auto-detection (com.docker.compose.project.config_files or com.docker.compose.project.working_dir)
     * 4. Path mapping translation if configured
     * @param container
     * @returns {string|null}
     */
    getComposeFileForContainer(container) {
        // 1. Check if container has a custom wud compose file label
        const composeFileLabel = this.configuration.composeFileLabel;
        if (container.labels && container.labels[composeFileLabel]) {
            const labelValue = container.labels[composeFileLabel];
            // Convert relative paths to absolute paths
            const isAbsolute =
                path.isAbsolute(labelValue) ||
                path.win32.isAbsolute(labelValue);
            const resolvedPath = isAbsolute
                ? labelValue
                : path.resolve(labelValue);
            return this.mapPath(resolvedPath);
        }

        // 2. Configured template file
        if (this.configuration.file) {
            let filePath = this.configuration.file;
            if (filePath.includes('${')) {
                try {
                    filePath = this.renderTemplate(filePath, container);
                } catch (e) {
                    this.log.warn(
                        `Error rendering compose file template '${this.configuration.file}' for container ${container.name || 'unknown'}: ${e.message}`,
                    );
                    return null;
                }
            }
            return this.mapPath(filePath);
        }

        // 3. Fall back to Docker Compose's automatically generated labels
        if (
            container.labels &&
            container.labels['com.docker.compose.project.config_files']
        ) {
            const configFiles =
                container.labels['com.docker.compose.project.config_files'];
            const firstFile = configFiles.split(',')[0].trim();
            if (firstFile) {
                return this.mapPath(firstFile);
            }
        }

        if (
            container.labels &&
            container.labels['com.docker.compose.project.working_dir']
        ) {
            const workingDir =
                container.labels[
                    'com.docker.compose.project.working_dir'
                ].trim();
            if (workingDir) {
                const normalizedWorkingDir = workingDir
                    .replace(/\\/g, '/')
                    .replace(/\/+$/, '');
                const composePath = `${normalizedWorkingDir}/docker-compose.yml`;
                return this.mapPath(composePath);
            }
        }

        return null;
    }

    /**
     * Update the container.
     * @param container the container
     * @returns {Promise<void>}
     */
    async trigger(container) {
        if (!container.updateAvailable) {
            this.log.info(
                `No update available for container ${fullName(container)} => skip trigger`,
            );
            return;
        }
        this.assertNotUpstreamTracked(container);
        return this.triggerBatch([container]);
    }

    /**
     * Update the docker-compose stack.
     * @param containers the containers
     * @returns {Promise<void>}
     */
    async triggerBatch(containers) {
        const containersToUpdate = containers
            .filter((c) => c.updateAvailable)
            .filter((c) => {
                const reason = this.getUpstreamRefusalReason(c);
                if (reason) {
                    this.log.warn(`${reason} => skip`);
                    return false;
                }
                return true;
            });
        if (containersToUpdate.length === 0) {
            this.log.info(
                'No containers with updates available => skip trigger',
            );
            return;
        }

        // Group containers by their compose file
        const containersByComposeFile = new Map();

        for (const container of containersToUpdate) {
            // Filter on containers running on local host
            const watcher = this.getWatcher(container);
            if (!watcher || !watcher.dockerApi) {
                this.log.warn(
                    `Cannot update container ${container.name} because watcher ${container.watcher} not found`,
                );
                continue;
            }

            const modem = watcher.dockerApi.modem as {
                socketPath?: string;
            };
            if (modem?.socketPath === '') {
                this.log.warn(
                    `Cannot update container ${container.name} because not running on local host`,
                );
                continue;
            }

            const composeFile = this.getComposeFileForContainer(container);
            if (!composeFile) {
                this.log.warn(
                    `No compose file found for container ${container.name} (no label '${this.configuration.composeFileLabel}' and no default file configured)`,
                );
                continue;
            }

            // Check if compose file exists
            try {
                await fs.access(composeFile);
            } catch (e: any) {
                this.log.warn(
                    `Compose file ${composeFile} for container ${container.name} does not exist (${e.message})`,
                );
                continue;
            }

            if (!containersByComposeFile.has(composeFile)) {
                containersByComposeFile.set(composeFile, []);
            }
            containersByComposeFile.get(composeFile).push(container);
        }

        // Process each compose file group
        for (const [composeFile, containersInFile] of containersByComposeFile) {
            await this.processComposeFile(composeFile, containersInFile);
        }
    }

    /**
     * Process a specific compose file with its associated containers.
     * @param composeFile
     * @param containers
     * @returns {Promise<void>}
     */
    async processComposeFile(composeFile, containers) {
        return projectMutex.withLock(composeFile, async () => {
            this.log.info(`Processing compose file: ${composeFile}`);

            const compose = await this.getComposeFileAsObject(composeFile);

            // Filter containers that belong to this compose file
            const containersFiltered = containers.filter((container) =>
                doesContainerBelongToCompose(compose, container),
            );

            if (containersFiltered.length === 0) {
                this.log.warn(
                    `No containers found in compose file ${composeFile}`,
                );
                return;
            }

            // Track which services have already been mapped to avoid duplicates
            // (multiple containers can share the same image/service)
            const processedServices = new Set();

            let currentVersionToUpdateVersionArray: {
                current: string;
                update: string;
                service?: string;
            }[];
            let containersToUpdate: Container[] = [];

            try {
                // [{ current: '1.0.0', update: '2.0.0' }, {...}]
                currentVersionToUpdateVersionArray = containersFiltered.flatMap(
                    (container) => {
                        const mapping = this.mapCurrentVersionToUpdateVersion(
                            compose,
                            container,
                            processedServices,
                        );
                        const hasDigestUpdate =
                            container.updateKind?.kind === 'digest' &&
                            this.hasResolvableUpdate(container);

                        return mapping &&
                            (mapping.current !== mapping.update ||
                                hasDigestUpdate)
                            ? [mapping]
                            : [];
                    },
                );

                if (currentVersionToUpdateVersionArray.length === 0) {
                    this.log.info(
                        `No updates to apply for containers in compose file ${composeFile}`,
                    );
                    return;
                }

                const updateServiceKeys = new Set(
                    currentVersionToUpdateVersionArray.map((m) => m.service),
                );
                containersToUpdate = containersFiltered.filter((container) => {
                    const serviceKey = findServiceKeyForContainer(
                        compose,
                        container,
                    );
                    return serviceKey && updateServiceKeys.has(serviceKey);
                });

                if (containersToUpdate.length === 0) {
                    this.log.info(
                        `No containers to update in compose file ${composeFile}`,
                    );
                    return;
                }

                const recreate = this.configuration.recreate !== false;

                if (!recreate) {
                    await this.updateComposeFileOnly(
                        composeFile,
                        containersToUpdate,
                        currentVersionToUpdateVersionArray,
                    );
                    return;
                }

                // Recreate services only after the services they depend on
                // (dependencies first, dependents last, WUD itself last).
                const selfContainerId =
                    await this.resolveSelfContainerIdFor(containersToUpdate);
                const plan = orderContainersByDependencies(
                    compose,
                    containersToUpdate,
                    (container) =>
                        isSelfContainer(container.id, selfContainerId),
                );
                if (plan.cyclicServices.length > 0) {
                    this.log.warn(
                        `Dependency cycle between services ${plan.cyclicServices.join(', ')} in ${composeFile}; they will be recreated together`,
                    );
                }
                if (plan.waves.length > 1) {
                    this.log.info(
                        `Recreation order for ${composeFile}: ${plan.waves
                            .map((wave) => wave.map((c) => c.name).join(', '))
                            .join(' -> ')}`,
                    );
                }
                const orderedContainersToUpdate = plan.waves.flat();

                if (!this.configuration.dryrun) {
                    for (const container of containersToUpdate) {
                        event.emitContainerUpdatePre(container);
                    }
                }

                // Dry-run?
                if (this.configuration.dryrun) {
                    this.log.info(
                        `Do not replace existing docker-compose file ${composeFile} (dry-run mode enabled)`,
                    );
                } else if (
                    containersToUpdate.some(
                        (container) => this.resolveRollback(container).enabled,
                    )
                ) {
                    // Quality Gate Pre-update hooks for all containers in this compose stack
                    for (const container of containersToUpdate) {
                        const watcher = this.getWatcher(container);
                        await HookManager.runPreHooks(
                            container,
                            this.configuration.hooks,
                            {
                                triggerName: this.name,
                                dockerApi: watcher?.dockerApi,
                                log: this.log,
                            },
                        );
                    }

                    // CLI-free project transaction with whole-project revert.
                    const committed = await performProjectTransaction(
                        this,
                        composeFile,
                        orderedContainersToUpdate,
                        currentVersionToUpdateVersionArray,
                    );

                    // Post-update or rollback hooks for all containers in this compose stack
                    if (committed) {
                        for (const container of containersToUpdate) {
                            const watcher = this.getWatcher(container);
                            await HookManager.runPostHooks(
                                container,
                                this.configuration.hooks,
                                {
                                    triggerName: this.name,
                                    dockerApi: watcher?.dockerApi,
                                    log: this.log,
                                },
                            );
                            event.emitContainerUpdateSuccess(container);
                        }
                    } else {
                        // Rolled back
                        for (const container of containersToUpdate) {
                            const watcher = this.getWatcher(container);
                            await HookManager.runRollbackHooks(
                                container,
                                this.configuration.hooks,
                                {
                                    triggerName: this.name,
                                    dockerApi: watcher?.dockerApi,
                                    log: this.log,
                                },
                            );
                        }
                    }
                    return;
                } else {
                    // Quality Gate Pre-update hooks for all containers in this compose stack
                    for (const container of containersToUpdate) {
                        const watcher = this.getWatcher(container);
                        await HookManager.runPreHooks(
                            container,
                            this.configuration.hooks,
                            {
                                triggerName: this.name,
                                dockerApi: watcher?.dockerApi,
                                log: this.log,
                            },
                        );
                    }

                    // Backup docker-compose file
                    if (this.configuration.backup) {
                        const backupFile = `${composeFile}.back`;
                        await this.backup(composeFile, backupFile);
                    }

                    // Read the compose file as a string
                    const composeFileStr = (
                        await this.getComposeFile(composeFile)
                    ).toString();

                    // Replace all versions targeting specific services in YAML
                    const updatedComposeFileStr = this.updateComposeYaml(
                        composeFileStr,
                        currentVersionToUpdateVersionArray,
                    );

                    // Write docker-compose.yml file back
                    await this.writeComposeFile(
                        composeFile,
                        updatedComposeFileStr,
                    );
                }

                // Update all containers, one dependency wave at a time; a
                // failed wave aborts the recreation of the dependent services
                // (super.notify will take care of the dry-run mode for each container as well)
                for (let i = 0; i < plan.waves.length; i += 1) {
                    const wave = plan.waves[i];
                    const results = await Promise.allSettled(
                        wave.map((container) =>
                            super.trigger(container, {
                                runHooks: false,
                                emitEvents: false,
                            }),
                        ),
                    );
                    this.throwOnFailedWave(
                        wave,
                        results,
                        i < plan.waves.length - 1,
                    );
                    if (
                        i < plan.waves.length - 1 &&
                        !this.configuration.dryrun
                    ) {
                        await this.waitForHealthyDependencies(
                            compose,
                            wave,
                            plan.healthyDependencies,
                        );
                    }
                }

                // Post-update hooks for all containers in this compose stack
                if (!this.configuration.dryrun) {
                    for (const container of containersToUpdate) {
                        const watcher = this.getWatcher(container);
                        await HookManager.runPostHooks(
                            container,
                            this.configuration.hooks,
                            {
                                triggerName: this.name,
                                dockerApi: watcher?.dockerApi,
                                log: this.log,
                            },
                        );
                        event.emitContainerUpdateSuccess(container);
                    }
                }
            } catch (e: any) {
                this.log.error(`Compose update failed: ${e.message}`);
                const failedContainers =
                    containersToUpdate && containersToUpdate.length > 0
                        ? containersToUpdate
                        : containersFiltered;
                for (const container of failedContainers) {
                    container.error = e.message;
                    const watcher = this.getWatcher(container);
                    try {
                        await HookManager.runFailureHooks(
                            container,
                            this.configuration.hooks,
                            {
                                triggerName: this.name,
                                dockerApi: watcher?.dockerApi,
                                log: this.log,
                            },
                        );
                    } catch (hookErr: any) {
                        this.log.error(
                            `Failure hooks failed for ${container.name}: ${hookErr.message}`,
                        );
                    }
                    event.emitContainerUpdateFailure(container);
                }
                throw e;
            }
        });
    }

    /**
     * File-only mode (`recreate=false`): rewrite the compose file with the new
     * versions and stop there (no pull, no recreation, no hooks, no rollback).
     * Only mappings that actually change the file are written, so a digest
     * check with `once=false` never clobbers the `.back` copy.
     */
    async updateComposeFileOnly(
        composeFile: string,
        containers: Container[],
        mappings: ComposeImageUpdate[],
    ): Promise<void> {
        const fileMappings = mappings.filter(
            (mapping) => mapping.current !== mapping.update,
        );
        const names = containers.map((c) => c.name).join(', ');
        if (fileMappings.length === 0) {
            this.log.info(
                `Compose file ${composeFile} already references the target images for ${names} => nothing to rewrite (recreate=false)`,
            );
            return;
        }
        if (this.configuration.dryrun) {
            this.log.info(
                `Would update compose file ${composeFile} for ${names} (dry-run mode enabled, recreate=false)`,
            );
            return;
        }
        if (this.configuration.backup) {
            await this.backup(composeFile, `${composeFile}.back`);
        }
        await this.rewriteComposeFile(composeFile, fileMappings);
        this.log.info(
            `Compose file ${composeFile} updated for ${names}; services not recreated (recreate=false), run "docker compose up -d" to apply`,
        );
    }

    /**
     * Resolve the id of the container WUD runs in, using the Docker API of
     * the first container's watcher (undefined when unavailable).
     */
    async resolveSelfContainerIdFor(
        containers: Container[],
    ): Promise<string | undefined> {
        const dockerApi = containers
            .map((container) => this.getWatcher(container)?.dockerApi)
            .find((api) => Boolean(api));
        if (!dockerApi) {
            return undefined;
        }
        try {
            return await this.resolveSelfContainerId(dockerApi);
        } catch (e: unknown) {
            this.log.debug(
                `Unable to resolve the WUD container id (${e instanceof Error ? e.message : String(e)})`,
            );
            return undefined;
        }
    }

    /**
     * Fail the batch when a recreation wave has rejected members. A single
     * failure is rethrown as is; several are aggregated.
     */
    throwOnFailedWave(
        wave: Container[],
        results: PromiseSettledResult<unknown>[],
        hasDependents: boolean,
    ): void {
        const failures = results
            .map((result, index) => ({ result, container: wave[index] }))
            .filter(
                (
                    entry,
                ): entry is {
                    result: PromiseRejectedResult;
                    container: Container;
                } => entry.result.status === 'rejected',
            );
        if (failures.length === 0) {
            return;
        }
        if (hasDependents) {
            this.log.warn(
                `${failures.length} service(s) failed to update; dependent services are not recreated`,
            );
        }
        if (failures.length === 1) {
            throw failures[0].result.reason;
        }
        const details = failures
            .map(
                ({ container, result }) =>
                    `${container.name}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
            )
            .join('; ');
        throw new Error(
            `${failures.length} services failed to update (${details})`,
        );
    }

    /**
     * Before recreating the next wave, wait for the services of this wave
     * that a dependent requires with `condition: service_healthy`.
     */
    async waitForHealthyDependencies(
        compose,
        wave: Container[],
        healthyDependencies: Set<string>,
    ): Promise<void> {
        for (const container of wave) {
            const serviceKey = findServiceKeyForContainer(compose, container);
            if (!serviceKey || !healthyDependencies.has(serviceKey)) {
                continue;
            }
            const dockerApi = this.getWatcher(container)?.dockerApi;
            if (!dockerApi) {
                continue;
            }
            const verdict = await waitForHealthy(
                dockerApi.getContainer(container.name),
                {
                    window: this.configuration.rollbackwindow ?? 300_000,
                    interval: this.configuration.rollbackinterval ?? 10_000,
                },
                this.log,
            );
            if (verdict === 'healthy' || verdict === 'no-healthcheck') {
                this.log.info(
                    `Dependency ${container.name} is ${verdict === 'healthy' ? 'healthy' : 'running (no healthcheck)'}; recreating dependent services`,
                );
                continue;
            }
            throw new Error(
                `Dependency ${container.name} did not become healthy (${verdict}); dependent services are not recreated`,
            );
        }
    }

    /**
     * Resolve the registry manager of a container.
     * @param container the container
     * @returns {Registry}
     */
    resolveRegistry(container) {
        return getState().registry[container.image.registry.name];
    }

    /**
     * Read file permissions and ownership metadata.
     * Returns undefined if stat fails or does not expose numeric metadata.
     */
    private async getFileMetadata(
        filePath: string,
    ): Promise<FileMetadata | undefined> {
        try {
            const stats = await fs.stat(filePath);
            if (
                !stats ||
                typeof stats.mode !== 'number' ||
                typeof stats.uid !== 'number' ||
                typeof stats.gid !== 'number'
            ) {
                return undefined;
            }
            return {
                mode: stats.mode & 0o7777,
                uid: stats.uid,
                gid: stats.gid,
            };
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            this.log.debug(
                `Unable to stat ${filePath} to preserve file metadata (${message})`,
            );
            return undefined;
        }
    }

    /**
     * Best-effort restore of file permissions and ownership metadata on a target file.
     * Errors (such as EPERM, ENOTSUP, ENOSYS, EINVAL, EROFS when running non-root
     * or on non-POSIX mounts) are logged at debug level and never fail the operation.
     */
    private async applyFileMetadata(
        filePath: string,
        metadata: FileMetadata,
    ): Promise<void> {
        try {
            await fs.chmod(filePath, metadata.mode);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            this.log.debug(
                `Unable to preserve permissions on ${filePath} (${message})`,
            );
        }
        try {
            await fs.chown(filePath, metadata.uid, metadata.gid);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            this.log.debug(
                `Unable to preserve ownership on ${filePath} (${message})`,
            );
        }
    }

    /**
     * Copy a file and best-effort preserve the source file's permissions and ownership.
     */
    private async copyFilePreservingMetadata(
        src: string,
        dest: string,
    ): Promise<void> {
        await fs.copyFile(src, dest);
        const metadata = await this.getFileMetadata(src);
        if (metadata) {
            await this.applyFileMetadata(dest, metadata);
        }
    }

    /**
     * Force a backup of the compose file (implicit rollback requirement).
     * Throws when the backup cannot be written so the transaction can abort
     * before mutating anything.
     * @param composeFile the compose file path
     * @returns {Promise<void>}
     */
    async ensureComposeBackup(composeFile: string): Promise<void> {
        await this.copyFilePreservingMetadata(
            composeFile,
            `${composeFile}.back`,
        );
    }

    /**
     * Restore the compose file from its `.back` copy.
     * @param composeFile the compose file path
     * @returns {Promise<void>}
     */
    async restoreComposeFileFromBackup(composeFile: string): Promise<void> {
        await this.copyFilePreservingMetadata(
            `${composeFile}.back`,
            composeFile,
        );
    }

    /**
     * Rewrite the compose file replacing the current versions with the update
     * versions. Throws on failure (unlike writeComposeFile).
     * @param composeFile the compose file path
     * @param mappings [{ current, update }]
     * @returns {Promise<void>}
     */
    async rewriteComposeFile(
        composeFile: string,
        mappings: ComposeImageUpdate[],
    ): Promise<void> {
        const composeFileStr = (await fs.readFile(composeFile)).toString();
        const metadata = await this.getFileMetadata(composeFile);
        const updatedComposeFileStr = this.updateComposeYaml(
            composeFileStr,
            mappings,
        );
        const tmpFile = `${composeFile}.tmp.${Date.now()}`;
        try {
            await fs.writeFile(tmpFile, updatedComposeFileStr);
            if (metadata) {
                await this.applyFileMetadata(tmpFile, metadata);
            }
            await fs.rename(tmpFile, composeFile);
        } catch (error) {
            try {
                await fs.unlink(tmpFile);
            } catch {
                // Ignore failure if temp file was already removed or does not exist
            }
            try {
                const backupFile = `${composeFile}.back`;
                await fs.access(backupFile);
                await fs.copyFile(backupFile, composeFile);
                if (metadata) {
                    await this.applyFileMetadata(composeFile, metadata);
                }
            } catch {
                // Ignore failure if backup does not exist or restore fails
            }
            throw error;
        }
    }

    /**
     * Backup a file.
     * @param file
     * @param backupFile
     * @returns {Promise<void>}
     */
    async backup(file: string, backupFile: string): Promise<void> {
        try {
            this.log.debug(`Backup ${file} as ${backupFile}`);
            await this.copyFilePreservingMetadata(file, backupFile);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            this.log.warn(
                `Error when trying to backup file ${file} to ${backupFile} (${message})`,
            );
        }
    }

    /**
     * Return a map containing the image declaration
     * with the current version
     * and the image declaration with the update version.
     * @param compose
     * @param container
     * @param processedServices - Set to track which services have already been processed
     * @returns {{service, current, update}|undefined}
     */
    mapCurrentVersionToUpdateVersion(compose, container, processedServices) {
        // Get registry configuration
        this.log.debug(`Get ${container.image.registry.name} registry manager`);
        const registry = getState().registry[container.image.registry.name];

        const serviceKeyToUpdate = findServiceKeyForContainer(
            compose,
            container,
            processedServices,
        );

        if (!serviceKeyToUpdate) {
            const alreadyProcessed =
                processedServices &&
                findServiceKeyForContainer(compose, container);
            if (alreadyProcessed && processedServices.has(alreadyProcessed)) {
                this.log.debug(
                    `Service ${alreadyProcessed} already processed for container ${container.name} (duplicate image)`,
                );
            } else {
                const currentImage = registry?.getImageFullName
                    ? registry.getImageFullName(
                          container.image,
                          container.image?.tag?.value,
                      )
                    : 'unknown';
                this.log.warn(
                    `Could not find service for container ${container.name} with image ${currentImage}`,
                );
            }
            return undefined;
        }

        // Mark this service as processed
        if (processedServices) {
            processedServices.add(serviceKeyToUpdate);
        }

        // Rebuild image definition string
        const currentImageInCompose =
            compose.services[serviceKeyToUpdate].image;
        const newImage = this.getNewComposeImage(
            registry,
            container,
            currentImageInCompose,
        );

        return {
            service: serviceKeyToUpdate,
            current: currentImageInCompose,
            update: newImage,
        };
    }

    /**
     * Compute the new image string to write into the compose file,
     * preserving or updating pinned image digests.
     * @param registry
     * @param container
     * @param currentImageInCompose
     * @returns {string}
     */
    getNewComposeImage(
        registry: Registry,
        container: Container,
        currentImageInCompose: string,
    ): string {
        const trimmed = (currentImageInCompose || '').trim();
        const atIndex = trimmed.indexOf('@');
        const hasPinnedDigest = atIndex !== -1;

        if (!hasPinnedDigest) {
            return this.getNewImageFullName(registry, container);
        }

        const currentImageWithoutDigest = trimmed.substring(0, atIndex);
        const lastSlash = currentImageWithoutDigest.lastIndexOf('/');
        const lastPart =
            lastSlash !== -1
                ? currentImageWithoutDigest.substring(lastSlash + 1)
                : currentImageWithoutDigest;
        const currentHadTag = lastPart.includes(':');

        // Resolve new remote digest if available
        let remoteDigest: string | undefined;
        if (container.updateKind?.kind === 'digest') {
            remoteDigest =
                container.updateKind.remoteValue || container.result?.digest;
        } else {
            remoteDigest = container.result?.digest;
            if (
                !remoteDigest &&
                container.updateKind?.remoteValue &&
                container.updateKind.remoteValue.includes('@')
            ) {
                remoteDigest = container.updateKind.remoteValue.split('@')[1];
            }
        }

        if (remoteDigest && !remoteDigest.includes(':')) {
            remoteDigest = `sha256:${remoteDigest}`;
        }

        // Digest update on a digest-pinned image
        if (container.updateKind?.kind === 'digest') {
            if (remoteDigest) {
                return `${currentImageWithoutDigest}@${remoteDigest}`;
            }
            if (this.isStrictDigestEnabled(container)) {
                throw new Error(
                    `Image ${currentImageInCompose} is pinned by digest, but no remote digest is available for ${currentImageWithoutDigest} and strict_digest is enabled`,
                );
            }
            return currentImageInCompose;
        }

        // Tag update on a digest-pinned image
        let newTag =
            container.updateKind?.remoteValue ??
            container.result?.tag ??
            container.image?.tag?.value;

        if (newTag && newTag.includes('@')) {
            newTag = newTag.split('@')[0];
        }

        let newBaseImage: string;
        if (currentHadTag) {
            const lastColonIndex = currentImageWithoutDigest.lastIndexOf(':');
            newBaseImage = `${currentImageWithoutDigest.substring(0, lastColonIndex)}:${newTag}`;
        } else if (newTag && newTag !== 'latest') {
            newBaseImage = `${currentImageWithoutDigest}:${newTag}`;
        } else {
            newBaseImage = currentImageWithoutDigest;
        }

        if (remoteDigest) {
            return `${newBaseImage}@${remoteDigest}`;
        }

        if (this.isStrictDigestEnabled(container)) {
            throw new Error(
                `Image ${currentImageInCompose} is pinned by digest, but no remote digest is available for ${newBaseImage} and strict_digest is enabled`,
            );
        }

        this.log.info(
            `No remote digest available for ${newBaseImage}; removing stale digest pin`,
        );
        return newBaseImage;
    }

    /**
     * Update compose file YAML string with target service image updates.
     * Preserves comments, quotes, indentation, flow sequences, and document structure via AST range replacement.
     * @param composeFileStr
     * @param updates Array of { service?, current?, update }
     * @returns {string}
     */
    updateComposeYaml(
        composeFileStr: string,
        updates: ComposeImageUpdate[],
    ): string {
        try {
            const doc = yaml.parseDocument(composeFileStr, {
                maxAliasCount: 10000,
            } as Record<string, unknown>);
            if (doc.errors && doc.errors.length > 0) {
                this.log.warn(
                    `YAML parse errors in compose file (${doc.errors[0].message}), falling back to string replacement`,
                );
                return this.fallbackStringReplace(composeFileStr, updates);
            }

            const replacements: ImageReplacement[] = [];
            const matchedNodes = new Set<Scalar>();
            const seenRanges = new Set<string>();
            const unhandledUpdates: ComposeImageUpdate[] = [];

            for (const updateItem of updates) {
                if (!updateItem.update) {
                    continue;
                }
                const node = findImageNode(
                    doc,
                    updateItem.service,
                    updateItem.current,
                    matchedNodes,
                );
                if (
                    node &&
                    node.range &&
                    typeof node.range[0] === 'number' &&
                    typeof node.range[1] === 'number'
                ) {
                    matchedNodes.add(node);
                    const [start, valueEnd] = node.range;
                    const rangeKey = `${start}:${valueEnd}`;
                    if (seenRanges.has(rangeKey)) {
                        continue;
                    }
                    seenRanges.add(rangeKey);
                    const rawSlice = composeFileStr.slice(start, valueEnd);
                    const text = formatImageReplacement(
                        node,
                        rawSlice,
                        updateItem.update,
                    );
                    replacements.push({ start, end: valueEnd, text });
                } else if (
                    updateItem.service &&
                    doc.hasIn(['services', updateItem.service])
                ) {
                    // Service exists in YAML but lacks an image Scalar node
                    unhandledUpdates.push(updateItem);
                }
            }

            if (replacements.length === 0 && unhandledUpdates.length === 0) {
                return this.fallbackStringReplace(composeFileStr, updates);
            }

            // If a service existed without an image node, we must mutate AST and serialize
            if (unhandledUpdates.length > 0) {
                for (const { service, update } of updates) {
                    if (service && doc.hasIn(['services', service])) {
                        doc.setIn(['services', service, 'image'], update);
                    }
                }
                return doc.toString({ lineWidth: 0 });
            }

            // Apply replacements in descending offset order so earlier indices remain untouched
            replacements.sort((a, b) => b.start - a.start);
            let result = composeFileStr;
            for (const { start, end, text } of replacements) {
                result = result.slice(0, start) + text + result.slice(end);
            }

            // Check if any updates with `current` were not matched via AST
            const unmatchedUpdates = updates.filter(
                (u) =>
                    u.current &&
                    u.update &&
                    !replacements.some(
                        (r) =>
                            r.text === u.update ||
                            r.text === `"${u.update}"` ||
                            r.text === `'${u.update}'`,
                    ),
            );
            if (unmatchedUpdates.length > 0) {
                result = this.fallbackStringReplace(result, unmatchedUpdates);
            }

            return result;
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            this.log.warn(
                `Failed to update compose YAML via AST (${message}), falling back to string replacement`,
            );
            return this.fallbackStringReplace(composeFileStr, updates);
        }
    }

    /**
     * Fallback replacement of image strings.
     * @param composeFileStr
     * @param updates
     * @returns {string}
     */
    fallbackStringReplace(
        composeFileStr: string,
        updates: { current?: string; update: string }[],
    ): string {
        let result = composeFileStr;
        updates.forEach(({ current, update }) => {
            if (current && update) {
                result = result.replaceAll(current, update);
            }
        });
        return result;
    }

    /**
     * Write docker-compose file.
     * @param file
     * @param data
     * @returns {Promise<void>}
     */
    async writeComposeFile(file, data) {
        try {
            await fs.writeFile(file, data);
        } catch (e) {
            this.log.error(`Error when writing ${file} (${e.message})`);
            this.log.debug(e);
        }
    }

    /**
     * Read docker-compose file as a buffer.
     * @param file - Optional file path, defaults to configuration file
     * @returns {Promise<any>}
     */
    getComposeFile(file = null) {
        const filePath = file || this.configuration.file;
        try {
            return fs.readFile(filePath);
        } catch (e) {
            this.log.error(
                `Error when reading the docker-compose yaml file ${filePath} (${e.message})`,
            );
            throw e;
        }
    }

    /**
     * Whether this trigger supports background image preloading.
     */
    supportsPreload(): boolean {
        return true;
    }

    /**
     * Preload image for container: delegate to Docker trigger.
     */
    async preload(container: Container): Promise<void> {
        return super.preload(container);
    }

    /**
     * Read docker-compose file as an object.
     * @param file - Optional file path, defaults to configuration file
     * @returns {Promise<any>}
     */
    async getComposeFileAsObject(file = null) {
        try {
            return yaml.parse((await this.getComposeFile(file)).toString(), {
                maxAliasCount: 10000,
            } as Record<string, unknown>);
        } catch (e) {
            const filePath = file || this.configuration.file;
            this.log.error(
                `Error when parsing the docker-compose yaml file ${filePath} (${e.message})`,
            );
            throw e;
        }
    }
}

export default Dockercompose;
export {
    doesContainerBelongToCompose,
    findServiceKeyForContainer,
    getServiceDependencies,
    orderContainersByDependencies,
    isMatchingServiceImage,
    findImageNode,
    formatImageReplacement,
};
