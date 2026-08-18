// @ts-nocheck
import axios from 'axios';

import Trigger from '../Trigger';

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
            url: this.joi
                .string()
                .uri({
                    scheme: ['http', 'https'],
                })
                .required(),
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
     * Sanitize sensitive data.
     *
     * HTTP endpoints and proxy URLs can embed credentials in addition to the
     * explicit authentication fields, so mask every potentially secret value.
     */
    maskConfiguration() {
        return {
            ...this.configuration,
            url: Http.mask(this.configuration.url),
            auth: this.configuration.auth
                ? {
                      ...this.configuration.auth,
                      user: Http.mask(this.configuration.auth.user),
                      password: Http.mask(this.configuration.auth.password),
                      bearer: Http.mask(this.configuration.auth.bearer),
                  }
                : undefined,
            proxy: Http.mask(this.configuration.proxy),
        };
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
            url: this.configuration.url,
        };
        if (this.configuration.method === 'POST') {
            options.data = body;
        } else if (this.configuration.method === 'GET') {
            options.params = body;
        }
        if (this.configuration.auth) {
            if (this.configuration.auth.type === 'BASIC') {
                options.auth = {
                    username: this.configuration.auth.user,
                    password: this.configuration.auth.password,
                };
            } else if (this.configuration.auth.type === 'BEARER') {
                options.headers = {
                    Authorization: `Bearer ${this.configuration.auth.bearer}`,
                };
            }
        }
        if (this.configuration.proxy) {
            const proxyUrl = new URL(this.configuration.proxy);
            options.proxy = {
                host: proxyUrl.hostname,
                port: proxyUrl.port,
            };
        }
        const response = await axios(options);
        return response.data;
    }
}

export default Http;
