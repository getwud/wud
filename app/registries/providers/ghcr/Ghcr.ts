// @ts-nocheck
import BaseRegistry from '../../BaseRegistry';

/**
 * Github Container Registry integration.
 */
class Ghcr extends BaseRegistry {
    getConfigurationSchema() {
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

    match(image) {
        return this.matchUrlPattern(image, /^.*\.?ghcr.io$/);
    }

    normalizeImage(image) {
        return this.normalizeImageUrl(image);
    }

    async authenticate(image, requestOptions) {
        const token = Buffer.from(
            this.configuration.token || ':',
            'utf-8',
        ).toString('base64');
        return this.authenticateBearer(requestOptions, token);
    }
}

export default Ghcr;
