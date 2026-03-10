import Component from '../../registry/Component';
import { Strategy } from 'passport';
import { Express } from 'express';

class Authentication extends Component {
    /**
     * Init the Trigger.
     */
    async init() {
        await this.initAuthentication();
    }

    /**
     * Init Trigger. Can be overridden in trigger implementation class.
     */
    async initAuthentication() {
        // do nothing by default
    }

    /**
     * Return passport strategy.
     */
    getStrategy(_app: Express): Strategy {
        throw new Error('getStrategy must be implemented');
    }

    getStrategyDescription() {
        throw new Error('getStrategyDescription must be implemented');
    }
}

export default Authentication;
