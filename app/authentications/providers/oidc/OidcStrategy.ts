// @ts-nocheck
import { Strategy } from 'openid-client';

class OidcStrategy extends Strategy {
    /**
     * Constructor.
     * @param options
     * @param verify
     * @param log
     */
    constructor(options, verify, log) {
        super(options, verify);
        this.log = log;
        this.verify = verify;
    }

    /**
     * Authenticate method.
     * @param req
     */
    authenticate(req) {
        // Already authenticated (thanks to session) => ok
        this.log.debug('Executing oidc strategy');
        if (req.isAuthenticated()) {
            this.log.debug('User is already authenticated');
            this.success(req.user);
        } else {
            // Get bearer token if so
            const authorization = req.headers.authorization || '';
            const authSplit = authorization.split('Bearer ');
            if (authSplit.length === 2) {
                this.log.debug('Bearer token found => validate it');
                const accessToken = authSplit[1];
                this.verify(accessToken, (err, user) => {
                    if (err || !user) {
                        this.log.warn('Bearer token is invalid');
                        this.fail(401);
                    } else {
                        this.log.debug('Bearer token is valid');
                        this.success(user);
                    }
                });
                // Fail if no bearer token
            } else {
                this.log.debug('No bearer token found in the request');
                this.fail(401);
            }
        }
    }
}

export default OidcStrategy;
