import { AnySchema } from 'joi';
import { AxiosRequestConfig } from 'axios';
import DockerRegistryV2 from '../../DockerRegistryV2';
import { ContainerImage } from '../../../model/container';

/**
 * Docker Custom Registry V2 integration.
 */
class Custom extends DockerRegistryV2 {
    getConfigurationSchema(): AnySchema<any> {
        return this.joi.object().keys({
            url: this.joi.string().uri().required(),
            login: this.joi.alternatives().conditional('password', {
                not: undefined,
                then: this.joi.string().required(),
                otherwise: this.joi.any().forbidden(),
            }),
            password: this.joi.alternatives().conditional('login', {
                not: undefined,
                then: this.joi.string().required(),
                otherwise: this.joi.any().forbidden(),
            }),
            token: this.joi.alternatives().conditional('login', {
                not: undefined,
                then: this.joi.any().forbidden(),
                otherwise: this.joi.alternatives().conditional('auth', {
                    not: undefined,
                    then: this.joi.any().forbidden(),
                    otherwise: this.joi.string(),
                }),
            }),
            auth: this.joi.alternatives().conditional('login', {
                not: undefined,
                then: this.joi.any().forbidden(),
                otherwise: this.joi
                    .alternatives()
                    .try(
                        this.joi.string().base64(),
                        this.joi.string().valid(''),
                    ),
            }),
        });
    }

    maskConfiguration() {
        return this.maskSensitiveFields(['password', 'token', 'auth']);
    }

    /**
     * Return true if image has no registry url.
     */
    match(imageUrl: string) {
        return this.configuration.url.indexOf(imageUrl) !== -1;
    }

    /**
     * Normalize images according to Custom characteristics.
     */
    normalizeImage(image: ContainerImage) {
        const imageNormalized = image;
        imageNormalized.registry.url = `${this.configuration.url}/v2`;
        return imageNormalized;
    }

    async authenticate(
        image: ContainerImage,
        requestOptions: AxiosRequestConfig,
    ) {
        if (this.configuration.token) {
            return this.authenticateBearer(
                requestOptions,
                this.configuration.token,
            );
        }
        return this.authenticateBasic(
            requestOptions,
            this.getAuthCredentials(),
        );
    }
}

export default Custom;
