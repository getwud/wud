import {
    getRegistryPriority,
    findRegistryProvider,
    resolveRegistry,
    isRegistryRegistered,
} from './registryProvider';

describe('registryProvider helper', () => {
    describe('getRegistryPriority', () => {
        test('should score authenticated provider higher than anonymous provider', () => {
            const anonProvider: any = {
                name: 'public',
                configuration: {},
            };
            const authProvider: any = {
                name: 'public',
                configuration: {
                    login: 'user',
                    password: 'pwd',
                },
            };
            expect(
                getRegistryPriority(authProvider, 'docker.io'),
            ).toBeGreaterThan(getRegistryPriority(anonProvider, 'docker.io'));
        });

        test('should score custom named provider higher than default public provider', () => {
            const publicProvider: any = {
                name: 'public',
                configuration: {},
            };
            const customProvider: any = {
                name: 'private',
                configuration: {},
            };
            expect(
                getRegistryPriority(customProvider, 'docker.io'),
            ).toBeGreaterThan(getRegistryPriority(publicProvider, 'docker.io'));
        });

        test('should score matching URL higher than generic provider', () => {
            const genericProvider: any = {
                name: 'generic',
                configuration: { url: 'https://other.com' },
            };
            const specificProvider: any = {
                name: 'specific',
                configuration: { url: 'https://myregistry.com' },
            };
            expect(
                getRegistryPriority(specificProvider, 'myregistry.com'),
            ).toBeGreaterThan(
                getRegistryPriority(genericProvider, 'myregistry.com'),
            );
        });
    });

    describe('findRegistryProvider', () => {
        test('should return undefined when no registries match', () => {
            const registries: any = {
                hub: { match: jest.fn().mockReturnValue(false) },
            };
            expect(
                findRegistryProvider('unknown.io', registries),
            ).toBeUndefined();
        });

        test('should return single matching registry', () => {
            const matching: any = {
                name: 'public',
                configuration: {},
                match: jest.fn().mockReturnValue(true),
            };
            const registries: any = { 'hub.public': matching };
            expect(findRegistryProvider('docker.io', registries)).toBe(
                matching,
            );
        });

        test('should prioritize authenticated/custom registry when multiple match', () => {
            const publicHub: any = {
                name: 'public',
                configuration: {},
                match: jest.fn().mockReturnValue(true),
            };
            const privateHub: any = {
                name: 'private',
                configuration: {
                    login: 'myuser',
                    password: 'mypassword',
                },
                match: jest.fn().mockReturnValue(true),
            };
            const registries: any = {
                'hub.public': publicHub,
                'hub.private': privateHub,
            };
            expect(findRegistryProvider('docker.io', registries)).toBe(
                privateHub,
            );
        });
    });

    describe('resolveRegistry', () => {
        test('should resolve exact match', () => {
            const mockHubPublic: any = { type: 'hub', name: 'public' };
            const registries: any = { 'hub.public': mockHubPublic };
            expect(resolveRegistry('hub.public', registries)).toBe(
                mockHubPublic,
            );
        });

        test('should resolve alias fallback to .public (e.g. hub -> hub.public, ghcr -> ghcr.public)', () => {
            const mockHubPublic: any = { type: 'hub', name: 'public' };
            const mockGhcrPublic: any = { type: 'ghcr', name: 'public' };
            const registries: any = {
                'hub.public': mockHubPublic,
                'ghcr.public': mockGhcrPublic,
            };
            expect(resolveRegistry('hub', registries)).toBe(mockHubPublic);
            expect(resolveRegistry('ghcr', registries)).toBe(mockGhcrPublic);
        });

        test('should resolve fallback when single instance exists for provider type', () => {
            const mockCustomNexus: any = { type: 'nexus', name: 'internal' };
            const registries: any = { 'nexus.internal': mockCustomNexus };
            expect(resolveRegistry('nexus', registries)).toBe(mockCustomNexus);
        });

        test('should throw error when registry is unsupported', () => {
            const registries: any = {};
            expect(() => resolveRegistry('unknown', registries)).toThrow(
                'Unsupported Registry unknown',
            );
        });
    });

    describe('isRegistryRegistered', () => {
        test('should return false for empty or undefined registryName', () => {
            expect(isRegistryRegistered(undefined, {})).toBe(false);
            expect(isRegistryRegistered('', {})).toBe(false);
        });

        test('should return true when registry can be resolved', () => {
            const registries: any = {
                'hub.public': { type: 'hub', name: 'public' },
            };
            expect(isRegistryRegistered('hub', registries)).toBe(true);
            expect(isRegistryRegistered('hub.public', registries)).toBe(true);
        });

        test('should return false when registry cannot be resolved', () => {
            const registries: any = {
                'hub.public': { type: 'hub', name: 'public' },
            };
            expect(isRegistryRegistered('lscr.linux', registries)).toBe(false);
        });
    });
});
