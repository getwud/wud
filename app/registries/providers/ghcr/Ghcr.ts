import { AxiosRequestConfig } from 'axios';
import { ContainerImage } from '../../../model/container';
import DockerRegistryV2 from '../../DockerRegistryV2';
import { AnySchema } from 'joi';

/**
 * Github Container Registry integration.
 */
class Ghcr extends DockerRegistryV2 {
    protected registryPattern = /^.*\.?ghcr.io$/;

    getConfigurationSchema(): AnySchema {
        return this.joi.alternatives([
            this.joi.string().allow(''),
            this.joi.object().keys({
                username: this.joi.string().required(),
                token: this.joi.string().required(),
            }),
        ]);
    }

    async authenticate(
        image: ContainerImage,
        requestOptions: AxiosRequestConfig,
    ) {
        const token = Buffer.from(
            this.configuration.token || ':',
            'utf-8',
        ).toString('base64');
        return this.authenticateBearer(requestOptions, token);
    }
}

export default Ghcr;
