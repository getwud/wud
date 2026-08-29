import DockerRegistryV2 from '../../DockerRegistryV2';
import { ContainerImage } from '../../../model/container';

/**
 * Sonatype Nexus Repository integration.
 */
class Nexus extends DockerRegistryV2 {
    getConfigurationSchema() {
        return this.joi.alternatives([
            this.joi.string().allow(''),
            this.joi.object().keys({
                url: this.joi.string().uri(),
                login: this.joi.string(),
                username: this.joi.string(),
                password: this.joi.string(),
                token: this.joi.string(),
                auth: this.joi.string(),
            }),
        ]);
    }

    normalizeImage(image: ContainerImage): ContainerImage {
        if (this.configuration && this.configuration.url) {
            const imageNormalized = {
                ...image,
                registry: { ...image.registry },
            };
            imageNormalized.registry.url = `${this.configuration.url}/v2`;
            return imageNormalized;
        }
        return super.normalizeImage(image);
    }
}

export default Nexus;
