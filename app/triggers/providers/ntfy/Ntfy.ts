import axios, { AxiosRequestConfig } from 'axios';
import Trigger, { TriggerConfiguration, RollbackReport } from '../Trigger';
import { Container } from '../../../model/container';

export interface NtfyAuthConfiguration {
    user?: string;
    password?: string;
    token?: string;
}

export interface NtfyConfiguration extends TriggerConfiguration {
    url?: string;
    topic?: string;
    priority?: number;
    tags?: string[];
    icon?: string;
    click?: string;
    auth?: NtfyAuthConfiguration;
}

export interface NtfyMessageBody {
    topic?: string;
    title?: string;
    message?: string;
    priority?: number;
    tags?: string[];
    icon?: string;
    click?: string;
}

/**
 * Ntfy Trigger implementation
 */
class Ntfy extends Trigger {
    public configuration: NtfyConfiguration = {};

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
            tags: this.joi
                .alternatives([
                    this.joi.array().items(this.joi.string()),
                    this.joi
                        .string()
                        .empty('')
                        .custom((value: string) =>
                            value.split(',').map((t) => t.trim()),
                        ),
                ])
                .default([]),
            icon: this.joi
                .string()
                .uri({
                    scheme: ['http', 'https'],
                })
                .allow('')
                .default(''),
            click: this.joi.string().allow(''),
            auth: this.joi.object({
                user: this.joi.string(),
                password: this.joi.string(),
                token: this.joi.string(),
            }),
        });
    }

    /**
     * Sanitize sensitive data
     * @returns {*}
     */
    maskConfiguration(): NtfyConfiguration {
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
     * @param container the container
     * @returns {Promise<unknown>}
     */
    async trigger(container: Container): Promise<void> {
        const body: NtfyMessageBody = {
            topic: this.configuration.topic,
            title: this.renderSimpleTitle(container),
            message: this.renderSimpleBody(container),
            priority: this.configuration.priority,
        };
        if (this.configuration.tags && this.configuration.tags.length > 0) {
            body.tags = this.configuration.tags;
        }
        if (this.configuration.icon) {
            body.icon = this.configuration.icon;
        }
        if (this.configuration.click) {
            const click = this.renderTemplate(
                this.configuration.click,
                container,
            );
            if (click) {
                body.click = click;
            }
        }
        await this.sendHttpRequest(body);
    }

    /**
     * Send an HTTP Request to Ntfy.
     * @param containers
     * @returns {Promise<void>}
     */
    async triggerBatch(containers: Container[]): Promise<void> {
        const body: NtfyMessageBody = {
            topic: this.configuration.topic,
            title: this.renderBatchTitle(containers),
            message: this.renderBatchBody(containers),
            priority: this.configuration.priority,
        };
        if (this.configuration.tags && this.configuration.tags.length > 0) {
            body.tags = this.configuration.tags;
        }
        if (this.configuration.icon) {
            body.icon = this.configuration.icon;
        }
        if (this.configuration.click) {
            const click = this.renderBatch(
                this.configuration.click,
                containers,
            );
            if (click) {
                body.click = click;
            }
        }
        await this.sendHttpRequest(body);
    }

    /**
     * This trigger supports rollback notifications.
     */
    supportsRollbackNotifications(): boolean {
        return true;
    }

    /**
     * Send a rollback notification to Ntfy.
     * @param rollbackReport the rollback report
     * @returns {Promise<void>}
     */
    async triggerRollback(rollbackReport: RollbackReport): Promise<void> {
        const body: NtfyMessageBody = {
            topic: this.configuration.topic,
            title: this.renderRollbackTitle(rollbackReport),
            message: this.renderRollbackBody(rollbackReport),
            priority: this.configuration.priority,
        };
        if (this.configuration.tags && this.configuration.tags.length > 0) {
            body.tags = this.configuration.tags;
        }
        if (this.configuration.icon) {
            body.icon = this.configuration.icon;
        }
        if (this.configuration.click) {
            const click = rollbackReport.container
                ? this.renderTemplate(
                      this.configuration.click,
                      rollbackReport.container,
                  )
                : this.configuration.click;
            if (click) {
                body.click = click;
            }
        }
        await this.sendHttpRequest(body);
    }

    /**
     * Send http request to Ntfy.
     * @param body
     * @returns {Promise<unknown>}
     */
    async sendHttpRequest(body: NtfyMessageBody): Promise<unknown> {
        const options: AxiosRequestConfig = {
            method: 'POST',
            url: this.configuration.url,
            headers: {
                'Content-Type': 'application/json',
            },
            data: body,
        };
        if (
            this.configuration.auth &&
            this.configuration.auth.user &&
            this.configuration.auth.password
        ) {
            options.auth = {
                username: this.configuration.auth.user,
                password: this.configuration.auth.password,
            };
        }
        if (this.configuration.auth && this.configuration.auth.token) {
            options.headers = {
                ...options.headers,
                Authorization: `Bearer ${this.configuration.auth.token}`,
            };
        }
        const response = await axios(options);
        return response.data;
    }
}

export default Ntfy;
