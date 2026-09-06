import { initDatabase, closeDatabase } from './db';
import { bootstrapAuth } from './auth_bootstrap';
import * as configuration from '../configuration';
import { countAdminUsers, getUserByUsername } from './user';

jest.mock('../configuration', () => ({
    ...jest.requireActual('../configuration'),
    getAuthenticationConfigurations: jest.fn(),
    wudEnvVars: {},
    get: jest.fn(),
}));

describe('Auth Bootstrap', () => {
    beforeEach(() => {
        initDatabase(':memory:');
        jest.clearAllMocks();
    });

    afterEach(() => {
        closeDatabase();
    });

    test('should bootstrap administrator from WUD_AUTH_ADMIN environment variables', async () => {
        (
            configuration.getAuthenticationConfigurations as jest.Mock
        ).mockReturnValue({});
        (configuration.get as jest.Mock).mockReturnValue({
            user: 'admin_test',
            password: 'supersecretpassword',
        });

        await bootstrapAuth();

        const admin = await getUserByUsername('admin_test');
        expect(admin).toBeDefined();
        expect(admin?.role).toBe('admin');
        expect(admin?.provider).toBe('local');
        expect(await countAdminUsers()).toBe(1);
    });

    test('should allow startup if OIDC is configured with admin group', async () => {
        (
            configuration.getAuthenticationConfigurations as jest.Mock
        ).mockReturnValue({
            oidc: {
                discovery: 'https://oidc.example.com',
                admingroup: 'wud-admins',
            },
        });
        (configuration.get as jest.Mock).mockReturnValue(undefined);

        // Should not throw error
        await expect(bootstrapAuth()).resolves.not.toThrow();
    });

    test('should throw fail-fast error when DB is empty and no admin config exists', async () => {
        (
            configuration.getAuthenticationConfigurations as jest.Mock
        ).mockReturnValue({});
        (configuration.get as jest.Mock).mockReturnValue(undefined);

        await expect(bootstrapAuth()).rejects.toThrow(
            /Authentication is mandatory: No administrator user found/,
        );
    });
});
