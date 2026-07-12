import { Strategy } from 'passport';
import * as client from 'openid-client';
import Logger from 'bunyan';
import { Request } from 'express';

export interface User {
    username: string;
}

interface OidcStrategyOptions {
    config: client.Configuration | undefined;
    params: Record<string, string>;
}

class OidcStrategy extends Strategy {
    private log: Logger;
    private verify: (
        accessToken: string,
        callback: (err: Error | null, user?: User | false) => void,
    ) => void;

    /**
     * Constructor.
     */
    constructor(
        options: OidcStrategyOptions,
        verify: (
            accessToken: string,
            callback: (err: Error | null, user?: User | false) => void,
        ) => void,
        log: Logger,
    ) {
        super();
        this.log = log;
        this.verify = verify;
    }

    /**
     * Authenticate method.
     * @param req
     */
    authenticate(req: Request) {
        // Already authenticated (thanks to session) => ok
        if (req.isAuthenticated()) {
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
                this.log.debug(
                    `No bearer token found in the request ${req.originalUrl}`,
                );
                this.fail(401);
            }
        }
    }
}

export default OidcStrategy;
