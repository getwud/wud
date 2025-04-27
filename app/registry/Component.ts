import joi from 'joi';
import log from '../log';
import Logger from 'bunyan';

export type ComponentKind = 'trigger' | 'watcher' | 'registry' | 'authentication';

export interface BaseConfig { }

/**
 * Base Component Class.
 */
export class Component<TConfig extends BaseConfig = {}> {
    joi: joi.Root;
    log!: Logger;

    kind!: ComponentKind;
    type!: string;
    name!: string;
    configuration!: TConfig;
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
    async register(kind: ComponentKind, type: string, name: string, configuration: TConfig) {
        // Child log for the component
        this.log = log.child({ component: `${kind}.${type}.${name}` });
        this.kind = kind;
        this.type = type;
        this.name = name;

        this.configuration = this.validateConfiguration(configuration);
        this.log.info(
            `Register with configuration ${JSON.stringify(this.maskConfiguration())}`,
        );
        await this.init();
        return this;
    }

    /**
     * Deregister the component.
     */
    async deregister() {
        this.log?.info('Deregister component');
        await this.deregisterComponent();
        return this;
    }

    /**
     * Deregister the component (do nothing by default).
     */

    async deregisterComponent() {
        // Do nothing by default
    }

    /**
     * Validate the configuration of the component.
     *
     * @param configuration the configuration
     * @returns or throw a validation error
     */
    validateConfiguration<T extends TConfig>(configuration: T): T {
        const schema = this.getConfigurationSchema();
        const schemaValidated = schema.validate(configuration);
        if (schemaValidated.error) {
            throw schemaValidated.error;
        }
        return schemaValidated.value ? schemaValidated.value as T : {} as T;
    }

    /**
     * Get the component configuration schema.
     * Can be overridden by the component implementation class
     */
    getConfigurationSchema(): joi.AnySchema<TConfig> {
        return this.joi.object<TConfig>();
    }

    /**
     * Init the component.
     * Can be overridden by the component implementation class
     */

    init() { }

    /**
     * Sanitize sensitive data
     */
    maskConfiguration() {
        return this.configuration;
    }

    /**
     * Get Component ID.
     */
    getId() {
        return `${this.type}.${this.name}`;
    }

    static mask(value: string, nb?: number, char?: string): string;
    static mask(value: null | undefined, nb?: number, char?: string): undefined;
    static mask(value: string | undefined, nb?: number, char?: string): string | undefined;
    /**
     * Mask a String
     * @param value the value to mask
     * @param nb the number of chars to keep start/end
     * @param char the replacement char
     */
    static mask(value: string | null | undefined, nb = 1, char = '*') {
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