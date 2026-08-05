import axios, { AxiosRequestConfig } from 'axios';
import Trigger from '../Trigger';
import { ComponentConfiguration } from '../../../registry/Component';
import { Container } from '../../../model/container';

/**
 * HTTP Trigger implementation
 */
class Http extends Trigger {
    /**
     * Get the Trigger configuration schema.
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

    maskConfiguration(): ComponentConfiguration {
        return {
            ...this.configuration,
            auth: {
                ...this.configuration.auth,
                password: Http.mask(this.configuration.auth?.password),
                bearer: Http.mask(this.configuration.auth?.bearer),
            },
        };
    }

    /**
     * Send an HTTP Request with new image version details.
     */
    async trigger(container: Container) {
        return this.sendHttpRequest(container);
    }

    /**
     * Send an HTTP Request with new image versions details.
     */
    async triggerBatch(containers: Container[]) {
        return this.sendHttpRequest(containers);
    }

    async sendHttpRequest(body: Container | Container[]) {
        const options: AxiosRequestConfig = {
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
                port: Number.parseInt(proxyUrl.port),
            };
        }
        const response = await axios(options);
        return response.data;
    }
}

export default Http;
