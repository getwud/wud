import rp from 'request-promise-native';
import { Trigger, TriggerConfiguration } from '../Trigger';
import { Container } from '../../../model/container';

export interface DiscordConfiguration extends TriggerConfiguration {
    url: string;
    botusername: string;
    cardcolor: number;
    cardlabel: string;
}

/**
 * Discord Trigger implementation
 */
export class Discord extends Trigger<DiscordConfiguration> {
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
            cardcolor: this.joi.number().default(65280),
            cardlabel: this.joi.string().default(''),
        });
    }

    /**
     * Sanitize sensitive data
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
     */
    async trigger(container: Container) {
        return this.sendMessage(
            this.renderSimpleTitle(container),
            this.renderSimpleBody(container),
        );
    }

    /**
     * Send an HTTP Request to Discord.
     * @param containers the list of the containers
     */
    async triggerBatch(containers: Container[]) {
        return this.sendMessage(
            this.renderBatchTitle(containers),
            this.renderBatchBody(containers),
        );
    }

    /**
     * Post a message to discord webhook.
     * @param title the message title
     * @param bodyText the text to post
     */
    async sendMessage(title: string, bodyText: string) {
        const uri = this.configuration.url;
        const body = {
            username: this.configuration.botusername,
            embeds: [
                {
                    title,
                    color: this.configuration.cardcolor,
                    fields: [
                        {
                            name: this.configuration.cardlabel,
                            value: bodyText,
                        },
                    ],
                },
            ],
        };

        const options = {
            method: 'POST',
            json: true,
            uri,
            body,
        };
        return rp(options);
    }
}
