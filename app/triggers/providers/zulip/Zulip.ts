// @ts-nocheck
import axios from 'axios';
import Trigger from '../Trigger';

/**
 * Zulip Trigger implementation
 */
class Zulip extends Trigger {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            url: this.joi
                .string()
                .uri({ scheme: ['http', 'https'] })
                .replace(/\/$/, '')
                .required(),
            botemail: this.joi.string().required(),
            apikey: this.joi.string().trim().required(),
            type: this.joi.string().valid('stream', 'direct').default('stream'),
            to: this.joi.string().required(),
            topic: this.joi.string().default('WUD Updates'),
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
            apikey: Zulip.mask(this.configuration.apikey),
        };
    }

    /**
     * Notify Zulip with container update details.
     * @param container the container
     * @returns {Promise<*>}
     */
    async trigger(container) {
        const message = this.composeMessage(container);
        return this.sendMessage(message);
    }

    composeMessage(container) {
        const body = this.renderSimpleBody(container);
        if (this.configuration.disabletitle) {
            return body;
        }
        const title = this.renderSimpleTitle(container);
        return `**${title}**\n\n${body}`;
    }

    /**
     * Notify Zulip with batch container update details.
     * @param containers
     * @returns {Promise<*>}
     */
    async triggerBatch(containers) {
        const message = this.composeBatchMessage(containers);
        return this.sendMessage(message);
    }

    composeBatchMessage(containers) {
        const body = this.renderBatchBody(containers);
        if (this.configuration.disabletitle) {
            return body;
        }
        const title = this.renderBatchTitle(containers);
        return `**${title}**\n\n${body}`;
    }

    /**
     * Send message to Zulip Messages API.
     * @param {string} text
     * @returns {Promise<*>}
     */
    async sendMessage(text) {
        const params = new URLSearchParams();
        params.append('type', this.configuration.type);
        params.append('to', this.configuration.to);
        if (this.configuration.type === 'stream') {
            params.append('topic', this.configuration.topic);
        }
        params.append('content', text);

        const authBuffer = Buffer.from(
            `${this.configuration.botemail}:${this.configuration.apikey}`,
        ).toString('base64');

        return axios.post(
            `${this.configuration.url}/api/v1/messages`,
            params.toString(),
            {
                headers: {
                    Authorization: `Basic ${authBuffer}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            },
        );
    }
}

export default Zulip;
