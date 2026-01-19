// @ts-nocheck
import axios from 'axios';
import Registry from '../../Registry';

/**
 * Quay.io Registry integration.
 */
class Quay extends Registry {
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
     * Sanitize sensitive data
     * @returns {*}
     */
    maskConfiguration() {
        return {
            ...this.configuration,
            namespace: this.configuration.namespace,
            account: this.configuration.account,
            token: Quay.mask(this.configuration.token),
        };
    }

    /**
     * Return true if image has not registry url.
     * @param image the image
     * @returns {boolean}
     */

    match(image) {
        return /^.*\.?quay\.io$/.test(image.registry.url);
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
        let token;

        // Add Authorization if any
        const credentials = this.getAuthCredentials();
        if (credentials) {
            const request = {
                method: 'GET',
                url: `https://quay.io/v2/auth?service=quay.io&scope=repository:${image.name}:pull`,
                headers: {
                    Accept: 'application/json',
                    Authorization: `Basic ${credentials}`,
                },
            };
            try {
                const response = await axios(request);
                token = response.token;
            } catch (e) {
                this.log.warn(
                    `Error when trying to get an access token (${e.message})`,
                );
            }
        }

        // Token? Put it in authorization header
        if (token) {
            requestOptionsWithAuth.headers.Authorization = `Bearer ${token}`;
        }
        return requestOptionsWithAuth;
    }

    /**
     * Return Base64 credentials if any.
     * @returns {string|undefined|*}
     */
    getAuthCredentials() {
        if (this.configuration.namespace && this.configuration.account) {
            return Quay.base64Encode(
                `${this.configuration.namespace}+${this.configuration.account}`,
                this.configuration.token,
            );
        }
        return undefined;
    }

    /**
     * Return username / password for Docker(+compose) triggers usage
     * @return {{password: string, username: string}|undefined}
     */
    getAuthPull() {
        if (this.configuration.namespace && this.configuration.account) {
            return {
                username: `${this.configuration.namespace}+${this.configuration.account}`,
                password: this.configuration.token,
            };
        }
        return undefined;
    }

    getTagsPage(image, lastItem, link) {
        // Default items per page (not honoured by all registries)
        const itemsPerPage = 1000;
        let nextOrLast = '';
        if (link) {
            const nextPageRegex = link.match(/^.*next_page=(.*)$/);
            const lastRegex = link.match(/^.*last=(.*)>;.*$/);
            if (nextPageRegex) {
                nextOrLast = `&next_page=${nextPageRegex[1]}`;
            } else if (lastRegex) {
                nextOrLast = `&last=${lastRegex[1]}`;
            }
        }
        return this.callRegistry({
            image,
            url: `${image.registry.url}/${image.name}/tags/list?n=${itemsPerPage}${nextOrLast}`,
            resolveWithFullResponse: true,
        });
    }
}

export default Quay;
