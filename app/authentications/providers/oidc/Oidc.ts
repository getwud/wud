import * as client from 'openid-client';
import Authentication from '../Authentication';
import OidcStrategy from './OidcStrategy';
import { getPublicUrl } from '../../../configuration';
import { Express, Request, Response } from 'express';

// Extend express-session to store OIDC data in session
declare module 'express-session' {
    interface SessionData {
        oidc: {
            codeVerifier: string;
            state?: string;
        };
    }
}

/**
 * OIDC authentication.
 */
class Oidc extends Authentication {
    /**
     * Get the Trigger configuration schema.
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            discovery: this.joi.string().uri().required(),
            clientid: this.joi.string().required(),
            clientsecret: this.joi.string().required(),
            redirect: this.joi.boolean().default(false),
            timeout: this.joi.number().greater(500).default(5000),
            ttl: this.joi.number().min(-1).default(60),
            usernameclaim: this.joi.string().default('email'),
        });
    }

    /**
     * Sanitize sensitive data
     */
    maskConfiguration() {
        return {
            ...this.configuration,
            clientid: Oidc.mask(this.configuration.clientid),
            clientsecret: Oidc.mask(this.configuration.clientsecret),
        };
    }

    private cachedConfig: client.Configuration | undefined;
    private discoveryCachedAt: number | undefined;
    private logoutUrl: string | undefined;
    private discoveryPromise: Promise<void> | undefined;

    private async discoverConfiguration() {
        this.log.debug(
            `Discovering configuration from ${this.configuration.discovery}`,
        );

        this.cachedConfig = await client.discovery(
            new URL(this.configuration.discovery),
            this.configuration.clientid,
            this.configuration.clientsecret,
            undefined,
            {
                timeout: this.configuration.timeout,
            },
        );
        this.discoveryCachedAt = Date.now();

        try {
            this.logoutUrl = client
                .buildEndSessionUrl(this.cachedConfig)
                .toString();
        } catch (e) {
            this.log.warn(` End session url is not supported (${e.message})`);
        }
    }

    private isDiscoveryCacheValid() {
        if (!this.cachedConfig || this.discoveryCachedAt === undefined) {
            return false;
        }

        if (this.configuration.ttl === -1) {
            return true;
        }

        return (
            Date.now() - this.discoveryCachedAt <
            this.configuration.ttl * 60_000
        );
    }

    private async ensureDiscovered(): Promise<client.Configuration>;
    private async ensureDiscovered(
        throwOnError: true,
    ): Promise<client.Configuration>;
    private async ensureDiscovered(
        throwOnError: false,
    ): Promise<client.Configuration | undefined>;
    private async ensureDiscovered(
        throwOnError = true,
    ): Promise<client.Configuration | undefined> {
        if (this.isDiscoveryCacheValid()) {
            return this.cachedConfig;
        }

        if (this.cachedConfig) {
            this.log.debug(
                `OIDC discovery cache expired after ${this.configuration.ttl} minute(s) => refresh configuration`,
            );
            this.cachedConfig = undefined;
            this.discoveryCachedAt = undefined;
            this.logoutUrl = undefined;
        }

        if (!this.discoveryPromise) {
            this.discoveryPromise = this.discoverConfiguration().finally(() => {
                this.discoveryPromise = undefined;
            });
        }

        try {
            await this.discoveryPromise;
        } catch (e) {
            if (throwOnError) {
                throw e;
            }
            this.log.warn(
                `Unable to discover OIDC authority (${(e as Error).message})`,
            );
            return undefined;
        }

        if (!this.cachedConfig && throwOnError) {
            throw new Error('OIDC configuration is not available');
        }
        return this.cachedConfig;
    }

    async initAuthentication() {
        await this.ensureDiscovered(false);
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
                config: this.cachedConfig,
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

    async redirect(req: Request, res: Response) {
        const config = await this.ensureDiscovered();
        const codeVerifier = client.randomPKCECodeVerifier();
        const codeChallenge =
            await client.calculatePKCECodeChallenge(codeVerifier);
        const state = client.randomState();

        const parameters: Record<string, string> = {
            redirect_uri: `${getPublicUrl(req)}/auth/oidc/${this.name}/cb`,
            scope: 'openid email profile',
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
            state: state,
        };

        req.session.oidc = {
            codeVerifier,
            state,
        };

        const authUrl = client.buildAuthorizationUrl(config, parameters);
        this.log.debug(`Build redirection url [${authUrl}]`);
        res.json({
            url: authUrl,
        });
    }

    async callback(req: Request, res: Response) {
        try {
            const config = await this.ensureDiscovered();
            this.log.debug('Validate callback data');

            const oidcChecks = req.session.oidc;
            const currentUrl = new URL(
                `${getPublicUrl(req)}${req.originalUrl}`,
            );

            // Authentik sends an empty state back instead of not sending it at all when PKCE is not supported, so in that case we skip the state check
            const check: client.AuthorizationCodeGrantChecks = {
                pkceCodeVerifier: oidcChecks.codeVerifier,
                expectedState: oidcChecks.state
                    ? oidcChecks.state
                    : req.query.state === ''
                      ? client.skipStateCheck
                      : undefined,
            };

            const tokenSet = await client.authorizationCodeGrant(
                config,
                currentUrl,
                check,
            );

            this.log.debug('Get user info');

            const user = await this.getUserFromAccessToken(
                tokenSet.access_token,
                tokenSet.claims(),
            );
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
        } catch (err) {
            this.log.warn(`Error when logging the user [${err.message}]`);
            res.status(401).send(err.message);
        }
    }

    async verify(
        accessToken: string,
        done: (err: Error | null, user?: { username: string } | false) => void,
    ) {
        try {
            const user = await this.getUserFromAccessToken(accessToken);
            done(null, user);
        } catch (e) {
            this.log.warn(
                `Error when validating the user access token (${(e as Error).message})`,
            );
            done(null, false);
        }
    }

    async getUserFromAccessToken(accessToken: string, claim?: client.IDToken) {
        const config = await this.ensureDiscovered();
        const userInfo = await client.fetchUserInfo(
            config,
            accessToken,
            claim?.sub,
        );

        // check the usernameclaim, if it doesn't exist, try to use the email and log a warning
        let username = userInfo[this.configuration.usernameclaim]?.toString();
        if (!username) {
            this.log.warn(
                `The claim [${this.configuration.usernameclaim}] does not exist in the user info, using email instead`,
            );
            username = userInfo.email?.toString();
        }

        return {
            username: username || 'unknown',
        };
    }
}

export default Oidc;
