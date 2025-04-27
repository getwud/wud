import { promises as fs } from 'fs';
import mqtt, { IClientOptions, MqttClient } from 'mqtt';
import { Trigger } from '../Trigger';
import { Hass } from './Hass';
import { registerContainerAdded, registerContainerUpdated } from '../../../event';
import { Container, flatten } from '../../../model/container';
import { MqttConfiguration } from './MqttConfiguration';

const containerDefaultTopic = 'wud/container';
const hassDefaultPrefix = 'homeassistant';

/**
 * Get container topic.
 * @param baseTopic
 * @param container
 * @return {string}
 */
function getContainerTopic({ baseTopic, container }: {
    baseTopic: string;
    container: Container;
}) {
    return `${baseTopic}/${container.watcher}/${container.name}`;
}

/**
 * MQTT Trigger implementation
 */
export class Mqtt extends Trigger<MqttConfiguration> {
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
                })
                .default({
                    enabled: false,
                    prefix: hassDefaultPrefix,
                    discovery: false,
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

    /**
     * Sanitize sensitive data
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

    public client!: MqttClient;
    // Hass instance for Home Assistant integration
    // We have to clean this up, but we don't have to worry about it for now
    private hass?: Hass;

    async initTrigger() {
        // Enforce simple mode
        this.configuration.mode = 'simple';

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

        this.client = await mqtt.connectAsync(this.configuration.url, options);

        if (this.configuration.hass.enabled) {
            this.hass = new Hass({
                client: this.client,
                configuration: this.configuration,
                log: this.log,
            });
        }
        registerContainerAdded((container) => this.trigger(container));
        registerContainerUpdated((container) => this.trigger(container));
    }

    /**
     * Send an MQTT message with new image version details.
     */
    async trigger(container: Container) {
        const containerTopic = getContainerTopic({
            baseTopic: this.configuration.topic,
            container,
        });

        this.log.debug(`Publish container result to ${containerTopic}`);
        return this.client.publish(
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
}

