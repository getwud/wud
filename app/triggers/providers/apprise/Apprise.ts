import rp from 'request-promise-native';
import { Trigger, TriggerConfiguration } from '../Trigger';
import { Container } from '../../../model/container';

export interface AppriseConfig extends TriggerConfiguration {
    url: string;
    urls?: string;
    config?: string;
    tag?: string;
}

/**
 * Apprise Trigger implementation
 */
export class Apprise extends Trigger<AppriseConfig> {
    /**
     * Get the Trigger configuration schema.
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
     * @param container the container
     */
    async trigger(container: Container) {
        let uri = `${this.configuration.url}/notify`;
        const body: {
            title: string;
            body: string;
            format: string;
            type: string;
            urls?: string;
            tag?: string;
        } = {
            title: this.renderSimpleTitle(container),
            body: this.renderSimpleBody(container),
            format: 'text',
            type: 'info',
        };

        // Persistent storage usage (target apprise yml config file and tags)
        if (this.configuration.config) {
            uri += `/${this.configuration.config}`;
            if (this.configuration.tag) {
                body.tag = this.configuration.tag;
            }

            // Standard usage
        } else {
            body.urls = this.configuration.urls;
        }
        const options = {
            method: 'POST',
            json: true,
            uri,
            body,
        };
        return rp(options);
    }

    /**
     * Send an HTTP Request to Apprise.
     * @param containers
     */
    async triggerBatch(containers: Container[]) {
        const options = {
            method: 'POST',
            uri: `${this.configuration.url}/notify`,
            json: true,
            body: {
                urls: this.configuration.urls,
                title: this.renderBatchTitle(containers),
                body: this.renderBatchBody(containers),
                format: 'text',
                type: 'info',
            },
        };
        return rp(options);
    }
}

