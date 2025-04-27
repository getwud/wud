import { Kafka as KafkaClient, KafkaConfig, SASLOptions } from 'kafkajs';
import { Trigger, TriggerConfiguration } from '../Trigger';
import { Container } from '../../../model/container';

export interface KafkaConfiguration extends TriggerConfiguration {
    brokers: string;
    topic: string;
    clientId: string;
    ssl: boolean;
    authentication?: {
        type: 'PLAIN' | 'SCRAM-SHA-256' | 'SCRAM-SHA-512';
        user: string;
        password: string;
    };
}

/**
 * Kafka Trigger implementation
 */
export class Kafka extends Trigger<KafkaConfiguration> {
    /**
     * Get the Trigger configuration schema.
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            brokers: this.joi.string().required(),
            topic: this.joi.string().default('wud-container'),
            clientId: this.joi.string().default('wud'),
            ssl: this.joi.boolean().default(false),
            authentication: this.joi.object({
                type: this.joi
                    .string()
                    .allow('PLAIN')
                    .allow('SCRAM-SHA-256')
                    .allow('SCRAM-SHA-512')
                    .default('PLAIN'),
                user: this.joi.string().required(),
                password: this.joi.string().required(),
            }),
        });
    }

    /**
     * Sanitize sensitive data
     */
    maskConfiguration() {
        return {
            ...this.configuration,
            brokers: this.configuration.brokers,
            topic: this.configuration.topic,
            clientId: this.configuration.clientId,
            ssl: this.configuration.ssl,
            authentication: this.configuration.authentication
                ? {
                    type: this.configuration.authentication.type,
                    user: this.configuration.authentication.user,
                    password: Kafka.mask(
                        this.configuration.authentication.password,
                    ),
                }
                : undefined,
        };
    }

    public kafka!: KafkaClient;
    /**
     * Init trigger.
     */
    async initTrigger() {
        const brokers = this.configuration.brokers
            .split(/\s*,\s*/)
            .map((broker) => broker.trim());
        const clientConfiguration: KafkaConfig = {
            clientId: this.configuration.clientId,
            brokers,
            ssl: this.configuration.ssl,
        };
        if (this.configuration.authentication) {
            clientConfiguration.sasl = {
                mechanism: this.configuration.authentication.type.toLocaleLowerCase(),
                username: this.configuration.authentication.user,
                password: this.configuration.authentication.password,
            } as SASLOptions;
        }
        this.kafka = new KafkaClient(clientConfiguration);
    }

    /**
     * Send a record to a Kafka topic with new container version details.
     */
    async trigger(container: Container) {
        const producer = this.kafka.producer();
        await producer.connect();
        return producer.send({
            topic: this.configuration.topic,
            messages: [{ value: JSON.stringify(container) }],
        });
    }

    /**
     * Send a record to a Kafka topic with new container versions details.
     */
    async triggerBatch(containers: Container[]) {
        const producer = this.kafka.producer();
        await producer.connect();
        return producer.send({
            topic: this.configuration.topic,
            messages: containers.map((container) => ({
                value: JSON.stringify(container),
            })),
        });
    }
}
