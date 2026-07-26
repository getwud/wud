import parse from 'parse-docker-image-name';
import Dockerode from 'dockerode';
import Trigger from '../Trigger';
import { getState } from '../../../registry';
import { Container, ContainerImage, fullName } from '../../../model/container';
import { Docker as DockerWatcher } from '../../../watchers/providers/docker/Docker';
import Registry from '../../../registries/Registry';
import Logger from 'bunyan';

/**
 * Replace a Docker container with an updated one.
 */
class Docker extends Trigger {
    /**
     * Get the Trigger configuration schema.
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            prune: this.joi.boolean().default(false),
            dryrun: this.joi.boolean().default(false),
            autoremovetimeout: this.joi.number().default(10_000),
            multinetworkfallback: this.joi.boolean().default(true),
        });
    }

    /**
     * Get watcher responsible for the container.
     */

    getWatcher(container: Container) {
        return getState().watcher[
            `docker.${container.watcher}`
        ] as DockerWatcher;
    }

    /**
     * Get current container.
     */
    async getCurrentContainer(
        dockerApi: Dockerode,
        container: Container,
    ): Promise<Dockerode.Container> {
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
     */
    async inspectContainer(
        container: Dockerode.Container,
        logContainer: Logger,
    ): Promise<Dockerode.ContainerInspectInfo> {
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
     */
    async pruneImages(
        dockerApi: Dockerode,
        registry: Registry,
        container: Container,
        logContainer: Logger,
    ): Promise<void> {
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
                    } as ContainerImage);

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
                    logContainer.info(
                        `Prune image ${(imageToRemove as any).name || imageToRemove.id}`,
                    );
                    return imageToRemove.remove();
                }),
            );
        } catch (e: any) {
            logContainer.warn(
                `Some errors occurred when trying to prune previous tags (${e.message})`,
            );
        }
    }

    /**
     * Pull new image.
     */
    async pullImage(
        dockerApi: Dockerode,
        auth: Dockerode.AuthConfig | undefined,
        newImage: string,
        logContainer: Logger,
    ): Promise<void> {
        logContainer.info(`Pull image ${newImage}`);
        try {
            const pullStream = await dockerApi.pull(newImage, {
                authconfig: auth,
            });

            await new Promise((res) =>
                dockerApi.modem.followProgress(pullStream, res),
            );
            logContainer.info(`Image ${newImage} pulled with success`);
        } catch (e: any) {
            logContainer.warn(
                `Error when pulling image ${newImage} (${e.message})`,
            );
            throw e;
        }
    }

    /**
     * Stop a container.
     */
    async stopContainer(
        container: Dockerode.Container,
        containerName: string,
        containerId: string,
        logContainer: Logger,
    ): Promise<void> {
        logContainer.info(
            `Stop container ${containerName} with id ${containerId}`,
        );
        try {
            await container.stop();
            logContainer.info(
                `Container ${containerName} with id ${containerId} stopped with success`,
            );
        } catch (e: any) {
            logContainer.warn(
                `Error when stopping container ${containerName} with id ${containerId}`,
            );
            throw e;
        }
    }

    /**
     * Remove a container.
     */
    async removeContainer(
        container: Dockerode.Container,
        containerName: string,
        containerId: string,
        logContainer: Logger,
    ): Promise<void> {
        logContainer.info(
            `Remove container ${containerName} with id ${containerId}`,
        );
        try {
            await container.remove();
            logContainer.info(
                `Container ${containerName} with id ${containerId} removed with success`,
            );
        } catch (e: any) {
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
        container: Dockerode.Container,
        containerName: string,
        containerId: string,
        logContainer: Logger,
    ): Promise<void> {
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
        } catch (e: any) {
            logContainer.warn(
                `Error while waiting for container ${containerName} with id ${containerId}`,
            );
            throw e;
        }
    }

    /**
     * Create a new container.
     */
    async createContainer(
        dockerApi: Dockerode,
        containerToCreate: Dockerode.ContainerCreateOptions,
        containerName: string,
        logContainer: Logger,
    ): Promise<Dockerode.Container> {
        logContainer.info(`Create container ${containerName}`);
        try {
            const newContainer =
                await dockerApi.createContainer(containerToCreate);
            logContainer.info(
                `Container ${containerName} recreated on new image with success`,
            );
            return newContainer;
        } catch (e: any) {
            logContainer.warn(
                `Error when creating container ${containerName} (${e.message})`,
            );
            throw e;
        }
    }

    /**
     * Sanitize endpoint config so it can be reused on create/connect calls.
     */
    sanitizeEndpointConfig(
        endpointConfig: Dockerode.EndpointSettings | undefined,
        currentContainerId: string | undefined,
    ) {
        if (!endpointConfig) {
            return {};
        }
        const sanitized: Dockerode.EndpointSettings = {};

        if (endpointConfig.IPAMConfig) {
            sanitized.IPAMConfig = endpointConfig.IPAMConfig;
        }
        if (endpointConfig.Links && endpointConfig.Links.length > 0) {
            sanitized.Links = endpointConfig.Links;
        }
        if (endpointConfig.DriverOpts) {
            sanitized.DriverOpts = endpointConfig.DriverOpts;
        }
        if (endpointConfig.MacAddress) {
            sanitized.MacAddress = endpointConfig.MacAddress;
        }
        const linkLocalIPs = (endpointConfig as any).LinkLocalIPs;
        if (linkLocalIPs && linkLocalIPs.length) {
            (sanitized as any).LinkLocalIPs = linkLocalIPs;
        }
        if (endpointConfig.Aliases && endpointConfig.Aliases.length > 0) {
            sanitized.Aliases = endpointConfig.Aliases.filter(
                (alias: string) =>
                    !(
                        alias &&
                        ((currentContainerId &&
                            currentContainerId.startsWith(alias)) ||
                            /^[a-f0-9]{12,64}$/i.test(alias))
                    ),
            );
        }

        return sanitized;
    }

    /**
     * Build fallback plan for multi-network containers.
     */
    buildMultiNetworkFallbackPlan(
        containerToCreate: Dockerode.ContainerCreateOptions,
        currentContainerId: string | undefined,
    ) {
        const endpointsConfig =
            containerToCreate?.NetworkingConfig?.EndpointsConfig;
        if (!endpointsConfig) {
            return null;
        }
        const networkNames = Object.keys(endpointsConfig);
        if (networkNames.length <= 1) {
            return null;
        }

        const sanitizedEndpoints: Record<string, Dockerode.EndpointSettings> =
            {};
        networkNames.forEach((networkName) => {
            sanitizedEndpoints[networkName] = this.sanitizeEndpointConfig(
                endpointsConfig[networkName],
                currentContainerId,
            );
        });

        const networkMode = containerToCreate?.HostConfig?.NetworkMode;
        const primaryNetwork = sanitizedEndpoints[networkMode]
            ? networkMode
            : networkNames[0];

        return {
            primaryNetwork,
            primaryEndpointConfig: sanitizedEndpoints[primaryNetwork],
            secondaryNetworks: networkNames
                .filter((networkName) => networkName !== primaryNetwork)
                .map((networkName) => ({
                    networkName,
                    endpointConfig: sanitizedEndpoints[networkName],
                })),
        };
    }

    /**
     * Create a container and fallback to sequential network attach for daemon/API combinations
     * that reject multiple endpoints in createContainer.
     */
    async createContainerWithMultiNetworkFallback(
        dockerApi: Dockerode,
        containerToCreate: Dockerode.ContainerCreateOptions,
        currentContainerSpec: Dockerode.ContainerInspectInfo,
        containerName: string,
        logContainer: Logger,
    ): Promise<Dockerode.Container> {
        try {
            return await this.createContainer(
                dockerApi,
                containerToCreate,
                containerName,
                logContainer,
            );
        } catch (createError: any) {
            if (
                this.configuration.multinetworkfallback !== true ||
                !(
                    createError instanceof Error &&
                    createError.message
                        .toLowerCase()
                        .includes('cannot be connected to network endpoints')
                )
            ) {
                throw createError;
            }

            logContainer.info(
                `create-primary: failed for ${containerName} on multiple networks, trying fallback with sequential network attach...`,
            );
            const fallbackPlan = this.buildMultiNetworkFallbackPlan(
                containerToCreate,
                currentContainerSpec?.Id,
            );
            if (!fallbackPlan) {
                throw createError;
            }

            logContainer.warn(
                `create-primary: retry create for ${containerName} on network ${fallbackPlan.primaryNetwork} after multi-network create failure`,
            );

            const containerToCreatePrimary = {
                ...containerToCreate,
                NetworkingConfig: {
                    EndpointsConfig: {
                        [fallbackPlan.primaryNetwork]:
                            fallbackPlan.primaryEndpointConfig,
                    },
                },
            };

            let newContainer: Dockerode.Container;
            try {
                newContainer = await this.createContainer(
                    dockerApi,
                    containerToCreatePrimary,
                    containerName,
                    logContainer,
                );
            } catch (primaryCreateError: any) {
                logContainer.warn(
                    `create-primary: failed for ${containerName} (${primaryCreateError.message})`,
                );
                throw primaryCreateError;
            }

            const newContainerIdOrName = newContainer.id || containerName;
            for (const secondaryNetwork of fallbackPlan.secondaryNetworks) {
                const { networkName, endpointConfig } = secondaryNetwork;
                logContainer.info(
                    `connect-secondary:${networkName}: attach ${containerName}`,
                );
                try {
                    const network = dockerApi.getNetwork(networkName);
                    await network.connect({
                        Container: newContainerIdOrName,
                        EndpointConfig: endpointConfig,
                    });
                } catch (connectError: any) {
                    logContainer.warn(
                        `connect-secondary:${networkName}: failed for ${containerName} (${connectError.message})`,
                    );
                    throw connectError;
                }
            }

            return newContainer;
        }
    }

    /**
     * Start container.
     */
    async startContainer(
        container: Dockerode.Container,
        containerName: string,
        logContainer: Logger,
    ): Promise<void> {
        logContainer.info(`Start container ${containerName}`);
        try {
            await container.start();
            logContainer.info(
                `Container ${containerName} started with success`,
            );
        } catch (e: any) {
            logContainer.warn(`Error when starting container ${containerName}`);
            throw e;
        }
    }

    /**
     * Remove an image.
     */
    async removeImage(
        dockerApi: Dockerode,
        imageToRemove: string,
        logContainer: Logger,
    ): Promise<void> {
        logContainer.info(`Remove image ${imageToRemove}`);
        try {
            const image = await dockerApi.getImage(imageToRemove);
            await image.remove();
            logContainer.info(`Image ${imageToRemove} removed with success`);
        } catch (e: any) {
            logContainer.warn(`Error when removing image ${imageToRemove}`);
            throw e;
        }
    }

    /**
     * Clone container specs.
     */
    cloneContainer(
        currentContainer: Dockerode.ContainerInspectInfo,
        newImage: string,
    ): Dockerode.ContainerCreateOptions {
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
                        (alias: string) =>
                            !currentContainer.Id.startsWith(alias),
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
     */
    getNewImageFullName(registry: Registry, container: Container) {
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
     */
    async trigger(container: Container) {
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
                const newContainer =
                    await this.createContainerWithMultiNetworkFallback(
                        dockerApi,
                        containerToCreateInspect,
                        currentContainerSpec,
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
     */
    async triggerBatch(containers: Container[]) {
        await Promise.all(
            containers.map((container) => this.trigger(container)),
        );
    }
}

export default Docker;
