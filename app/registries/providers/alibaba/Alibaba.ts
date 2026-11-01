import { AxiosRequestConfig } from 'axios';
import { ContainerImage } from '../../../model/container';
import DockerRegistryV2 from '../../DockerRegistryV2';
import { AnySchema } from 'joi';

/**
 * Alibaba Cloud Container Registry (ACR / Aliyun) integration.
 */
class Alibaba extends DockerRegistryV2 {
    protected registryPattern = /^.*\.?aliyuncs\.com$/;

    getConfigurationSchema(): AnySchema {
        return this.joi.alternatives([
            this.joi.string().allow(''),
            this.joi.object().keys({
                username: this.joi.string(),
                password: this.joi.string(),
                token: this.joi.string(),
                auth: this.joi.string(),
            }),
        ]);
    }

    async authenticate(
        image: ContainerImage,
        requestOptions: AxiosRequestConfig,
    ): Promise<AxiosRequestConfig> {
        if (this.configuration?.token && !this.getAuthCredentials()) {
            return this.authenticateBearer(
                requestOptions,
                this.configuration.token,
            );
        }

        let registryUrl = image?.registry?.url;
        if (registryUrl) {
            if (
                !registryUrl.startsWith('http://') &&
                !registryUrl.startsWith('https://')
            ) {
                registryUrl = `https://${registryUrl}`;
            }
            registryUrl = registryUrl.replace(/\/v2\/?$/, '');

            const credentials = this.getAuthCredentials();
            const token = await this.getBearerToken(
                image,
                registryUrl,
                credentials,
            );
            if (token) {
                return this.authenticateBearer(requestOptions, token);
            }
        }

        return super.authenticate(image, requestOptions);
    }
}

export default Alibaba;
