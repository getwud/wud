// @ts-nocheck
import amqp from 'amqplib';
import Trigger from '../Trigger';

/**
 * AMQP / RabbitMQ Trigger implementation
 */
class Amqp extends Trigger {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            url: this.joi
                .string()
                .uri({ scheme: ['amqp', 'amqps'] })
                .required(),
            exchange: this.joi.string().allow('').default(''),
            routingkey: this.joi.string().default('wud-container'),
            exchangetype: this.joi
                .string()
                .valid('direct', 'topic', 'fanout', 'headers')
                .default('topic'),
            persistent: this.joi.boolean().default(true),
            disabletitle: this.joi.boolean().default(false),
        });
    }

    /**
     * Sanitize sensitive data
     * @returns {*}
     */
    maskConfiguration() {
        return {
            ...this.configuration,
            url: Amqp.mask(this.configuration.url),
        };
    }

    /**
     * Get or create AMQP channel.
     * @returns {Promise<amqp.Channel>}
     */
    async getChannel() {
        if (!this.connection) {
            this.connection = await amqp.connect(this.configuration.url);
            this.connection.on('error', (err) => {
                this.log.warn(`AMQP connection error: ${err.message}`);
            });
            this.connection.on('close', () => {
                this.connection = null;
                this.channel = null;
            });
        }
        if (!this.channel) {
            this.channel = await this.connection.createChannel();
            if (this.configuration.exchange) {
                await this.channel.assertExchange(
                    this.configuration.exchange,
                    this.configuration.exchangetype,
                    { durable: true },
                );
            }
        }
        return this.channel;
    }

    /**
     * Publish single container update to AMQP broker.
     * @param container the container
     * @returns {Promise<*>}
     */
    async trigger(container) {
        const payload = {
            title: this.configuration.disabletitle
                ? ''
                : this.renderSimpleTitle(container),
            message: this.renderSimpleBody(container),
            mode: 'simple',
            container,
        };
        return this.publishMessage(payload);
    }

    /**
     * Publish batch container updates to AMQP broker.
     * @param containers
     * @returns {Promise<*>}
     */
    async triggerBatch(containers) {
        const payload = {
            title: this.configuration.disabletitle
                ? ''
                : this.renderBatchTitle(containers),
            message: this.renderBatchBody(containers),
            mode: 'batch',
            count: containers.length,
            containers,
        };
        return this.publishMessage(payload);
    }

    /**
     * Publish payload to exchange and routing key.
     * @param {Object} message
     * @returns {Promise<void>}
     */
    async publishMessage(message) {
        const channel = await this.getChannel();
        const content = Buffer.from(JSON.stringify(message));
        return channel.publish(
            this.configuration.exchange,
            this.configuration.routingkey,
            content,
            {
                persistent: this.configuration.persistent,
                contentType: 'application/json',
            },
        );
    }

    /**
     * Cleanup AMQP connection on deregistration.
     */
    async deregisterComponent() {
        try {
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await this.connection.close();
            }
        } catch (e) {
            this.log.debug(`Error closing AMQP connection: ${e.message}`);
        }
    }
}

export default Amqp;
