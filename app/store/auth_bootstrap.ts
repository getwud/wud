import {
    getAuthenticationConfigurations,
    wudEnvVars,
    get,
} from '../configuration';
import {
    countAdminUsers,
    getUserByUsername,
    createUser,
    updateUser,
} from './user';
import logger from '../log';

const log = logger.child({ component: 'auth-bootstrap' });

/**
 * Bootstrap authentication state on startup.
 * Seeds initial admin user if env variables are provided,
 * or verifies that an admin exists or can be provisioned via OIDC.
 */
export async function bootstrapAuth(): Promise<void> {
    const authConfigs = (getAuthenticationConfigurations() || {}) as Record<
        string,
        any
    >;

    // 1. Check for dedicated Admin env vars
    const adminConfig = get('wud.auth.admin', wudEnvVars) as any;
    if (adminConfig?.user && (adminConfig?.password || adminConfig?.hash)) {
        const existing = await getUserByUsername(adminConfig.user);
        if (!existing) {
            log.info(
                `Bootstrapping administrator user '${adminConfig.user}' from environment`,
            );
            await createUser({
                username: adminConfig.user,
                password: adminConfig.password,
                passwordHash: adminConfig.hash,
                role: 'admin',
                provider: 'local',
            });
        } else {
            log.info(
                `Ensuring administrator role and updating credentials for '${adminConfig.user}'`,
            );
            await updateUser(existing.id, {
                role: 'admin',
                password: adminConfig.password,
                passwordHash: adminConfig.hash,
            });
        }
    }

    // 2. Check for legacy basic authentication configs (single or multi-user: WUD_AUTH_BASIC_{name}_USER / HASH)
    if (authConfigs.basic && typeof authConfigs.basic === 'object') {
        const entries: Array<{ user: string; password?: string; hash?: string }> =
            [];
        if (authConfigs.basic.user) {
            entries.push({
                user: authConfigs.basic.user,
                password: authConfigs.basic.password,
                hash: authConfigs.basic.hash,
            });
        }
        for (const [key, val] of Object.entries(authConfigs.basic)) {
            if (val && typeof val === 'object' && (val as any).user) {
                entries.push({
                    user: (val as any).user,
                    password: (val as any).password,
                    hash: (val as any).hash,
                });
            }
        }
        for (const entry of entries) {
            if (entry.user && (entry.password || entry.hash)) {
                const existing = await getUserByUsername(entry.user);
                if (!existing) {
                    log.info(
                        `Bootstrapping administrator user '${entry.user}' from basic auth configuration`,
                    );
                    await createUser({
                        username: entry.user,
                        password: entry.password,
                        passwordHash: entry.hash,
                        role: 'admin',
                        provider: 'local',
                    });
                } else {
                    log.info(
                        `Ensuring administrator role and updating credentials for '${entry.user}'`,
                    );
                    await updateUser(existing.id, {
                        role: 'admin',
                        password: entry.password,
                        passwordHash: entry.hash,
                    });
                }
            }
        }
    }

    // 3. Check if at least one admin exists in database
    const adminCount = await countAdminUsers();
    if (adminCount > 0) {
        log.info(
            `Authentication initialized. Found ${adminCount} administrator account(s).`,
        );
        return;
    }

    // 4. Check if OIDC is configured with an admin group
    const oidcConfig = authConfigs.oidc;
    const envVars = wudEnvVars as Record<string, any>;
    if (oidcConfig && typeof oidcConfig === 'object') {
        const hasOidcWithAdmin =
            (oidcConfig.discovery &&
                (oidcConfig.admingroup || envVars.WUD_AUTH_OIDC_ADMIN_GROUP)) ||
            Object.values(oidcConfig).some(
                (c: any) =>
                    c &&
                    typeof c === 'object' &&
                    c.discovery &&
                    (c.admingroup || envVars.WUD_AUTH_OIDC_ADMIN_GROUP),
            );
        if (hasOidcWithAdmin) {
            log.info(
                'No local administrator found in database, but OIDC is configured with an admin group. Admin access will be granted via OIDC claims.',
            );
            return;
        }
    }

    // 5. Fail-fast
    log.error(
        'Authentication is mandatory. No administrator user exists in the database, and no administrator is configured via environment variables (WUD_AUTH_ADMIN_USER / WUD_AUTH_ADMIN_PASSWORD) or OIDC admin group (WUD_AUTH_OIDC_ADMIN_GROUP). Please configure an administrator to start WUD.',
    );
    throw new Error(
        'Authentication is mandatory: No administrator user found. Please set WUD_AUTH_ADMIN_USER and WUD_AUTH_ADMIN_PASSWORD, or configure WUD_AUTH_OIDC_ADMIN_GROUP.',
    );
}
