import rp, { OptionsWithUrl, RequestPromiseOptions } from 'request-promise-native';
import { Trigger, TriggerConfiguration } from '../Trigger';
import { Container } from '../../../model/container';
import { UriOptions } from 'request';

export interface HttpConfiguration extends TriggerConfiguration {
    url: string;
    method: 'GET' | 'POST';
    auth?: {
        type: 'BASIC' | 'BEARER';
        user?: string;
        password?: string;
        bearer?: string;
    };
    proxy?: string;
}

/**
 * HTTP Trigger implementation
 */
export class Http extends Trigger<HttpConfiguration> {
    /**
     * Get the Trigger configuration schema.
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
        const url = this.configuration.url;
        const options: RequestPromiseOptions & UriOptions = {
            method: this.configuration.method,
            uri: url,
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
