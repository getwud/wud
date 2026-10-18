// @ts-nocheck
import axios from 'axios';
import Trigger from '../Trigger';

/**
 * Rocket Chat Trigger implementation
 */
class Rocketchat extends Trigger {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            url: this.joi
                .string()
                .uri({ scheme: ['http', 'https'] })
                .replace(/\/$/, '')
                .required(),
            user: this.joi.object({
                id: this.joi.string().required(),
            }),
            auth: this.joi.object({
                token: this.joi.string().trim().required(),
            }),
            channel: this.joi.string().required(),
            alias: this.joi.string(),
            avatar: this.joi.string(),
            emoji: this.joi.string(),
            parse: this.joi.object({
                urls: this.joi.boolean(),
            }),
            disabletitle: this.joi.boolean().default(false),
        });
    }

    /**
     * Sanitize sensitive data
     * @returns {*}
     */
    maskConfiguration() {
        return {
            ...this.configuration,
            auth: {
                token: Rocketchat.mask(this.configuration.auth.token),
            },
            user: {
                id: Rocketchat.mask(this.configuration.user.id),
            },
        };
    }

    /**
     * Notify Rocket Chat with new image version details.
     *
     * @param container the container
     * @returns {Promise<*>}
     */
    async trigger(container) {
        const message = this.composeMessage(container);
        const risk = container.result?.riskAnalysis;
        if (!risk) {
            return this.postMessage(message);
        }

        const RISK_COLORS = {
            low: '#2eb886',
            medium: '#e67e22',
            high: '#e74c3c',
            critical: '#e74c3c',
            locked: '#9b59b6',
        };
        const riskEmojis = {
            low: '🟢',
            medium: '⚠️',
            high: '⚡',
            critical: '🚨',
            locked: '🔒',
        };

        const color = RISK_COLORS[risk.riskScore] || '#2eb886';
        const emoji = riskEmojis[risk.riskScore] || 'ℹ️';

        const fields = [];
        fields.push({
            title: 'Risk Level',
            value: `${emoji} ${risk.riskScore.toUpperCase()}`,
            short: true,
        });

        const skipped = this.getSkippedVersionsCount(risk);
        if (skipped > 0) {
            fields.push({
                title: 'Skipped Versions',
                value: `+${skipped}`,
                short: true,
            });
        }

        if (risk.breakingChanges && risk.breakingChanges.length > 0) {
            fields.push({
                title: 'Breaking Changes',
                value: risk.breakingChanges.map((b) => `• ${b}`).join('\n'),
                short: false,
            });
        }

        if (risk.databaseImpact) {
            fields.push({
                title: 'DB Impact',
                value: risk.databaseImpact,
                short: false,
            });
        }

        const reviewUrl = this.getUpgradeReviewUrl(container);
        if (reviewUrl) {
            fields.push({
                title: 'Review',
                value: `[Review Update in WUD](${reviewUrl})`,
                short: false,
            });
        }

        const attachments = [
            {
                color,
                fields,
            },
        ];

        return this.postMessage(message, attachments);
    }

    composeMessage(container) {
        const body = this.renderSimpleBody(container);

        if (this.configuration.disabletitle) {
            return body;
        }

        const title = this.renderSimpleTitle(container);
        return `${title}\n\n${body}`;
    }

    /**
     * Notify Rocket Chat with new image versions details for a batch of
     * containers.
     *
     * @param containers
     * @returns {Promise<*>}
     */
    async triggerBatch(containers) {
        const message = this.composeBatchMessage(containers);
        return this.postMessage(message);
    }

    composeBatchMessage(containers) {
        const body = this.renderBatchBody(containers);

        if (this.configuration.disabletitle) {
            return body;
        }

        const title = this.renderBatchTitle(containers);
        return `${title}\n\n${body}`;
    }

    /**
     * This trigger supports rollback notifications.
     */
    supportsRollbackNotifications(): boolean {
        return true;
    }

    /**
     * Notify Rocket Chat with rollback details.
     * @param rollbackReport the rollback report
     * @returns {Promise<*>}
     */
    async triggerRollback(rollbackReport) {
        const body = this.renderRollbackBody(rollbackReport);
        if (this.configuration.disabletitle) {
            return this.postMessage(body);
        }
        const title = this.renderRollbackTitle(rollbackReport);
        return this.postMessage(`${title}\n\n${body}`);
    }

    /**
     * Send message through the Rocket Chat API.
     *
     * @param text
     * @param attachments
     * @returns {Promise<*>}
     */
    async postMessage(text, attachments = undefined) {
        const data = this.buildMessageBody(text, attachments);
        const options = this.buildRequestOptions();

        return axios.post(
            `${this.configuration.url}/api/v1/chat.postMessage`,
            data,
            options,
        );
    }

    /**
     * Build the message body with all configuration options.
     *
     * @param {string} text - The message text
     * @param {Array} attachments - Optional attachments
     * @returns {Object} The message body
     */
    buildMessageBody(text, attachments = undefined) {
        const body = {
            channel: this.configuration.channel,
            text: text,
        };
        if (this.configuration.alias) {
            body.alias = this.configuration.alias;
        }
        if (this.configuration.avatar) {
            body.avatar = this.configuration.avatar;
        }
        if (this.configuration.emoji) {
            body.emoji = this.configuration.emoji;
        }
        if (this.configuration.parse?.urls) {
            body.parseUrls = this.configuration.parse.urls;
        }
        if (attachments && attachments.length > 0) {
            body.attachments = attachments;
        }

        return body;
    }

    /**
     * Build HTTP request options for Rocket Chat API.
     *
     * @returns {Object} The request options
     */
    buildRequestOptions() {
        return {
            headers: {
                'X-User-Id': this.configuration.user.id,
                'X-Auth-Token': this.configuration.auth.token,
                'content-type': 'application/json',
                accept: 'application/json',
            },
        };
    }
}

export default Rocketchat;
