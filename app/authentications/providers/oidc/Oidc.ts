import * as client from 'openid-client';
import Authentication from '../Authentication';
import OidcStrategy from './OidcStrategy';
import { getPublicUrl } from '../../../configuration';
import { Express, Request, Response } from 'express';
import {
    getUserByUsername,
    createUser,
    updateUser,
    UserRole,
} from '../../../store/user';

export interface OidcPendingCheck {
    codeVerifier: string;
    state: string;
    next?: string;
    createdAt: number;
}

// Extend express-session to store OIDC data in session
declare module 'express-session' {
    interface SessionData {
        oidc?: {
            codeVerifier?: string;
            state?: string;
            next?: string;
            pending?: Record<string, OidcPendingCheck>;
        };
    }
}

export const OIDC_CHECKS_TTL_MS = 10 * 60 * 1000;
export const OIDC_MAX_PENDING_CHECKS = 10;
export const OIDC_SESSION_LOCK_WAIT_TIMEOUT_MS = 10 * 1000;
export const OIDC_SESSION_LOCK_STALE_TTL_MS = 60 * 1000;

export const oidcSessionLocks = new Map<string, Promise<void>>();

export async function withOidcSessionLock<T>(
    sessionId: string | undefined,
    operation: () => Promise<T>,
): Promise<T> {
    if (!sessionId) {
        return operation();
    }
    const previousLock = oidcSessionLocks.get(sessionId) || Promise.resolve();
    let releaseLock: (() => void) | undefined;
    const currentLock = new Promise<void>((resolve) => {
        releaseLock = resolve;
    });
    const nextLock = previousLock
        .catch(() => undefined)
        .then(() => currentLock);
    oidcSessionLocks.set(sessionId, nextLock);

    const staleLockCleanupTimer = setTimeout(() => {
        if (oidcSessionLocks.get(sessionId) === nextLock) {
            oidcSessionLocks.delete(sessionId);
        }
    }, OIDC_SESSION_LOCK_STALE_TTL_MS);
    if (typeof staleLockCleanupTimer.unref === 'function') {
        staleLockCleanupTimer.unref();
    }

    let previousLockWaitTimer: ReturnType<typeof setTimeout> | undefined;
    try {
        await Promise.race([
            previousLock.catch(() => undefined),
            new Promise<void>((resolve) => {
                previousLockWaitTimer = setTimeout(
                    resolve,
                    OIDC_SESSION_LOCK_WAIT_TIMEOUT_MS,
                );
                if (typeof previousLockWaitTimer.unref === 'function') {
                    previousLockWaitTimer.unref();
                }
            }),
        ]);
        return await operation();
    } finally {
        if (previousLockWaitTimer !== undefined) {
            clearTimeout(previousLockWaitTimer);
        }
        clearTimeout(staleLockCleanupTimer);
        releaseLock?.();
        if (oidcSessionLocks.get(sessionId) === nextLock) {
            oidcSessionLocks.delete(sessionId);
        }
    }
}

export async function reloadSession(req: Request): Promise<void> {
    if (req.session && typeof req.session.reload === 'function') {
        await new Promise<void>((resolve) => {
            req.session.reload(() => {
                resolve();
            });
        });
    }
}

