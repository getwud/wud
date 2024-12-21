const Registry = require('../../Registry');

/**
 * Github Container Registry integration.
 */
class Ghcr extends Registry {
    getConfigurationSchema() {
        return this.joi.alternatives([
            this.joi.string().allow(''),
            this.joi.object().keys({
                username: this.joi.string().required(),
                token: this.joi.string().required(),
            }),
        ]);
    }

    /**
     * Sanitize sensitive data
     * @returns {*}
     */
    maskConfiguration() {
        return {
            ...this.configuration,
            username: this.configuration.username,
            token: Ghcr.mask(this.configuration.token),
        };
    }

    /**
     * Return true if image has not registry url.
     * @param image the image
     * @returns {boolean}
     */

    match(image) {
        return /^.*\.?ghcr.io$/.test(image.registry.url);
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

    async authenticate(image, requestOptions) {
        const requestOptionsWithAuth = requestOptions;
        const bearer = Buffer.from(
            this.configuration.token ? this.configuration.token : ':',
            'utf-8',
        ).toString('base64');
        requestOptionsWithAuth.headers.Authorization = `Bearer ${bearer}`;
        return requestOptionsWithAuth;
    }

    getAuthPull() {
        if (this.configuration.username && this.configuration.token) {
            return {
                username: this.configuration.username,
                password: this.configuration.token,
            };
        }
        return undefined;
    }
}

module.exports = Ghcr;
