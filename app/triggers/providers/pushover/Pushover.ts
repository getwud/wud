// @ts-nocheck
import Push from 'pushover-notifications';
import Trigger from '../Trigger';

/**
 * Ifttt Trigger implementation
 */
class Pushover extends Trigger {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            user: this.joi.string().required(),
            token: this.joi.string().required(),
            device: this.joi.string(),
            html: this.joi.number().valid(0, 1).default(0),
            sound: this.joi
                .string()
                .allow(
                    'alien',
                    'bike',
                    'bugle',
                    'cashregister',
                    'classical',
                    'climb',
                    'cosmic',
                    'echo',
                    'falling',
                    'gamelan',
                    'incoming',
                    'intermission',
                    'magic',
                    'mechanical',
                    'none',
                    'persistent',
                    'pianobar',
                    'pushover',
                    'siren',
                    'spacealarm',
                    'tugboat',
                    'updown',
                    'vibrate',
                )
                .default('pushover'),
            priority: this.joi.number().integer().min(-2).max(2).default(0),
            retry: this.joi.number().integer().min(30).when('priority', {
                is: 2,
                then: this.joi.required(),
                otherwise: this.joi.optional(),
            }),
            ttl: this.joi.number().integer().min(0),
            expire: this.joi
                .number()
                .integer()
                .min(1)
                .max(10800)
                .when('priority', {
                    is: 2,
                    then: this.joi.required(),
                    otherwise: this.joi.optional(),
                }),
        });
    }

    /**
     * Sanitize sensitive data
     * @returns {*}
     */
    maskConfiguration() {
        return {
            ...this.configuration,
            user: Pushover.mask(this.configuration.user),
            token: Pushover.mask(this.configuration.token),
        };
    }

    /**
     * Send a Pushover notification with new container version details.
     *
     * @param container the container
     * @returns {Promise<void>}
     */
    async trigger(container) {
        const risk = container.result?.riskAnalysis;
        if (!risk) {
            return this.sendMessage({
                title: this.renderSimpleTitle(container),
                message: this.renderSimpleBody(container),
            });
        }

        const RISK_PRIORITIES = {
            low: 0,
            medium: 0,
            high: 1,
            critical: 1,
            locked: 0,
        };
        const priority =
            RISK_PRIORITIES[risk.riskScore] ?? this.configuration.priority ?? 0;
        const reviewUrl = this.getUpgradeReviewUrl(container);
        const skipped = this.getSkippedVersionsCount(risk);
        const riskEmojis = {
            low: '🟢',
            medium: '⚠️',
            high: '⚡',
            critical: '🚨',
            locked: '🔒',
        };
        const emoji = riskEmojis[risk.riskScore] || 'ℹ️';

        const isHtml = this.configuration.html === 1;
        const baseBody = this.renderSimpleBody(container);
        let enrichedMessage = baseBody;

        if (isHtml) {
            const parts = [baseBody];
            parts.push(
                `<b>Risk Level:</b> ${emoji} ${risk.riskScore.toUpperCase()}`,
            );
            if (skipped > 0) {
                parts.push(`<b>Skipped Versions:</b> +${skipped}`);
            }
            if (risk.summary) {
                parts.push(`<i>${risk.summary}</i>`);
            }
            if (risk.breakingChanges && risk.breakingChanges.length > 0) {
                parts.push(
                    `<b>Breaking Changes:</b><br/>${risk.breakingChanges.map((b) => `• ${b}`).join('<br/>')}`,
                );
            }
            if (risk.databaseImpact) {
                parts.push(`<b>DB Impact:</b> ${risk.databaseImpact}`);
            }
            enrichedMessage = parts.join('<br/><br/>');
        } else {
            const parts = [baseBody];
            parts.push(`Risk Level: ${emoji} ${risk.riskScore.toUpperCase()}`);
            if (skipped > 0) {
                parts.push(`Skipped Versions: +${skipped}`);
            }
            if (risk.summary) {
                parts.push(`Summary: ${risk.summary}`);
            }
            if (risk.breakingChanges && risk.breakingChanges.length > 0) {
                parts.push(
                    `Breaking Changes:\n${risk.breakingChanges.map((b) => `• ${b}`).join('\n')}`,
                );
            }
            if (risk.databaseImpact) {
                parts.push(`DB Impact: ${risk.databaseImpact}`);
            }
            enrichedMessage = parts.join('\n\n');
        }

        const payload: Record<string, any> = {
            title: this.renderSimpleTitle(container),
            message: enrichedMessage,
            priority,
        };
        if (reviewUrl) {
            payload.url = reviewUrl;
            payload.url_title = 'Review Update in WUD';
        }
        return this.sendMessage(payload);
    }

    /**
     * Send a Pushover notification with new container versions details.
     * @param containers
     * @returns {Promise<unknown>}
     */
    async triggerBatch(containers) {
        return this.sendMessage({
            title: this.renderBatchTitle(containers),
            message: this.renderBatchBody(containers),
        });
    }

    /**
     * This trigger supports rollback notifications.
     */
    supportsRollbackNotifications(): boolean {
        return true;
    }

    /**
     * Send a Pushover rollback notification.
     * @param rollbackReport the rollback report
     * @returns {Promise<unknown>}
     */
    async triggerRollback(rollbackReport) {
        return this.sendMessage({
            title: this.renderRollbackTitle(rollbackReport),
            message: this.renderRollbackBody(rollbackReport),
        });
    }

    async sendMessage(message) {
        const messageToSend = {
            sound: this.configuration.sound,
            device: this.configuration.device,
            priority: this.configuration.priority,
            html: this.configuration.html,
            ...message,
        };

        // Emergency priority needs retry/expire props
        if (messageToSend.priority === 2) {
            messageToSend.expire = this.configuration.expire;
            messageToSend.retry = this.configuration.retry;
        }
        if (this.configuration.ttl) {
            messageToSend.ttl = this.configuration.ttl;
        }
        return new Promise((resolve, reject) => {
            const push = new Push({
                user: this.configuration.user,
                token: this.configuration.token,
            });

            push.onerror = (err) => {
                reject(new Error(err));
            };

            push.send(messageToSend, (err, res) => {
                if (err) {
                    reject(new Error(err));
                } else {
                    resolve(res);
                }
            });
        });
    }

    /**
     * Render trigger body batch (override) to remove empty lines between containers.
     * @param containers
     * @returns {*}
     */
    renderBatchBody(containers) {
        return containers
            .map((container) => `- ${this.renderSimpleBody(container)}`)
            .join('\n');
    }
}

export default Pushover;
