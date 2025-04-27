import Logger from 'bunyan';
import { Client, Strategy, StrategyOptions, StrategyVerifyCallback, TokenSet } from 'openid-client';
import { Request } from 'express';

export interface User {
    username: string
}

export class OidcStrategy extends Strategy<User, Client> {
    private log: Logger;
    private verify: StrategyVerifyCallback<User>;
    public name: string = 'oidc';
    /**
     * Constructor.
     * @param options
     * @param verify
     * @param log
     */
    constructor(options: StrategyOptions<Client>, verify: StrategyVerifyCallback<User>, log: Logger) {
        super(options, verify);
        this.log = log;
        this.verify = verify;
    }

    /**
     * Authenticate method.
     * @param req
     */
    authenticate(req: Request) {
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
                this.verify(accessToken as unknown as TokenSet, (err, user) => {
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
};
