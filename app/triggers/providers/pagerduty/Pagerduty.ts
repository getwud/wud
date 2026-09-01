// @ts-nocheck
import axios from 'axios';
import Trigger from '../Trigger';

const PAGERDUTY_EVENTS_API = 'https://events.pagerduty.com/v2/enqueue';

/**
 * PagerDuty Trigger implementation (Events API v2)
 */
class Pagerduty extends Trigger {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            routingkey: this.joi.string().trim().required(),
            severity: this.joi
                .string()
                .valid('info', 'warning', 'error', 'critical')
                .default('info'),
            source: this.joi.string().default('WUD'),
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
            routingkey: Pagerduty.mask(this.configuration.routingkey),
        };
    }

    /**
     * Notify PagerDuty with container update details.
     * @param container the container
     * @returns {Promise<*>}
     */
    async trigger(container) {
        const title = this.configuration.disabletitle
            ? `Update available for ${container.name}`
            : this.renderSimpleTitle(container);
        const body = this.renderSimpleBody(container);
        return this.sendEvent(title, body, container);
    }

    /**
     * Notify PagerDuty with batch container update details.
     * @param containers
     * @returns {Promise<*>}
     */
    async triggerBatch(containers) {
        const title = this.configuration.disabletitle
            ? `${containers.length} container updates available`
            : this.renderBatchTitle(containers);
        const body = this.renderBatchBody(containers);
        return this.sendEvent(title, body);
    }

    /**
     * Send event to PagerDuty Events API v2.
     * @param {string} summary
     * @param {string} details
     * @param {Object} [container]
     * @returns {Promise<*>}
     */
    async sendEvent(summary, details, container) {
        const payload = {
            routing_key: this.configuration.routingkey,
            event_action: 'trigger',
            payload: {
                summary,
                source: this.configuration.source,
                severity: this.configuration.severity,
                custom_details: {
                    message: details,
                },
            },
        };

        if (container) {
            payload.payload.custom_details.containerName = container.name;
            payload.payload.custom_details.watcher = container.watcher;
            if (container.updateKind) {
                payload.payload.custom_details.local =
                    container.updateKind.localValue;
                payload.payload.custom_details.remote =
                    container.updateKind.remoteValue;
            }
            if (container.result?.link) {
                payload.payload.custom_details.link = container.result.link;
            }
        }

        return axios.post(PAGERDUTY_EVENTS_API, payload, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
}

export default Pagerduty;
