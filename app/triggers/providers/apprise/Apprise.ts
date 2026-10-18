// @ts-nocheck
import axios from 'axios';

import Trigger from '../Trigger';

/**
 * Apprise Trigger implementation
 */
class Apprise extends Trigger {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi
            .object()
            .keys({
                url: this.joi.string().uri({
                    scheme: ['http', 'https'],
                }),
                urls: this.joi.string(),
                config: this.joi.string(),
                tag: this.joi.string(),
            })
            .xor('urls', 'config');
    }

    /**
     * Sanitize sensitive data
     * @returns {*}
     */
    maskConfiguration() {
        return {
            ...this.configuration,
            url: this.configuration.url,
            urls: Apprise.mask(this.configuration.urls),
        };
    }

    /**
     * Send an HTTP Request to Apprise.
     * @param container the container
     * @returns {Promise<void>}
     */
    async trigger(container) {
        let uri = `${this.configuration.url}/notify`;
        const risk = container.result?.riskAnalysis;
        let type = 'info';
        let bodyText = this.renderSimpleBody(container);
        let format = 'text';

        if (risk) {
            format = 'markdown';
            const TYPE_MAP = {
                low: 'info',
                medium: 'info',
                high: 'warning',
                critical: 'failure',
                locked: 'warning',
            };
            type = TYPE_MAP[risk.riskScore] || 'info';

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

            const parts = [bodyText];
            parts.push(
                `**Risk Level:** ${emoji} ${risk.riskScore.toUpperCase()}`,
            );
            if (skipped > 0) {
                parts.push(`**Skipped Releases:** +${skipped}`);
            }
            if (risk.summary) {
                parts.push(`> ${risk.summary}`);
            }
            if (risk.breakingChanges && risk.breakingChanges.length > 0) {
                parts.push(
                    `**Breaking Changes:**\n${risk.breakingChanges.map((b) => `• ${b}`).join('\n')}`,
                );
            }
            if (risk.databaseImpact) {
                parts.push(`**Database Impact:** ${risk.databaseImpact}`);
            }
            if (reviewUrl) {
                parts.push(`[🔍 Review Update in WUD](${reviewUrl})`);
            }
            bodyText = parts.join('\n\n');
        }

        const body = {
            title: this.renderSimpleTitle(container),
            body: bodyText,
            format,
            type,
        };

        // Persistent storage usage (target apprise yml config file and tags)
        if (this.configuration.config) {
            uri += `/${this.configuration.config}`;
            if (this.configuration.tag) {
                body.tag = this.configuration.tag;
            }

            // Standard usage
        } else {
            body.urls = this.configuration.urls;
        }
        const options = {
            method: 'POST',
            url: uri,
            data: body,
        };
        const response = await axios(options);
        return response.data;
    }

    /**
     * Send an HTTP Request to Apprise.
     * @param containers
     * @returns {Promise<*>}
     */
    async triggerBatch(containers) {
        const options = {
            method: 'POST',
            url: `${this.configuration.url}/notify`,
            data: {
                urls: this.configuration.urls,
                title: this.renderBatchTitle(containers),
                body: this.renderBatchBody(containers),
                format: 'text',
                type: 'info',
            },
        };
        const response = await axios(options);
        return response.data;
    }

    /**
     * This trigger supports rollback notifications.
     */
    supportsRollbackNotifications(): boolean {
        return true;
    }

    /**
     * Send a rollback notification.
     * @param rollbackReport the rollback report
     * @returns {Promise<*>}
     */
    async triggerRollback(rollbackReport) {
        let uri = `${this.configuration.url}/notify`;
        const body = {
            title: this.renderRollbackTitle(rollbackReport),
            body: this.renderRollbackBody(rollbackReport),
            format: 'text',
            type: 'warning',
        };

        if (this.configuration.config) {
            uri += `/${this.configuration.config}`;
            if (this.configuration.tag) {
                body.tag = this.configuration.tag;
            }
        } else {
            body.urls = this.configuration.urls;
        }

        const options = {
            method: 'POST',
            url: uri,
            data: body,
        };
        const response = await axios(options);
        return response.data;
    }
}

export default Apprise;
