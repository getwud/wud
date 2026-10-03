import { AxiosRequestConfig } from 'axios';
import { AnySchema } from 'joi';
import DockerRegistryV2 from '../../DockerRegistryV2';
import { ContainerImage } from '../../../model/container';

/**
 * Elastic Container Registry integration.
 */
class Elastic extends DockerRegistryV2 {
    protected registryPattern = /^(.*[.])?docker\.elastic\.co$/;

    async init(): Promise<void> {
        if (
            typeof this.configuration !== 'object' ||
            this.configuration === null
        ) {
            this.configuration = {};
        }
        if (!this.configuration.url) {
            this.configuration.url = 'https://docker.elastic.co';
        }
        await super.init();
    }

    getConfigurationSchema(): AnySchema {
        return this.joi.alternatives([
            this.joi.string().allow(''),
            this.joi.object().keys({
                url: this.joi.string().uri().optional(),
                login: this.joi.string().optional(),
                password: this.joi.string().optional(),
                token: this.joi.string().optional(),
                auth: this.joi.string().base64().optional(),
                proxy: this.joi.string().uri().optional(),
            }),
        ]);
    }

    async authenticate(
        image: ContainerImage,
        requestOptions: AxiosRequestConfig,
    ): Promise<AxiosRequestConfig> {
        if (this.configuration.token) {
            return this.authenticateBearer(
                requestOptions,
                this.configuration.token,
            );
        }
        const credentials = this.getAuthCredentials();
        if (credentials) {
            return this.authenticateBasic(requestOptions, credentials);
        }

        const token = await this.getAnonymousBearerToken(
            image,
            this.configuration.url || 'https://docker.elastic.co',
        );
        if (token) {
            return this.authenticateBearer(requestOptions, token);
        }

        return requestOptions;
    }
}

export default Elastic;
