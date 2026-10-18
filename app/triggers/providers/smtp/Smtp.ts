// @ts-nocheck
import nodemailer from 'nodemailer';
import Trigger from '../Trigger';

/**
 * SMTP Trigger implementation
 */
class Smtp extends Trigger {
    static fromDeprecationWarningMessage =
        'WUD_TRIGGER_SMTP_[trigger_name]_FROM is deprecated, use WUD_TRIGGER_SMTP_[trigger_name]_FROM_ADDRESS instead';

    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        const emailAddressSchema = this.joi
            .string()
            .required()
            .when('/allowcustomtld', {
                is: true,
                then: this.joi.string().email({ tlds: { allow: false } }),
                otherwise: this.joi.string().email(),
            });

        const nodemailerAddressSchema = this.joi
            .extend({
                type: 'withBackwardCompatibility',
                base: this.joi
                    .object({
                        address: emailAddressSchema,
                        name: this.joi.string().optional(),
                    })
                    .required(),
                messages: {
                    'from.deprecated': Smtp.fromDeprecationWarningMessage,
                },
                coerce: {
                    from: 'string',
                    method(value, helpers) {
                        helpers.warn('from.deprecated');
                        return { value: { address: value } };
                    },
                },
            })
            .withBackwardCompatibility();

        return this.joi.object().keys({
            host: [
                this.joi.string().hostname().required(),
                this.joi.string().ip().required(),
            ],
            allowcustomtld: this.joi.boolean().default(false),
            port: this.joi.number().port().required(),
            user: this.joi.string(),
            pass: this.joi.string(),
            from: nodemailerAddressSchema,
            to: emailAddressSchema,
            tls: this.joi
                .object({
                    enabled: this.joi.boolean().default(false),
                    verify: this.joi.boolean().default(true),
                })
                .default({
                    enabled: false,
                    verify: true,
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
            host: this.configuration.host,
            port: this.configuration.port,
            user: this.configuration.user,
            pass: Smtp.mask(this.configuration.pass),
            from: this.configuration.from,
            to: this.configuration.to,
            tls: this.configuration.tls,
        };
    }

    /**
     * Init trigger.
     */
    initTrigger() {
        let auth;
        if (this.configuration.user || this.configuration.pass) {
            auth = {
                user: this.configuration.user,
                pass: this.configuration.pass,
            };
        }
        this.transporter = nodemailer.createTransport({
            host: this.configuration.host,
            port: this.configuration.port,
            auth,
            secure: this.configuration.tls && this.configuration.tls.enabled,
            tls: {
                rejectUnauthorized: this.configuration.tls
                    ? this.configuration.tls.verify
                    : true,
            },
        });
    }

    /**
     * Send a mail with new container version details.
     *
     * @param container the container
     * @returns {Promise<void>}
     */
    async trigger(container) {
        const risk = container.result?.riskAnalysis;
        if (!risk) {
            return this.transporter.sendMail({
                from: this.configuration.from,
                to: this.configuration.to,
                subject: this.renderSimpleTitle(container),
                text: this.renderSimpleBody(container),
            });
        }

        const subject = this.renderSimpleTitle(container);
        const text = this.renderSimpleBody(container);
        const html = this.renderRiskHtml(container);

        return this.transporter.sendMail({
            from: this.configuration.from,
            to: this.configuration.to,
            subject,
            text,
            html,
        });
    }

    renderRiskHtml(container) {
        const risk = container.result?.riskAnalysis;
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
        const skipped = this.getSkippedVersionsCount(risk);
        const reviewUrl = this.getUpgradeReviewUrl(container);
        const title = this.renderSimpleTitle(container);
        const body = this.renderSimpleBody(container);

        let skippedHtml = '';
        if (skipped > 0) {
            skippedHtml = `<p><strong>Skipped Releases:</strong> +${skipped} intermediate version${skipped > 1 ? 's' : ''}</p>`;
        }

        let summaryHtml = '';
        if (risk.summary) {
            summaryHtml = `<blockquote style="border-left: 4px solid #ccc; margin: 10px 0; padding-left: 10px; color: #555;">${risk.summary}</blockquote>`;
        }

        let bcHtml = '';
        if (risk.breakingChanges && risk.breakingChanges.length > 0) {
            const listItems = risk.breakingChanges
                .map((b) => `<li>${b}</li>`)
                .join('');
            bcHtml = `<div style="margin-top: 10px;"><strong>Breaking Changes:</strong><ul>${listItems}</ul></div>`;
        }

        let dbHtml = '';
        if (risk.databaseImpact) {
            dbHtml = `<p><strong>Database Impact:</strong> ${risk.databaseImpact}</p>`;
        }

        let buttonHtml = '';
        if (reviewUrl) {
            buttonHtml = `<p style="margin-top: 20px;"><a href="${reviewUrl}" style="background-color: #0366d6; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">🔍 Review Update in WUD</a></p>`;
        }

        return `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2>${title}</h2>
                <p style="white-space: pre-line;">${body}</p>
                <div style="border: 1px solid #e1e4e8; border-radius: 6px; padding: 16px; margin-top: 20px; background-color: #f6f8fa;">
                    <h3 style="margin-top: 0;">Upgrade Risk Analysis</h3>
                    <p>
                        <strong>Risk Level:</strong>
                        <span style="background-color: ${color}; color: #ffffff; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 0.9em;">
                            ${emoji} ${risk.riskScore.toUpperCase()}
                        </span>
                    </p>
                    ${summaryHtml}
                    ${skippedHtml}
                    ${bcHtml}
                    ${dbHtml}
                    ${buttonHtml}
                </div>
            </div>
        `.trim();
    }

    /**
     * Send a mail with new container versions details.
     * @param containers
     * @returns {Promise<void>}
     */
    async triggerBatch(containers) {
        return this.transporter.sendMail({
            from: this.configuration.from,
            to: this.configuration.to,
            subject: this.renderBatchTitle(containers),
            text: this.renderBatchBody(containers),
        });
    }

    /**
     * This trigger supports rollback notifications.
     */
    supportsRollbackNotifications(): boolean {
        return true;
    }

    /**
     * Send a mail with rollback details.
     * @param rollbackReport the rollback report
     * @returns {Promise<void>}
     */
    async triggerRollback(rollbackReport) {
        return this.transporter.sendMail({
            from: this.configuration.from,
            to: this.configuration.to,
            subject: this.renderRollbackTitle(rollbackReport),
            text: this.renderRollbackBody(rollbackReport),
        });
    }
}

export default Smtp;
