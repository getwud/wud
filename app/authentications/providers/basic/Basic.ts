// @ts-nocheck
import BasicStrategy from './BasicStrategy';
import Authentication from '../Authentication';
import { getUserByUsername, verifyPassword } from '../../../store/user';
import log from '../../../log';

/**
 * Local / Basic authentication backed by database.
 */
class Basic extends Authentication {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            user: this.joi.string().optional(),
            hash: this.joi.string().optional(),
        });
    }

    /**
     * Sanitize sensitive data
     * @returns {*}
     */
    maskConfiguration() {
        return {
            user: this.configuration.user,
            hash: this.configuration.hash
                ? Basic.mask(this.configuration.hash)
                : undefined,
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

    async authenticate(user, pass, done) {
        if (!user || !pass) {
            done(null, false);
            return;
        }

        try {
            const dbUser = await getUserByUsername(user);
            if (
                dbUser &&
                dbUser.provider === 'local' &&
                dbUser.passwordHash &&
                (await verifyPassword(pass, dbUser.passwordHash))
            ) {
                done(null, {
                    id: dbUser.id,
                    username: dbUser.username,
                    role: dbUser.role,
                    provider: dbUser.provider,
                    preferences: dbUser.preferences,
                });
            } else {
                done(null, false);
            }
        } catch (e) {
            log.warn(
                `Error during local authentication for '${user}': ${e.message}`,
            );
            done(null, false);
        }
    }
}

export default Basic;
