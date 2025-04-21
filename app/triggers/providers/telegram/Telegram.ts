import TelegramBot from 'node-telegram-bot-api';
import { Trigger, TriggerConfiguration } from '../Trigger';
import { Container } from '../../../model/container';

export interface TelegramConfiguration extends TriggerConfiguration {
    bottoken: string;
    chatid: string;
}

/**
 * Telegram Trigger implementation
 */
export class Telegram extends Trigger<TelegramConfiguration> {
    telegramBot!: TelegramBot;

    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            bottoken: this.joi.string().required(),
            chatid: this.joi.string().required(),
        });
    }

    /**
     * Sanitize sensitive data
     */
    maskConfiguration() {
        return {
            ...this.configuration,
            bottoken: Telegram.mask(this.configuration.bottoken),
            chatid: Telegram.mask(this.configuration.chatid),
        };
    }

    /**
     * Init trigger (create telegram client).
     */
    async initTrigger() {
        this.telegramBot = new TelegramBot(this.configuration.bottoken);
    }

    /*
     * Post a message with new image version details.
     *
     * @param image the image
     * @returns {Promise<void>}
     */
    async trigger(container: Container) {
        return this.sendMessage(this.renderSimpleBody(container));
    }

    async triggerBatch(containers: Container[]) {
        return this.sendMessage(this.renderBatchBody(containers));
    }

    /**
     * Post a message to a Slack channel.
     * @param text the text to post
     * @returns {Promise<>}
     */
    async sendMessage(text: string) {
        return this.telegramBot.sendMessage(this.configuration.chatid, text);
    }
}
