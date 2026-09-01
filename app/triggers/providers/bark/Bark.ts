// @ts-nocheck
import axios from 'axios';
import Trigger from '../Trigger';

/**
 * Bark Trigger implementation (iOS Push Notifications)
 */
class Bark extends Trigger {
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
                .default('https://api.day.app'),
            devicekey: this.joi.string().trim().required(),
            group: this.joi.string().default('WUD'),
            icon: this.joi.string().uri({ scheme: ['http', 'https'] }),
            sound: this.joi.string(),
            badge: this.joi.number().integer().min(0),
            urltoopen: this.joi.string().uri({ scheme: ['http', 'https'] }),
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
            devicekey: Bark.mask(this.configuration.devicekey),
        };
    }

    /**
     * Notify Bark with container update details.
     * @param container the container
     * @returns {Promise<*>}
     */
    async trigger(container) {
        const title = this.configuration.disabletitle
            ? ''
            : this.renderSimpleTitle(container);
        const body = this.renderSimpleBody(container);
        const link = container.result?.link;
        return this.sendMessage(title, body, link);
    }

    /**
     * Notify Bark with batch container update details.
     * @param containers
     * @returns {Promise<*>}
     */
    async triggerBatch(containers) {
        const title = this.configuration.disabletitle
            ? ''
            : this.renderBatchTitle(containers);
        const body = this.renderBatchBody(containers);
        return this.sendMessage(title, body);
    }

    /**
     * Send push notification via Bark API.
     * @param {string} title
     * @param {string} bodyText
     * @param {string} [link]
     * @returns {Promise<*>}
     */
    async sendMessage(title, bodyText, link) {
        const payload = {
            device_key: this.configuration.devicekey,
            body: bodyText,
        };

        if (title) {
            payload.title = title;
        }
        if (this.configuration.group) {
            payload.group = this.configuration.group;
        }
        if (this.configuration.icon) {
            payload.icon = this.configuration.icon;
        }
        if (this.configuration.sound) {
            payload.sound = this.configuration.sound;
        }
        if (this.configuration.badge !== undefined) {
            payload.badge = this.configuration.badge;
        }

        const openUrl = this.configuration.urltoopen || link;
        if (openUrl) {
            payload.url = openUrl;
        }

        return axios.post(`${this.configuration.url}/push`, payload, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
}

export default Bark;
