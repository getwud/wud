// @ts-nocheck
import { WebClient } from '@slack/web-api';
import Trigger from '../Trigger';

/*
 * Slack Trigger implementation
 */
class Slack extends Trigger {
    /*
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            token: this.joi.string().required(),
            channel: this.joi.string().required(),
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
            channel: this.configuration.channel,
            token: Slack.mask(this.configuration.token),
        };
    }

    /*
     * Init trigger.
     */
    initTrigger() {
        this.client = new WebClient(this.configuration.token);
    }

    /*
     * Post a message with new image version details.
     *
     * @param container the container
     * @returns {Promise<void>}
     */
    async trigger(container) {
        const body = this.renderSimpleBody(container);
        const risk = container.result?.riskAnalysis;

        if (risk) {
            const riskEmojis = {
                low: '🟢',
                medium: '⚠️',
                high: '⚡',
                critical: '🚨',
            };
            const emoji = riskEmojis[risk.riskScore] || 'ℹ️';
            const parts: string[] = [];

            if (!this.configuration.disabletitle) {
                const title = this.renderSimpleTitle(container);
                parts.push(`*${title}*`);
            }

            parts.push(body);
            parts.push(
                `*Risk Level:* ${emoji} ${risk.riskScore.toUpperCase()}`,
            );

            if (risk.summary) {
                parts.push(`> ${risk.summary}`);
            }

            if (risk.breakingChanges && risk.breakingChanges.length > 0) {
                const bullets = risk.breakingChanges
                    .map((b) => `• ${b}`)
                    .join('\n');
                parts.push(
                    `*Breaking Changes (${risk.breakingChanges.length}):*\n${bullets}`,
                );
            }

            if (risk.databaseImpact) {
                parts.push(`*Database Impact:* ${risk.databaseImpact}`);
            }

            const changelog =
                container.result?.changelogUrl || container.changelogUrl;
            if (changelog) {
                parts.push(`<${changelog}|Official Release Notes>`);
            }

            return this.sendMessage(parts.join('\n\n'));
        }

        if (this.configuration.disabletitle) {
            return this.sendMessage(body);
        }

        const title = this.renderSimpleTitle(container);
        return this.sendMessage(`*${title}*\n\n${body}`);
    }

    async triggerBatch(containers) {
        const body = this.renderBatchBody(containers);
        if (this.configuration.disabletitle) {
            return this.sendMessage(body);
        }

        const title = this.renderBatchTitle(containers);
        return this.sendMessage(`*${title}*\n\n${body}`);
    }

    /**
     * This trigger supports rollback notifications.
     */
    supportsRollbackNotifications(): boolean {
        return true;
    }

    /**
     * Post a rollback notification to the Slack channel.
     * @param rollbackReport the rollback report
     * @returns {Promise<ChatPostMessageResponse>}
     */
    async triggerRollback(rollbackReport) {
        const body = this.renderRollbackBody(rollbackReport);
        if (this.configuration.disabletitle) {
            return this.sendMessage(body);
        }

        const title = this.renderRollbackTitle(rollbackReport);
        return this.sendMessage(`*${title}*\n\n${body}`);
    }

    /**
     * Post a message to a Slack channel.
     * @param text the text to post
     * @returns {Promise<ChatPostMessageResponse>}
     */
    async sendMessage(text) {
        return this.client.chat.postMessage({
            channel: this.configuration.channel,
            text,
        });
    }
}

export default Slack;
