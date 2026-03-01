import { AxiosRequestConfig } from 'axios';
import { ContainerImage } from '../../../model/container';
import BaseRegistry from '../../BaseRegistry';
import { AnySchema } from 'joi';

/**
 * Github Container Registry integration.
 */
class Ghcr extends BaseRegistry {
    getConfigurationSchema(): AnySchema {
        return this.joi.alternatives([
            this.joi.string().allow(''),
            this.joi.object().keys({
                username: this.joi.string().required(),
                token: this.joi.string().required(),
            }),
        ]);
    }

    maskConfiguration() {
        return this.maskSensitiveFields(['token']);
    }

    match(imageUrl: string) {
        return this.matchUrlPattern(imageUrl, /^.*\.?ghcr.io$/);
    }

    normalizeImage(image: ContainerImage) {
        return this.normalizeImageUrl(image);
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
