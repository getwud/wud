// @ts-nocheck
import axios from 'axios';

import Trigger from '../Trigger';

/**
 * Apprise Trigger implementation
 */
class Apprise extends Trigger {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi
            .object()
            .keys({
                url: this.joi.string().uri({
                    scheme: ['http', 'https'],
                }),
                urls: this.joi.string(),
                config: this.joi.string(),
                tag: this.joi.string(),
            })
            .xor('urls', 'config');
    }

    /**
     * Sanitize sensitive data
     * @returns {*}
     */
    maskConfiguration() {
        return {
            ...this.configuration,
            url: this.configuration.url,
            urls: Apprise.mask(this.configuration.urls),
        };
    }

    /**
     * Send an HTTP Request to Apprise.
     * @param title the title
     * @param body the body
     * @param type the notification type ('info' | 'warning' etc.)
     * @returns {Promise<*>}
     */
    async sendNotification(title, body, type = 'info') {
        let uri = `${this.configuration.url}/notify`;
        const data = {
            title,
            body,
            format: 'text',
            type,
        };

        // Persistent storage usage (target apprise yml config file and tags)
        if (this.configuration.config) {
            uri += `/${this.configuration.config}`;
            if (this.configuration.tag) {
                data.tag = this.configuration.tag;
            }

            // Standard usage
        } else {
            data.urls = this.configuration.urls;
        }
        const options = {
            method: 'POST',
            url: uri,
            data,
        };
        const response = await axios(options);
        return response.data;
    }

    /**
     * Send an HTTP Request to Apprise.
     * @param container the container
     * @returns {Promise<void>}
     */
    async trigger(container) {
        return this.sendNotification(
            this.renderSimpleTitle(container),
            this.renderSimpleBody(container),
            'info',
        );
    }

    /**
     * Send an HTTP Request to Apprise.
     * @param containers
     * @returns {Promise<*>}
     */
    async triggerBatch(containers) {
        return this.sendNotification(
            this.renderBatchTitle(containers),
            this.renderBatchBody(containers),
            'info',
        );
    }

    /**
     * This trigger supports rollback notifications.
     */
    supportsRollbackNotifications(): boolean {
        return true;
    }

    /**
     * Send a rollback notification.
     * @param rollbackReport the rollback report
     * @returns {Promise<*>}
     */
    async triggerRollback(rollbackReport) {
        return this.sendNotification(
            this.renderRollbackTitle(rollbackReport),
            this.renderRollbackBody(rollbackReport),
            'warning',
        );
    }
}

export default Apprise;
