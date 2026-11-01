// @ts-nocheck
import Trigger from '../Trigger';
import { Container } from '../../../model/container';
import { client, xml } from '@xmpp/client';

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
            timeout: this.joi.number().greater(0).default(10_000),
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
     * @returns {Promise<Container>}
     */
    async trigger(container: Container) {
        await this.sendMessage(
            this.renderSimpleTitle(container),
            this.renderSimpleBody(container),
        );
        return container;
    }

    /**
     * Send an XMPP message with new container versions details.
     * @param containers
     * @returns {Promise<Container[]>}
     */
    async triggerBatch(containers: Container[]) {
        await this.sendMessage(
            this.renderBatchTitle(containers),
            this.renderBatchBody(containers),
        );
        return containers;
    }

    /**
     * This trigger supports rollback notifications.
     */
    supportsRollbackNotifications(): boolean {
        return true;
    }

    /**
     * Send an XMPP message with rollback details.
     *
     * @param rollbackReport the rollback report
     * @returns {Promise<void>}
     */
    async triggerRollback(rollbackReport) {
        await this.sendMessage(
            this.renderRollbackTitle(rollbackReport),
            this.renderRollbackBody(rollbackReport),
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
            let settled = false;
            let timeoutHandle: ReturnType<typeof setTimeout> | undefined =
                undefined;

            const settle = (err?: Error) => {
                if (settled) {
                    return;
                }
                settled = true;
                if (timeoutHandle) {
                    clearTimeout(timeoutHandle);
                }
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            };

            const xmpp = client({
                service: this.configuration.service,
                domain: this.configuration.domain,
                username: this.configuration.user,
                password: this.configuration.password,
            });

            xmpp.on('error', (err) => {
                this.log.error(`XMPP Error: ${err.message}`);
                settle(err);
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
                    settle();
                } catch (e) {
                    settle(e);
                } finally {
                    await xmpp.stop().catch(() => undefined);
                }
            });

            xmpp.start().catch((err) => {
                this.log.error(`XMPP Start Error: ${err.message}`);
                settle(err);
            });

            timeoutHandle = setTimeout(() => {
                const err = new Error(
                    `XMPP session timed out after ${this.configuration.timeout}ms`,
                );
                this.log.error(err.message);
                try {
                    xmpp.stop().catch(() => undefined);
                } catch {
                    // The connection may not be initialized yet
                }
                settle(err);
            }, this.configuration.timeout);
        });
    }
}

export default Xmpp;
