import { RequestPromiseOptions } from 'request-promise-native';
import { ContainerImage } from '../../../model/container';
import { Registry } from '../../Registry';

export interface AcrConfiguration {
    clientid: string;
    clientsecret: string;
}


/**
 * Azure Container Registry integration.
 */
export class Acr extends Registry<AcrConfiguration> {
    getConfigurationSchema() {
        return this.joi.object().keys({
            clientid: this.joi.string().required(),
            clientsecret: this.joi.string().required(),
        });
    }

    /**
     * Sanitize sensitive data
     */
    maskConfiguration() {
        return {
            ...this.configuration,
            clientid: this.configuration.clientid,
            clientsecret: Acr.mask(this.configuration.clientsecret),
        };
    }

    /**
     * Return true if image has not registryUrl.
     * @param image the image
     */

    match(image: ContainerImage) {
        return /^.*\.?azurecr.io$/.test(image.registry.url);
    }

    /**
     * Normalize image according to AWS ECR characteristics.
     * @param image
     */

    normalizeImage(image: ContainerImage) {
        const imageNormalized = image;
        if (!imageNormalized.registry.url.startsWith('https://')) {
            imageNormalized.registry.url = `https://${imageNormalized.registry.url}/v2`;
        }
        return imageNormalized;
    }

    async authenticate(_image: ContainerImage, requestOptions: RequestPromiseOptions) {
        const requestOptionsWithAuth = requestOptions;
        requestOptionsWithAuth.headers!.Authorization = `Basic ${Acr.base64Encode(this.configuration.clientid, this.configuration.clientsecret)}`;
        return requestOptionsWithAuth;
    }

    getAuthPull() {
        return {
            username: this.configuration.clientid,
            password: this.configuration.clientsecret,
        };
    }
}
