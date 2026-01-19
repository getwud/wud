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
     * @param image the image
     * @returns {Promise<void>}
     */
    async trigger(container) {
        const body = this.renderSimpleBody(container);

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
