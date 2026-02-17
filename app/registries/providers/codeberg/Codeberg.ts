// @ts-nocheck
import Forgejo from '../forgejo/Forgejo';

/**
 * Codeberg Container Registry integration.
 */
class Codeberg extends Forgejo {
    getConfigurationSchema() {
        return this.joi.alternatives([
            this.joi.string().allow(''),
            this.joi.object().keys({
                url: this.joi
                    .string()
                    .uri()
                    .optional()
                    .default('https://codeberg.org'),
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
    init() {
        // Set default URL if not provided
        if (!this.configuration.url) {
            this.configuration.url = 'https://codeberg.org';
        }
        // Call parent init to handle URL normalization
        super.init();
    }
}

export default Codeberg;
