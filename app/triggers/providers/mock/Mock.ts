// @ts-nocheck
import Trigger from '../Trigger';

/**
 * Mock Trigger implementation (for tests)
 */
class Mock extends Trigger {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            mock: this.joi.string().default('mock'),
        });
    }

    /**
     * Mock trigger only logs a dummy line...
     * @param container
     * @returns {Promise<void>}
     */
    async trigger(container) {
        this.log.info(
            `MOCK triggered title = \n${this.renderSimpleTitle(container)}`,
        );
        this.log.info(
            `MOCK triggered body  = \n${this.renderSimpleBody(container)}`,
        );
    }

    /**
     * Mock trigger only logs a dummy line...
     * @param containers
     * @returns {Promise<void>}
     */
    async triggerBatch(containers) {
        this.log.info(
            `MOCK triggered title = \n${this.renderBatchTitle(containers)}`,
        );
        this.log.info(
            `MOCK triggered body  = \n${this.renderBatchBody(containers)}`,
        );
    }
}

export default Mock;
