import Push, { SendMessageOptions } from 'pushover-notifications';
import { Trigger, TriggerConfiguration } from '../Trigger';
import e from 'express';
import { Container } from '../../../model/container';

export interface PushoverConfiguration extends TriggerConfiguration {
    user: string;
    token: string;
    device?: string;
    html?: 0 | 1;
    sound?: string;
    priority?: number;
    retry?: number;
    expire?: number;
    ttl?: number;
}

/**
 * Ifttt Trigger implementation
 */
export class Pushover extends Trigger<PushoverConfiguration> {
    /**
     * Get the Trigger configuration schema.
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            user: this.joi.string().required(),
            token: this.joi.string().required(),
            device: this.joi.string(),
            html: this.joi.number().valid(0, 1).default(0),
            sound: this.joi
                .string()
                .allow(
                    'alien',
                    'bike',
                    'bugle',
                    'cashregister',
                    'classical',
                    'climb',
                    'cosmic',
                    'echo',
                    'falling',
                    'gamelan',
                    'incoming',
                    'intermission',
                    'magic',
                    'mechanical',
                    'none',
                    'persistent',
                    'pianobar',
                    'pushover',
                    'siren',
                    'spacealarm',
                    'tugboat',
                    'updown',
                    'vibrate',
                )
                .default('pushover'),
            priority: this.joi.number().integer().min(-2).max(2).default(0),
            retry: this.joi.number().integer().min(30).when('priority', {
                is: 2,
                then: this.joi.required(),
                otherwise: this.joi.optional(),
            }),
            ttl: this.joi.number().integer().min(0),
            expire: this.joi
                .number()
                .integer()
                .min(1)
                .max(10800)
                .when('priority', {
                    is: 2,
                    then: this.joi.required(),
                    otherwise: this.joi.optional(),
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
            user: Pushover.mask(this.configuration.user),
            token: Pushover.mask(this.configuration.token),
        };
    }

    /**
     * Send a Pushover notification with new container version details.
     */
    async trigger(container: Container) {
        return this.sendMessage({
            title: this.renderSimpleTitle(container),
            message: this.renderSimpleBody(container),
        });
    }

    /**
     * Send a Pushover notification with new container versions details.
     */
    async triggerBatch(containers: Container[]) {
        return this.sendMessage({
            title: this.renderBatchTitle(containers),
            message: this.renderBatchBody(containers),
        });
    }

    async sendMessage(message: { title: string; message: string }) {
        const messageToSend: SendMessageOptions = {
            ...message,
            sound: this.configuration.sound,
            device: this.configuration.device,
            priority: this.configuration.priority,
            html: this.configuration.html,

        };
        // Emergency priority needs retry/expire props
        if (this.configuration.priority === 2) {
            messageToSend.expire = this.configuration.expire;
            messageToSend.retry = this.configuration.retry;
        }
        if (this.configuration.ttl) {
            messageToSend.ttl = this.configuration.ttl;
        }
        return new Promise((resolve, reject) => {
            const push = new Push({
                user: this.configuration.user,
                token: this.configuration.token,
            });

            push.onerror = (err) => {
                reject(err);
            };

            push.send(messageToSend, (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });
    }

    /**
     * Render trigger body batch (override) to remove empty lines between containers.
     */
    renderBatchBody(containers: Container[]) {
        return containers
            .map((container) => `- ${this.renderSimpleBody(container)}`)
            .join('\n');
    }
}
