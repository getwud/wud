import { AnySchema } from 'joi';
import DockerRegistryV2 from '../../DockerRegistryV2';
import { ContainerImage } from '../../../model/container';

/**
 * Docker Custom Registry V2 integration.
 */
class Custom extends DockerRegistryV2 {
    getConfigurationSchema(): AnySchema<any> {
        return this.joi.alternatives([
            this.joi.string().allow(''),
            this.joi.object().keys({
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
            }),
        ]);
    }

    /**
     * Normalize images according to Custom characteristics.
     */
    normalizeImage(image: ContainerImage) {
        const imageNormalized = image;
        imageNormalized.registry.url = `${this.configuration.url}/v2`;
        return imageNormalized;
    }
}

export default Custom;
