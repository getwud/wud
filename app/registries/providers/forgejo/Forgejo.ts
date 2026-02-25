// @ts-nocheck
import Gitea from '../gitea/Gitea';

/**
 * Forgejo Container Registry integration.
 */
class Forgejo extends Gitea {
    getConfigurationSchema() {
        return this.joi.alternatives([
            this.joi.string().allow(''),
            this.joi.object().keys({
                url: this.joi
                    .string()
                    .uri()
                    .optional()
                    .default('https://code.forgejo.org'),
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
            this.configuration.url = 'https://code.forgejo.org';
        }
        // Call parent init to handle URL normalization
        super.init();
    }
}

export default Forgejo;
