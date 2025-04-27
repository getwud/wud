import { ContainerImage } from '../../../model/container';
import { Ghcr } from '../ghcr/Ghcr';

/**
 * Linux-Server Container Registry integration.
 */
export class Lscr extends Ghcr {
    getConfigurationSchema() {
        return this.joi.object().keys({
            username: this.joi.string().required(),
            token: this.joi.string().required(),
        });
    }

    /**
     * Return true if image has not registry url.
     * @param image the image
     */

    match(image: ContainerImage) {
        return /^.*\.?lscr.io$/.test(image.registry.url);
    }

    /**
     * Normalize image according to Github Container Registry characteristics.
     * @param image
     */
    normalizeImage(image: ContainerImage) {
        const imageNormalized = image;
        if (!imageNormalized.registry.url.startsWith('https://')) {
            imageNormalized.registry.url = `https://${imageNormalized.registry.url}/v2`;
        }
        return imageNormalized;
    }
}