// @ts-nocheck
import Ghcr from './Ghcr';

describe('GitHub Container Registry', () => {
    let ghcr;

    beforeEach(async () => {
        ghcr = new Ghcr();
        await ghcr.register('registry', 'ghcr', 'test', {
            username: 'testuser',
            token: 'testtoken',
        });
    });

    test('should create instance', async () => {
        expect(ghcr).toBeDefined();
        expect(ghcr).toBeInstanceOf(Ghcr);
    });

    test('should match registry', async () => {
        expect(ghcr.match({ registry: { url: 'ghcr.io' } })).toBe(true);
        expect(ghcr.match({ registry: { url: 'docker.io' } })).toBe(false);
    });

    test('should normalize image name', async () => {
        const image = { name: 'user/repo', registry: { url: 'ghcr.io' } };
        const normalized = ghcr.normalizeImage(image);
        expect(normalized.name).toBe('user/repo');
        expect(normalized.registry.url).toBe('https://ghcr.io/v2');
    });

    test('should not modify URL if already starts with https', async () => {
        const image = {
            name: 'user/repo',
            registry: { url: 'https://ghcr.io/v2' },
        };
        const normalized = ghcr.normalizeImage(image);
        expect(normalized.registry.url).toBe('https://ghcr.io/v2');
    });

    test('should mask configuration token', async () => {
        ghcr.configuration = { username: 'testuser', token: 'secret_token' };
        const masked = ghcr.maskConfiguration();
        expect(masked.username).toBe('testuser');
        expect(masked.token).toBe('s**********n');
    });

    test('should return auth pull credentials', async () => {
        ghcr.configuration = { username: 'testuser', token: 'testtoken' };
        const auth = ghcr.getAuthPull();
        expect(auth).toEqual({
            username: 'testuser',
            password: 'testtoken',
        });
    });

    test('should return undefined auth pull when no credentials', async () => {
        ghcr.configuration = {};
        const auth = ghcr.getAuthPull();
        expect(auth).toBeUndefined();
    });

    test('should authenticate with token', async () => {
        ghcr.configuration = { token: 'test-token' };
        const image = { name: 'user/repo' };
        const requestOptions = { headers: {} };

        const result = await ghcr.authenticate(image, requestOptions);

        const expectedBearer = Buffer.from('test-token', 'utf-8').toString(
            'base64',
        );
        expect(result.headers.Authorization).toBe(`Bearer ${expectedBearer}`);
    });

    test('should authenticate without token', async () => {
        ghcr.configuration = {};
        const image = { name: 'user/repo' };
        const requestOptions = { headers: {} };

        const result = await ghcr.authenticate(image, requestOptions);

        const expectedBearer = Buffer.from(':', 'utf-8').toString('base64');
        expect(result.headers.Authorization).toBe(`Bearer ${expectedBearer}`);
    });

    test('should validate string configuration', async () => {
        expect(() => ghcr.validateConfiguration('')).not.toThrow();
        expect(() => ghcr.validateConfiguration('some-string')).not.toThrow();
    });

    test('should return undefined auth pull when missing username', async () => {
        ghcr.configuration = { token: 'test-token' };
        const auth = ghcr.getAuthPull();
        expect(auth).toBeUndefined();
    });

    test('should return undefined auth pull when missing token', async () => {
        ghcr.configuration = { username: 'testuser' };
        const auth = ghcr.getAuthPull();
        expect(auth).toBeUndefined();
    });
});
