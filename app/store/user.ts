import { eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import passJs from 'pass';
import { getDb } from './db';
import { users } from './db/schema';
import logger from '../log';

const log = logger.child({ component: 'store-user' });

export type UserRole = 'admin' | 'rw' | 'ro';
export type UserProvider = 'local' | 'oidc';

export interface UserPreferences {
    theme?: 'light' | 'dark';
    [key: string]: any;
}

export interface User {
    id: string;
    username: string;
    passwordHash?: string | null;
    provider: UserProvider;
    role: UserRole;
    preferences?: UserPreferences | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

/**
 * Hash plain text password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
}

/**
 * Verify password against bcrypt or legacy htpasswd hash.
 */
export async function verifyPassword(
    password: string,
    hash: string,
): Promise<boolean> {
    if (!password || !hash) {
        return false;
    }
    // Check if hash is bcrypt
    if (
        hash.startsWith('$2a$') ||
        hash.startsWith('$2b$') ||
        hash.startsWith('$2y$')
    ) {
        return bcrypt.compare(password, hash);
    }
    // Fallback: Apache htpasswd style via pass library
    return new Promise((resolve) => {
        passJs.validate(password, hash, (err: any, success: boolean) => {
            if (err || !success) {
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}

/**
 * Get user by id.
 */
export async function getUserById(id: string): Promise<User | undefined> {
    const db = getDb();
    const result = db.select().from(users).where(eq(users.id, id)).get();
    if (!result) {
        return undefined;
    }
    return {
        id: result.id,
        username: result.username,
        passwordHash: result.passwordHash,
        provider: result.provider as UserProvider,
        role: result.role as UserRole,
        preferences: result.preferences as UserPreferences,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
    };
}

/**
 * Get user by username.
 */
export async function getUserByUsername(
    username: string,
): Promise<User | undefined> {
    const db = getDb();
    const result = db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .get();
    if (!result) {
        return undefined;
    }
    return {
        id: result.id,
        username: result.username,
        passwordHash: result.passwordHash,
        provider: result.provider as UserProvider,
        role: result.role as UserRole,
        preferences: result.preferences as UserPreferences,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
    };
}

/**
 * List all users (excluding password hash).
 */
export async function listUsers(): Promise<Omit<User, 'passwordHash'>[]> {
    const db = getDb();
    const results = db.select().from(users).all();
    return results.map((u) => ({
        id: u.id,
        username: u.username,
        provider: u.provider as UserProvider,
        role: u.role as UserRole,
        preferences: u.preferences as UserPreferences,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
    }));
}

/**
 * Create a new user.
 */
export async function createUser(data: {
    username: string;
    password?: string;
    passwordHash?: string;
    role?: UserRole;
    provider?: UserProvider;
    preferences?: UserPreferences;
}): Promise<User> {
    const db = getDb();
    const id = uuidv4();
    const role = data.role || 'ro';
    const provider = data.provider || 'local';
    let passwordHash = data.passwordHash || null;

    if (data.password && !passwordHash) {
        passwordHash = await hashPassword(data.password);
    }

    const newUser = {
        id,
        username: data.username,
        passwordHash,
        provider,
        role,
        preferences: data.preferences || { theme: 'light' },
    };

    db.insert(users).values(newUser).run();
    log.info(`Created user ${data.username} (${role}, ${provider})`);
    return (await getUserById(id))!;
}

/**
 * Update an existing user.
 */
export async function updateUser(
    id: string,
    data: {
        role?: UserRole;
        preferences?: UserPreferences;
        password?: string;
        passwordHash?: string;
    },
): Promise<User> {
    const db = getDb();
    const updateValues: Record<string, any> = {
        updatedAt: sql`CURRENT_TIMESTAMP`,
    };

    if (data.role !== undefined) {
        updateValues.role = data.role;
    }
    if (data.preferences !== undefined) {
        updateValues.preferences = data.preferences;
    }
    if (data.password !== undefined) {
        updateValues.passwordHash = await hashPassword(data.password);
    } else if (data.passwordHash !== undefined) {
        updateValues.passwordHash = data.passwordHash;
    }

    db.update(users).set(updateValues).where(eq(users.id, id)).run();
    log.info(`Updated user ${id}`);
    return (await getUserById(id))!;
}

/**
 * Delete a user by id.
 */
export async function deleteUser(id: string): Promise<void> {
    const db = getDb();
    db.delete(users).where(eq(users.id, id)).run();
    log.info(`Deleted user ${id}`);
}

/**
 * Count total number of users.
 */
export async function countUsers(): Promise<number> {
    const db = getDb();
    const count = db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .get();
    return count ? Number(count.count) : 0;
}

/**
 * Count number of admin users.
 */
export async function countAdminUsers(): Promise<number> {
    const db = getDb();
    const count = db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.role, 'admin'))
        .get();
    return count ? Number(count.count) : 0;
}

/**
 * Count number of local users.
 */
export async function countLocalUsers(): Promise<number> {
    const db = getDb();
    const count = db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.provider, 'local'))
        .get();
    return count ? Number(count.count) : 0;
}
