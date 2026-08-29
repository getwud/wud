import { ContainerImage } from '../model/container';
import DockerRegistryV2 from './DockerRegistryV2';

class TestRegistry extends DockerRegistryV2 {
    public registryPattern = /^.*\.?testreg\.io$/;

    getConfigurationSchema() {
        return this.joi.object();
    }
}

describe('DockerRegistryV2 base class tests', () => {
    let registry: TestRegistry;

    beforeEach(() => {
        registry = new TestRegistry();
    });

    describe('match', () => {
        test('should return false for empty or falsy imageUrl', () => {
            expect(registry.match('')).toBe(false);
            expect(registry.match(undefined as any)).toBe(false);
        });

        test('should match using registryPattern', () => {
            expect(registry.match('testreg.io')).toBe(true);
            expect(registry.match('sub.testreg.io')).toBe(true);
            expect(registry.match('other.io')).toBe(false);
        });

        test('should match using configuration.url if pattern not defined', () => {
            const noPatternRegistry = new (class extends DockerRegistryV2 {
                getConfigurationSchema() {
                    return this.joi.object();
                }
            })();
            noPatternRegistry.configuration = {
                url: 'https://registry.example.com',
            };

            expect(noPatternRegistry.match('registry.example.com')).toBe(true);
            expect(noPatternRegistry.match('other.com')).toBe(false);
        });

        test('should return false if neither pattern nor configuration.url is present', () => {
            const bareRegistry = new (class extends DockerRegistryV2 {
                getConfigurationSchema() {
                    return this.joi.object();
                }
            })();
            expect(bareRegistry.match('test.io')).toBe(false);
        });

        test('should support matchUrlPattern helper', () => {
            expect(
                registry.matchUrlPattern('my-image.io', /^.*\.?my-image\.io$/),
            ).toBe(true);
            expect(
                registry.matchUrlPattern('other.io', /^.*\.?my-image\.io$/),
            ).toBe(false);
        });
    });

    describe('normalizeImage', () => {
        test('should prepend https and append /v2 if missing', () => {
            const image: ContainerImage = {
                name: 'app/service',
                registry: { url: 'testreg.io/app/service' },
            } as any;

            const normalized = registry.normalizeImage(image);
            expect(normalized.registry.url).toBe(
                'https://testreg.io/app/service/v2',
            );
        });

        test('should not prepend https if already present', () => {
            const image: ContainerImage = {
                name: 'app/service',
                registry: { url: 'https://testreg.io/app/service/v2' },
            } as any;

            const normalized = registry.normalizeImage(image);
            expect(normalized.registry.url).toBe(
                'https://testreg.io/app/service/v2',
            );
        });

        test('should support normalizeImageUrl with custom registryUrl', () => {
            const image: ContainerImage = {
                name: 'app/service',
                registry: { url: 'old.io' },
            } as any;

            const normalized = registry.normalizeImageUrl(image, 'custom.io');
            expect(normalized.registry.url).toBe('https://custom.io/v2');
        });
    });

    describe('maskConfiguration', () => {
        test('should return empty object if configuration is not object or empty', () => {
            registry.configuration = '' as any;
            expect(registry.maskConfiguration()).toEqual({});

            registry.configuration = undefined as any;
            expect(registry.maskConfiguration()).toEqual({});
        });

        test('should mask default sensitive fields and keep others clear', () => {
            registry.configuration = {
                url: 'https://testreg.io',
                login: 'admin',
                username: 'user',
                password: 'supersecretpassword',
                token: 'secrettoken',
                auth: 'c2VjcmV0',
                clientid: 'cid',
                clientsecret: 'csecret',
                accesskeyid: 'myaccesskey',
                secretaccesskey: 'mysecretkey',
                privatekey: 'myprivatekey',
            };

            const masked = registry.maskConfiguration();
            expect(masked.url).toBe('https://testreg.io');
            expect(masked.login).toBe('admin');
            expect(masked.username).toBe('user');
            expect(masked.clientid).toBe('cid');
            expect(masked.password).toBe('s*****************d');
            expect(masked.token).toBe('s*********n');
            expect(masked.auth).toBe('c******0');
            expect(masked.clientsecret).toBe('c*****t');
            expect(masked.accesskeyid).toBe('m*********y');
            expect(masked.secretaccesskey).toBe('m*********y');
            expect(masked.privatekey).toBe('m**********y');
        });

        test('should support maskSensitiveFields helper', () => {
            registry.configuration = {
                customField: 'secretvalue',
                normalField: 'clearvalue',
            };
            const masked = registry.maskSensitiveFields(['customField']);
            expect(masked.customField).toBe('s*********e');
            expect(masked.normalField).toBe('clearvalue');
        });
    });

    describe('Authentication', () => {
        test('authenticateBasic should set Basic authorization header', async () => {
            const result = await registry.authenticateBasic(
                { headers: {} },
                'dXNlcjpwYXNz',
            );
            expect(result.headers.Authorization).toBe('Basic dXNlcjpwYXNz');
        });

        test('authenticateBasic should not modify header when credentials missing', async () => {
            const result = await registry.authenticateBasic({ headers: {} });
            expect(result.headers.Authorization).toBeUndefined();
        });

        test('authenticateBearer should set Bearer authorization header', async () => {
            const result = await registry.authenticateBearer(
                { headers: {} },
                'mytoken',
            );
            expect(result.headers.Authorization).toBe('Bearer mytoken');
        });

        test('authenticateBearer should not modify header when token missing', async () => {
            const result = await registry.authenticateBearer({ headers: {} });
            expect(result.headers.Authorization).toBeUndefined();
        });

        test('authenticate should use getAuthCredentials when available', async () => {
            registry.configuration = { login: 'user', password: 'password' };
            const result = await registry.authenticate({} as any, {
                headers: {},
            });
            expect(result.headers.Authorization).toBe(
                'Basic dXNlcjpwYXNzd29yZA==',
            );
        });

        test('authenticate should return requestOptions unmodified when no credentials', async () => {
            registry.configuration = {};
            const result = await registry.authenticate({} as any, {
                headers: {},
            });
            expect(result.headers.Authorization).toBeUndefined();
        });
    });

    describe('getAuthCredentials', () => {
        test('should return undefined when no configuration', () => {
            registry.configuration = undefined as any;
            expect(registry.getAuthCredentials()).toBeUndefined();
        });

        test('should return auth if provided', () => {
            registry.configuration = { auth: 'dXNlcjpwYXNz' };
            expect(registry.getAuthCredentials()).toBe('dXNlcjpwYXNz');
        });

        test('should encode login and password', () => {
            registry.configuration = { login: 'user', password: 'password' };
            expect(registry.getAuthCredentials()).toBe('dXNlcjpwYXNzd29yZA==');
        });

        test('should encode login and token', () => {
            registry.configuration = { login: 'user', token: 'token' };
            expect(registry.getAuthCredentials()).toBe('dXNlcjp0b2tlbg==');
        });

        test('should encode username and password', () => {
            registry.configuration = { username: 'user', password: 'password' };
            expect(registry.getAuthCredentials()).toBe('dXNlcjpwYXNzd29yZA==');
        });

        test('should encode username and token', () => {
            registry.configuration = { username: 'user', token: 'token' };
            expect(registry.getAuthCredentials()).toBe('dXNlcjp0b2tlbg==');
        });

        test('should encode clientid and clientsecret', () => {
            registry.configuration = { clientid: 'cid', clientsecret: 'csec' };
            expect(registry.getAuthCredentials()).toBe('Y2lkOmNzZWM=');
        });

        test('should encode namespace, account and token', () => {
            registry.configuration = {
                namespace: 'ns',
                account: 'acc',
                token: 'tok',
            };
            expect(registry.getAuthCredentials()).toBe('bnMrYWNjOnRvaw==');
        });

        test('should encode apikey with default iamapikey user', () => {
            registry.configuration = { apikey: 'mykey' };
            expect(registry.getAuthCredentials()).toBe('aWFtYXBpa2V5Om15a2V5');
        });

        test('should encode secretkey with default nologin user', () => {
            registry.configuration = { secretkey: 'mysecret' };
            expect(registry.getAuthCredentials()).toBe(
                'bm9sb2dpbjpteXNlY3JldA==',
            );
        });

        test('should return undefined when no matching credential fields', () => {
            registry.configuration = { url: 'https://testreg.io' };
            expect(registry.getAuthCredentials()).toBeUndefined();
        });
    });

    describe('getAuthPull', () => {
        test('should return undefined when no configuration', async () => {
            registry.configuration = undefined as any;
            await expect(registry.getAuthPull()).resolves.toBeUndefined();
        });

        test('should return login and password', async () => {
            registry.configuration = { login: 'user', password: 'password' };
            await expect(registry.getAuthPull()).resolves.toEqual({
                username: 'user',
                password: 'password',
            });
        });

        test('should return username and password', async () => {
            registry.configuration = { username: 'user', password: 'password' };
            await expect(registry.getAuthPull()).resolves.toEqual({
                username: 'user',
                password: 'password',
            });
        });

        test('should return username and token', async () => {
            registry.configuration = { username: 'user', token: 'token' };
            await expect(registry.getAuthPull()).resolves.toEqual({
                username: 'user',
                password: 'token',
            });
        });

        test('should return clientid and clientsecret', async () => {
            registry.configuration = { clientid: 'cid', clientsecret: 'csec' };
            await expect(registry.getAuthPull()).resolves.toEqual({
                username: 'cid',
                password: 'csec',
            });
        });

        test('should return clientemail and privatekey', async () => {
            registry.configuration = {
                clientemail: 'email',
                privatekey: 'key',
            };
            await expect(registry.getAuthPull()).resolves.toEqual({
                username: 'email',
                password: 'key',
            });
        });

        test('should return accesskeyid and secretaccesskey', async () => {
            registry.configuration = {
                accesskeyid: 'aid',
                secretaccesskey: 'skey',
            };
            await expect(registry.getAuthPull()).resolves.toEqual({
                username: 'aid',
                password: 'skey',
            });
        });

        test('should return namespace+account and token', async () => {
            registry.configuration = {
                namespace: 'ns',
                account: 'acc',
                token: 'tok',
            };
            await expect(registry.getAuthPull()).resolves.toEqual({
                username: 'ns+acc',
                password: 'tok',
            });
        });

        test('should return apikey with default iamapikey username', async () => {
            registry.configuration = { apikey: 'mykey' };
            await expect(registry.getAuthPull()).resolves.toEqual({
                username: 'iamapikey',
                password: 'mykey',
            });
        });

        test('should return secretkey with default nologin username', async () => {
            registry.configuration = { secretkey: 'mysecret' };
            await expect(registry.getAuthPull()).resolves.toEqual({
                username: 'nologin',
                password: 'mysecret',
            });
        });

        test('should return undefined when no credentials configured', async () => {
            registry.configuration = { url: 'https://testreg.io' };
            await expect(registry.getAuthPull()).resolves.toBeUndefined();
        });
    });
});
