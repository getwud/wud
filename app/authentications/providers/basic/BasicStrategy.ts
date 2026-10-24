// @ts-nocheck
import { BasicStrategy as HttpBasicStrategy } from 'passport-http';

/**
 * Inherit from Basic Strategy including Session support and RFC 7617 compliant password parsing.
 * @type {module.MyStrategy}
 */
class BasicStrategy extends HttpBasicStrategy {
    authenticate(req) {
        // Already authenticated (thanks to session) => ok
        if (req.isAuthenticated && req.isAuthenticated()) {
            return this.success(req.user);
        }

        const authorization = req.headers
            ? req.headers.authorization || req.headers.Authorization
            : undefined;
        if (!authorization) {
            return this.fail(this._challenge());
        }

        const parts = authorization.split(' ');
        if (parts.length < 2) {
            return this.fail(400);
        }

        const scheme = parts[0];
        if (!/Basic/i.test(scheme)) {
            return this.fail(this._challenge());
        }

        const credentials = Buffer.from(parts[1], 'base64').toString('utf8');
        const colonIndex = credentials.indexOf(':');
        if (colonIndex === -1) {
            return this.fail(400);
        }

        const userid = credentials.slice(0, colonIndex);
        const password = credentials.slice(colonIndex + 1);

        if (!userid || !password) {
            return this.fail(this._challenge());
        }

        const verified = (err, user) => {
            if (err) {
                return this.error(err);
            }
            if (!user) {
                return this.fail(this._challenge());
            }
            this.success(user);
        };

        if (this._passReqToCallback) {
            this._verify(req, userid, password, verified);
        } else {
            this._verify(userid, password, verified);
        }
    }

    /**
     * Override challenge to avoid browser popup on 401 errrors.
     * @returns {string}
     * @private
     */
    _challenge() {
        return 401;
    }
}

export default BasicStrategy;
