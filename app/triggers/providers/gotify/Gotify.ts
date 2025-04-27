import { GotifyClient } from 'gotify-client';
import { Trigger, TriggerConfiguration } from '../Trigger';
import { Container } from '../../../model/container';

export interface GotifyConfiguration extends TriggerConfiguration {
    url: string;
    token: string;
    priority: number;
}

/**
 * Gotify Trigger implementation
 */
export class Gotify extends Trigger<GotifyConfiguration> {
    private client!: GotifyClient;

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
    async initTrigger() {
        this.client = new GotifyClient(this.configuration.url, {
            app: this.configuration.token,
        });
    }

    /**
     * Send an HTTP Request to Gotify.
     */
    async trigger(container: Container) {
        return this.client.message.createMessage({
            title: this.renderSimpleTitle(container),
            message: this.renderSimpleBody(container),
            priority: this.configuration.priority,
        });
    }

    /**
     * Send an HTTP Request to Gotify.
     */
    async triggerBatch(containers: Container[]) {
        return this.client.message.createMessage({
            title: this.renderBatchTitle(containers),
            message: this.renderBatchBody(containers),
            priority: this.configuration.priority,
        });
    }
}

