import fs from 'fs/promises';
import mqtt, { IClientOptions, MqttClient } from 'mqtt';
import Trigger, { TriggerConfiguration } from '../Trigger';
import Hass from './Hass';
import {
    registerContainerAdded,
    registerContainerUpdated,
} from '../../../event';
import { Container, flatten } from '../../../model/container';

const containerDefaultTopic = 'wud/container';
const hassDefaultPrefix = 'homeassistant';

/**
 * Get container topic.
 * @param baseTopic
 * @param container
 * @return {string}
 */
function getContainerTopic({ baseTopic, container }) {
    const containerName = container.name.replace(/\./g, '-');
    return `${baseTopic}/${container.watcher}/${containerName}`;
}

export interface MqqtConfiguration extends TriggerConfiguration {
    url: string;
    topic: string;
    clientid: string;
    user: string;
    password: string;
    hass: {
        enabled: boolean;
        prefix: string;
        discovery: boolean;
        deviceid: string;
        devicename: string;
    };
    tls: {
        clientkey: string;
        clientcert: string;
        cachain: string;
        rejectunauthorized: boolean;
    };
}

/**
 * MQTT Trigger implementation
 */
class Mqtt extends Trigger {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            url: this.joi
                .string()
                .uri({
                    scheme: ['mqtt', 'mqtts', 'tcp', 'tls', 'ws', 'wss'],
                })
                .required(),
            topic: this.joi.string().default(containerDefaultTopic),
            clientid: this.joi
                .string()
                .default(`wud_${Math.random().toString(16).substring(2, 10)}`),
            user: this.joi.string(),
            password: this.joi.string(),
            hass: this.joi
                .object({
                    enabled: this.joi.boolean().default(false),
                    prefix: this.joi.string().default(hassDefaultPrefix),
                    discovery: this.joi.boolean().when('enabled', {
                        is: true,
                        then: this.joi.boolean().default(true),
                    }),
                    deviceid: this.joi.string().default('wud'),
                    devicename: this.joi.string().default('wud'),
                })
                .default({
                    enabled: false,
                    prefix: hassDefaultPrefix,
                    discovery: false,
                    deviceid: 'wud',
                    devicename: 'wud',
                }),
            tls: this.joi
                .object({
                    clientkey: this.joi.string(),
                    clientcert: this.joi.string(),
                    cachain: this.joi.string(),
                    rejectunauthorized: this.joi.boolean().default(true),
                })
                .default({
                    clientkey: undefined,
                    clientcert: undefined,
                    cachain: undefined,
                    rejectunauthorized: true,
                }),
        });
    }

    declare configuration: MqqtConfiguration;

    /**
     * Sanitize sensitive data
     * @returns {*}
     */
    maskConfiguration() {
        return {
            ...this.configuration,
            url: this.configuration.url,
            topic: this.configuration.topic,
            user: this.configuration.user,
            password: Mqtt.mask(this.configuration.password),
            hass: this.configuration.hass,
        };
    }

    private hass: Hass;
    private client: MqttClient;

    async initTrigger() {
        // Enforce simple mode
        this.configuration.mode = 'simple';

        if (this.configuration.hass.enabled) {
            this.hass = new Hass({
                configuration: this.configuration,
                log: this.log,
            });
        }

        // Set MQTT connection options and create client
        const options: IClientOptions = {
            clientId: this.configuration.clientid,
        };
        if (this.configuration.user) {
            options.username = this.configuration.user;
        }
        if (this.configuration.password) {
            options.password = this.configuration.password;
        }
        if (this.configuration.tls.clientkey) {
            options.key = await fs.readFile(this.configuration.tls.clientkey);
        }
        if (this.configuration.tls.clientcert) {
            options.cert = await fs.readFile(this.configuration.tls.clientcert);
        }
        if (this.configuration.tls.cachain) {
            options.ca = [await fs.readFile(this.configuration.tls.cachain)];
        }
        options.rejectUnauthorized = this.configuration.tls.rejectunauthorized;
        options.manualConnect = true;
        options.reconnectPeriod = 10000; // Reconnect every 10 seconds
        if (this.hass) {
            options.will = this.hass.getWill();
        }
        this.client = mqtt.connect(this.configuration.url, options);

        // Register MQTT connection event handlers
        this.client.on('connect', () => {
            this.log.debug('MQTT client connected');
            if (this.hass) {
                this.hass.updateConnectionStatusSensor(true);
            }
        });

        this.client.on('reconnect', () => {
            this.log.debug('MQTT client reconnecting');
        });

        this.client.on('close', () => {
            this.log.debug('MQTT connection closed');
        });

        this.client.on('disconnect', (packet) => {
            this.log.debug(
                `MQTT client disconnected, reasonCode: ${packet?.reasonCode}`,
            );
        });

        this.client.on('error', (error: mqtt.ErrorWithReasonCode) => {
            this.log.debug(`MQTT client error ${error.code}`);
        });

        this.client.on('end', () => {
            this.log.debug('MQTT client ended');
        });

        // Start MQTT client and initialize HA integration if enabled
        this.client.connect();
        if (this.hass) {
            this.hass.init(this.client);
        }
        registerContainerAdded((container) => this.trigger(container));
        registerContainerUpdated((container) => this.trigger(container));
    }

    /**
     * Send an MQTT message with new image version details.
     *
     * @param container the container
     */
    async trigger(container: Container) {
        const containerTopic = getContainerTopic({
            baseTopic: this.configuration.topic,
            container,
        });

        this.log.debug(`Publish container result to ${containerTopic}`);
        this.client.publish(
            containerTopic,
            JSON.stringify(flatten(container)),
            {
                retain: true,
            },
        );
    }

    /**
     * Mqtt trigger does not support batch mode.
     */

    async triggerBatch() {
        throw new Error('This trigger does not support "batch" mode');
    }

    /**
     * Deregister the component
     */
    async deregisterComponent(): Promise<void> {
        if (this.hass) {
            this.hass.updateConnectionStatusSensor(false);
        }
        this.client.end(true);
    }
}

export default Mqtt;
