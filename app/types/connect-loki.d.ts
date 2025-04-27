declare module "connect-loki" {
    import { Store, SessionData } from "express-session";

    export interface ConnectLokiOptions {
        /**
         * When autosave is enabled the database file will be written automatically, disabling this saves a write per session change.
         * Defaults to true.
         */
        autosave?: boolean;
        /**
         * The file path to save the Loki database. Defaults to './session-store.db'
         */
        path?: string;
        /**
         * The session time-to-live in seconds. Defaults to 1209600. A value of 0 implies no TTL.
         */
        ttl?: number;
        /**
         * An optional error logging function or a boolean.
         */
        logErrors?: ((err: any) => void) | boolean;
    }

    export interface LokiStore extends Store {
        /**
         * Fetch the session by its sid.
         * @param sid - Session ID.
         * @param callback - Callback with error or session data.
         */
        get(sid: string, callback: (err: any, session?: SessionData | null) => void): void;

        /**
         * Commit the given session object to the store.
         * @param sid - Session ID.
         * @param session - Session data.
         * @param callback - Optional callback on completion.
         */
        set(sid: string, session: SessionData, callback?: (err?: any) => void): void;

        /**
         * Destroy the session identified by sid.
         * @param sid - Session ID.
         * @param callback - Optional callback on completion.
         */
        destroy(sid: string, callback?: (err?: any) => void): void;

        /**
         * Clear all sessions from the store.
         * @param callback - Optional callback on completion.
         */
        clear(callback?: (err?: any) => void): void;

        /**
         * Get the count of all sessions in the store.
         * @param callback - Callback with error or count.
         */
        length(callback: (err: any, length: number) => void): void;

        /**
         * Refresh the time-to-live for the session identified by sid.
         * @param sid - Session ID.
         * @param session - Session data.
         * @param callback - Optional callback on completion.
         */
        touch(sid: string, session: SessionData, callback?: () => void): void;
    }

    /**
     * The exported factory function expects an instance of session (from express-session),
     * and returns a LokiStore constructor that extends session.Store.
     *
     * Usage:
     *    import session from "express-session";
     *    import connectLoki from "connect-loki";
     *    const LokiStore = connectLoki(session);
     *    const store = new LokiStore(options);
     */
    function connectLoki(session: any): {
        new(options?: ConnectLokiOptions): LokiStore;
    };

    export = connectLoki;
}