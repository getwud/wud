import { RequestPromiseOptions } from 'request-promise-native';
import { ContainerImage } from '../../../model/container';
import { Registry } from '../../Registry';
import { AnySchema } from 'joi';

export interface GhcrConfiguration {
    username: string;
    token: string;
}

/**
 * Github Container Registry integration.
 */
export class Ghcr extends Registry<GhcrConfiguration> {
    getConfigurationSchema(): AnySchema {
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
     */

    match(image: ContainerImage) {
        return /^.*\.?ghcr.io$/.test(image.registry.url);
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
        const bearer = Buffer.from(
            this.configuration.token ? this.configuration.token : ':',
            'utf-8',
        ).toString('base64');
        requestOptionsWithAuth.headers!.Authorization = `Bearer ${bearer}`;
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
