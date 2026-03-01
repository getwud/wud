import axios, { AxiosRequestConfig } from 'axios';
import Custom from '../custom/Custom';
import { ContainerImage } from '../../../model/container';

/**
 * Docker Hub integration.
 */
class Hub extends Custom {
    async init() {
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
                watchdigest: this.joi.bool().default(false),
                suppressdigestwatchwarning: this.joi.bool().default(false),
            }),
        ]);
    }

    shouldWatchDigest(wudWatchDigestLabelValue: string, image: string) {
        const shouldWatch =
            (wudWatchDigestLabelValue &&
                wudWatchDigestLabelValue.toLowerCase() === 'true') ||
            this.configuration.watchdigest === true;
        if (shouldWatch && !this.configuration.suppressdigestwatchwarning) {
            this.log.warn(
                `Watching digest for image ${image} may result in throttled requests`,
            );
        }

        return shouldWatch;
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
     */

    match(imageUrl: string) {
        return !imageUrl || /^.*\.?docker.io$/.test(imageUrl);
    }

    /**
     * Normalize images according to Hub characteristics.
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
     */
    async authenticate(
        image: ContainerImage,
        requestOptions: AxiosRequestConfig,
    ) {
        const axiosConfig: AxiosRequestConfig = {
            method: 'GET',
            url: `https://auth.docker.io/token?service=registry.docker.io&scope=repository:${image.name}:pull&grant_type=password`,
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

    getImageFullName(image: ContainerImage, tagOrDigest: string) {
        let fullName = super.getImageFullName(image, tagOrDigest);
        fullName = fullName.replace(/registry-1.docker.io\//, '');
        fullName = fullName.replace(/library\//, '');
        return fullName;
    }
}

export default Hub;
