// @ts-nocheck
import axios from 'axios';
import Trigger from '../Trigger';

const OPSGENIE_ENDPOINTS = {
    us: 'https://api.opsgenie.com/v2/alerts',
    eu: 'https://api.eu.opsgenie.com/v2/alerts',
};

/**
 * Opsgenie Trigger implementation
 */
class Opsgenie extends Trigger {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            apikey: this.joi.string().trim().required(),
            region: this.joi.string().valid('us', 'eu').default('us'),
            priority: this.joi
                .string()
                .valid('P1', 'P2', 'P3', 'P4', 'P5')
                .default('P5'),
            tags: this.joi.string().default('wud,docker'),
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
            apikey: Opsgenie.mask(this.configuration.apikey),
        };
    }

    /**
     * Notify Opsgenie with container update details.
     * @param container the container
     * @returns {Promise<*>}
     */
    async trigger(container) {
        const title = this.configuration.disabletitle
            ? 'Container update'
            : this.renderSimpleTitle(container);
        const description = this.renderSimpleBody(container);
        return this.sendAlert(title, description, container);
    }

    /**
     * Notify Opsgenie with batch container update details.
     * @param containers
     * @returns {Promise<*>}
     */
    async triggerBatch(containers) {
        const title = this.configuration.disabletitle
            ? 'Container updates available'
            : this.renderBatchTitle(containers);
        const description = this.renderBatchBody(containers);
        return this.sendAlert(title, description);
    }

    /**
     * Send alert to Opsgenie Alerts API.
     * @param {string} message
     * @param {string} description
     * @param {Object} [container]
     * @returns {Promise<*>}
     */
    async sendAlert(message, description, container) {
        const endpoint =
            OPSGENIE_ENDPOINTS[this.configuration.region] ||
            OPSGENIE_ENDPOINTS.us;

        const tagList = this.configuration.tags
            ? this.configuration.tags
                  .split(',')
                  .map((t) => t.trim())
                  .filter((t) => t.length > 0)
            : ['wud'];

        const payload = {
            message,
            description,
            priority: this.configuration.priority,
            source: 'WUD',
            tags: tagList,
        };

        if (container) {
            payload.details = {
                containerName: container.name,
                watcher: container.watcher,
                localTag: container.updateKind?.localValue || '',
                remoteTag: container.updateKind?.remoteValue || '',
            };
        }

        return axios.post(endpoint, payload, {
            headers: {
                Authorization: `GenieKey ${this.configuration.apikey}`,
                'Content-Type': 'application/json',
            },
        });
    }
}

export default Opsgenie;
