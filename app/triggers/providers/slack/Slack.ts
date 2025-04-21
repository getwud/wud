import { WebClient } from '@slack/web-api';
import { Trigger, TriggerConfiguration } from '../Trigger';
import { Container } from '../../../model/container';

export interface SlackConfiguration extends TriggerConfiguration {
    token: string;
    channel: string;
}

/*
 * Slack Trigger implementation
 */
export class Slack extends Trigger<SlackConfiguration> {
    /*
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            token: this.joi.string().required(),
            channel: this.joi.string().required(),
        });
    }

    /**
     * Sanitize sensitive data
     */
    maskConfiguration() {
        return {
            ...this.configuration,
            channel: this.configuration.channel,
            token: Slack.mask(this.configuration.token),
        };
    }

    client!: WebClient;
    /*
    * Init trigger.
    */
    async initTrigger() {
        this.client = new WebClient(this.configuration.token);
    }

    /*
     * Post a message with new image version details.
     */
    async trigger(container: Container) {
        return this.postMessage(this.renderSimpleBody(container));
    }

    async triggerBatch(containers: Container[]) {
        return this.postMessage(this.renderBatchBody(containers));
    }

    /**
     * Post a message to a Slack channel.
     */
    async postMessage(text: string) {
        return this.client.chat.postMessage({
            channel: this.configuration.channel,
            text,
        });
    }
}
