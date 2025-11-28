const Quay = require('../quay/Quay');

/**
 * Linux-Server Container Registry integration.
 */
class Trueforge extends Quay {
    getConfigurationSchema() {
        return this.joi.alternatives([
            // Anonymous configuration
            this.joi.string().allow(''),

            // Auth configuration
            this.joi.object().keys({
                namespace: this.joi.string().required(),
                account: this.joi.string().required(),
                token: this.joi.string().required(),
            }),
        ]);
    }

    /**
     * Return true if image has not registry url.
     * @param image the image
     * @returns {boolean}
     */

    match(image) {
        return /^.*\.?oci.trueforge.org$/.test(image.registry.url);
    }

    /**
     * Normalize image according to Github Container Registry characteristics.
     * @param image
     * @returns {*}
     */

    normalizeImage(image) {
        const imageNormalized = image;
        if (!imageNormalized.registry.url.startsWith('https://')) {
            imageNormalized.registry.url = `https://${imageNormalized.registry.url}/v2`;
        }
        return imageNormalized;
    }
}

module.exports = Trueforge;
