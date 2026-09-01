// @ts-nocheck
import axios from 'axios';
import Trigger from '../Trigger';

/**
 * Uptime Kuma Trigger implementation (Push Monitors)
 */
class Uptimekuma extends Trigger {
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
            status: this.joi.string().valid('up', 'down').default('up'),
            msg: this.joi.string(),
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
            url: Uptimekuma.mask(this.configuration.url),
        };
    }

    /**
     * Notify Uptime Kuma with container update details.
     * @param container the container
     * @returns {Promise<*>}
     */
    async trigger(container) {
        const title = this.configuration.disabletitle
            ? ''
            : this.renderSimpleTitle(container);
        const body = this.renderSimpleBody(container);
        const defaultMsg = title ? `${title}: ${body}` : body;
        const msg = this.configuration.msg || defaultMsg;
        return this.sendPush(msg);
    }

    /**
     * Notify Uptime Kuma with batch container update details.
     * @param containers
     * @returns {Promise<*>}
     */
    async triggerBatch(containers) {
        const title = this.configuration.disabletitle
            ? ''
            : this.renderBatchTitle(containers);
        const body = this.renderBatchBody(containers);
        const defaultMsg = title ? `${title}: ${body}` : body;
        const msg = this.configuration.msg || defaultMsg;
        return this.sendPush(msg);
    }

    /**
     * Send HTTP GET request to Uptime Kuma Push Monitor.
     * @param {string} msg
     * @returns {Promise<*>}
     */
    async sendPush(msg) {
        return axios.get(this.configuration.url, {
            params: {
                status: this.configuration.status,
                msg: msg.substring(0, 200), // Kuma displays short status messages nicely
            },
        });
    }
}

export default Uptimekuma;
