// @ts-nocheck
import axios from 'axios';
import Custom from '../custom/Custom';

/**
 * Gitea Container Registry integration.
 */
class Gitea extends Custom {
    getConfigurationSchema() {
        return this.joi.object().keys({
            url: this.joi.string().uri().required(),
            login: this.joi.alternatives().conditional('password', {
                not: undefined,
                then: this.joi.string().required(),
                otherwise: this.joi.any().forbidden(),
            }),
            password: this.joi.alternatives().conditional('login', {
                not: undefined,
                then: this.joi.string().required(),
                otherwise: this.joi.any().forbidden(),
            }),
            auth: this.joi.alternatives().conditional('login', {
                not: undefined,
                then: this.joi.any().forbidden(),
                otherwise: this.joi
                    .alternatives()
                    .try(
                        this.joi.string().base64(),
                        this.joi.string().valid(''),
                    ),
            }),
        });
    }

    /**
     * Custom init behavior.
     */
    init() {
        // Prepend the URL with https protocol if protocol is missing
        if (!this.configuration.url.toLowerCase().startsWith('http')) {
            this.configuration.url = `https://${this.configuration.url}`;
        }
    }

    /**
     * Return true if image registry match gitea fqdn.
     * @param image the image
     * @returns {boolean}
     */
    match(image) {
        const fqdnConfigured = /(?:https?:\/\/)?(.*)/
            .exec(this.configuration.url)[1]
            .toLowerCase();
        const imageRegistryFqdn = /(?:https?:\/\/)?(.*)/
            .exec(image.registry.url)[1]
            .toLowerCase();
        return fqdnConfigured === imageRegistryFqdn;
    }

    /**
     * Normalize image according to Gitea Container Registry characteristics.
     * @param image
     * @returns {*}
     */
    normalizeImage(image) {
        const imageNormalized = image;
        imageNormalized.registry.url = `${this.configuration.url}/v2`;
        return imageNormalized;
    }

    /**
     * Authenticate to Gitea/Forgejo Container Registry.
     * @param image
     * @param requestOptions
     * @returns {Promise<*>}
     */
    async authenticate(image, requestOptions) {
        const axiosConfig = {
            method: 'GET',
            url: `${this.configuration.url}/v2/token?service=container_registry&scope=repository:${image.name}:pull`,
            headers: {
                Accept: 'application/json',
            },
        };

        // Add Authorization if any
        const credentials = this.getAuthCredentials();
        if (credentials) {
            axiosConfig.headers.Authorization = `Basic ${credentials}`;
        }

        const response = await axios(axiosConfig);
        const requestOptionsWithAuth = requestOptions;
        requestOptionsWithAuth.headers.Authorization = `Bearer ${response.data.token}`;
        return requestOptionsWithAuth;
    }
}

export default Gitea;
