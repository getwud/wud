// @ts-nocheck
import axios from 'axios';
import Trigger from '../Trigger';

const DEFAULT_GITLAB_URL = 'https://gitlab.com';

/**
 * GitLab CI Trigger implementation (Pipeline Triggers)
 */
class Gitlabci extends Trigger {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            projectid: this.joi.string().trim().required(),
            token: this.joi.string().trim().required(),
            ref: this.joi.string().trim().default('main'),
            url: this.joi
                .string()
                .uri({ scheme: ['http', 'https'] })
                .replace(/\/$/, '')
                .default(DEFAULT_GITLAB_URL),
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
            token: Gitlabci.mask(this.configuration.token),
        };
    }

    /**
     * Trigger GitLab CI pipeline for single container update.
     * @param container the container
     * @returns {Promise<*>}
     */
    async trigger(container) {
        const variables = {
            WUD_MODE: 'simple',
            WUD_CONTAINER: container.name || '',
            WUD_WATCHER: container.watcher || '',
            WUD_IMAGE: container.image?.name || '',
            WUD_LOCAL_TAG: container.updateKind?.localValue || '',
            WUD_REMOTE_TAG: container.updateKind?.remoteValue || '',
            WUD_LINK: container.result?.link || '',
            WUD_TITLE: this.configuration.disabletitle
                ? ''
                : this.renderSimpleTitle(container),
            WUD_MESSAGE: this.renderSimpleBody(container),
        };
        return this.triggerPipeline(variables);
    }

    /**
     * Trigger GitLab CI pipeline for batch container updates.
     * @param containers
     * @returns {Promise<*>}
     */
    async triggerBatch(containers) {
        const variables = {
            WUD_MODE: 'batch',
            WUD_COUNT: containers.length.toString(),
            WUD_CONTAINERS: containers.map((c) => c.name).join(','),
            WUD_TITLE: this.configuration.disabletitle
                ? ''
                : this.renderBatchTitle(containers),
            WUD_MESSAGE: this.renderBatchBody(containers),
        };
        return this.triggerPipeline(variables);
    }

    /**
     * Send pipeline trigger request to GitLab REST API.
     * @param {Object} variables
     * @returns {Promise<*>}
     */
    async triggerPipeline(variables) {
        const encodedProjectId = encodeURIComponent(
            this.configuration.projectid,
        );
        const endpoint = `${this.configuration.url}/api/v4/projects/${encodedProjectId}/trigger/pipeline`;

        const payload = {
            token: this.configuration.token,
            ref: this.configuration.ref,
            variables,
        };

        return axios.post(endpoint, payload, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
}

export default Gitlabci;
