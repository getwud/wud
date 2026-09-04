import Loki from 'lokijs';
import session from 'express-session';
import LokiSessionStore from './LokiSessionStore';

describe('LokiSessionStore', () => {
    test('should reuse the existing sessions collection on the provided db', () => {
        const db = new Loki('test.db');
        const existingCollection = db.addCollection('Sessions', {
            indices: ['sid'],
        });

        const store = new LokiSessionStore(db);

        expect(store).toBeDefined();
        expect(db.getCollection('Sessions')).toBe(existingCollection);
    });

    test('should persist and retrieve sessions from the shared db instance', (done) => {
        const db = new Loki('test.db');
        const store = new LokiSessionStore(db);
        const sessionData = {
            cookie: {} as session.Cookie,
            oidc: {
                codeVerifier: 'code-verifier',
                state: 'state',
            },
            passport: {
                user: '{"username":"tester"}',
            },
        } as unknown as session.SessionData;

        store.set('sid-1', sessionData, (setError) => {
            expect(setError).toBeNull();

            const sessionsCollection = db.getCollection('Sessions');
            expect(sessionsCollection.findOne({ sid: 'sid-1' })).toBeDefined();

            store.get('sid-1', (getError, storedSession) => {
                expect(getError).toBeNull();
                expect(storedSession).toEqual(sessionData);
                done();
            });
        });
    });

    test('should reject and remove expired sessions based on cookie expiry', (done) => {
        const db = new Loki('test.db');
        const store = new LokiSessionStore(db);
        const sessionData = {
            cookie: {
                expires: new Date(Date.now() - 60_000),
            } as session.Cookie,
            oidc: {
                codeVerifier: 'code-verifier',
                state: 'state',
            },
            passport: {
                user: '{"username":"tester"}',
            },
        } as unknown as session.SessionData;

        store.set('expired-cookie', sessionData, () => {
            store.get('expired-cookie', (_getError, storedSession) => {
                expect(storedSession).toBeNull();
                expect(
                    db.getCollection('Sessions').findOne({
                        sid: 'expired-cookie',
                    }),
                ).toBeNull();
                done();
            });
        });
    });

    test('should reject and remove expired sessions based on ttl fallback', (done) => {
        const db = new Loki('test.db');
        const store = new LokiSessionStore(db, 1);
        const sessionData = {
            cookie: {} as session.Cookie,
            oidc: {
                codeVerifier: 'code-verifier',
                state: 'state',
            },
            passport: {
                user: '{"username":"tester"}',
            },
        } as unknown as session.SessionData;

        store.set('expired-ttl', sessionData, () => {
            const storedSession = db
                .getCollection('Sessions')
                .findOne({ sid: 'expired-ttl' });
            storedSession.updatedAt = new Date(Date.now() - 5_000);
            db.getCollection('Sessions').update(storedSession);

            store.get('expired-ttl', (_getError, refreshedSession) => {
                expect(refreshedSession).toBeNull();
                expect(
                    db
                        .getCollection('Sessions')
                        .findOne({ sid: 'expired-ttl' }),
                ).toBeNull();
                done();
            });
        });
    });

    test('should persist refreshed cookie data on touch', (done) => {
        const db = new Loki('test.db');
        const store = new LokiSessionStore(db);
        const originalSessionData = {
            cookie: {
                expires: new Date(Date.now() + 30_000),
            } as session.Cookie,
        } as unknown as session.SessionData;
        const refreshedSessionData = {
            cookie: {
                expires: new Date(Date.now() + 60_000),
            } as session.Cookie,
        } as unknown as session.SessionData;

        store.set('sid-touch', originalSessionData, () => {
            store.touch('sid-touch', refreshedSessionData, () => {
                store.get('sid-touch', (_getError, storedSession) => {
                    expect(storedSession).toEqual(refreshedSessionData);
                    done();
                });
            });
        });
    });

    test('should evaluate ttl fallback when updatedAt is reloaded as a string', (done) => {
        const db = new Loki('test.db');
        const store = new LokiSessionStore(db, 1);
        const sessionData = {
            cookie: {} as session.Cookie,
        } as unknown as session.SessionData;

        store.set('sid-string-date', sessionData, () => {
            const storedSession = db
                .getCollection('Sessions')
                .findOne({ sid: 'sid-string-date' });
            storedSession.updatedAt = new Date(
                Date.now() - 5_000,
            ).toISOString();
            db.getCollection('Sessions').update(storedSession);

            store.get('sid-string-date', (_getError, refreshedSession) => {
                expect(refreshedSession).toBeNull();
                done();
            });
        });
    });
});
