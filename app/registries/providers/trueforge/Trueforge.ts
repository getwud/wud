import { ContainerImage } from '../../../model/container';
import Ghcr from '../ghcr/Ghcr';

/**
 * Linux-Server Container Registry integration.
 */
class Trueforge extends Ghcr {
    getConfigurationSchema() {
        return this.joi.object().keys({
            username: this.joi.string().required(),
            token: this.joi.string().required(),
        });
    }

    /**
     * Return true if image has not registry url.
     */
    match(imageUrl: string) {
        return /^.*\.?oci.trueforge.org$/.test(imageUrl);
    }

    /**
     * Normalize image according to Github Container Registry characteristics.
     */
    normalizeImage(image: ContainerImage) {
        const imageNormalized = image;
        if (!imageNormalized.registry.url.startsWith('https://')) {
            imageNormalized.registry.url = `https://${imageNormalized.registry.url}/v2`;
        }
        return imageNormalized;
    }
}

export default Trueforge;
