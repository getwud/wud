import { AxiosRequestConfig } from 'axios';
import { ContainerImage } from '../../../model/container';
import DockerRegistryV2 from '../../DockerRegistryV2';
import { AnySchema } from 'joi';

/**
 * Oracle Cloud Infrastructure Registry (OCIR) integration.
 */
class Ocir extends DockerRegistryV2 {
    protected registryPattern = /^.*\.?ocir\.io$/;

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
        const credentials = this.getAuthCredentials();
        let registryUrl = image?.registry?.url;
        if (credentials && registryUrl) {
            // getBearerChallenge() appends /v2/ itself, but WUD normalizes
            // registry URLs with a trailing /v2 already; probing /v2/v2/
            // yields 404 with no challenge, so no token is ever fetched.
            registryUrl = registryUrl.replace(/\/v2\/?$/, '');
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

export default Ocir;
