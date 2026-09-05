import session from 'express-session';
import { eq, sql } from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../store/db/schema';
import { getDb } from '../store/db';

class SqliteSessionStore extends session.Store {
    private readonly ttlMs: number | null;

    constructor(ttlSeconds = 604800) {
        super();
        this.ttlMs = ttlSeconds > 0 ? ttlSeconds * 1000 : null;
    }

    private getDb(): BetterSQLite3Database<typeof schema> {
        return getDb();
    }

    private isExpired(row: typeof schema.sessions.$inferSelect) {
        if (row.expiresAt) {
            return new Date(row.expiresAt).getTime() <= Date.now();
        }
        if (this.ttlMs == null) {
            return false;
        }
        return new Date(row.updatedAt).getTime() + this.ttlMs <= Date.now();
    }

    private cleanupExpiredSessions() {
        try {
            const db = this.getDb();
            const now = Math.floor(Date.now() / 1000);
            db.delete(schema.sessions)
                .where(sql`expires_at IS NOT NULL AND expires_at <= ${now}`)
                .run();
        } catch {
            // Ignore cleanup errors
        }
    }

    get(
        sid: string,
        callback: (
            err?: unknown,
            sessionData?: session.SessionData | null,
        ) => void,
    ) {
        try {
            const db = this.getDb();
            const row = db
                .select()
                .from(schema.sessions)
                .where(eq(schema.sessions.sid, sid))
                .get();

            if (!row) {
                return callback(null, null);
            }
            if (this.isExpired(row)) {
                this.destroy(sid);
                return callback(null, null);
            }
            callback(null, row.content as session.SessionData);
        } catch (e) {
            callback(e);
        }
    }

    set(
        sid: string,
        sessionData: session.SessionData,
        callback?: (err?: unknown) => void,
    ) {
        try {
            this.cleanupExpiredSessions();
            const db = this.getDb();
            const updatedAt = new Date();
            const expiresAt = sessionData?.cookie?.expires
                ? new Date(sessionData.cookie.expires)
                : undefined;

            db.insert(schema.sessions)
                .values({
                    sid,
                    content: sessionData,
                    updatedAt,
                    expiresAt,
                })
                .onConflictDoUpdate({
                    target: schema.sessions.sid,
                    set: {
                        content: sessionData,
                        updatedAt,
                        expiresAt,
                    },
                })
                .run();
            callback?.(null);
        } catch (e) {
            callback?.(e);
        }
    }

    destroy(sid: string, callback?: (err?: unknown) => void) {
        try {
            const db = this.getDb();
            db.delete(schema.sessions)
                .where(eq(schema.sessions.sid, sid))
                .run();
            callback?.(null);
        } catch (e) {
            callback?.(e);
        }
    }

    clear(callback?: (err?: unknown) => void) {
        try {
            const db = this.getDb();
            db.delete(schema.sessions).run();
            callback?.(null);
        } catch (e) {
            callback?.(e);
        }
    }

    length(callback: (err: unknown, length?: number) => void) {
        try {
            const db = this.getDb();
            const result = db
                .select({ count: sql<number>`count(*)` })
                .from(schema.sessions)
                .get();
            callback(null, result?.count ?? 0);
        } catch (e) {
            callback(e);
        }
    }

    touch(
        sid: string,
        sessionData: session.SessionData,
        callback?: () => void,
    ) {
        try {
            const db = this.getDb();
            const row = db
                .select()
                .from(schema.sessions)
                .where(eq(schema.sessions.sid, sid))
                .get();

            if (row && !this.isExpired(row)) {
                const expiresAt = sessionData?.cookie?.expires
                    ? new Date(sessionData.cookie.expires)
                    : undefined;
                db.update(schema.sessions)
                    .set({
                        content: sessionData,
                        updatedAt: new Date(),
                        expiresAt,
                    })
                    .where(eq(schema.sessions.sid, sid))
                    .run();
            }
            callback?.();
        } catch {
            callback?.();
        }
    }
}

export default SqliteSessionStore;
