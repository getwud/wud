import { initDatabase, closeDatabase } from './db';
import { createUser } from './user';
import {
    createToken,
    verifyToken,
    listTokensForUser,
    deleteToken,
    hashToken,
} from './token';

describe('Token Store', () => {
    let testUserId: string;

    beforeAll(async () => {
        initDatabase(':memory:');
        const user = await createUser({
            username: 'tokenuser',
            password: 'password123',
            role: 'admin',
        });
        testUserId = user.id;
    });

    afterAll(() => {
        closeDatabase();
    });

    test('should generate a token with raw secret starting with wud_', async () => {
        const { token, rawSecret } = await createToken({
            userId: testUserId,
            name: 'ci-token',
            scopes: ['read', 'write'],
        });

        expect(token).toBeDefined();
        expect(token.id).toBeDefined();
        expect(token.name).toBe('ci-token');
        expect(token.scopes).toEqual(['read', 'write']);
        expect(rawSecret.startsWith('wud_')).toBe(true);

        const hashed = hashToken(rawSecret);
        expect(hashed).toBeDefined();
    });

    test('should verify a valid token and return user', async () => {
        const { rawSecret } = await createToken({
            userId: testUserId,
            name: 'verification-token',
            scopes: ['read'],
        });

        const verified = await verifyToken(rawSecret);
        expect(verified).not.toBeNull();
        expect(verified?.user.username).toBe('tokenuser');
        expect(verified?.token.name).toBe('verification-token');
        expect(verified?.token.scopes).toEqual(['read']);
        expect(verified?.token.lastUsedAt).toBeDefined();
    });

    test('should reject invalid or non-existent token', async () => {
        expect(await verifyToken('wud_nonexistent1234567890')).toBeNull();
        expect(await verifyToken('invalid_prefix')).toBeNull();
        expect(await verifyToken('')).toBeNull();
    });

    test('should reject expired tokens', async () => {
        const pastDate = new Date(Date.now() - 60000); // 1 minute in the past
        const { rawSecret } = await createToken({
            userId: testUserId,
            name: 'expired-token',
            scopes: ['read'],
            expiresAt: pastDate,
        });

        const verified = await verifyToken(rawSecret);
        expect(verified).toBeNull();
    });

    test('should list tokens for a user', async () => {
        const tokens = await listTokensForUser(testUserId);
        expect(tokens.length).toBeGreaterThanOrEqual(2);
        expect(tokens[0].userId).toBe(testUserId);
    });

    test('should delete/revoke a token', async () => {
        const { token, rawSecret } = await createToken({
            userId: testUserId,
            name: 'to-revoke',
            scopes: ['read'],
        });

        expect(await verifyToken(rawSecret)).not.toBeNull();
        await deleteToken(token.id, testUserId);
        expect(await verifyToken(rawSecret)).toBeNull();
    });
});
