import fs from 'fs/promises';
import yaml from 'yaml';
import { ConstructorOptions } from 'docker-modem'
import { Docker as DockerTrigger, DockerTriggerConfiguration } from '../docker/Docker';
import { getState } from '../../../registry/states';
import { Container } from '../../../model/container';
import { Docker as DockerWatcher } from '../../../watchers/providers/docker/Docker';

/**
 * Return true if the container belongs to the compose file.
 */
function doesContainerBelongToCompose(compose: any, container: Container) {
    // Get registry configuration
    const registry = getState().registry[container.image.registry.name!];

    // Rebuild image definition string
    const currentImage = registry.getImageFullName(
        container.image,
        container.image.tag.value,
    );
    return Object.keys(compose.services).some((key) => {
        const service = compose.services[key];
        return service.image.includes(currentImage);
    });
}

export interface DockerComposeConfiguration extends DockerTriggerConfiguration {
    file: string;
    backup: boolean;
}


/**
 * Update a Docker compose stack with an updated one.
 */
export class Dockercompose extends DockerTrigger<DockerComposeConfiguration> {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        const schemaDocker = super.getConfigurationSchema();
        return schemaDocker.append({
            file: this.joi.string().required(),
            backup: this.joi.boolean().default(false),
        });
    }

    async initTrigger() {
        // Force mode=batch to avoid docker-compose concurrent operations
        this.configuration.mode = 'batch';

        // Check docker-compose file is found
        try {
            await fs.access(this.configuration.file);
        } catch (e) {
            this.log.error(
                `The file ${this.configuration.file} does not exist`,
            );
            throw e;
        }
    }

    /**
     * Update the container.
     * @param container the container
     */
    async trigger(container: Container) {
        return this.triggerBatch([container]);
    }

    /**
     * Update the docker-compose stack.
     */
    async triggerBatch(containers: Container[]) {
        const compose = await this.getComposeFileAsObject();

        const containersFiltered = containers
            // Filter on containers running on local host
            .filter((container) => {
                const watcher = this.getWatcher(container) as DockerWatcher;
                if ((watcher.dockerApi.modem as ConstructorOptions).socketPath !== '') {
                    return true;
                }
                this.log.warn(
                    `Cannot update container ${container.name} because not running on local host`,
                );
                return false;
            })
            // Filter on containers defined in the compose file
            .filter((container) =>
                doesContainerBelongToCompose(compose, container),
            );

        // [{ current: '1.0.0', update: '2.0.0' }, {...}]
        const currentVersionToUpdateVersionArray = containersFiltered
            .map((container) =>
                this.mapCurrentVersionToUpdateVersion(compose, container),
            )
            .filter((map) => map !== undefined);

        // Dry-run?
        if (this.configuration.dryrun) {
            this.log.info(
                'Do not replace existing docker-compose file (dry-run mode enabled)',
            );
        } else {
            // Backup docker-compose file
            if (this.configuration.backup) {
                const backupFile = `${this.configuration.file}.back`;
                await this.backup(this.configuration.file, backupFile);
            }

            // Read the compose file as a string
            let composeFileStr = (await this.getComposeFile()).toString();

            // Replace all versions
            currentVersionToUpdateVersionArray.forEach(
                ({ current, update }) => {
                    composeFileStr = composeFileStr.replaceAll(current, update);
                },
            );

            // Write docker-compose.yml file back
            await this.writeComposeFile(
                this.configuration.file,
                composeFileStr,
            );
        }

        // Update all containers
        // (super.notify will take care of the dry-run mode for each container as well)
        await Promise.all(
            containersFiltered.map((container) => super.trigger(container)),
        );
    }

    /**
     * Backup a file.
     */
    async backup(file: string, backupFile: string) {
        try {
            this.log.debug(`Backup ${file} as ${backupFile}`);
            await fs.copyFile(file, backupFile);
        } catch (e: any) {
            this.log.warn(
                `Error when trying to backup file ${file} to ${backupFile} (${e.message})`,
            );
        }
    }

    /**
     * Return a map containing the image declaration
     * with the current version
     * and the image declaration with the update version.
     */
    mapCurrentVersionToUpdateVersion(compose: any, container: Container) {
        // Get registry configuration
        this.log.debug(`Get ${container.image.registry.name} registry manager`);
        const registry = getState().registry[container.image.registry.name!];

        // Rebuild image definition string
        const currentImage = registry.getImageFullName(
            container.image,
            container.image.tag.value,
        );

        const serviceKeyToUpdate = Object.keys(compose.services).find(
            (serviceKey) => {
                const service = compose.services[serviceKey];
                return service.image.includes(currentImage);
            },
        )!;

        // Rebuild image definition string
        return {
            current: compose.services[serviceKeyToUpdate].image,
            update: this.getNewImageFullName(registry, container),
        };
    }

    /**
     * Write docker-compose file.
     */
    async writeComposeFile(file: string, data: string) {
        try {
            await fs.writeFile(file, data);
        } catch (e: any) {
            this.log.error(`Error when writing ${file} (${e.message})`);
            this.log.debug(e);
        }
    }

    /**
     * Read docker-compose file as a buffer.
     */
    getComposeFile() {
        try {
            return fs.readFile(this.configuration.file);
        } catch (e: any) {
            this.log.error(
                `Error when reading the docker-compose yaml file (${e.message})`,
            );
            throw e;
        }
    }

    /**
     * Read docker-compose file as an object.
     */
    async getComposeFileAsObject() {
        try {
            return yaml.parse((await this.getComposeFile()).toString());
        } catch (e: any) {
            this.log.error(
                `Error when parsing the docker-compose yaml file (${e.message})`,
            );
            throw e;
        }
    }
}