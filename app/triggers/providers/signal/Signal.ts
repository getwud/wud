// @ts-nocheck
import axios from 'axios';
import Trigger from '../Trigger';

/**
 * Signal Trigger implementation (via signal-cli-rest-api)
 */
class Signal extends Trigger {
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
            number: this.joi.string().required(),
            recipients: this.joi.string().required(),
            apikey: this.joi.string(),
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
            number: Signal.mask(this.configuration.number),
            recipients: Signal.mask(this.configuration.recipients),
            apikey: this.configuration.apikey
                ? Signal.mask(this.configuration.apikey)
                : undefined,
        };
    }

    /**
     * Notify Signal with container update details.
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
        return `${title}\n\n${body}`;
    }

    /**
     * Notify Signal with batch container update details.
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
        return `${title}\n\n${body}`;
    }

    /**
     * Send message via signal-cli REST API /v2/send endpoint.
     * @param {string} text
     * @returns {Promise<*>}
     */
    async sendMessage(text) {
        const recipientsList = this.configuration.recipients
            .split(',')
            .map((r) => r.trim())
            .filter((r) => r.length > 0);

        const payload = {
            message: text,
            number: this.configuration.number,
            recipients: recipientsList,
        };

        const headers = {
            'Content-Type': 'application/json',
        };
        if (this.configuration.apikey) {
            headers.Authorization = `Bearer ${this.configuration.apikey}`;
        }

        return axios.post(`${this.configuration.url}/v2/send`, payload, {
            headers,
        });
    }
}

export default Signal;
