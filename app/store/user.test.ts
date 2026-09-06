import { initDatabase, closeDatabase } from './db';
import {
    createUser,
    getUserById,
    getUserByUsername,
    listUsers,
    updateUser,
    deleteUser,
    countUsers,
    countAdminUsers,
    hashPassword,
    verifyPassword,
} from './user';

describe('User Store', () => {
    beforeAll(() => {
        initDatabase(':memory:');
    });

    afterAll(() => {
        closeDatabase();
    });

    test('should hash and verify passwords with bcrypt', async () => {
        const hash = await hashPassword('mySecretPassword');
        expect(hash).toMatch(/^\$2[aby]\$/);
        const isValid = await verifyPassword('mySecretPassword', hash);
        expect(isValid).toBe(true);

        const isInvalid = await verifyPassword('wrongPassword', hash);
        expect(isInvalid).toBe(false);
    });

    test('should verify empty or invalid password safely', async () => {
        expect(await verifyPassword('', '')).toBe(false);
        expect(await verifyPassword('pass', '')).toBe(false);
    });

    test('should create and retrieve a user by username and id', async () => {
        const user = await createUser({
            username: 'alice',
            password: 'alicepassword',
            role: 'admin',
            provider: 'local',
            preferences: { theme: 'dark' },
        });

        expect(user).toBeDefined();
        expect(user.id).toBeDefined();
        expect(user.username).toBe('alice');
        expect(user.role).toBe('admin');
        expect(user.provider).toBe('local');
        expect(user.preferences).toEqual({ theme: 'dark' });

        const retrievedById = await getUserById(user.id);
        expect(retrievedById).toBeDefined();
        expect(retrievedById?.username).toBe('alice');

        const retrievedByName = await getUserByUsername('alice');
        expect(retrievedByName).toBeDefined();
        expect(retrievedByName?.id).toBe(user.id);
    });

    test('should return undefined when user is not found', async () => {
        expect(await getUserById('non-existent')).toBeUndefined();
        expect(await getUserByUsername('non-existent')).toBeUndefined();
    });

    test('should list all users without exposing password hashes', async () => {
        await createUser({
            username: 'bob',
            password: 'bobpassword',
            role: 'rw',
        });

        const users = await listUsers();
        expect(users.length).toBeGreaterThanOrEqual(2);
        const alice = users.find((u) => u.username === 'alice');
        expect(alice).toBeDefined();
        expect((alice as any).passwordHash).toBeUndefined();
    });

    test('should update a user', async () => {
        const user = await getUserByUsername('bob');
        expect(user).toBeDefined();

        const updated = await updateUser(user!.id, {
            role: 'admin',
            preferences: { theme: 'light' },
            password: 'newPassword123',
        });

        expect(updated.role).toBe('admin');
        expect(updated.preferences).toEqual({ theme: 'light' });

        const verified = await verifyPassword(
            'newPassword123',
            updated.passwordHash!,
        );
        expect(verified).toBe(true);
    });

    test('should count users and admin users', async () => {
        const total = await countUsers();
        const admins = await countAdminUsers();
        expect(total).toBeGreaterThanOrEqual(2);
        expect(admins).toBeGreaterThanOrEqual(2);
    });

    test('should delete a user', async () => {
        const user = await createUser({
            username: 'charlie',
            password: 'charliepassword',
            role: 'ro',
        });

        expect(await getUserByUsername('charlie')).toBeDefined();
        await deleteUser(user.id);
        expect(await getUserByUsername('charlie')).toBeUndefined();
    });
});
