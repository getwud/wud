// @ts-nocheck
import BaseRegistry from '../../BaseRegistry';

/**
 * Docker Custom Registry V2 integration.
 */
class Custom extends BaseRegistry {
    getConfigurationSchema() {
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

    maskConfiguration() {
        return this.maskSensitiveFields(['password', 'auth']);
    }

    /**
     * Return true if image has no registry url.
     * @param image the image
     * @returns {boolean}
     */
    match(image) {
        return this.configuration.url.indexOf(image.registry.url) !== -1;
    }

    /**
     * Normalize images according to Custom characteristics.
     * @param image
     * @returns {*}
     */
    normalizeImage(image) {
        const imageNormalized = image;
        imageNormalized.registry.url = `${this.configuration.url}/v2`;
        return imageNormalized;
    }

    async authenticate(image, requestOptions) {
        return this.authenticateBasic(
            requestOptions,
            this.getAuthCredentials(),
        );
    }
}

export default Custom;
