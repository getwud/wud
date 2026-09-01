// @ts-nocheck
import axios from 'axios';
import Trigger from '../Trigger';

const PROWL_API_URL = 'https://api.prowlapp.com/publicapi/add';

/**
 * Prowl Trigger implementation (iOS Push Notifications)
 */
class Prowl extends Trigger {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            apikey: this.joi.string().trim().required(),
            priority: this.joi.number().integer().min(-2).max(2).default(0),
            application: this.joi.string().default('WUD'),
            url: this.joi
                .string()
                .uri({ scheme: ['http', 'https'] })
                .default(PROWL_API_URL),
            openurl: this.joi.string().uri({ scheme: ['http', 'https'] }),
            providerkey: this.joi.string().trim(),
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
            apikey: Prowl.mask(this.configuration.apikey),
            providerkey: this.configuration.providerkey
                ? Prowl.mask(this.configuration.providerkey)
                : undefined,
        };
    }

    /**
     * Notify Prowl with container update details.
     * @param container the container
     * @returns {Promise<*>}
     */
    async trigger(container) {
        const title = this.configuration.disabletitle
            ? 'Update'
            : this.renderSimpleTitle(container);
        const body = this.renderSimpleBody(container);
        const link = container.result?.link;
        return this.sendMessage(title, body, link);
    }

    /**
     * Notify Prowl with batch container update details.
     * @param containers
     * @returns {Promise<*>}
     */
    async triggerBatch(containers) {
        const title = this.configuration.disabletitle
            ? 'Batch Updates'
            : this.renderBatchTitle(containers);
        const body = this.renderBatchBody(containers);
        return this.sendMessage(title, body);
    }

    /**
     * Send push notification via Prowl Public API.
     * @param {string} title - event name
     * @param {string} bodyText - description
     * @param {string} [link] - optional url
     * @returns {Promise<*>}
     */
    async sendMessage(title, bodyText, link) {
        const params = new URLSearchParams();
        params.append('apikey', this.configuration.apikey);
        params.append('priority', this.configuration.priority.toString());
        params.append('application', this.configuration.application);
        params.append('event', title);
        params.append('description', bodyText);

        const openUrl = this.configuration.openurl || link;
        if (openUrl) {
            params.append('url', openUrl);
        }
        if (this.configuration.providerkey) {
            params.append('providerkey', this.configuration.providerkey);
        }

        return axios.post(this.configuration.url, params.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
    }
}

export default Prowl;
