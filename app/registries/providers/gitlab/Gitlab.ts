// @ts-nocheck
import axios from 'axios';
import Registry from '../../Registry';

/**
 * Docker Gitlab integration.
 */
class Gitlab extends Registry {
    /**
     * Get the Gitlab configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            url: this.joi.string().uri().default('https://registry.gitlab.com'),
            authurl: this.joi.string().uri().default('https://gitlab.com'),
            token: this.joi.string().required(),
        });
    }

    /**
     * Sanitize sensitive data
     * @returns {*}
     */
    maskConfiguration() {
        return {
            ...this.configuration,
            url: this.configuration.url,
            authurl: this.configuration.authurl,
            token: Gitlab.mask(this.configuration.token),
        };
    }

    /**
     * Return true if image has no registry url.
     * @param image the image
     * @returns {boolean}
     */
    match(image) {
        return this.configuration.url.indexOf(image.registry.url) !== -1;
    }

    /**
     * Normalize images according to Gitlab characteristics.
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

    /**
     * Authenticate to Gitlab.
     * @param image
     * @param requestOptions
     * @returns {Promise<*>}
     */
    async authenticate(image, requestOptions) {
        const request = {
            method: 'GET',
            url: `${this.configuration.authurl}/jwt/auth?service=container_registry&scope=repository:${image.name}:pull`,
            headers: {
                Accept: 'application/json',
                Authorization: `Basic ${Gitlab.base64Encode('', this.configuration.token)}`,
            },
        };
        const response = await axios(request);
        const requestOptionsWithAuth = requestOptions;
        requestOptionsWithAuth.headers.Authorization = `Bearer ${response.data.token}`;
        return requestOptionsWithAuth;
    }

    /**
     * Return empty username and personal access token value.
     * @returns {{password: (string|undefined|*), username: string}}
     */
    getAuthPull() {
        return {
            username: '',
            password: this.configuration.token,
        };
    }
}

export default Gitlab;
