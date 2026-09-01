// @ts-nocheck
import axios from 'axios';
import Trigger from '../Trigger';

const DEFAULT_GRAPH_URL = 'https://graph.facebook.com/v19.0';

/**
 * WhatsApp Trigger implementation (via Meta WhatsApp Cloud API)
 */
class Whatsapp extends Trigger {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            phonenumberid: this.joi.string().trim().required(),
            token: this.joi.string().trim().required(),
            recipient: this.joi.string().trim().required(),
            url: this.joi
                .string()
                .uri({ scheme: ['http', 'https'] })
                .replace(/\/$/, '')
                .default(DEFAULT_GRAPH_URL),
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
            phonenumberid: Whatsapp.mask(this.configuration.phonenumberid),
            token: Whatsapp.mask(this.configuration.token),
            recipient: Whatsapp.mask(this.configuration.recipient),
        };
    }

    /**
     * Notify WhatsApp with container update details.
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
        return `*${title}*\n\n${body}`;
    }

    /**
     * Notify WhatsApp with batch container update details.
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
        return `*${title}*\n\n${body}`;
    }

    /**
     * Send message via WhatsApp Cloud API.
     * @param {string} text
     * @returns {Promise<*>}
     */
    async sendMessage(text) {
        const endpoint = `${this.configuration.url}/${this.configuration.phonenumberid}/messages`;
        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: this.configuration.recipient,
            type: 'text',
            text: {
                preview_url: true,
                body: text,
            },
        };

        return axios.post(endpoint, payload, {
            headers: {
                Authorization: `Bearer ${this.configuration.token}`,
                'Content-Type': 'application/json',
            },
        });
    }
}

export default Whatsapp;
