// @ts-nocheck
import joi from 'joi';
import log from '../log';

/**
 * Base Component Class.
 */
class Component {
    /**
     * Constructor.
     */
    constructor() {
        this.joi = joi;
    }

    /**
     * Register the component.
     * @param type the type of the component
     * @param name the name of the component
     * @param configuration the configuration of the component
     */
    async register(kind, type, name, configuration) {
        // Child log for the component
        this.log = log.child({ component: `${kind}.${type}.${name}` });
        this.kind = kind;
        this.type = type;
        this.name = name;

        this.configuration = this.validateConfiguration(configuration);
        this.log.info(
            `Register with configuration ${JSON.stringify(this.maskConfiguration(configuration))}`,
        );
        await this.init();
        return this;
    }

    /**
     * Deregister the component.
     * @returns {Promise<void>}
     */
    async deregister() {
        this.log.info('Deregister component');
        await this.deregisterComponent();
        return this;
    }

    /**
     * Deregistger the component (do nothing by default).
     * @returns {Promise<void>}
     */

    async deregisterComponent() {
        // Do nothing by default
    }

    /**
     * Validate the configuration of the component.
     *
     * @param configuration the configuration
     * @returns {*} or throw a validation error
     */
    validateConfiguration(configuration) {
        const schema = this.getConfigurationSchema();
        const schemaValidated = schema.validate(configuration);
        if (schemaValidated.error) {
            throw schemaValidated.error;
        }
        return schemaValidated.value ? schemaValidated.value : {};
    }

    /**
     * Get the component configuration schema.
     * Can be overridden by the component implementation class
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object();
    }

    /**
     * Init the component.
     * Can be overridden by the component implementation class
     */

    init() {}

    /**
     * Sanitize sensitive data
     * @returns {*}
     */
    maskConfiguration() {
        return this.configuration;
    }

    /**
     * Get Component ID.
     * @returns {string}
     */
    getId() {
        return `${this.type}.${this.name}`;
    }

    /**
     * Mask a String
     * @param value the value to mask
     * @param nb the number of chars to keep start/end
     * @param char the replacement char
     * @returns {string|undefined} the masked string
     */
    static mask(value, nb = 1, char = '*') {
        if (!value) {
            return undefined;
        }
        if (value.length < 2 * nb) {
            return char.repeat(value.length);
        }
        return `${value.substring(0, nb)}${char.repeat(
            Math.max(0, value.length - nb * 2),
        )}${value.substring(value.length - nb, value.length)}`;
    }
}

export default Component;
