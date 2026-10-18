// @ts-nocheck
import axios from 'axios';
import Trigger from '../Trigger';

/**
 * Mattermost Trigger implementation
 */
class Mattermost extends Trigger {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            url: this.joi
                .string()
                .uri({ scheme: ['http', 'https'] })
                .required(),
            channel: this.joi.string(),
            username: this.joi.string().default('WUD'),
            iconurl: this.joi.string().uri({ scheme: ['http', 'https'] }),
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
            url: Mattermost.mask(this.configuration.url),
        };
    }

    /**
     * Notify Mattermost with container update details.
     * @param container the container
     * @returns {Promise<*>}
     */
    async trigger(container) {
        const message = this.composeMessage(container);
        const risk = container.result?.riskAnalysis;
        if (!risk) {
            return this.sendMessage(message);
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
                title: 'Skipped Releases',
                value: `+${skipped} version${skipped > 1 ? 's' : ''}`,
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
                title: 'Database Impact',
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

        return this.sendMessage(message, attachments);
    }

    composeMessage(container) {
        const body = this.renderSimpleBody(container);
        if (this.configuration.disabletitle) {
            return body;
        }
        const title = this.renderSimpleTitle(container);
        return `### ${title}\n${body}`;
    }

    /**
     * Notify Mattermost with batch container update details.
     * @param containers
     * @returns {Promise<*>}
     */
    async triggerBatch(containers) {
        const message = this.composeBatchMessage(containers);
        return this.sendMessage(message);
    }

    composeBatchMessage(containers) {
        const body = this.renderBatchBody(containers);
        if (this.configuration.disabletitle) {
            return body;
        }
        const title = this.renderBatchTitle(containers);
        return `### ${title}\n${body}`;
    }

    /**
     * This trigger supports rollback notifications.
     */
    supportsRollbackNotifications(): boolean {
        return true;
    }

    /**
     * Notify Mattermost with rollback details.
     * @param rollbackReport the rollback report
     * @returns {Promise<*>}
     */
    async triggerRollback(rollbackReport) {
        const body = this.renderRollbackBody(rollbackReport);
        if (this.configuration.disabletitle) {
            return this.sendMessage(body);
        }
        const title = this.renderRollbackTitle(rollbackReport);
        return this.sendMessage(`### ${title}\n${body}`);
    }

    /**
     * Send message to Mattermost incoming webhook.
     * @param {string} text
     * @param {Array} attachments
     * @returns {Promise<*>}
     */
    async sendMessage(text, attachments = undefined) {
        const payload = {
            text,
        };
        if (this.configuration.channel) {
            payload.channel = this.configuration.channel;
        }
        if (this.configuration.username) {
            payload.username = this.configuration.username;
        }
        if (this.configuration.iconurl) {
            payload.icon_url = this.configuration.iconurl;
        }
        if (attachments && attachments.length > 0) {
            payload.attachments = attachments;
        }

        return axios.post(this.configuration.url, payload, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
}

export default Mattermost;
