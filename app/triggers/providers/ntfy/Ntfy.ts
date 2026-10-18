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

export interface NtfyAction {
    action: string;
    label: string;
    url?: string;
    [key: string]: unknown;
}

export interface NtfyMessageBody {
    topic?: string;
    title?: string;
    message?: string;
    priority?: number;
    tags?: string[];
    icon?: string;
    click?: string;
    actions?: NtfyAction[];
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
        const risk = container.result?.riskAnalysis;
        if (!risk) {
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
            return;
        }

        const RISK_PRIORITIES: Record<string, number> = {
            low: 2,
            medium: 3,
            high: 4,
            critical: 5,
            locked: 3,
        };
        const priority =
            RISK_PRIORITIES[risk.riskScore] ?? this.configuration.priority ?? 3;

        const riskTagEmojis: Record<string, string> = {
            low: 'shield',
            medium: 'warning',
            high: 'warning',
            critical: 'rotating_light',
            locked: 'lock',
        };
        const riskTag = riskTagEmojis[risk.riskScore] || 'information_source';
        const tags = Array.from(
            new Set([
                ...(this.configuration.tags || []),
                riskTag,
                risk.riskScore,
            ]),
        );

        let message = this.renderSimpleBody(container);
        const skipped = this.getSkippedVersionsCount(risk);
        const riskEmojis: Record<string, string> = {
            low: '🟢',
            medium: '⚠️',
            high: '⚡',
            critical: '🚨',
            locked: '🔒',
        };
        const emoji = riskEmojis[risk.riskScore] || 'ℹ️';

        const extraParts: string[] = [];
        extraParts.push(`Risk Level: ${emoji} ${risk.riskScore.toUpperCase()}`);
        if (skipped > 0) {
            extraParts.push(`Skipped Releases: +${skipped}`);
        }
        if (risk.summary) {
            extraParts.push(`Summary: ${risk.summary}`);
        }
        if (risk.breakingChanges && risk.breakingChanges.length > 0) {
            extraParts.push(
                `Breaking Changes:\n${risk.breakingChanges.map((b: string) => `• ${b}`).join('\n')}`,
            );
        }
        if (risk.databaseImpact) {
            extraParts.push(`Database Impact: ${risk.databaseImpact}`);
        }
        message = `${message}\n\n${extraParts.join('\n\n')}`;

        const reviewUrl = this.getUpgradeReviewUrl(container);
        const actions: NtfyAction[] = [];
        if (reviewUrl) {
            actions.push({
                action: 'view',
                label: 'Review Update',
                url: reviewUrl,
            });
        }

        let click: string | undefined;
        if (this.configuration.click) {
            const renderedClick = this.renderTemplate(
                this.configuration.click,
                container,
            );
            if (renderedClick) {
                click = renderedClick;
            }
        } else if (reviewUrl) {
            click = reviewUrl;
        }

        const body: NtfyMessageBody = {
            topic: this.configuration.topic,
            title: this.renderSimpleTitle(container),
            message,
            priority,
            tags,
        };
        if (this.configuration.icon) {
            body.icon = this.configuration.icon;
        }
        if (click) {
            body.click = click;
        }
        if (actions.length > 0) {
            body.actions = actions;
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
