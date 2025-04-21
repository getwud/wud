import { Strategy } from 'passport';
import { BaseConfig, Component } from '../../registry/Component';
import { Express } from 'express';

export class Authentication<TConfig extends BaseConfig = {}> extends Component<TConfig> {
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
    getStrategy(app: Express): Strategy {
        throw new Error('getStrategy must be implemented');
    }

    getStrategyDescription(): StrategyDescription {
        throw new Error('getStrategyDescription must be implemented');
    }
}

export interface StrategyDescription {
    type: string;
    name: string;
    logoutUrl?: string;
}
