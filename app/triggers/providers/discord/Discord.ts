// @ts-nocheck
import axios from 'axios';

import Trigger from '../Trigger';

/**
 * Discord Trigger implementation
 */
class Discord extends Trigger {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            url: this.joi
                .string()
                .uri({
                    scheme: ['https'],
                })
                .required(),
            botusername: this.joi.string().default('WUD'),
            avatarurl: this.joi
                .string()
                .uri({ scheme: ['https'] })
                .allow('')
                .default(''),
            cardcolor: this.joi.number().default(65280),
            cardlabel: this.joi.string().default(''),
        });
    }

    /**
     * Sanitize sensitive data
     * @returns {*}
     */
    maskConfiguration() {
        return {
            ...this.configuration,
            url: Discord.mask(this.configuration.url),
        };
    }

    /**
     * Send an HTTP Request to Discord.
     * @param container the container
     * @returns {Promise<void>}
     */
    async trigger(container) {
        const title = this.renderSimpleTitle(container);
        const bodyText = this.renderSimpleBody(container);

        const risk = container.result?.riskAnalysis;
        if (!risk) {
            return this.sendMessage(title, bodyText);
        }

        const RISK_COLORS = {
            low: 2278750, // 0x22c55e
            medium: 15381256, // 0xeab308
            high: 16347926, // 0xf97316
            critical: 15680580, // 0xef4444
            locked: 10175195, // 0x9b59b6
        };
        const color =
            RISK_COLORS[risk.riskScore] ?? this.configuration.cardcolor;

        const extraFields = [];
        const riskEmojis = {
            low: '🛡️',
            medium: '⚠️',
            high: '⚡',
            critical: '🚨',
            locked: '🔒',
        };
        const emoji = riskEmojis[risk.riskScore] || 'ℹ️';
        extraFields.push({
            name: 'Risk Level',
            value: `${emoji} ${risk.riskScore.toUpperCase()}`,
        });

        const skipped =
            risk.skippedVersionsCount !== undefined
                ? risk.skippedVersionsCount
                : risk.intermediateReleases
                  ? Math.max(0, risk.intermediateReleases.length - 1)
                  : 0;
        if (skipped > 0) {
            extraFields.push({
                name: 'Skipped Releases',
                value: `+${skipped} intermediate version${skipped > 1 ? 's' : ''}`,
            });
        }

        if (risk.summary) {
            extraFields.push({
                name: 'Summary',
                value: risk.summary,
            });
        }

        if (risk.breakingChanges && risk.breakingChanges.length > 0) {
            extraFields.push({
                name: `Breaking Changes (${risk.breakingChanges.length})`,
                value: risk.breakingChanges.map((b) => `• ${b}`).join('\n'),
            });
        }

        if (risk.databaseImpact) {
            extraFields.push({
                name: 'Database Impact',
                value: risk.databaseImpact,
            });
        }

        const changelog =
            container.result?.changelogUrl || container.changelogUrl;
        if (changelog) {
            extraFields.push({
                name: 'Release Notes',
                value: changelog,
            });
        }

        const baseUrl = process.env.WUD_PUBLIC_URL
            ? process.env.WUD_PUBLIC_URL.replace(/\/+$/, '')
            : '';
        const reviewUrl = baseUrl
            ? `${baseUrl}/#/containers?action=review&container=${container.id}`
            : container.result?.changelogUrl ||
              container.changelogUrl ||
              container.result?.link ||
              container.link;
        if (reviewUrl) {
            extraFields.push({
                name: 'Upgrade Review',
                value: `[Inspect Upgrade Journey](${reviewUrl})`,
            });
        }

        return this.sendMessage(title, bodyText, { color, extraFields });
    }

    /**
     * Send an HTTP Request to Discord.
     * @param containers the list of the containers
     * @returns {Promise<void>}
     */
    async triggerBatch(containers) {
        return this.sendMessage(
            this.renderBatchTitle(containers),
            this.renderBatchBody(containers),
        );
    }

    /**
     * This trigger supports rollback notifications.
     */
    supportsRollbackNotifications(): boolean {
        return true;
    }

    /**
     * Send a rollback notification to Discord.
     * @param rollbackReport the rollback report
     * @returns {Promise<void>}
     */
    async triggerRollback(rollbackReport) {
        return this.sendMessage(
            this.renderRollbackTitle(rollbackReport),
            this.renderRollbackBody(rollbackReport),
        );
    }

    /**
     * Post a message to discord webhook.
     * @param title the message title
     * @param bodyText the text to post
     * @param options optional styling options (color, extraFields)
     * @returns {Promise<>}
     */
    async sendMessage(title, bodyText, options = {}) {
        const uri = this.configuration.url;
        const color = options.color ?? this.configuration.cardcolor;
        const fields = [
            {
                name: this.configuration.cardlabel,
                value: bodyText,
            },
            ...(options.extraFields || []),
        ];

        const body = {
            username: this.configuration.botusername,
            avatar_url: this.configuration.avatarurl,
            embeds: [
                {
                    title,
                    color,
                    fields,
                },
            ],
        };

        const reqOptions = {
            method: 'POST',
            url: uri,
            data: body,
        };
        const response = await axios(reqOptions);
        return response.data;
    }
}

export default Discord;
