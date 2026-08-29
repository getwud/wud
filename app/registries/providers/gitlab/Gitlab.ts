import axios, { AxiosRequestConfig } from 'axios';
import DockerRegistryV2 from '../../DockerRegistryV2';
import { ContainerImage } from '../../../model/container';

/**
 * Docker Gitlab integration.
 */
class Gitlab extends DockerRegistryV2 {
    /**
     * Get the Gitlab configuration schema.
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            url: this.joi.string().uri().default('https://registry.gitlab.com'),
            authurl: this.joi.string().uri().default('https://gitlab.com'),
            username: this.joi.string().optional().default(''),
            token: this.joi.string().required(),
        });
    }

    /**
     * Authenticate to Gitlab.
     */
    async authenticate(
        image: ContainerImage,
        requestOptions: AxiosRequestConfig,
    ) {
        const request = {
            method: 'GET',
            url: `${this.configuration.authurl}/jwt/auth?service=container_registry&scope=repository:${image.name}:pull`,
            headers: {
                Accept: 'application/json',
                Authorization: `Basic ${Gitlab.base64Encode(this.configuration.username, this.configuration.token)}`,
            },
        };
        const response = await axios(request);
        const requestOptionsWithAuth = requestOptions;
        requestOptionsWithAuth.headers.Authorization = `Bearer ${response.data.token}`;
        return requestOptionsWithAuth;
    }
}

export default Gitlab;
