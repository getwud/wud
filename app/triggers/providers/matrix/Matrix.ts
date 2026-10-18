// @ts-nocheck
import axios from 'axios';
import Trigger from '../Trigger';

/**
 * Matrix Trigger implementation
 */
class Matrix extends Trigger {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            url: this.joi
                .string()
                .uri({ scheme: ['http', 'https'] })
                .replace(/\/$/, '')
                .required(),
            roomid: this.joi.string().required(),
            accesstoken: this.joi.string().trim().required(),
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
            accesstoken: Matrix.mask(this.configuration.accesstoken),
        };
    }

    /**
     * Notify Matrix room with container update details.
     * @param container the container
     * @returns {Promise<*>}
     */
    async trigger(container) {
        const risk = container.result?.riskAnalysis;
        if (!risk) {
            const message = this.composeMessage(container);
            return this.sendMessage(message);
        }

        const RISK_COLORS = {
            low: '#2eb886',
            medium: '#e67e22',
            high: '#e74c3c',
            critical: '#e74c3c',
            locked: '#9b59b6',
        };
        const riskEmojis = {
            low: '🟢',
            medium: '⚠️',
            high: '⚡',
            critical: '🚨',
            locked: '🔒',
        };

        const color = RISK_COLORS[risk.riskScore] || '#2eb886';
        const emoji = riskEmojis[risk.riskScore] || 'ℹ️';
        const skipped = this.getSkippedVersionsCount(risk);
        const reviewUrl = this.getUpgradeReviewUrl(container);

        // Plain text fallback
        const textParts = [this.composeMessage(container)];
        textParts.push(`Risk Level: ${emoji} ${risk.riskScore.toUpperCase()}`);
        if (skipped > 0) {
            textParts.push(`Skipped Versions: +${skipped}`);
        }
        if (risk.summary) {
            textParts.push(`Summary: ${risk.summary}`);
        }
        if (risk.breakingChanges && risk.breakingChanges.length > 0) {
            textParts.push(
                `Breaking Changes:\n${risk.breakingChanges.map((b) => `• ${b}`).join('\n')}`,
            );
        }
        if (risk.databaseImpact) {
            textParts.push(`DB Impact: ${risk.databaseImpact}`);
        }
        if (reviewUrl) {
            textParts.push(`Review: ${reviewUrl}`);
        }
        const textFallback = textParts.join('\n\n');

        // Formatted HTML body
        const htmlParts = [];
        if (!this.configuration.disabletitle) {
            htmlParts.push(`<h3>${this.renderSimpleTitle(container)}</h3>`);
        }
        htmlParts.push(`<p>${this.renderSimpleBody(container)}</p>`);
        htmlParts.push(
            `<p><b>Risk Level:</b> <font color="${color}"><b>${emoji} ${risk.riskScore.toUpperCase()}</b></font></p>`,
        );
        if (skipped > 0) {
            htmlParts.push(`<p><b>Skipped Versions:</b> +${skipped}</p>`);
        }
        if (risk.summary) {
            htmlParts.push(`<blockquote>${risk.summary}</blockquote>`);
        }
        if (risk.breakingChanges && risk.breakingChanges.length > 0) {
            htmlParts.push(
                `<p><b>Breaking Changes:</b></p><ul>${risk.breakingChanges.map((b) => `<li>${b}</li>`).join('')}</ul>`,
            );
        }
        if (risk.databaseImpact) {
            htmlParts.push(
                `<p><b>Database Impact:</b> ${risk.databaseImpact}</p>`,
            );
        }
        if (reviewUrl) {
            htmlParts.push(
                `<p><a href="${reviewUrl}">🔍 Review Update in WUD</a></p>`,
            );
        }
        const formattedBody = htmlParts.join('');

        return this.sendMessage(textFallback, formattedBody);
    }

    composeMessage(container) {
        const body = this.renderSimpleBody(container);
        if (this.configuration.disabletitle) {
            return body;
        }
        const title = this.renderSimpleTitle(container);
        return `${title}\n\n${body}`;
    }

    /**
     * Notify Matrix room with batch container update details.
     * @param containers
     * @returns {Promise<*>}
     */
    async triggerBatch(containers) {
        const message = this.composeBatchMessage(containers);
        return this.sendMessage(message);
    }

    composeBatchMessage(containers) {
        const body = this.renderBatchBody(containers);
        if (this.configuration.disabletitle) {
            return body;
        }
        const title = this.renderBatchTitle(containers);
        return `${title}\n\n${body}`;
    }

    /**
     * This trigger supports rollback notifications.
     */
    supportsRollbackNotifications(): boolean {
        return true;
    }

    /**
     * Notify Matrix room with rollback details.
     * @param rollbackReport the rollback report
     * @returns {Promise<*>}
     */
    async triggerRollback(rollbackReport) {
        const body = this.renderRollbackBody(rollbackReport);
        if (this.configuration.disabletitle) {
            return this.sendMessage(body);
        }
        const title = this.renderRollbackTitle(rollbackReport);
        return this.sendMessage(`${title}\n\n${body}`);
    }

    /**
     * Send message to Matrix room via Client-Server API.
     * @param {string} text
     * @param {string} formattedBody
     * @returns {Promise<*>}
     */
    async sendMessage(text, formattedBody = undefined) {
        const txnId = `wud_${Date.now()}_${Math.random().toString(16).substring(2, 8)}`;
        const encodedRoomId = encodeURIComponent(this.configuration.roomid);
        const endpoint = `${this.configuration.url}/_matrix/client/v3/rooms/${encodedRoomId}/send/m.room.message/${txnId}`;

        const payload = {
            msgtype: 'm.text',
            body: text,
        };
        if (formattedBody) {
            payload.format = 'org.matrix.custom.html';
            payload.formatted_body = formattedBody;
        }

        return axios.put(endpoint, payload, {
            headers: {
                Authorization: `Bearer ${this.configuration.accesstoken}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
        });
    }
}

export default Matrix;
