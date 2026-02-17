// @ts-nocheck
import { Strategy as AnonymousStrategy } from 'passport-anonymous';
import Authentication from '../Authentication';
import log from '../../../log';

/**
 * Anonymous authentication.
 */
class Anonymous extends Authentication {
    /**
     * Return passport strategy.
     */
    getStrategy() {
        log.warn(
            'Anonymous authentication is enabled; please make sure that the app is not exposed to unsecure networks',
        );
        return new AnonymousStrategy();
    }

    getStrategyDescription() {
        return {
            type: 'anonymous',
            name: 'Anonymous',
        };
    }
}

export default Anonymous;
