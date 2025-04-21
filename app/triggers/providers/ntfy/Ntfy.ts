import rp, { RequestPromiseOptions } from 'request-promise-native';
import { Trigger, TriggerConfiguration } from '../Trigger';
import { Container } from '../../../model/container';
import { RequiredUriUrl } from 'request';

export interface NtfyConfiguration extends TriggerConfiguration {
    url: string;
    topic: string;
    priority: 0 | 1 | 2 | 3 | 4 | 5;
    auth?: {
        user?: string;
        password?: string;
        token?: string;
    } | undefined;
}

/**
 * Ntfy Trigger implementation
 */
export class Ntfy extends Trigger<NtfyConfiguration> {
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
                .default('https://ntfy.sh'),
            topic: this.joi.string(),
            priority: this.joi.number().integer().min(0).max(5),
            auth: this.joi.object({
                user: this.joi.string(),
                password: this.joi.string(),
                token: this.joi.string(),
            }),
        });
    }

    /**
     * Sanitize sensitive data
     */
    maskConfiguration() {
        return {
            ...this.configuration,
            auth: this.configuration.auth
                ? {
                    user: Ntfy.mask(this.configuration.auth.user),
                    password: Ntfy.mask(this.configuration.auth.password),
                    token: Ntfy.mask(this.configuration.auth.token),
                }
                : undefined,
        };
    }

    /**
     * Send an HTTP Request to Ntfy.
     */
    async trigger(container: Container) {
        return this.sendHttpRequest({
            topic: this.configuration.topic,
            title: this.renderSimpleTitle(container),
            message: this.renderSimpleBody(container),
            priority: this.configuration.priority,
        });
    }

    /**
     * Send an HTTP Request to Ntfy.
     */
    async triggerBatch(containers: Container[]) {
        return this.sendHttpRequest({
            topic: this.configuration.topic,
            title: this.renderBatchTitle(containers),
            message: this.renderBatchBody(containers),
            priority: this.configuration.priority,
        });
    }

    /**
     * Send http request to Ntfy.
     * @param body
     * @returns {Promise<*>}
     */
    async sendHttpRequest(body: any) {
        const options: RequestPromiseOptions & RequiredUriUrl = {
            method: 'POST',
            uri: this.configuration.url,
            headers: {
                'Content-Type': 'application/json',
            },
            body,
            json: true,
        };
        if (
            this.configuration.auth &&
            this.configuration.auth.user &&
            this.configuration.auth.password
        ) {
            options.auth = {
                user: this.configuration.auth.user,
                pass: this.configuration.auth.password,
            };
        }
        if (this.configuration.auth && this.configuration.auth.token) {
            options.auth = {
                bearer: this.configuration.auth.token,
            };
        }
        return rp(options);
    }
}
