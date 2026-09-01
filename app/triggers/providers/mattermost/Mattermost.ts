// @ts-nocheck
import axios from 'axios';
import Trigger from '../Trigger';

/**
 * Mattermost Trigger implementation
 */
class Mattermost extends Trigger {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            url: this.joi
                .string()
                .uri({ scheme: ['http', 'https'] })
                .required(),
            channel: this.joi.string(),
            username: this.joi.string().default('WUD'),
            iconurl: this.joi.string().uri({ scheme: ['http', 'https'] }),
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
            url: Mattermost.mask(this.configuration.url),
        };
    }

    /**
     * Notify Mattermost with container update details.
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
        return `### ${title}\n${body}`;
    }

    /**
     * Notify Mattermost with batch container update details.
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
        return `### ${title}\n${body}`;
    }

    /**
     * Send message to Mattermost incoming webhook.
     * @param {string} text
     * @returns {Promise<*>}
     */
    async sendMessage(text) {
        const payload = {
            text,
        };
        if (this.configuration.channel) {
            payload.channel = this.configuration.channel;
        }
        if (this.configuration.username) {
            payload.username = this.configuration.username;
        }
        if (this.configuration.iconurl) {
            payload.icon_url = this.configuration.iconurl;
        }

        return axios.post(this.configuration.url, payload, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
}

export default Mattermost;
