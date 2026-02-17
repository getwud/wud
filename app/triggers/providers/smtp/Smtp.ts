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
                rejectUnauthorized: !this.configuration.tls
                    ? false
                    : !this.configuration.tls.verify,
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
        return this.transporter.sendMail({
            from: this.configuration.from,
            to: this.configuration.to,
            subject: this.renderSimpleTitle(container),
            text: this.renderSimpleBody(container),
        });
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
}

export default Smtp;
