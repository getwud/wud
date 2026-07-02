// @ts-nocheck
import TelegramBot from 'node-telegram-bot-api';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import Trigger from '../Trigger';

/**
 * Escape special characters.
 * @param {*} text
 * @returns
 */
function escapeMarkdown(text) {
    return text.replace(/([\\_*`|!.[\](){}>+#=~-])/gm, '\\$1');
}

/**
 * Build an http(s)/socks proxy agent from a proxy URL.
 * socks:// | socks5:// | socks5h:// | socks4:// => SocksProxyAgent
 * http:// | https:// => HttpsProxyAgent
 * @param {string} proxyUrl the proxy url (e.g. socks5://user:pass@host:1080)
 * @returns {*} the proxy agent instance
 */
function createProxyAgent(proxyUrl) {
    const { protocol } = new URL(proxyUrl);
    if (protocol.startsWith('socks')) {
        return new SocksProxyAgent(proxyUrl);
    }
    if (protocol === 'http:' || protocol === 'https:') {
        return new HttpsProxyAgent(proxyUrl);
    }
    throw new Error(`Unsupported proxy protocol (${protocol}) for proxy url`);
}

/**
 * Mask the password of a proxy URL, keeping host/port/user readable.
 * Falls back to a full mask if the value is not a parsable URL.
 * @param {string} proxyUrl the proxy url
 * @returns {string|undefined} the masked proxy url
 */
function maskProxy(proxyUrl) {
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

/**
 * Telegram Trigger implementation
 */
class Telegram extends Trigger {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
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

    /**
     * Sanitize sensitive data
     * @returns {*}
     */
    maskConfiguration() {
        return {
            ...this.configuration,
            bottoken: Telegram.mask(this.configuration.bottoken),
            chatid: Telegram.mask(this.configuration.chatid),
            proxy: maskProxy(this.configuration.proxy),
        };
    }

    /**
     * Init trigger (create telegram client).
     * @returns {Promise<void>}
     */
    async initTrigger() {
        const options = {};
        if (this.configuration.proxy) {
            options.request = {
                agent: createProxyAgent(this.configuration.proxy),
            };
        }
        this.telegramBot = new TelegramBot(
            this.configuration.bottoken,
            options,
        );
    }

    /*
     * Post a message with new image version details.
     *
     * @param image the image
     */
    async trigger(container) {
        const body = this.renderSimpleBody(container);

        if (this.configuration.disabletitle) {
            return this.sendMessage(body);
        }

        const title = this.renderSimpleTitle(container);

        return this.sendMessage(
            `${this.bold(title)}\n\n${escapeMarkdown(body)}`,
        );
    }

    async triggerBatch(containers) {
        const body = this.renderBatchBody(containers);
        if (this.configuration.disabletitle) {
            return this.sendMessage(body);
        }

        const title = this.renderBatchTitle(containers);
        return this.sendMessage(`${this.bold(title)}\n\n${body}`);
    }

    /**
     * Post a message to a Slack channel.
     * @param text the text to post
     * @returns {Promise<>}
     */
    async sendMessage(text) {
        const txtToSend = text;
        return this.telegramBot.sendMessage(
            this.configuration.chatid,
            txtToSend,
            {
                parse_mode: this.getParseMode(),
            },
        );
    }

    bold(text) {
        return this.configuration.messageformat.toLowerCase() === 'markdown'
            ? `*${escapeMarkdown(text)}*`
            : `<b>${text}</b>`;
    }

    getParseMode() {
        return this.configuration.messageformat.toLowerCase() === 'markdown'
            ? 'MarkdownV2'
            : 'HTML';
    }
}

export default Telegram;
