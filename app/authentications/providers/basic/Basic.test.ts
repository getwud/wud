// @ts-nocheck
import Basic from './Basic';
import * as userStore from '../../../store/user';

jest.mock('../../../store/user', () => ({
    getUserByUsername: jest.fn(),
    verifyPassword: jest.fn(),
}));

describe('Basic Authentication', () => {
    let basic;

    beforeEach(async () => {
        jest.clearAllMocks();
        basic = new Basic();
    });

    test('should create instance', async () => {
        expect(basic).toBeDefined();
        expect(basic).toBeInstanceOf(Basic);
    });

    test('should return basic strategy', async () => {
        basic.configuration = {
            user: 'testuser',
            hash: '$2b$10$test.hash.value',
        };

        const strategy = basic.getStrategy();
        expect(strategy).toBeDefined();
        expect(strategy.name).toBe('basic');
    });

    test('should return strategy description', async () => {
        const description = basic.getStrategyDescription();
        expect(description).toEqual({
            type: 'basic',
            name: 'Login',
        });
    });

    test('should mask configuration hash if present', async () => {
        basic.configuration = {
            user: 'testuser',
            hash: '$2b$10$test.hash.value',
        };
        const masked = basic.maskConfiguration();
        expect(masked.user).toBe('testuser');
        expect(masked.hash).toBe('$********************e');
    });

    test('should authenticate valid user against database', async () => {
        (userStore.getUserByUsername as jest.Mock).mockResolvedValue({
            id: 'u1',
            username: 'testuser',
            role: 'admin',
            provider: 'local',
            passwordHash: '$2b$10$hashed',
            preferences: { theme: 'dark' },
        });
        (userStore.verifyPassword as jest.Mock).mockResolvedValue(true);

        await new Promise<void>((resolve) => {
            basic.authenticate('testuser', 'password', (err, result) => {
                expect(result).toEqual({
                    id: 'u1',
                    username: 'testuser',
                    role: 'admin',
                    provider: 'local',
                    preferences: { theme: 'dark' },
                });
                resolve();
            });
        });
    });

    test('should reject invalid user not found in database', async () => {
        (userStore.getUserByUsername as jest.Mock).mockResolvedValue(null);

        await new Promise<void>((resolve) => {
            basic.authenticate('wronguser', 'password', (err, result) => {
                expect(result).toBe(false);
                resolve();
            });
        });
    });

    test('should reject invalid password', async () => {
        (userStore.getUserByUsername as jest.Mock).mockResolvedValue({
            id: 'u1',
            username: 'testuser',
            role: 'ro',
            provider: 'local',
            passwordHash: '$2b$10$hashed',
        });
        (userStore.verifyPassword as jest.Mock).mockResolvedValue(false);

        await new Promise<void>((resolve) => {
            basic.authenticate('testuser', 'wrongpassword', (err, result) => {
                expect(result).toBe(false);
                resolve();
            });
        });
    });
});
