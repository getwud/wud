const AnonymousStrategy = require('passport-anonymous').Strategy;
const Authentication = require('../Authentication');
const log = require('../../../log');

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

module.exports = Anonymous;
