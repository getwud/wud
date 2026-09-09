import axios, { AxiosRequestConfig } from 'axios';
import { ContainerImage } from '../../../model/container';
import DockerRegistryV2 from '../../DockerRegistryV2';
import { AnySchema } from 'joi';

/**
 * Docker Hardened Images (DHI) integration.
 */
class Dhi extends DockerRegistryV2 {
    protected registryPattern = /^.*\.?dhi\.io$/;

    async init() {
        if (
            typeof this.configuration === 'object' &&
            this.configuration !== null
        ) {
            if (this.configuration.token && !this.configuration.password) {
                this.configuration.password = this.configuration.token;
            }
            if (this.configuration.login && !this.configuration.username) {
                this.configuration.username = this.configuration.login;
            }
        }
    }

    /**
     * Get the DHI configuration schema.
     */
    getConfigurationSchema(): AnySchema {
        return this.joi.alternatives([
            this.joi
                .object()
                .keys({
                    username: this.joi.string().required(),
                    password: this.joi.string(),
                    token: this.joi.string(),
                })
                .or('password', 'token'),
            this.joi
                .object()
                .keys({
                    login: this.joi.string().required(),
                    password: this.joi.string(),
                    token: this.joi.string(),
                })
                .or('password', 'token'),
            this.joi.object().keys({
                auth: this.joi.string().required(),
            }),
        ]);
    }

    /**
     * Authenticate to DHI.
     */
    async authenticate(
        image: ContainerImage,
        requestOptions: AxiosRequestConfig,
    ): Promise<AxiosRequestConfig> {
        const axiosConfig: AxiosRequestConfig = {
            method: 'GET',
            url: `https://dhi.io/token?service=registry.docker.io&scope=repository:${image.name}:pull&grant_type=password`,
            headers: {
                Accept: 'application/json',
            },
        };

        // Add Authorization if any
        const credentials = this.getAuthCredentials();
        if (credentials) {
            axiosConfig.headers = axiosConfig.headers || {};
            axiosConfig.headers.Authorization = `Basic ${credentials}`;
        }

        const response = await axios(axiosConfig);
        const token = response.data?.token || response.data?.access_token;
        if (!token) {
            throw new Error(
                `Unable to authenticate to DHI registry: token endpoint response did not contain a token`,
            );
        }

        const requestOptionsWithAuth = {
            ...requestOptions,
            headers: {
                ...requestOptions.headers,
                Authorization: `Bearer ${token}`,
            },
        };
        return requestOptionsWithAuth;
    }
}

export default Dhi;
