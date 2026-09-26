// @ts-nocheck
import axios from 'axios';
import Trigger from '../Trigger';

/**
 * Home Assistant Webhook Trigger implementation
 */
class Homeassistant extends Trigger {
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
            event: this.joi.string().default('wud_container_update'),
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
            url: Homeassistant.mask(this.configuration.url),
        };
    }

    /**
     * Notify Home Assistant via webhook with container update details.
     * @param container the container
     * @returns {Promise<*>}
     */
    async trigger(container) {
        const title = this.configuration.disabletitle
            ? ''
            : this.renderSimpleTitle(container);
        const message = this.renderSimpleBody(container);

        const payload = {
            event: this.configuration.event,
            mode: 'simple',
            title,
            message,
            container,
        };

        return this.sendWebhook(payload);
    }

    /**
     * Notify Home Assistant via webhook with batch container update details.
     * @param containers
     * @returns {Promise<*>}
     */
    async triggerBatch(containers) {
        const title = this.configuration.disabletitle
            ? ''
            : this.renderBatchTitle(containers);
        const message = this.renderBatchBody(containers);

        const payload = {
            event: this.configuration.event,
            mode: 'batch',
            title,
            message,
            count: containers.length,
            containers,
        };

        return this.sendWebhook(payload);
    }

    /**
     * This trigger supports rollback notifications.
     */
    supportsRollbackNotifications(): boolean {
        return true;
    }

    /**
     * Notify Home Assistant via webhook with rollback details.
     * @param rollbackReport the rollback report
     * @returns {Promise<*>}
     */
    async triggerRollback(rollbackReport) {
        const title = this.configuration.disabletitle
            ? ''
            : this.renderRollbackTitle(rollbackReport);
        const message = this.renderRollbackBody(rollbackReport);

        return this.sendWebhook({
            event: this.configuration.event,
            mode: 'rollback',
            title,
            message,
            rollbackReport,
        });
    }

    /**
     * Send HTTP POST to Home Assistant webhook.
     * @param {Object} payload
     * @returns {Promise<*>}
     */
    async sendWebhook(payload) {
        return axios.post(this.configuration.url, payload, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
}

export default Homeassistant;
