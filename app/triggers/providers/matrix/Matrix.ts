// @ts-nocheck
import axios from 'axios';
import Trigger from '../Trigger';

/**
 * Matrix Trigger implementation
 */
class Matrix extends Trigger {
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
            roomid: this.joi.string().required(),
            accesstoken: this.joi.string().trim().required(),
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
            accesstoken: Matrix.mask(this.configuration.accesstoken),
        };
    }

    /**
     * Notify Matrix room with container update details.
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
     * Notify Matrix room with batch container update details.
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
     * Send message to Matrix room via Client-Server API.
     * @param {string} text
     * @returns {Promise<*>}
     */
    async sendMessage(text) {
        const txnId = `wud_${Date.now()}_${Math.random().toString(16).substring(2, 8)}`;
        const encodedRoomId = encodeURIComponent(this.configuration.roomid);
        const endpoint = `${this.configuration.url}/_matrix/client/v3/rooms/${encodedRoomId}/send/m.room.message/${txnId}`;

        return axios.put(
            endpoint,
            {
                msgtype: 'm.text',
                body: text,
            },
            {
                headers: {
                    Authorization: `Bearer ${this.configuration.accesstoken}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
            },
        );
    }
}

export default Matrix;
