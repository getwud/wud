import session from 'express-session';
import type { Collection } from 'lokijs';
import type Loki from 'lokijs';

interface StoredSession {
    sid: string;
    content: session.SessionData;
    updatedAt: Date | string;
}

class LokiSessionStore extends session.Store {
    private collection: Collection<StoredSession>;

    private readonly ttlMs: number | null;

    constructor(db: Loki, ttlSeconds = 604800) {
        super();
        this.ttlMs = ttlSeconds > 0 ? ttlSeconds * 1000 : null;
        const existingCollection = db.getCollection<StoredSession>('Sessions');
        this.collection =
            existingCollection ||
            db.addCollection<StoredSession>('Sessions', {
                indices: ['sid'],
            });
    }

    private isExpired(storedSession: StoredSession) {
        const cookieExpires = storedSession.content?.cookie?.expires;
        if (cookieExpires) {
            return new Date(cookieExpires).getTime() <= Date.now();
        }
        if (this.ttlMs == null) {
            return false;
        }
        return (
            new Date(storedSession.updatedAt).getTime() + this.ttlMs <=
            Date.now()
        );
    }

    private deleteIfExpired(storedSession: StoredSession | null) {
        if (storedSession && this.isExpired(storedSession)) {
            this.collection.remove(storedSession);
            return true;
        }
        return false;
    }

    private cleanupExpiredSessions() {
        this.collection
            .find()
            .filter((storedSession) => this.isExpired(storedSession))
            .forEach((storedSession) => this.collection.remove(storedSession));
    }

    get(
        sid: string,
        callback: (
            err?: unknown,
            sessionData?: session.SessionData | null,
        ) => void,
    ) {
        const storedSession = this.collection.findOne({ sid });
        if (this.deleteIfExpired(storedSession)) {
            callback(null, null);
            return;
        }
        callback(null, storedSession?.content || null);
    }

    set(
        sid: string,
        sessionData: session.SessionData,
        callback?: (err?: unknown) => void,
    ) {
        this.cleanupExpiredSessions();
        const storedSession = this.collection.findOne({ sid });
        if (storedSession) {
            storedSession.content = sessionData;
            storedSession.updatedAt = new Date();
            this.collection.update(storedSession);
        } else {
            this.collection.insert({
                sid,
                content: sessionData,
                updatedAt: new Date(),
            });
        }
        callback?.(null);
    }

    destroy(sid: string, callback?: (err?: unknown) => void) {
        this.collection.findAndRemove({ sid });
        callback?.(null);
    }

    clear(callback?: (err?: unknown) => void) {
        this.collection.clear();
        callback?.(null);
    }

    length(callback: (err: unknown, length?: number) => void) {
        callback(null, this.collection.count());
    }

    touch(
        sid: string,
        sessionData: session.SessionData,
        callback?: () => void,
    ) {
        const storedSession = this.collection.findOne({ sid });
        if (this.deleteIfExpired(storedSession)) {
            callback?.();
            return;
        }
        if (storedSession) {
            storedSession.content = sessionData;
            storedSession.updatedAt = new Date();
            this.collection.update(storedSession);
        }
        callback?.();
    }
}

export default LokiSessionStore;