export async function saveSession(req: Request): Promise<void> {
    if (req.session && typeof req.session.save === 'function') {
        await new Promise<void>((resolve, reject) => {
            req.session.save((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}

export function prunePendingChecks(
    pending: Record<string, OidcPendingCheck> | undefined,
    now = Date.now(),
): Record<string, OidcPendingCheck> {
    if (!pending || typeof pending !== 'object') {
        return {};
    }
    const result: Record<string, OidcPendingCheck> = {};
    const validEntries = Object.entries(pending).filter(([, check]) => {
        return (
            check &&
            typeof check === 'object' &&
            typeof check.state === 'string' &&
            typeof check.codeVerifier === 'string' &&
            typeof check.createdAt === 'number' &&
            now - check.createdAt <= OIDC_CHECKS_TTL_MS
        );
    });

    validEntries.sort(([, a], [, b]) => b.createdAt - a.createdAt);
    for (const [state, check] of validEntries.slice(
        0,
        OIDC_MAX_PENDING_CHECKS,
    )) {
        result[state] = check;
    }
    return result;
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
            admingroup: this.joi.string().optional(),
            rwgroup: this.joi.string().optional(),
            rogroup: this.joi.string().optional(),
            defaultrole: this.joi.string().valid('ro', 'none').default('ro'),
            groupsclaim: this.joi.string().default('groups'),
            scope: this.joi.string().optional(),
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

        const discoveryUrl = new URL(this.configuration.discovery);
        const isHttp = discoveryUrl.protocol === 'http:';
        const execute = isHttp ? [client.allowInsecureRequests] : undefined;

        this.cachedConfig = await client.discovery(
            discoveryUrl,
            this.configuration.clientid,
            this.configuration.clientsecret,
            undefined,
            {
                timeout: this.configuration.timeout,
                execute,
            },
        );
        if (isHttp) {
            client.allowInsecureRequests(this.cachedConfig);
        }
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
     * Compute effective OIDC scopes to request.
     */
    getEffectiveScope(config?: client.Configuration): string {
        if (this.configuration.scope) {
            return this.configuration.scope;
        }
        const scopes = ['openid', 'email', 'profile'];
        if (
            this.configuration.admingroup ||
            this.configuration.rwgroup ||
            this.configuration.rogroup
        ) {
            const scopesSupported = config?.serverMetadata()?.scopes_supported;
            // Only request 'groups' scope if the IdP explicitly declares supporting it (or if no discovery metadata available)
            if (
                !scopesSupported ||
                (Array.isArray(scopesSupported) &&
                    scopesSupported.includes('groups'))
            ) {
                scopes.push('groups');
            }
        }
        return scopes.join(' ');
    }

    /**
     * Return passport strategy.
     * @param app
     */
    getStrategy(app: Express) {
        app.get(`/auth/oidc/${this.name}/redirect`, async (req, res) => {
            try {
                await this.redirect(req, res);
            } catch (e: any) {
                this.log.warn(`Error during OIDC redirection (${e.message})`);
                res.status(500).json({ error: e.message });
            }
        });
        app.get(`/auth/oidc/${this.name}/cb`, async (req, res) => {
            try {
                await this.callback(req, res);
            } catch (e: any) {
                this.log.warn(`Error during OIDC callback (${e.message})`);
                const publicUrl = getPublicUrl(req).replace(/\/$/, '');
                res.redirect(
                    `${publicUrl}/#/login?error=${encodeURIComponent(e.message)}`,
                );
            }
        });
        const strategy = new OidcStrategy(
            {
                config: this.cachedConfig,
                params: {
                    scope: this.getEffectiveScope(this.cachedConfig),
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
            scope: this.getEffectiveScope(config),
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
            state: state,
        };

        const rawNext = req.query.next;
        const next =
            typeof rawNext === 'string' &&
            rawNext.startsWith('/') &&
            !rawNext.startsWith('//')
                ? rawNext
                : undefined;

        await withOidcSessionLock(req.sessionID, async () => {
            await reloadSession(req);

            if (!req.session) {
                throw new Error(
                    'Unable to initialize OIDC checks because no session is available',
                );
            }

            const currentPending = prunePendingChecks(
                req.session.oidc?.pending,
            );
            currentPending[state] = {
                codeVerifier,
                state,
                next,
                createdAt: Date.now(),
            };

            req.session.oidc = {
                codeVerifier,
                state,
                next,
                pending: currentPending,
            };

            await saveSession(req);
        });

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

            const callbackState =
                typeof req.query.state === 'string'
                    ? req.query.state
                    : undefined;

            let matchedCheck: OidcPendingCheck | undefined;

            await withOidcSessionLock(req.sessionID, async () => {
                await reloadSession(req);

                const oidcSession = req.session?.oidc;
                if (!oidcSession) {
                    throw new Error('OIDC session state not found');
                }

                const pending = prunePendingChecks(oidcSession.pending);

                if (callbackState && pending[callbackState]) {
                    matchedCheck = pending[callbackState];
                    delete pending[callbackState];
                } else if (
                    oidcSession.state &&
                    oidcSession.codeVerifier &&
                    (!callbackState || oidcSession.state === callbackState)
                ) {
                    matchedCheck = {
                        codeVerifier: oidcSession.codeVerifier,
                        state: oidcSession.state,
                        next: oidcSession.next,
                        createdAt: Date.now(),
                    };
                } else if (
                    !callbackState &&
                    req.query.state === '' &&
                    oidcSession.codeVerifier
                ) {
                    matchedCheck = {
                        codeVerifier: oidcSession.codeVerifier,
                        state: '',
                        next: oidcSession.next,
                        createdAt: Date.now(),
                    };
                }

                if (!matchedCheck) {
                    this.log.warn(
                        `OIDC callback state [${callbackState || 'none'}] does not match any pending session checks (pending: ${Object.keys(pending).length})`,
                    );
                    throw new Error('OIDC session state mismatch or expired');
                }

                if (req.session && req.session.oidc) {
                    req.session.oidc.pending = pending;
                    if (req.session.oidc.state === matchedCheck.state) {
                        delete req.session.oidc.state;
                        delete req.session.oidc.codeVerifier;
                        delete req.session.oidc.next;
                    }
                }

                await saveSession(req);
            });

            if (!matchedCheck) {
                throw new Error('OIDC session state not found');
            }

            const nextUrl = matchedCheck.next;
            const currentUrl = new URL(
                `${getPublicUrl(req)}${req.originalUrl}`,
            );

            // Authentik sends an empty state back instead of not sending it at all when PKCE is not supported, so in that case we skip the state check
            const check: client.AuthorizationCodeGrantChecks = {
                pkceCodeVerifier: matchedCheck.codeVerifier,
                expectedState: matchedCheck.state
                    ? matchedCheck.state
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
                    const publicUrl = getPublicUrl(req).replace(/\/$/, '');
                    res.redirect(
                        `${publicUrl}/#/login?error=${encodeURIComponent(err.message)}`,
                    );
                } else {
                    const publicUrl = getPublicUrl(req).replace(/\/$/, '');
                    const destination = nextUrl
                        ? `${publicUrl}${nextUrl}`
                        : getPublicUrl(req);
                    this.log.debug(
                        `User authenticated => redirect to app [${destination}]`,
                    );
                    res.redirect(destination);
                }
            });
        } catch (err: any) {
            this.log.warn(`Error when logging the user [${err.message}]`);
            const publicUrl = getPublicUrl(req).replace(/\/$/, '');
            res.redirect(
                `${publicUrl}/#/login?error=${encodeURIComponent(err.message)}`,
            );
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
            claim?.sub ?? client.skipSubjectCheck,
        );

        // check the usernameclaim, if it doesn't exist, try to use the email and log a warning
        let username = userInfo[this.configuration.usernameclaim]?.toString();
        if (!username) {
            this.log.warn(
                `The claim [${this.configuration.usernameclaim}] does not exist in the user info, using email instead`,
            );
            username = userInfo.email?.toString();
        }

        const validUsername = username || 'unknown';

        // Extract groups claim
        const groupsClaimKey = this.configuration.groupsclaim || 'groups';
        const rawGroups =
            userInfo[groupsClaimKey] || (claim as any)?.[groupsClaimKey];
        let userGroups: string[] = [];
        if (Array.isArray(rawGroups)) {
            userGroups = rawGroups.map(String);
        } else if (typeof rawGroups === 'string') {
            userGroups = rawGroups.split(',').map((g) => g.trim());
        }

        // Determine role from groups if configured
        let determinedRole: UserRole | 'none' = this.configuration.defaultrole;
        const hasGroupConfig = Boolean(
            this.configuration.admingroup ||
                this.configuration.rwgroup ||
                this.configuration.rogroup,
        );

        if (hasGroupConfig) {
            this.log.debug(
                `Extracted user groups for '${validUsername}' via claim '${groupsClaimKey}': [${userGroups.join(', ')}]`,
            );
        }

        if (
            this.configuration.admingroup &&
            userGroups.includes(this.configuration.admingroup)
        ) {
            determinedRole = 'admin';
        } else if (
            this.configuration.rwgroup &&
            userGroups.includes(this.configuration.rwgroup)
        ) {
            determinedRole = 'rw';
        } else if (
            this.configuration.rogroup &&
            userGroups.includes(this.configuration.rogroup)
        ) {
            determinedRole = 'ro';
        }

        if (determinedRole === 'none') {
            this.log.warn(
                `Access denied for user '${validUsername}': does not belong to any authorized group.`,
            );
            throw new Error(
                'Access denied: user does not belong to any authorized group',
            );
        }

        const role: UserRole = determinedRole;

        // Check if user exists in database
        const existingUser = await getUserByUsername(validUsername);
        if (existingUser) {
            if (hasGroupConfig) {
                // If group claims are configured on OIDC, sync role from IDP
                if (existingUser.role !== role) {
                    this.log.info(
                        `Syncing OIDC user role for '${validUsername}' from '${existingUser.role}' to '${role}'`,
                    );
                    await updateUser(existingUser.id, { role });
                    existingUser.role = role;
                }
            }
            return {
                id: existingUser.id,
                username: existingUser.username,
                role: existingUser.role,
                provider: existingUser.provider,
                preferences: existingUser.preferences,
            };
        }

        // User onboarding: create new OIDC user in database
        this.log.info(
            `Onboarding new OIDC user '${validUsername}' with role '${role}'`,
        );
        const newUser = await createUser({
            username: validUsername,
            role,
            provider: 'oidc',
        });

        return {
            id: newUser.id,
            username: newUser.username,
            role: newUser.role,
            provider: newUser.provider,
            preferences: newUser.preferences,
        };
    }
}

export default Oidc;
