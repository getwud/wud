import { Container } from '../../../model/container';
import { Trigger } from '../Trigger';

/**
 * Mock Trigger implementation (for tests)
 */
export class Mock extends Trigger {
    /**
     * Mock trigger only logs a dummy line...
     */
    async trigger(container: Container) {
        this.log.info(
            `MOCK triggered title = \n${this.renderSimpleTitle(container)}`,
        );
        this.log.info(
            `MOCK triggered body  = \n${this.renderSimpleBody(container)}`,
        );
    }

    /**
     * Mock trigger only logs a dummy line...
     */
    async triggerBatch(containers: Container[]) {
        this.log.info(
            `MOCK triggered title = \n${this.renderBatchTitle(containers)}`,
        );
        this.log.info(
            `MOCK triggered body  = \n${this.renderBatchBody(containers)}`,
        );
    }
}
