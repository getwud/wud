const rp = require('request-promise-native');
const Registry = require('../../Registry');

/**
 * Google Container Registry integration.
 */
class Gcr extends Registry {
    getConfigurationSchema() {
        return this.joi.alternatives([
            this.joi.string().allow(''),
            this.joi.object().keys({
                clientemail: this.joi.string().required(),
                privatekey: this.joi.string().required(),
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
            clientemail: this.configuration.clientemail,
            privatekey: Gcr.mask(this.configuration.privatekey),
        };
    }

    /**
     * Return true if image has not registry url.
     * @param image the image
     * @returns {boolean}
     */

    match(image) {
        return /^.*\.?gcr.io$/.test(image.registry.url);
    }

    /**
     * Normalize image according to AWS ECR characteristics.
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
        if (!this.configuration.clientemail) {
            return requestOptions;
        }
        const request = {
            method: 'GET',
            uri: `https://gcr.io/v2/token?scope=repository:${image.name}:pull`,
            headers: {
                Accept: 'application/json',
                Authorization: `Basic ${Gcr.base64Encode(
                    '_json_key',
                    JSON.stringify({
                        client_email: this.configuration.clientemail,
                        private_key: this.configuration.privatekey,
                    }),
                )}`,
            },
            json: true,
        };

        const response = await rp(request);
        const requestOptionsWithAuth = requestOptions;
        requestOptionsWithAuth.headers.Authorization = `Bearer ${response.token}`;
        return requestOptionsWithAuth;
    }

    getAuthPull() {
        return {
            username: this.configuration.clientemail,
            password: this.configuration.privatekey,
        };
    }
}

module.exports = Gcr;
