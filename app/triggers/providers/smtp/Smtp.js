const nodemailer = require('nodemailer');
const Trigger = require('../Trigger');

/**
 * SMTP Trigger implementation
 */
class Smtp extends Trigger {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            host: [
                this.joi.string().hostname().required(),
                this.joi.string().ip().required(),
            ],
            allowcustomtld: this.joi.boolean().default(false),
            port: this.joi.number().port().required(),
            user: this.joi.string(),
            pass: this.joi.string(),
            from: this.joi.string().required().custom((value, helpers) => {
					const match = /^("?(?<displayName>[^"]*)"? <)?(?<emailAddress>[^ <]+@[^ >]+)>?$/.exec(value);
					if (!match) {
						return helpers.error('string.email');
					}

					const emailAddress = match.groups.emailAddress;
					const emailValidationResult = this.joi
													.string()
													.email({ tlds: { allow: !helpers.state.ancestors[0].allowcustomtld } })
													.validate(emailAddress);
					if (emailValidationResult.error) {
						return helpers.error('string.email');
					}
					
					const displayName = match.groups.displayName;
					return displayName ? `"${displayName}" <${emailAddress}>` : emailAddress;
				}),
            to: this.joi
                .string()
                .required()
                .when('allowcustomtld', {
                    is: true,
                    then: this.joi.string().email({ tlds: { allow: false } }),
                    otherwise: this.joi.string().email(),
                }),
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

module.exports = Smtp;
