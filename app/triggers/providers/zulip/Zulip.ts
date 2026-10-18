// @ts-nocheck
import axios from 'axios';
import Trigger from '../Trigger';

/**
 * Zulip Trigger implementation
 */
class Zulip extends Trigger {
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
            botemail: this.joi.string().required(),
            apikey: this.joi.string().trim().required(),
            type: this.joi.string().valid('stream', 'direct').default('stream'),
            to: this.joi.string().required(),
            topic: this.joi.string().default('WUD Updates'),
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
            apikey: Zulip.mask(this.configuration.apikey),
        };
    }

    /**
     * Notify Zulip with container update details.
     * @param container the container
     * @returns {Promise<*>}
     */
    async trigger(container) {
        const risk = container.result?.riskAnalysis;
        if (!risk) {
            const message = this.composeMessage(container);
            return this.sendMessage(message);
        }

        const riskEmojis = {
            low: '🟢',
            medium: '⚠️',
            high: '⚡',
            critical: '🚨',
            locked: '🔒',
        };
        const emoji = riskEmojis[risk.riskScore] || 'ℹ️';
        const skipped = this.getSkippedVersionsCount(risk);
        const reviewUrl = this.getUpgradeReviewUrl(container);

        const parts = [];
        if (!this.configuration.disabletitle) {
            const title = this.renderSimpleTitle(container);
            parts.push(`**${title}**`);
        }
        parts.push(this.renderSimpleBody(container));
        parts.push(`**Risk Level:** ${emoji} ${risk.riskScore.toUpperCase()}`);
        if (skipped > 0) {
            parts.push(`**Skipped Releases:** +${skipped}`);
        }
        if (risk.summary) {
            parts.push(`> ${risk.summary}`);
        }
        if (risk.breakingChanges && risk.breakingChanges.length > 0) {
            parts.push(
                `**Breaking Changes:**\n${risk.breakingChanges.map((b) => `* ${b}`).join('\n')}`,
            );
        }
        if (risk.databaseImpact) {
            parts.push(`**Database Impact:** ${risk.databaseImpact}`);
        }
        if (reviewUrl) {
            parts.push(`[🔍 Review Update in WUD](${reviewUrl})`);
        }

        return this.sendMessage(parts.join('\n\n'));
    }

    composeMessage(container) {
        const body = this.renderSimpleBody(container);
        if (this.configuration.disabletitle) {
            return body;
        }
        const title = this.renderSimpleTitle(container);
        return `**${title}**\n\n${body}`;
    }

    /**
     * Notify Zulip with batch container update details.
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
        return `**${title}**\n\n${body}`;
    }

    /**
     * This trigger supports rollback notifications.
     */
    supportsRollbackNotifications(): boolean {
        return true;
    }

    /**
     * Notify Zulip with rollback details.
     * @param rollbackReport the rollback report
     * @returns {Promise<*>}
     */
    async triggerRollback(rollbackReport) {
        const body = this.renderRollbackBody(rollbackReport);
        if (this.configuration.disabletitle) {
            return this.sendMessage(body);
        }
        const title = this.renderRollbackTitle(rollbackReport);
        return this.sendMessage(`**${title}**\n\n${body}`);
    }

    /**
     * Send message to Zulip Messages API.
     * @param {string} text
     * @returns {Promise<*>}
     */
    async sendMessage(text) {
        const params = new URLSearchParams();
        params.append('type', this.configuration.type);
        params.append('to', this.configuration.to);
        if (this.configuration.type === 'stream') {
            params.append('topic', this.configuration.topic);
        }
        params.append('content', text);

        const authBuffer = Buffer.from(
            `${this.configuration.botemail}:${this.configuration.apikey}`,
        ).toString('base64');

        return axios.post(
            `${this.configuration.url}/api/v1/messages`,
            params.toString(),
            {
                headers: {
                    Authorization: `Basic ${authBuffer}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            },
        );
    }
}

export default Zulip;
