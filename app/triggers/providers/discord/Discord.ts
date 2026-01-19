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
        return this.sendMessage(
            this.renderSimpleTitle(container),
            this.renderSimpleBody(container),
        );
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
     * Post a message to discord webhook.
     * @param title the message title
     * @param bodyText the text to post
     * @returns {Promise<>}
     */
    async sendMessage(title, bodyText) {
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
            uri,
            body,
        };
        const response = await axios(options);
        return response.data;
    }
}

export default Discord;
