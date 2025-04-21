import passJs from 'pass';
import { BasicStrategy } from './BasicStrategy';
import { Authentication } from '../Authentication';

export interface BasicConfiguration {
    user: string;
    hash: string;
}

/**
 * Htpasswd authentication.
 */
export class Basic extends Authentication<BasicConfiguration> {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            user: this.joi.string().required(),
            hash: this.joi.string().required(),
        });
    }

    /**
     * Sanitize sensitive data
     * @returns {*}
     */
    maskConfiguration() {
        return {
            user: this.configuration.user,
            hash: Basic.mask(this.configuration.hash),
        };
    }

    /**
     * Return passport strategy.
     */
    getStrategy() {
        return new BasicStrategy((user, pass, done) =>
            this.authenticate(user, pass, done),
        );
    }

    getStrategyDescription() {
        return {
            type: 'basic',
            name: 'Login',
        };
    }

    authenticate(user: string, pass: string, done: (error: Error | null, user?: false | { username: string }) => void) {
        // No user or different user? => reject
        if (!user || user !== this.configuration.user) {
            done(null, false);
            return;
        }

        // Different password? => reject
        passJs.validate(pass, this.configuration.hash, (err, success) => {
            if (success) {
                done(null, {
                    username: this.configuration.user,
                });
            } else {
                done(err, false);
            }
        });
    }
}

