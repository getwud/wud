const rp = require('request-promise-native');

const Trigger = require('../Trigger');

/**
 * HTTP Trigger implementation
 */
class Http extends Trigger {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            url: this.joi.string().uri({
                scheme: ['http', 'https'],
            }),
            method: this.joi
                .string()
                .allow('GET')
                .allow('POST')
                .default('POST'),
            auth: this.joi.object({
                type: this.joi
                    .string()
                    .allow('BASIC')
                    .allow('BEARER')
                    .default('BASIC'),
                user: this.joi.string(),
                password: this.joi.string(),
                bearer: this.joi.string(),
            }),
            proxy: this.joi.string(),
        });
    }

    /**
     * Send an HTTP Request with new image version details.
     *
     * @param container the container
     * @returns {Promise<void>}
     */
    async trigger(container) {
        return this.sendHttpRequest(container);
    }

    /**
     * Send an HTTP Request with new image versions details.
     * @param containers
     * @returns {Promise<*>}
     */
    async triggerBatch(containers) {
        return this.sendHttpRequest(containers);
    }

    async sendHttpRequest(body) {
        const options = {
            method: this.configuration.method,
            uri: this.configuration.url,
        };
        if (this.configuration.method === 'POST') {
            options.body = body;
            options.json = true;
        } else if (this.configuration.method === 'GET') {
            options.qs = body;
        }
        if (this.configuration.auth) {
            if (this.configuration.auth.type === 'BASIC') {
                options.auth = {
                    user: this.configuration.auth.user,
                    pass: this.configuration.auth.password,
                };
            } else if (this.configuration.auth.type === 'BEARER') {
                options.auth = {
                    bearer: this.configuration.auth.bearer,
                };
            }
        }
        if (this.configuration.proxy) {
            options.proxy = this.configuration.proxy;
        }
        return rp(options);
    }
}

module.exports = Http;
