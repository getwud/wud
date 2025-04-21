import { Strategy } from "passport-anonymous";
import { Authentication } from '../Authentication';
import log from '../../../log';

/**
 * Anonymous authentication.
 */
export class Anonymous extends Authentication {
    /**
     * Return passport strategy.
     */
    getStrategy() {
        log.warn(
            'Anonymous authentication is enabled; please make sure that the app is not exposed to unsecure networks',
        );
        return new Strategy();
    }

    getStrategyDescription() {
        return {
            type: 'anonymous',
            name: 'Anonymous',
        };
    }
}

