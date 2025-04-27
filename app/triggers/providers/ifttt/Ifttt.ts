import rp from 'request-promise-native';
import { Trigger, TriggerConfiguration } from '../Trigger';
import { Container } from '../../../model/container';

export interface IftttConfiguration extends TriggerConfiguration {
    key: string;
    event: string;
}

/**
 * Ifttt Trigger implementation
 */
export class Ifttt extends Trigger<IftttConfiguration> {
    /**
     * Get the Trigger configuration schema.
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            key: this.joi.string().required(),
            event: this.joi.string().default('wud-image'),
        });
    }

    /**
     * Sanitize sensitive data
     */
    maskConfiguration() {
        return {
            ...this.configuration,
            event: this.configuration.event,
            key: Ifttt.mask(this.configuration.key),
        };
    }

    /**
     * Send an HTTP Request to Ifttt Webhook with new image version details.
     */
    async trigger(container: Container) {
        return this.sendHttpRequest({
            value1: container.name,
            value2: container.result?.tag,
            value3: JSON.stringify(container),
        });
    }

    /**
     * end an HTTP Request to Ifttt Webhook with new image versions details.
     */
    async triggerBatch(containers: Container[]) {
        return this.sendHttpRequest({
            value1: JSON.stringify(containers),
        });
    }

    /**
     * Send http request to ifttt.
     */
    async sendHttpRequest(body: any) {
        const options = {
            method: 'POST',
            uri: `https://maker.ifttt.com/trigger/${this.configuration.event}/with/key/${this.configuration.key}`,
            headers: {
                'Content-Type': 'application/json',
            },
            body,
            json: true,
        };
        return rp(options);
    }
}
