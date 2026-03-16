import { AxiosRequestConfig } from 'axios';
import { ContainerImage } from '../../../model/container';
import Registry from '../../Registry';

/**
 * Azure Container Registry integration.
 */
class Acr extends Registry {
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
     */

    match(imageUrl: string) {
        return /^.*\.?azurecr.io$/.test(imageUrl);
    }

    /**
     * Normalize image according to AWS ECR characteristics.
     */

    normalizeImage(image: ContainerImage) {
        const imageNormalized = image;
        if (!imageNormalized.registry.url.startsWith('https://')) {
            imageNormalized.registry.url = `https://${imageNormalized.registry.url}/v2`;
        }
        return imageNormalized;
    }

    async authenticate(
        image: ContainerImage,
        requestOptions: AxiosRequestConfig,
    ) {
        const requestOptionsWithAuth = requestOptions;
        requestOptionsWithAuth.headers.Authorization = `Basic ${Acr.base64Encode(this.configuration.clientid, this.configuration.clientsecret)}`;
        return requestOptionsWithAuth;
    }

    async getAuthPull() {
        return {
            username: this.configuration.clientid,
            password: this.configuration.clientsecret,
        };
    }
}

export default Acr;
