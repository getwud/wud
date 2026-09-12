import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { Container } from '../../../model/container';
import { ComponentConfiguration } from '../../../registry/Component';
import Trigger from '../Trigger';

function createProxyAgent(proxyUrl: string) {
    const { protocol } = new URL(proxyUrl);
    if (protocol.startsWith('socks')) {
        return new SocksProxyAgent(proxyUrl);
    }
    if (protocol === 'http:' || protocol === 'https:') {
        return new HttpsProxyAgent(proxyUrl);
    }
    throw new Error(`Unsupported proxy protocol (${protocol}) for proxy url`);
}

function maskProxy(proxyUrl?: string) {
    if (!proxyUrl) {
        return undefined;
    }
    try {
        const url = new URL(proxyUrl);
        if (url.password) {
            url.password = '***';
        }
        return url.toString();
    } catch {
        return Telegram.mask(proxyUrl);
    }
}

class Telegram extends Trigger {
    private proxyAgent?: ReturnType<typeof createProxyAgent>;

    getConfigurationSchema() {
        return this.joi.object().keys({
            bottoken: this.joi.string().required(),
            chatid: this.joi.string().required(),
            messagethreadid: this.joi
                .alternatives([
                    this.joi.number().integer().strict(),
                    this.joi.string(),
                ])
                .optional(),
            disabletitle: this.joi.boolean().default(false),
            messageformat: this.joi
                .string()
                .valid('Markdown', 'HTML')
                .insensitive()
                .default('Markdown'),
            proxy: this.joi.string().uri().optional(),
        });
    }

    validateConfiguration(
        configuration: ComponentConfiguration,
    ): ComponentConfiguration {
        const normalizedConfig = { ...configuration };

        const threadId =
            normalizedConfig.messagethreadid ??
            normalizedConfig.message_thread_id ??
            normalizedConfig.message?.thread?.id;

        if (threadId !== undefined) {
            normalizedConfig.messagethreadid = threadId;
            delete normalizedConfig.message_thread_id;
            if (normalizedConfig.message?.thread) {
                delete normalizedConfig.message.thread.id;
                if (Object.keys(normalizedConfig.message.thread).length === 0) {
                    delete normalizedConfig.message.thread;
                }
                if (Object.keys(normalizedConfig.message).length === 0) {
                    delete normalizedConfig.message;
                }
            }
        }

        return super.validateConfiguration(normalizedConfig);
    }

    maskConfiguration() {
        return {
            ...this.configuration,
            bottoken: Telegram.mask(this.configuration.bottoken),
            chatid: Telegram.mask(this.configuration.chatid),
            proxy: maskProxy(this.configuration.proxy),
        };
    }

    async initTrigger() {
        this.proxyAgent = this.configuration.proxy
            ? createProxyAgent(this.configuration.proxy)
            : undefined;
    }

    private getMessageThreadId(
        container?: Container,
    ): string | number | undefined {
        if (container && container.labels) {
            const specificLabel =
                container.labels[
                    `wud.trigger.telegram.${this.name}.message_thread_id`
                ] ??
                container.labels[
                    `wud.trigger.telegram.${this.name}.messagethreadid`
                ];
            if (specificLabel !== undefined) {
                return specificLabel;
            }

            const genericLabel =
                container.labels['wud.trigger.telegram.message_thread_id'] ??
                container.labels['wud.trigger.telegram.messagethreadid'];
            if (genericLabel !== undefined) {
                return genericLabel;
            }
        }
        return this.configuration.messagethreadid;
    }

    trigger(container: Container) {
        const threadId = this.getMessageThreadId(container);
        const body = this.renderSimpleBody(container);

        if (this.configuration.disabletitle) {
            return threadId !== undefined
                ? this.sendMessage(body, threadId)
                : this.sendMessage(body);
        }

        const title = this.renderSimpleTitle(container);

        const message = `${this.bold(title)}\n\n${this.escapeMarkdown(body)}`;
        return threadId !== undefined
            ? this.sendMessage(message, threadId)
            : this.sendMessage(message);
    }

    triggerBatch(containers: Container[]) {
        const threadId = this.getMessageThreadId(containers[0]);
        const body = this.renderBatchBody(containers);
        if (this.configuration.disabletitle) {
            return threadId !== undefined
                ? this.sendMessage(body, threadId)
                : this.sendMessage(body);
        }

        const title = this.renderBatchTitle(containers);
        const message = `${this.bold(title)}\n\n${body}`;
        return threadId !== undefined
            ? this.sendMessage(message, threadId)
            : this.sendMessage(message);
    }

    private async sendMessage(text: string, threadId?: string | number) {
        const message: Record<string, any> = {
            chat_id: this.configuration.chatid,
            text,
            parse_mode: this.getParseMode(),
        };
        const effectiveThreadId =
            threadId ?? this.configuration.messagethreadid;
        if (
            effectiveThreadId !== undefined &&
            effectiveThreadId !== null &&
            effectiveThreadId !== ''
        ) {
            message.message_thread_id = effectiveThreadId;
        }
        const requestConfig = this.proxyAgent
            ? {
                  httpAgent: this.proxyAgent as any,
                  httpsAgent: this.proxyAgent as any,
                  proxy: false as const,
              }
            : undefined;

        const response = await axios.post(
            `https://api.telegram.org/bot${this.configuration.bottoken}/sendMessage`,
            message,
            requestConfig,
        );

        if (response.status < 200 || response.status >= 300) {
            this.log.error(
                `Failed to send message to Telegram: ${JSON.stringify(response.data)}`,
            );
        }
    }

    private bold(text: string) {
        return this.configuration.messageformat.toLowerCase() === 'markdown'
            ? `*${this.escapeMarkdown(text)}*`
            : `<b>${text}</b>`;
    }

    private getParseMode() {
        return this.configuration.messageformat.toLowerCase() === 'markdown'
            ? 'MarkdownV2'
            : 'HTML';
    }

    private escapeMarkdown(text: string) {
        return text.replace(/([\\_*`|!.[\](){}>+#=~-])/gm, '\\$1');
    }
}

export default Telegram;
