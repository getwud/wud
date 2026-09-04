import axios, { AxiosRequestConfig } from 'axios';
import DockerRegistryV2 from '../../DockerRegistryV2';
import { ContainerImage } from '../../../model/container';

/**
 * Docker Gitlab integration.
 */
class Gitlab extends DockerRegistryV2 {
    async init() {
        if (!this.configuration.url) {
            this.configuration.url = 'https://registry.gitlab.com';
        }
        if (!this.configuration.authurl) {
            this.configuration.authurl = 'https://gitlab.com';
        }
        if (!this.configuration.username) {
            this.configuration.username = '';
        }
        if (!this.configuration.token) {
            this.configuration.token = '';
        }
    }

    /**
     * Get the Gitlab configuration schema.
     */
    getConfigurationSchema() {
        return this.joi.alternatives([
            this.joi.string().allow(''),
            this.joi.object().keys({
                url: this.joi
                    .string()
                    .uri()
                    .default('https://registry.gitlab.com'),
                authurl: this.joi.string().uri().default('https://gitlab.com'),
                username: this.joi.string().allow('').optional().default(''),
                token: this.joi.string().allow('').optional().default(''),
            }),
        ]);
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
            } as Record<string, string>,
        };
        // Gitlab rejects invalid credentials with 401 even for public projects,
        // so only send Basic credentials when they are configured.
        if (
            this.configuration.username !== '' ||
            this.configuration.token !== ''
        ) {
            request.headers.Authorization = `Basic ${Gitlab.base64Encode(
                this.configuration.username,
                this.configuration.token,
            )}`;
        }
        const response = await axios(request);
        const requestOptionsWithAuth = requestOptions;
        requestOptionsWithAuth.headers.Authorization = `Bearer ${response.data.token}`;
        return requestOptionsWithAuth;
    }
}

export default Gitlab;
