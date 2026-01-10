// @ts-nocheck
import Basic from './Basic';

describe('Basic Authentication', () => {
    let basic;

    beforeEach(async () => {
        basic = new Basic();
    });

    test('should create instance', async () => {
        expect(basic).toBeDefined();
        expect(basic).toBeInstanceOf(Basic);
    });

    test('should return basic strategy', async () => {
        // Mock configuration to avoid validation errors
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

    test('should mask configuration hash', async () => {
        basic.configuration = {
            user: 'testuser',
            hash: '$2b$10$test.hash.value',
        };
        const masked = basic.maskConfiguration();
        expect(masked.user).toBe('testuser');
        expect(masked.hash).toBe('$********************e');
    });

    test('should authenticate valid user', async () => {
        const { default: passJs } = await import('pass');
        basic.configuration = {
            user: 'testuser',
            hash: '$2b$10$test.hash.value',
        };

        passJs.validate = jest.fn((pass, hash, callback) => {
            callback(null, true);
        });

        await new Promise<void>((resolve) => {
            basic.authenticate('testuser', 'password', (err, result) => {
                expect(result).toEqual({ username: 'testuser' });
                resolve();
            });
        });
    });

    test('should reject invalid user', async () => {
        basic.configuration = {
            user: 'testuser',
            hash: '$2b$10$test.hash.value',
        };

        await new Promise<void>((resolve) => {
            basic.authenticate('wronguser', 'password', (err, result) => {
                expect(result).toBe(false);
                resolve();
            });
        });
    });

    test('should reject invalid password', async () => {
        const { default: passJs } = await import('pass');
        basic.configuration = {
            user: 'testuser',
            hash: '$2b$10$test.hash.value',
        };

        passJs.validate = jest.fn((pass, hash, callback) => {
            callback(null, false);
        });

        await new Promise<void>((resolve) => {
            basic.authenticate('testuser', 'wrongpassword', (err, result) => {
                expect(result).toBe(false);
                resolve();
            });
        });
    });
});
