import session from 'express-session';
import SqliteSessionStore from './SqliteSessionStore';
import { initDatabase, closeDatabase } from '../store/db';

describe('SqliteSessionStore', () => {
    beforeEach(() => {
        closeDatabase();
        initDatabase(':memory:');
    });

    afterAll(() => {
        closeDatabase();
    });

    test('should persist and retrieve sessions', (done) => {
        const store = new SqliteSessionStore();
        const sessionData = {
            cookie: {} as session.Cookie,
            passport: {
                user: '{"username":"tester"}',
            },
        } as unknown as session.SessionData;

        store.set('sid-1', sessionData, (setError) => {
            expect(setError).toBeNull();

            store.get('sid-1', (getError, storedSession) => {
                expect(getError).toBeNull();
                expect(storedSession).toEqual(sessionData);
                done();
            });
        });
    });

    test('should reject and remove expired sessions based on cookie expiry', (done) => {
        const store = new SqliteSessionStore();
        const sessionData = {
            cookie: {
                expires: new Date(Date.now() - 60_000),
            } as session.Cookie,
            passport: {
                user: '{"username":"tester"}',
            },
        } as unknown as session.SessionData;

        store.set('expired-cookie', sessionData, () => {
            store.get('expired-cookie', (_getError, storedSession) => {
                expect(storedSession).toBeNull();
                done();
            });
        });
    });

    test('should reject and remove expired sessions based on ttl fallback', (done) => {
        const store = new SqliteSessionStore(0.001); // ~1ms TTL
        const sessionData = {
            cookie: {} as session.Cookie,
            passport: {
                user: '{"username":"tester"}',
            },
        } as unknown as session.SessionData;

        store.set('expired-ttl', sessionData, () => {
            setTimeout(() => {
                store.get('expired-ttl', (_getError, refreshedSession) => {
                    expect(refreshedSession).toBeNull();
                    done();
                });
            }, 50);
        });
    });

    test('should destroy a session', (done) => {
        const store = new SqliteSessionStore();
        const sessionData = {
            cookie: {} as session.Cookie,
        } as unknown as session.SessionData;

        store.set('sid-destroy', sessionData, () => {
            store.destroy('sid-destroy', (destroyErr) => {
                expect(destroyErr).toBeNull();
                store.get('sid-destroy', (_getErr, retrieved) => {
                    expect(retrieved).toBeNull();
                    done();
                });
            });
        });
    });

    test('should clear all sessions and return count', (done) => {
        const store = new SqliteSessionStore();
        const sessionData = {
            cookie: {} as session.Cookie,
        } as unknown as session.SessionData;

        store.set('sid-a', sessionData, () => {
            store.set('sid-b', sessionData, () => {
                store.length((_err, len) => {
                    expect(len).toBe(2);
                    store.clear((clearErr) => {
                        expect(clearErr).toBeNull();
                        store.length((_err2, len2) => {
                            expect(len2).toBe(0);
                            done();
                        });
                    });
                });
            });
        });
    });
});
