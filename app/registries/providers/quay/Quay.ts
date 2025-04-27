import rp, { RequestPromiseOptions } from 'request-promise-native';
import { DockerRegistryTags, Request, Registry } from '../../Registry';
import { ContainerImage } from '../../../model/container';

export interface QuayConfiguration {
    namespace: string;
    account: string;
    token: string;
}

/**
 * Quay.io Registry integration.
 */
export class Quay extends Registry<QuayConfiguration> {
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
     */

    match(image: ContainerImage) {
        return /^.*\.?quay.io$/.test(image.registry.url);
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

    async authenticate(image: ContainerImage, requestOptions: RequestPromiseOptions) {
        const requestOptionsWithAuth = requestOptions;
        let token;

        // Add Authorization if any
        const credentials = this.getAuthCredentials();
        if (credentials) {
            const request = {
                method: 'GET',
                uri: `https://quay.io/v2/auth?service=quay.io&scope=repository:${image.name}:pull`,
                headers: {
                    Accept: 'application/json',
                    Authorization: `Basic ${credentials}`,
                },
                json: true,
            };
            try {
                const response = await rp(request);
                token = response.token;
            } catch (e: any) {
                this.log.warn(
                    `Error when trying to get an access token (${e.message})`,
                );
            }
        }

        // Token? Put it in authorization header
        if (token) {
            requestOptionsWithAuth.headers!.Authorization = `Bearer ${token}`;
        }
        return requestOptionsWithAuth;
    }

    /**
     * Return Base64 credentials if any.
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

    getTagsPage(image: ContainerImage, _lastItem?: string | undefined, link?: string | undefined) {
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
        return this.callRegistry<Request<DockerRegistryTags>>({
            image,
            url: `${image.registry.url}/${image.name}/tags/list?n=${itemsPerPage}${nextOrLast}`,
            resolveWithFullResponse: true,
        });
    }
}
