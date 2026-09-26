// @ts-nocheck
import fs from 'fs/promises';
import path from 'path';
import yaml from 'yaml';
import Docker from '../docker/Docker';
import { getState } from '../../../registry';
import { fullName } from '../../../model/container';
import { HookManager } from '../../hooks/HookManager';
import { performProjectTransaction } from './rollback';

/**
 * Return true if the container belongs to the compose file.
 * @param compose
 * @param container
 * @returns true/false
 */
function doesContainerBelongToCompose(compose, container) {
    // Get registry configuration
    const registry = getState().registry[container.image.registry.name];

    // Rebuild image definition string
    const currentImage = registry.getImageFullName(
        container.image,
        container.image.tag.value,
    );
    return Object.keys(compose.services).some((key) => {
        const service = compose.services[key];
        return Boolean(service.image) && service.image.includes(currentImage);
    });
}

/**
 * Update a Docker compose stack with an updated one.
 */
class Dockercompose extends Docker {
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
        });
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
     * @param filePath
     * @returns {string}
     */
    mapPath(filePath) {
        if (!this.configuration.pathmapping || !filePath) {
            return filePath;
        }
        const { host, container } = this.configuration.pathmapping;
        if (filePath.startsWith(host)) {
            const relativePath = filePath
                .substring(host.length)
                .replace(/^[/\\]+/, '');
            return path.join(container, relativePath);
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
            const resolvedPath = path.isAbsolute(labelValue)
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
                return this.mapPath(
                    path.join(workingDir, 'docker-compose.yml'),
                );
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
        return this.triggerBatch([container]);
    }

    /**
     * Update the docker-compose stack.
     * @param containers the containers
     * @returns {Promise<void>}
     */
    async triggerBatch(containers) {
        const containersToUpdate = containers.filter((c) => c.updateAvailable);
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

            if (watcher.dockerApi.modem?.socketPath === '') {
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
            } catch (e) {
                this.log.warn(
                    `Compose file ${composeFile} for container ${container.name} does not exist`,
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
        this.log.info(`Processing compose file: ${composeFile}`);

        const compose = await this.getComposeFileAsObject(composeFile);

        // Filter containers that belong to this compose file
        const containersFiltered = containers.filter((container) =>
            doesContainerBelongToCompose(compose, container),
        );

        if (containersFiltered.length === 0) {
            this.log.warn(`No containers found in compose file ${composeFile}`);
            return;
        }

        // Track which services have already been mapped to avoid duplicates
        // (multiple containers can share the same image/service)
        const processedServices = new Set();

        // [{ current: '1.0.0', update: '2.0.0' }, {...}]
        const currentVersionToUpdateVersionArray = containersFiltered
            .map((container) => {
                const mapping = this.mapCurrentVersionToUpdateVersion(
                    compose,
                    container,
                    processedServices,
                );
                return mapping;
            })
            .filter((map) => map !== undefined);

        // Dry-run?
        if (this.configuration.dryrun) {
            this.log.info(
                `Do not replace existing docker-compose file ${composeFile} (dry-run mode enabled)`,
            );
        } else if (
            containersFiltered.some(
                (container) => this.resolveRollback(container).enabled,
            )
        ) {
            // Quality Gate Pre-update hooks for all containers in this compose stack
            for (const container of containersFiltered) {
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
                containersFiltered,
                currentVersionToUpdateVersionArray,
            );

            // Post-update hooks for all containers in this compose stack
            if (committed) {
                for (const container of containersFiltered) {
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
                }
            }
            return;
        } else {
            // Quality Gate Pre-update hooks for all containers in this compose stack
            for (const container of containersFiltered) {
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
            let composeFileStr = (
                await this.getComposeFile(composeFile)
            ).toString();

            // Replace all versions
            currentVersionToUpdateVersionArray.forEach(
                ({ current, update }) => {
                    composeFileStr = composeFileStr.replaceAll(current, update);
                },
            );

            // Write docker-compose.yml file back
            await this.writeComposeFile(composeFile, composeFileStr);
        }

        // Update all containers
        // (super.notify will take care of the dry-run mode for each container as well)
        await Promise.all(
            containersFiltered.map((container) =>
                super.trigger(container, { runHooks: false }),
            ),
        );

        // Post-update hooks for all containers in this compose stack
        if (!this.configuration.dryrun) {
            for (const container of containersFiltered) {
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
            }
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
     * Force a backup of the compose file (implicit rollback requirement).
     * Throws when the backup cannot be written so the transaction can abort
     * before mutating anything.
     * @param composeFile the compose file path
     * @returns {Promise<void>}
     */
    async ensureComposeBackup(composeFile) {
        await fs.copyFile(composeFile, `${composeFile}.back`);
    }

    /**
     * Restore the compose file from its `.back` copy.
     * @param composeFile the compose file path
     * @returns {Promise<void>}
     */
    async restoreComposeFileFromBackup(composeFile) {
        await fs.copyFile(`${composeFile}.back`, composeFile);
    }

    /**
     * Rewrite the compose file replacing the current versions with the update
     * versions. Throws on failure (unlike writeComposeFile).
     * @param composeFile the compose file path
     * @param mappings [{ current, update }]
     * @returns {Promise<void>}
     */
    async rewriteComposeFile(composeFile, mappings) {
        let composeFileStr = (await fs.readFile(composeFile)).toString();
        mappings.forEach(({ current, update }) => {
            composeFileStr = composeFileStr.replaceAll(current, update);
        });
        await fs.writeFile(composeFile, composeFileStr);
    }

    /**
     * Backup a file.
     * @param file
     * @param backupFile
     * @returns {Promise<void>}
     */
    async backup(file, backupFile) {
        try {
            this.log.debug(`Backup ${file} as ${backupFile}`);
            await fs.copyFile(file, backupFile);
        } catch (e) {
            this.log.warn(
                `Error when trying to backup file ${file} to ${backupFile} (${e.message})`,
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
     * @returns {{current, update}|undefined}
     */
    mapCurrentVersionToUpdateVersion(compose, container, processedServices) {
        // Get registry configuration
        this.log.debug(`Get ${container.image.registry.name} registry manager`);
        const registry = getState().registry[container.image.registry.name];

        // Rebuild image definition string
        const currentImage = registry.getImageFullName(
            container.image,
            container.image.tag.value,
        );

        const serviceKeyToUpdate = Object.keys(compose.services).find(
            (serviceKey) => {
                const service = compose.services[serviceKey];
                return (
                    Boolean(service.image) &&
                    service.image.includes(currentImage)
                );
            },
        );

        if (!serviceKeyToUpdate) {
            this.log.warn(
                `Could not find service for container ${container.name} with image ${currentImage}`,
            );
            return undefined;
        }

        // Skip if this service has already been processed (duplicate container with same image)
        if (processedServices && processedServices.has(serviceKeyToUpdate)) {
            this.log.debug(
                `Service ${serviceKeyToUpdate} already processed for container ${container.name} (duplicate image)`,
            );
            return undefined;
        }

        // Mark this service as processed
        if (processedServices) {
            processedServices.add(serviceKeyToUpdate);
        }

        // Rebuild image definition string
        return {
            current: compose.services[serviceKeyToUpdate].image,
            update: this.getNewImageFullName(registry, container),
        };
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
     * Read docker-compose file as an object.
     * @param file - Optional file path, defaults to configuration file
     * @returns {Promise<any>}
     */
    async getComposeFileAsObject(file = null) {
        try {
            return yaml.parse((await this.getComposeFile(file)).toString(), {
                maxAliasCount: 10000,
            });
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
export { doesContainerBelongToCompose };
