import axios from 'axios';
import { Container } from '../../../model/container';
import Trigger from '../Trigger';

/**
 * Telegram Trigger implementation
 */
class Telegram extends Trigger {
    /**
     * Get the Trigger configuration schema.
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
        });
    }

    /**
     * Sanitize sensitive data
     */
    maskConfiguration() {
        return {
            ...this.configuration,
            bottoken: Telegram.mask(this.configuration.bottoken),
            chatid: Telegram.mask(this.configuration.chatid),
        };
    }

    /**
     * Post a message with new image version details.
     * @param container the image
     */
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
            text: text,
            parse_mode: this.getParseMode(),
        };

        const response = await axios.post(
            `https://api.telegram.org/bot${this.configuration.bottoken}/sendMessage`,
            message,
        );

        if (response.status < 200 || response.status >= 300) {
            // log the error message from Telegram API
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

    /**
     * Escape special characters.
     */
    private escapeMarkdown(text: string) {
        return text.replace(/([\\_*`|!.[\](){}>+#=~-])/gm, '\\$1');
    }
}

export default Telegram;
