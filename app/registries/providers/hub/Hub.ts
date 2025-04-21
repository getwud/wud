import rp, { RequestPromiseOptions } from 'request-promise-native';
import { Custom } from '../custom/Custom';
import { ContainerImage } from '../../../model/container';

export interface HubConfiguration {
    url: string;
    login?: string;
    password?: string;
    token?: string;
    auth?: string;
}

/**
 * Docker Hub integration.
 */
export class Hub extends Custom<HubConfiguration> {
    init() {
        this.configuration.url = 'https://registry-1.docker.io';
        if (this.configuration.token) {
            this.configuration.password = this.configuration.token;
        }
    }

    /**
     * Get the Hub configuration schema.
     */
    getConfigurationSchema() {
        return this.joi.alternatives([
            this.joi.string().allow(''),
            this.joi.object().keys({
                login: this.joi.string(),
                password: this.joi.string(),
                token: this.joi.string(),
                auth: this.joi.string().base64(),
            }),
        ]);
    }

    /**
     * Sanitize sensitive data
     */
    maskConfiguration() {
        return {
            ...this.configuration,
            url: this.configuration.url,
            login: this.configuration.login,
            password: Hub.mask(this.configuration.password),
            token: Hub.mask(this.configuration.token),
            auth: Hub.mask(this.configuration.auth),
        };
    }

    /**
     * Return true if image has no registry url.
     * @param image the image
     */

    match(image: ContainerImage) {
        return (
            !image.registry.url || /^.*\.?docker.io$/.test(image.registry.url)
        );
    }

    /**
     * Normalize images according to Hub characteristics.
     * @param image
     */
    normalizeImage(image: ContainerImage) {
        const imageNormalized = super.normalizeImage(image);
        if (imageNormalized.name) {
            imageNormalized.name = imageNormalized.name.includes('/')
                ? imageNormalized.name
                : `library/${imageNormalized.name}`;
        }
        return imageNormalized;
    }

    /**
     * Authenticate to Hub.
     * @param image
     * @param requestOptions
     */
    async authenticate(image: ContainerImage, requestOptions: RequestPromiseOptions) {
        const uri = `https://auth.docker.io/token?service=registry.docker.io&scope=repository:${image.name}:pull&grant_type=password`;
        const request: RequestPromiseOptions = {
            method: 'GET',
            headers: {
                Accept: 'application/json',
            },
            json: true,
        };

        // Add Authorization if any
        const credentials = this.getAuthCredentials();
        if (credentials) {
            request.headers!.Authorization = `Basic ${credentials}`;
        }

        const response = await rp(uri, request);
        const requestOptionsWithAuth = requestOptions;
        requestOptionsWithAuth.headers!.Authorization = `Bearer ${response.token}`;
        return requestOptionsWithAuth;
    }

    getImageFullName(image: ContainerImage, tagOrDigest: string) {
        let fullName = super.getImageFullName(image, tagOrDigest);
        fullName = fullName.replace(/registry-1.docker.io\//, '');
        fullName = fullName.replace(/library\//, '');
        return fullName;
    }
}
