const fs = require('fs/promises');
const yaml = require('yaml');
const Docker = require('../docker/Docker');
const { getState } = require('../../../registry');

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
        return service.image?.includes(currentImage) ?? false;
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
     * @returns {Promise<void>}
     */
    async trigger(container) {
        return this.triggerBatch([container]);
    }

    /**
     * Update the docker-compose stack.
     * @param containers the containers
     * @returns {Promise<void>}
     */
    async triggerBatch(containers) {
        const compose = await this.getComposeFileAsObject();

        const containersFiltered = containers
            // Filter on containers running on local host
            .filter((container) => {
                const watcher = this.getWatcher(container);
                if (watcher.dockerApi.modem.socketPath !== '') {
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
     * @returns {{current, update}|undefined}
     */
    mapCurrentVersionToUpdateVersion(compose, container) {
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
                return service.image?.includes(currentImage) ?? false;
            },
        );

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
     * @returns {Promise<any>}
     */
    getComposeFile() {
        try {
            return fs.readFile(this.configuration.file);
        } catch (e) {
            this.log.error(
                `Error when reading the docker-compose yaml file (${e.message})`,
            );
            throw e;
        }
    }

    /**
     * Read docker-compose file as an object.
     * @returns {Promise<any>}
     */
    async getComposeFileAsObject() {
        try {
            return yaml.parse((await this.getComposeFile()).toString());
        } catch (e) {
            this.log.error(
                `Error when parsing the docker-compose yaml file (${e.message})`,
            );
            throw e;
        }
    }
}

module.exports = Dockercompose;
