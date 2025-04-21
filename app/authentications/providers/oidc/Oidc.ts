import { Issuer, generators, custom, Client, TokenSet } from 'openid-client';
import { v4 as uuid } from 'uuid';
import { Authentication } from '../Authentication';
import { OidcStrategy, User } from './OidcStrategy';
import { getPublicUrl } from '../../../configuration';
import { Express, Request } from 'express';

export interface OidcConfiguration {
    discovery: string;
    clientid: string;
    clientsecret: string;
    redirect: boolean;
    timeout: number;
}

/**
 * OIDC authentication.
 */
export class Oidc extends Authentication<OidcConfiguration> {
    public client?: Client;
    private logoutUrl?: string;

    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            discovery: this.joi.string().uri().required(),
            clientid: this.joi.string().required(),
            clientsecret: this.joi.string().required(),
            redirect: this.joi.boolean().default(false),
            timeout: this.joi.number().greater(500).default(5000),
        });
    }

    /**
     * Sanitize sensitive data
     */
    maskConfiguration() {
        return {
            ...this.configuration,
            discovery: this.configuration.discovery,
            clientid: Oidc.mask(this.configuration.clientid),
            clientsecret: Oidc.mask(this.configuration.clientsecret),
            redirect: this.configuration.redirect,
            timeout: this.configuration.timeout,
        };
    }

    async initAuthentication() {
        this.log.debug(
            `Discovering configuration from ${this.configuration.discovery}`,
        );
        custom.setHttpOptionsDefaults({
            timeout: this.configuration.timeout,
        });
        const issuer = await Issuer.discover(this.configuration.discovery);
        this.client = new issuer.Client({
            client_id: this.configuration.clientid,
            client_secret: this.configuration.clientsecret,
            response_types: ['code'],
        });
        try {
            this.logoutUrl = this.client.endSessionUrl();
        } catch (e: any) {
            this.log.warn(` End session url is not supported (${e.message})`);
        }
    }

    /**
     * Return passport strategy.
     * @param app
     */
    getStrategy(app: Express) {
        app.get(`/auth/oidc/${this.name}/redirect`, async (req, res) =>
            this.redirect(req, res),
        );
        app.get(`/auth/oidc/${this.name}/cb`, async (req, res) =>
            this.callback(req, res),
        );
        const strategy = new OidcStrategy(
            {
                client: this.client!,
                params: {
                    scope: 'openid email profile',
                },
            },
            async (accessToken, done) => this.verify(accessToken, done),
            this.log,
        );
        strategy.name = 'oidc';
        return strategy;
    }

    getStrategyDescription() {
        return {
            type: 'oidc',
            name: this.name,
            redirect: this.configuration.redirect,
            logoutUrl: this.logoutUrl,
        };
    }

    async redirect(req: Request, res: any) {
        const codeVerifier = generators.codeVerifier();
        const codeChallenge = generators.codeChallenge(codeVerifier);
        const state = uuid();
        (req.session as any).oidc = {
            codeVerifier,
            state,
        };
        const authUrl = `${this.client!.authorizationUrl({
            redirect_uri: `${getPublicUrl(req)}/auth/oidc/${this.name}/cb`,
            scope: 'openid email profile',
            code_challenge_method: 'S256',
            code_challenge: codeChallenge,
            state,
        })}`;
        this.log.debug(`Build redirection url [${authUrl}]`);
        res.json({
            url: authUrl,
        });
    }

    async callback(req: Request, res: any) {
        try {
            this.log.debug('Validate callback data');
            const params = this.client!.callbackParams(req);
            const oidcChecks = (req.session as any).oidc;

            const tokenSet = await this.client!.callback(
                `${getPublicUrl(req)}/auth/oidc/${this.name}/cb`,
                params,
                {
                    response_type: 'code',
                    code_verifier: oidcChecks ? oidcChecks.codeVerifier : '',
                    state: oidcChecks ? oidcChecks.state : '',
                },
            );
            this.log.debug('Get user info');
            const user = await this.getUserFromAccessToken(tokenSet);

            this.log.debug('Perform passport login');
            req.login(user, (err) => {
                if (err) {
                    this.log.warn(
                        `Error when logging the user [${err.message}]`,
                    );
                    res.status(401).send(err.message);
                } else {
                    this.log.debug('User authenticated => redirect to app');
                    res.redirect(`${getPublicUrl(req)}`);
                }
            });
        } catch (err: any) {
            this.log.warn(`Error when logging the user [${err.message}]`);
            res.status(401).send(err.message);
        }
    }

    async verify(accessToken: TokenSet, done: (err: any, user?: User | undefined) => void) {
        try {
            const user = await this.getUserFromAccessToken(accessToken);
            done(null, user);
        } catch (e: any) {
            this.log.warn(
                `Error when validating the user access token (${e.message})`,
            );
            done(null, undefined);
        }
    }

    async getUserFromAccessToken(accessToken: TokenSet) {
        const userInfo = await this.client!.userinfo(accessToken);
        return {
            username: userInfo.email || 'unknown',
        };
    }
}

