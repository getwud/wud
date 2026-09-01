// @ts-nocheck
import axios from 'axios';
import Trigger from '../Trigger';

const DEFAULT_GITHUB_API = 'https://api.github.com';

/**
 * GitHub Actions Trigger implementation (repository_dispatch)
 */
class Githubactions extends Trigger {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            owner: this.joi.string().trim().required(),
            repo: this.joi.string().trim().required(),
            token: this.joi.string().trim().required(),
            eventtype: this.joi.string().trim().default('wud-update'),
            url: this.joi
                .string()
                .uri({ scheme: ['http', 'https'] })
                .replace(/\/$/, '')
                .default(DEFAULT_GITHUB_API),
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
            token: Githubactions.mask(this.configuration.token),
        };
    }

    /**
     * Dispatch event to GitHub repository with container update details.
     * @param container the container
     * @returns {Promise<*>}
     */
    async trigger(container) {
        const payload = {
            event_type: this.configuration.eventtype,
            client_payload: {
                title: this.configuration.disabletitle
                    ? ''
                    : this.renderSimpleTitle(container),
                message: this.renderSimpleBody(container),
                mode: 'simple',
                container: container.name,
                watcher: container.watcher,
                image: container.image?.name,
                localTag: container.updateKind?.localValue,
                remoteTag: container.updateKind?.remoteValue,
                link: container.result?.link,
                raw: container,
            },
        };
        return this.sendDispatch(payload);
    }

    /**
     * Dispatch batch event to GitHub repository with containers update details.
     * @param containers
     * @returns {Promise<*>}
     */
    async triggerBatch(containers) {
        const payload = {
            event_type: this.configuration.eventtype,
            client_payload: {
                title: this.configuration.disabletitle
                    ? ''
                    : this.renderBatchTitle(containers),
                message: this.renderBatchBody(containers),
                mode: 'batch',
                count: containers.length,
                containers: containers.map((c) => ({
                    container: c.name,
                    watcher: c.watcher,
                    image: c.image?.name,
                    localTag: c.updateKind?.localValue,
                    remoteTag: c.updateKind?.remoteValue,
                })),
            },
        };
        return this.sendDispatch(payload);
    }

    /**
     * Send dispatch request to GitHub Actions API.
     * @param {Object} payload
     * @returns {Promise<*>}
     */
    async sendDispatch(payload) {
        const endpoint = `${this.configuration.url}/repos/${encodeURIComponent(this.configuration.owner)}/${encodeURIComponent(this.configuration.repo)}/dispatches`;

        return axios.post(endpoint, payload, {
            headers: {
                Authorization: `Bearer ${this.configuration.token}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'Content-Type': 'application/json',
            },
        });
    }
}

export default Githubactions;
