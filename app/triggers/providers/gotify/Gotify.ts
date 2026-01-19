// @ts-nocheck
import { GotifyClient } from 'gotify-client';
import Trigger from '../Trigger';

/**
 * Gotify Trigger implementation
 */
class Gotify extends Trigger {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            url: this.joi.string().uri({
                scheme: ['http', 'https'],
            }),
            token: this.joi.string(),
            priority: this.joi.number().integer().min(0),
        });
    }

    /**
     * Sanitize sensitive data
     * @returns {*}
     */
    maskConfiguration() {
        return {
            ...this.configuration,
            url: this.configuration.url,
            token: Gotify.mask(this.configuration.token),
        };
    }

    /**
     * Init trigger.
     */
    initTrigger() {
        this.client = new GotifyClient(this.configuration.url, {
            app: this.configuration.token,
        });
    }

    /**
     * Send an HTTP Request to Gotify.
     * @param container the container
     * @returns {Promise<void>}
     */
    async trigger(container) {
        return this.client.message.createMessage({
            title: this.renderSimpleTitle(container),
            message: this.renderSimpleBody(container),
            priority: this.configuration.priority,
        });
    }

    /**
     * Send an HTTP Request to Gotify.
     * @param containers
     * @returns {Promise<*>}
     */
    async triggerBatch(containers) {
        return this.client.message.createMessage({
            title: this.renderBatchTitle(containers),
            message: this.renderBatchBody(containers),
            priority: this.configuration.priority,
        });
    }
}

export default Gotify;
