import crypto from 'crypto';
import { eq, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './db';
import { apiTokens } from './db/schema';
import { getUserById, User } from './user';
import logger from '../log';

const log = logger.child({ component: 'store-token' });

export type ApiTokenScope = 'read' | 'write';

export interface ApiToken {
    id: string;
    userId: string;
    name: string;
    scopes: ApiTokenScope[];
    expiresAt?: Date | null;
    createdAt?: string | null;
    lastUsedAt?: string | null;
}

/**
 * Hash raw token with SHA-256.
 */
export function hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Create a new API Token.
 * Returns the created token metadata and the rawSecret (visible only once).
 */
export async function createToken(data: {
    userId: string;
    name: string;
    scopes: ApiTokenScope[];
    expiresAt?: Date | null;
}): Promise<{ token: ApiToken; rawSecret: string }> {
    const db = getDb();
    const id = uuidv4();
    const rawSecret = `wud_${crypto.randomBytes(24).toString('hex')}`;
    const tokenHash = hashToken(rawSecret);

    const newRecord = {
        id,
        tokenHash,
        userId: data.userId,
        name: data.name,
        scopes: data.scopes,
        expiresAt: data.expiresAt || null,
    };

    db.insert(apiTokens).values(newRecord).run();
    log.info(`Created API token '${data.name}' for user ${data.userId}`);

    return {
        token: {
            id,
            userId: data.userId,
            name: data.name,
            scopes: data.scopes,
            expiresAt: data.expiresAt,
            createdAt: new Date().toISOString(),
            lastUsedAt: null,
        },
        rawSecret,
    };
}

/**
 * Verify a raw token and return the associated token info & user.
 */
export async function verifyToken(
    rawToken: string,
): Promise<{ token: ApiToken; user: User } | null> {
    if (!rawToken || !rawToken.startsWith('wud_')) {
        return null;
    }

    const tokenHash = hashToken(rawToken);
    const db = getDb();

    const record = db
        .select()
        .from(apiTokens)
        .where(eq(apiTokens.tokenHash, tokenHash))
        .get();

    if (!record) {
        return null;
    }

    // Check expiration if set
    if (record.expiresAt && record.expiresAt.getTime() < Date.now()) {
        log.warn(`API token ${record.id} is expired`);
        return null;
    }

    // Update lastUsedAt
    const nowIso = new Date().toISOString();
    db.update(apiTokens)
        .set({ lastUsedAt: nowIso })
        .where(eq(apiTokens.id, record.id))
        .run();

    const user = await getUserById(record.userId);
    if (!user) {
        log.warn(
            `API token ${record.id} refers to non-existent user ${record.userId}`,
        );
        return null;
    }

    return {
        token: {
            id: record.id,
            userId: record.userId,
            name: record.name,
            scopes: record.scopes as ApiTokenScope[],
            expiresAt: record.expiresAt,
            createdAt: record.createdAt,
            lastUsedAt: nowIso,
        },
        user,
    };
}

/**
 * List all tokens for a given user.
 */
export async function listTokensForUser(userId: string): Promise<ApiToken[]> {
    const db = getDb();
    const results = db
        .select()
        .from(apiTokens)
        .where(eq(apiTokens.userId, userId))
        .all();

    return results.map((r) => ({
        id: r.id,
        userId: r.userId,
        name: r.name,
        scopes: r.scopes as ApiTokenScope[],
        expiresAt: r.expiresAt,
        createdAt: r.createdAt,
        lastUsedAt: r.lastUsedAt,
    }));
}

/**
 * Delete / revoke a token by id.
 */
export async function deleteToken(id: string, userId?: string): Promise<void> {
    const db = getDb();
    if (userId) {
        db.delete(apiTokens)
            .where(and(eq(apiTokens.id, id), eq(apiTokens.userId, userId)))
            .run();
    } else {
        db.delete(apiTokens).where(eq(apiTokens.id, id)).run();
    }
    log.info(`Revoked API token ${id}`);
}
