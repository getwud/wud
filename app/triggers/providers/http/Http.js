const rp = require('request-promise-native');

const Trigger = require('../Trigger');

/**
 * HTTP Trigger implementation
 */
class Http extends Trigger {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */

    constructor(name, configuration) {
    super(name, configuration);
    this.name = name;
    this.configuration = this.validateConfiguration(configuration);
    }

    getConfigurationSchema() {
        return this.joi.object().keys({
            url: this.joi.string().uri({
                scheme: ['http', 'https'],
            }),
            method: this.joi.string().allow('GET').allow('POST').default('POST'),
            auth: this.joi.object({
                type: this.joi.string()
                    .allow('BASIC')
                    .allow('BEARER')
                    .default('BASIC'),
                user: this.joi.string(),
                password: this.joi.string(),
                bearer: this.joi.string(),
            }),
            proxy: this.joi.string(),
            install: this.joi.boolean().truthy('true').falsy('false').default(false),
        });
    }

    /**
     * Send an HTTP Request with new image version details.
     *
     * @param container the container
     * @returns {Promise<void>}
     */
    async trigger(container) {
        if (String(this.configuration.install).toLowerCase() === 'true') {
        // Skip the trigger action if install is enabled
        this.log.debug(`Skipping trigger action for ${this.name} because install is enabled`);
        return;
        }
        return this.sendHttpRequest(container, 'trigger');
    }

    /**
     * Send an HTTP Request with new image versions details.
     * @param containers
     * @returns {Promise<*>}
     */
    async triggerBatch(containers) {
        if (String(this.configuration.install).toLowerCase() === 'true') {
            // Skip the batch trigger action if install is enabled
            this.log.debug(`Skipping batch trigger action for ${this.name} because install is enabled`);
            return;
        }
        return this.sendHttpRequest(containers, 'triggerBatch');
    }

    /**
     * Send an HTTP Request for install action.
     * @param container
     * @returns {Promise<void>}
     */
    async install(container) { // MODIFICATION START: Added 'install' method
        return this.sendHttpRequest(container, 'install');
    } // MODIFICATION END

    /**
     * Send an HTTP Request.
     * @param body
     * @param actionType
     * @returns {Promise<*>}
     */

    async sendHttpRequest(body, actionType = 'trigger') {
        const options = {
            method: this.configuration.method,
            uri: this.configuration.url,
        };
        if (this.configuration.method === 'POST') {
            options.body = { ...body, actionType }; 
            options.json = true;
        } else if (this.configuration.method === 'GET') {
            options.qs = { ...body, actionType };
        }
        if (this.configuration.auth) {
            if (this.configuration.auth.type === 'BASIC') {
                options.auth = {
                    user: this.configuration.auth.user,
                    pass: this.configuration.auth.password,
                };
            } else if (this.configuration.auth.type === 'BEARER') {
                options.auth = {
                    bearer: this.configuration.auth.bearer,
                };
            }
        }
        if (this.configuration.proxy) {
            options.proxy = this.configuration.proxy;
        }

        // MODIFICATION START: Add logging and error handling
        console.log(`Sending ${actionType} HTTP request to ${options.uri}`);
        try {
            const response = await rp(options);
            console.log(`HTTP ${actionType} request successful:`, response);
            return response;
        } catch (error) {
            console.error(`HTTP ${actionType} request failed:`, error.message);
            throw error; // Re-throw the error to be handled upstream
        }
        // MODIFICATION END
        // return rp(options);
    }
}

module.exports = Http;
