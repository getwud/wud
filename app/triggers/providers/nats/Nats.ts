// @ts-nocheck
import { connect, StringCodec } from 'nats';
import Trigger from '../Trigger';

const sc = StringCodec();

/**
 * NATS Trigger implementation
 */
class Nats extends Trigger {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            servers: this.joi.string().required(),
            subject: this.joi.string().default('wud.container'),
            user: this.joi.string(),
            password: this.joi.string(),
            token: this.joi.string(),
            nkey: this.joi.string(),
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
            password: this.configuration.password
                ? Nats.mask(this.configuration.password)
                : undefined,
            token: this.configuration.token
                ? Nats.mask(this.configuration.token)
                : undefined,
            nkey: this.configuration.nkey
                ? Nats.mask(this.configuration.nkey)
                : undefined,
        };
    }

    /**
     * Get or create active NATS connection.
     * @returns {Promise<NatsConnection>}
     */
    async getConnection() {
        if (!this.nc || this.nc.isClosed()) {
            const servers = this.configuration.servers
                .split(',')
                .map((s) => s.trim())
                .filter((s) => s.length > 0);

            const connectionOptions = {
                servers,
            };

            if (this.configuration.user && this.configuration.password) {
                connectionOptions.user = this.configuration.user;
                connectionOptions.pass = this.configuration.password;
            } else if (this.configuration.token) {
                connectionOptions.token = this.configuration.token;
            } else if (this.configuration.nkey) {
                connectionOptions.nkey = this.configuration.nkey;
            }

            this.nc = await connect(connectionOptions);
        }
        return this.nc;
    }

    /**
     * Publish container update to NATS subject.
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
     * Publish batch container updates to NATS subject.
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
     * Publish encoded message to NATS subject.
     * @param {Object} message
     * @returns {Promise<void>}
     */
    async publishMessage(message) {
        const nc = await this.getConnection();
        const data = sc.encode(JSON.stringify(message));
        nc.publish(this.configuration.subject, data);
    }

    /**
     * Drain and close NATS connection on deregistration.
     */
    async deregisterComponent() {
        try {
            if (this.nc && !this.nc.isClosed()) {
                await this.nc.drain();
            }
        } catch (e) {
            this.log.debug(`Error draining NATS connection: ${e.message}`);
        }
    }
}

export default Nats;
