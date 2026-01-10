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
     * @param container the container
     * @returns {Promise<void>}
     */
    async trigger(container) {
        let uri = `${this.configuration.url}/notify`;
        const body = {
            title: this.renderSimpleTitle(container),
            data: this.renderSimpleBody(container),
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
            url: uri,
            data: body,
        };
        const response = await axios(options);
        return response.data;
    }

    /**
     * Send an HTTP Request to Apprise.
     * @param containers
     * @returns {Promise<*>}
     */
    async triggerBatch(containers) {
        const options = {
            method: 'POST',
            url: `${this.configuration.url}/notify`,
            data: {
                urls: this.configuration.urls,
                title: this.renderBatchTitle(containers),
                data: this.renderBatchBody(containers),
                format: 'text',
                type: 'info',
            },
        };
        const response = await axios(options);
        return response.data;
    }
}

export default Apprise;
