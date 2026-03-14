import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { Container } from '../../../model/container';
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
            disabletitle: this.joi.boolean().default(false),
            messageformat: this.joi
                .string()
                .valid('Markdown', 'HTML')
                .insensitive()
                .default('Markdown'),
            proxy: this.joi.string().uri().optional(),
        });
    }

    maskConfiguration() {
        return {
            ...this.configuration,
            bottoken: Telegram.mask(this.configuration.bottoken),
            chatid: Telegram.mask(this.configuration.chatid),
            proxy: maskProxy(this.configuration.proxy),
        };
    }

    initTrigger() {
        this.proxyAgent = this.configuration.proxy
            ? createProxyAgent(this.configuration.proxy)
            : undefined;
    }

    trigger(container: Container) {
        const body = this.renderSimpleBody(container);

        if (this.configuration.disabletitle) {
            return this.sendMessage(body);
        }

        const title = this.renderSimpleTitle(container);

        return this.sendMessage(
            `${this.bold(title)}\n\n${this.escapeMarkdown(body)}`,
        );
    }

    triggerBatch(containers: Container[]) {
        const body = this.renderBatchBody(containers);
        if (this.configuration.disabletitle) {
            return this.sendMessage(body);
        }

        const title = this.renderBatchTitle(containers);
        return this.sendMessage(`${this.bold(title)}\n\n${body}`);
    }

    private async sendMessage(text: string) {
        const message = {
            chat_id: this.configuration.chatid,
            text,
            parse_mode: this.getParseMode(),
        };
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
