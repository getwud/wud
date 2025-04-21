import nodemailer, { Transporter } from 'nodemailer';
import { Trigger, TriggerConfiguration } from '../Trigger';
import { Container } from '../../../model/container';

export interface SmtpConfiguration extends TriggerConfiguration {
    host: string;
    port: number;
    user?: string;
    pass?: string;
    from: string;
    to: string;
    tls?: {
        enabled: boolean;
        verify: boolean;
    };
}

/**
 * SMTP Trigger implementation
 */
export class Smtp extends Trigger<SmtpConfiguration> {
    transporter!: Transporter;
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            host: [
                // allow IP address or hostname
                this.joi.string().hostname().required(),
                this.joi.string().ip().required(),
            ],
            port: this.joi.number().port().required(),
            user: this.joi.string(),
            pass: this.joi.string(),
            from: this.joi.string().email().required(),
            to: this.joi.string().email().required(),
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
    async initTrigger() {
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
     */
    async trigger(container: Container) {
        return this.transporter.sendMail({
            from: this.configuration.from,
            to: this.configuration.to,
            subject: this.renderSimpleTitle(container),
            text: this.renderSimpleBody(container),
        });
    }

    /**
     * Send a mail with new container versions details.
     */
    async triggerBatch(containers: Container[]) {
        return this.transporter.sendMail({
            from: this.configuration.from,
            to: this.configuration.to,
            subject: this.renderBatchTitle(containers),
            text: this.renderBatchBody(containers),
        });
    }
}
