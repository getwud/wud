// @ts-nocheck
import { Kafka as KafkaClient } from 'kafkajs';
import Trigger from '../Trigger';

/**
 * Kafka Trigger implementation
 */
class Kafka extends Trigger {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
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
     * @returns {*}
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

    /**
     * Init trigger.
     */
    initTrigger() {
        const brokers = this.configuration.brokers
            .split(/\s*,\s*/)
            .map((broker) => broker.trim());
        const clientConfiguration = {
            clientId: this.configuration.clientId,
            brokers,
            ssl: this.configuration.ssl,
        };
        if (this.configuration.authentication) {
            clientConfiguration.sasl = {
                mechanism: this.configuration.authentication.type,
                username: this.configuration.authentication.user,
                password: this.configuration.authentication.password,
            };
        }
        this.kafka = new KafkaClient(clientConfiguration);
    }

    /**
     * Send a record to a Kafka topic with new container version details.
     *
     * @param container the container
     * @returns {Promise<void>}
     */
    async trigger(container) {
        const producer = this.kafka.producer();
        await producer.connect();
        return producer.send({
            topic: this.configuration.topic,
            messages: [{ value: JSON.stringify(container) }],
        });
    }

    /**
     * Send a record to a Kafka topic with new container versions details.
     * @param containers
     * @returns {Promise<RecordMetadata[]>}
     */
    async triggerBatch(containers) {
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

export default Kafka;
