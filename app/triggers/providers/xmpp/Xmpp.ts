import { client, xml } from '@xmpp/client';
import Trigger from '../Trigger';
import { Container } from '../../../model/container';

/**
 * XMPP Trigger implementation
 */
class Xmpp extends Trigger {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            service: this.joi
                .string()
                .uri({ scheme: ['xmpp', 'xmpps', 'ws', 'wss'] })
                .required(),
            domain: this.joi.string().optional(),
            user: this.joi.string().required(),
            password: this.joi.string().required(),
            to: this.joi.string().required(),
        });
    }

    /**
     * Sanitize sensitive data
     * @returns {*}
     */
    maskConfiguration() {
        return {
            ...this.configuration,
            service: this.configuration.service,
            domain: this.configuration.domain,
            user: this.configuration.user,
            password: Xmpp.mask(this.configuration.password),
            to: this.configuration.to,
        };
    }

    /**
     * Init trigger.
     */
    initTrigger() {
        // Nothing to do for XMPP since we connect per message
    }

    /**
     * Send an XMPP message with new container version details.
     *
     * @param container the container
     * @returns {Promise<void>}
     */
    async trigger(container: Container) {
        return this.sendMessage(
            this.renderSimpleTitle(container),
            this.renderSimpleBody(container),
        );
    }

    /**
     * Send an XMPP message with new container versions details.
     * @param containers
     * @returns {Promise<void>}
     */
    async triggerBatch(containers: Container[]) {
        return this.sendMessage(
            this.renderBatchTitle(containers),
            this.renderBatchBody(containers),
        );
    }

    /**
     * Post a message to an XMPP recipient.
     * @param title the title to post
     * @param body the body to post
     * @returns {Promise<void>}
     */
    async sendMessage(title: string, body: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const xmpp = client({
                service: this.configuration.service,
                domain: this.configuration.domain,
                username: this.configuration.user,
                password: this.configuration.password,
            });

            xmpp.on('error', (err) => {
                this.log.error(`XMPP Error: ${err.message}`);
                reject(err);
            });

            xmpp.on('online', async (address) => {
                this.log.debug(`XMPP online as ${address.toString()}`);

                try {
                    const message = xml(
                        'message',
                        { type: 'chat', to: this.configuration.to },
                        xml('body', {}, `${title}\n\n${body}`),
                    );
                    await xmpp.send(message);
                    await xmpp.stop();
                    resolve();
                } catch (e) {
                    reject(e);
                }
            });

            xmpp.start().catch((err) => {
                this.log.error(`XMPP Start Error: ${err.message}`);
                reject(err);
            });
        });
    }
}

export default Xmpp;
