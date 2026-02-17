// @ts-nocheck
import parse from 'parse-docker-image-name';
import Trigger from '../Trigger';
import { getState } from '../../../registry';
import { fullName } from '../../../model/container';

/**
 * Replace a Docker container with an updated one.
 */
class Docker extends Trigger {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            prune: this.joi.boolean().default(false),
            dryrun: this.joi.boolean().default(false),
            autoremovetimeout: this.joi.number().default(10_000),
        });
    }

    /**
     * Get watcher responsible for the container.
     * @param container
     * @returns {*}
     */

    getWatcher(container) {
        return getState().watcher[`docker.${container.watcher}`];
    }

    /**
     * Get current container.
     * @param dockerApi
     * @param container
     * @returns {Promise<*>}
     */
    async getCurrentContainer(dockerApi, container) {
        this.log.debug(`Get container ${container.id}`);
        try {
            return await dockerApi.getContainer(container.id);
        } catch (e) {
            this.log.warn(`Error when getting container ${container.id}`);
            throw e;
        }
    }

    /**
     * Inspect container.
     * @param container
     * @returns {Promise<*>}
     */
    async inspectContainer(container, logContainer) {
        this.log.debug(`Inspect container ${container.id}`);
        try {
            return await container.inspect();
        } catch (e) {
            logContainer.warn(
                `Error when inspecting container ${container.id}`,
            );
            throw e;
        }
    }

    /**
     * Prune previous image versions.
     * @param dockerApi
     * @param registry
     * @param container
     * @param logContainer
     * @returns {Promise<void>}
     */
    async pruneImages(dockerApi, registry, container, logContainer) {
        logContainer.info('Pruning previous tags');
        try {
            // Get all pulled images
            const images = await dockerApi.listImages();

            // Find all pulled images to remove
            const imagesToRemove = images
                .filter((image) => {
                    // Exclude images without repo tags
                    if (!image.RepoTags || image.RepoTags.length === 0) {
                        return false;
                    }
                    const imageParsed = parse(image.RepoTags[0]);
                    const imageNormalized = registry.normalizeImage({
                        registry: {
                            url: imageParsed.domain ? imageParsed.domain : '',
                        },
                        tag: {
                            value: imageParsed.tag,
                        },
                        name: imageParsed.path,
                    });

                    // Exclude different registries
                    if (
                        imageNormalized.registry.name !==
                        container.image.registry.name
                    ) {
                        return false;
                    }

                    // Exclude different names
                    if (imageNormalized.name !== container.image.name) {
                        return false;
                    }

                    // Exclude current container image
                    if (
                        imageNormalized.tag.value ===
                        container.updateKind.localValue
                    ) {
                        return false;
                    }

                    // Exclude candidate image
                    if (
                        imageNormalized.tag.value ===
                        container.updateKind.remoteValue
                    ) {
                        return false;
                    }
                    return true;
                })
                .map((imageToRemove) => dockerApi.getImage(imageToRemove.Id));
            await Promise.all(
                imagesToRemove.map((imageToRemove) => {
                    logContainer.info(`Prune image ${imageToRemove.name}`);
                    return imageToRemove.remove();
                }),
            );
        } catch (e) {
            logContainer.warn(
                `Some errors occurred when trying to prune previous tags (${e.message})`,
            );
        }
    }

    /**
     * Pull new image.
     * @param dockerApi
     * @param auth
     * @param newImage
     * @param logContainer
     * @returns {Promise<void>}
     */

    async pullImage(dockerApi, auth, newImage, logContainer) {
        logContainer.info(`Pull image ${newImage}`);
        try {
            const pullStream = await dockerApi.pull(newImage, {
                authconfig: auth,
            });

            await new Promise((res) =>
                dockerApi.modem.followProgress(pullStream, res),
            );
            logContainer.info(`Image ${newImage} pulled with success`);
        } catch (e) {
            logContainer.warn(
                `Error when pulling image ${newImage} (${e.message})`,
            );
            throw e;
        }
    }

    /**
     * Stop a container.
     * @param container
     * @param containerName
     * @param containerId
     * @param logContainer
     * @returns {Promise<void>}
     */

    async stopContainer(container, containerName, containerId, logContainer) {
        logContainer.info(
            `Stop container ${containerName} with id ${containerId}`,
        );
        try {
            await container.stop();
            logContainer.info(
                `Container ${containerName} with id ${containerId} stopped with success`,
            );
        } catch (e) {
            logContainer.warn(
                `Error when stopping container ${containerName} with id ${containerId}`,
            );
            throw e;
        }
    }

    /**
     * Remove a container.
     * @param container
     * @param containerName
     * @param containerId
     * @param logContainer
     * @returns {Promise<void>}
     */
    async removeContainer(container, containerName, containerId, logContainer) {
        logContainer.info(
            `Remove container ${containerName} with id ${containerId}`,
        );
        try {
            await container.remove();
            logContainer.info(
                `Container ${containerName} with id ${containerId} removed with success`,
            );
        } catch (e) {
            logContainer.warn(
                `Error when removing container ${containerName} with id ${containerId}`,
            );
            throw e;
        }
    }

    /**
     * Wait for a container to be removed.
     */
    async waitContainerRemoved(
        container,
        containerName,
        containerId,
        logContainer,
    ) {
        logContainer.info(
            `Wait container ${containerName} with id ${containerId}`,
        );
        try {
            await container.wait({
                condition: 'removed',
                abortSignal: AbortSignal.timeout(
                    this.configuration.autoremovetimeout,
                ),
            });
            logContainer.info(
                `Container ${containerName} with id ${containerId} auto-removed successfully`,
            );
        } catch (e) {
            logContainer.warn(
                e,
                `Error while waiting for container ${containerName} with id ${containerId}`,
            );
            throw e;
        }
    }

    /**
     * Create a new container.
     * @param dockerApi
     * @param containerToCreate
     * @param containerName
     * @param logContainer
     * @returns {Promise<*>}
     */
    async createContainer(
        dockerApi,
        containerToCreate,
        containerName,
        logContainer,
    ) {
        logContainer.info(`Create container ${containerName}`);
        try {
            const newContainer =
                await dockerApi.createContainer(containerToCreate);
            logContainer.info(
                `Container ${containerName} recreated on new image with success`,
            );
            return newContainer;
        } catch (e) {
            logContainer.warn(
                `Error when creating container ${containerName} (${e.message})`,
            );
            throw e;
        }
    }

    /**
     * Start container.
     * @param container
     * @param containerName
     * @param logContainer
     * @returns {Promise<void>}
     */
    async startContainer(container, containerName, logContainer) {
        logContainer.info(`Start container ${containerName}`);
        try {
            await container.start();
            logContainer.info(
                `Container ${containerName} started with success`,
            );
        } catch (e) {
            logContainer.warn(`Error when starting container ${containerName}`);
            throw e;
        }
    }

    /**
     * Remove an image.
     * @param dockerApi
     * @param imageToRemove
     * @param logContainer
     * @returns {Promise<void>}
     */
    async removeImage(dockerApi, imageToRemove, logContainer) {
        logContainer.info(`Remove image ${imageToRemove}`);
        try {
            const image = await dockerApi.getImage(imageToRemove);
            await image.remove();
            logContainer.info(`Image ${imageToRemove} removed with success`);
        } catch (e) {
            logContainer.warn(`Error when removing image ${imageToRemove}`);
            throw e;
        }
    }

    /**
     * Clone container specs.
     * @param currentContainer
     * @param newImage
     * @returns {*}
     */
    cloneContainer(currentContainer, newImage) {
        const containerName = currentContainer.Name.replace('/', '');
        const containerClone = {
            ...currentContainer.Config,
            name: containerName,
            Image: newImage,
            HostConfig: currentContainer.HostConfig,
            NetworkingConfig: {
                EndpointsConfig: currentContainer.NetworkSettings.Networks,
            },
        };

        if (containerClone.NetworkingConfig.EndpointsConfig) {
            Object.values(
                containerClone.NetworkingConfig.EndpointsConfig,
            ).forEach((endpointConfig) => {
                if (
                    endpointConfig.Aliases &&
                    endpointConfig.Aliases.length > 0
                ) {
                    endpointConfig.Aliases = endpointConfig.Aliases.filter(
                        (alias) => !currentContainer.Id.startsWith(alias),
                    );
                }
            });
        }
        // Handle situation when container is using network_mode: service:other_service
        if (
            containerClone.HostConfig &&
            containerClone.HostConfig.NetworkMode &&
            containerClone.HostConfig.NetworkMode.startsWith('container:')
        ) {
            delete containerClone.Hostname;
            delete containerClone.ExposedPorts;
        }

        return containerClone;
    }

    /**
     * Get image full name.
     * @param registry the registry
     * @param container the container
     */
    getNewImageFullName(registry, container) {
        // Tag to pull/run is
        // either the same (when updateKind is digest)
        // or the new one (when updateKind is tag)
        const tagOrDigest =
            container.updateKind.kind === 'digest'
                ? container.image.tag.value
                : container.updateKind.remoteValue;

        // Rebuild image definition string
        return registry.getImageFullName(container.image, tagOrDigest);
    }

    /**
     * Update the container.
     * @param container the container
     * @returns {Promise<void>}
     */
    async trigger(container) {
        // Child logger for the container to process
        const logContainer = this.log.child({ container: fullName(container) });

        // Get watcher
        const watcher = this.getWatcher(container);

        // Get dockerApi from watcher
        const { dockerApi } = watcher;

        // Get registry configuration
        logContainer.debug(
            `Get ${container.image.registry.name} registry manager`,
        );
        const registry = getState().registry[container.image.registry.name];

        logContainer.debug(
            `Get ${container.image.registry.name} registry credentials`,
        );
        const auth = await registry.getAuthPull();

        // Rebuild image definition string
        const newImage = this.getNewImageFullName(registry, container);

        // Get current container
        const currentContainer = await this.getCurrentContainer(
            dockerApi,
            container,
        );

        if (currentContainer) {
            const currentContainerSpec = await this.inspectContainer(
                currentContainer,
                logContainer,
            );
            const currentContainerState = currentContainerSpec.State;

            // Try to remove previous pulled images
            if (this.configuration.prune) {
                await this.pruneImages(
                    dockerApi,
                    registry,
                    container,
                    logContainer,
                );
            }

            // Pull new image ahead of time
            await this.pullImage(dockerApi, auth, newImage, logContainer);

            // Dry-run?
            if (this.configuration.dryrun) {
                logContainer.info(
                    'Do not replace the existing container because dry-run mode is enabled',
                );
            } else {
                // Clone current container spec
                const containerToCreateInspect = this.cloneContainer(
                    currentContainerSpec,
                    newImage,
                    logContainer,
                );

                // Stop current container
                if (currentContainerState.Running) {
                    await this.stopContainer(
                        currentContainer,
                        container.name,
                        container.id,
                        logContainer,
                    );
                }

                if (currentContainerSpec.HostConfig?.AutoRemove !== true) {
                    // Remove current container
                    await this.removeContainer(
                        currentContainer,
                        container.name,
                        container.id,
                        logContainer,
                    );
                } else {
                    // This is a special case when the container is set to be removed automatically when it stops.
                    // In this case, we need to wait for the container to be removed before creating the new one.
                    await this.waitContainerRemoved(
                        currentContainer,
                        container.name,
                        container.id,
                        logContainer,
                    );
                }

                // Create new container
                const newContainer = await this.createContainer(
                    dockerApi,
                    containerToCreateInspect,
                    container.name,
                    logContainer,
                );

                // Start container if it was running
                if (currentContainerState.Running) {
                    await this.startContainer(
                        newContainer,
                        container.name,
                        logContainer,
                    );
                }

                // Remove previous image (only when updateKind is tag)
                if (this.configuration.prune) {
                    const tagOrDigestToRemove =
                        container.updateKind.kind === 'tag'
                            ? container.image.tag.value
                            : container.image.digest.repo;

                    // Rebuild image definition string
                    const oldImage = registry.getImageFullName(
                        container.image,
                        tagOrDigestToRemove,
                    );
                    await this.removeImage(dockerApi, oldImage, logContainer);
                }
            }
        } else {
            logContainer.warn(
                'Unable to update the container because it does not exist',
            );
        }
    }

    /**
     * Update the containers.
     * @param containers
     * @returns {Promise<unknown[]>}
     */
    async triggerBatch(containers) {
        return Promise.all(
            containers.map((container) => this.trigger(container)),
        );
    }
}

export default Docker;
