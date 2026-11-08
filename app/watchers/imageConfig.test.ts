import {
    resolveAndCacheImageConfig,
    resolveCandidateConfig,
    resolveDigestConfig,
} from './imageConfig';
import * as storeContainer from '../store/container';

jest.mock('../store/container');

describe('imageConfig watcher helper', () => {
    let mockRegistry: any;
    let mockContainer: any;
    let mockLog: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRegistry = {
            getImageConfig: jest.fn(),
        };
        mockContainer = {
            id: 'c1',
            image: {
                name: 'test/app',
                tag: { value: '1.0.0', semver: true },
                digest: { watch: false, value: 'sha256:current' },
            },
        };
        mockLog = {
            debug: jest.fn(),
        };
        (storeContainer.getContainer as jest.Mock).mockReturnValue(undefined);
    });

    describe('resolveAndCacheImageConfig', () => {
        test('should reuse cached created and version without calling registry', async () => {
            (storeContainer.getContainer as jest.Mock).mockReturnValue({
                id: 'c1',
                result: {
                    created: '2026-11-08T10:00:00Z',
                    version: '1.2.0',
                },
            });
            const result: any = {};
            await resolveAndCacheImageConfig(
                mockRegistry,
                mockContainer,
                mockContainer.image,
                'sha256:target',
                'sha256:config',
                result,
                () => true,
                mockLog,
            );

            expect(mockRegistry.getImageConfig).not.toHaveBeenCalled();
            expect(result.created).toBe('2026-11-08T10:00:00Z');
            expect(result.version).toBe('1.2.0');
        });

        test('should do nothing if registry has no getImageConfig function', async () => {
            const registryWithoutConfig: any = {};
            const result: any = {};
            await resolveAndCacheImageConfig(
                registryWithoutConfig,
                mockContainer,
                mockContainer.image,
                'sha256:target',
                undefined,
                result,
                () => false,
                mockLog,
            );

            expect(result.created).toBeUndefined();
            expect(result.version).toBeUndefined();
        });

        test('should catch and log error from getImageConfig gracefully', async () => {
            mockRegistry.getImageConfig.mockRejectedValue(
                new Error('Network timeout'),
            );
            const result: any = {};
            await resolveAndCacheImageConfig(
                mockRegistry,
                mockContainer,
                mockContainer.image,
                'sha256:target',
                'sha256:config',
                result,
                () => false,
                mockLog,
            );

            expect(mockLog.debug).toHaveBeenCalledWith(
                'Cannot get remote image config (Network timeout)',
            );
            expect(result.created).toBeUndefined();
        });
    });

    describe('resolveCandidateConfig', () => {
        test('should do nothing if result.created is already defined', async () => {
            const result: any = { created: '2026-11-08T09:00:00Z' };
            await resolveCandidateConfig({
                registryProvider: mockRegistry,
                container: mockContainer,
                candidateTag: '1.1.0',
                candidateRemoteDigest: { digest: 'sha256:cand', version: 2 },
                result,
                logContainer: mockLog,
            });

            expect(mockRegistry.getImageConfig).not.toHaveBeenCalled();
            expect(result.created).toBe('2026-11-08T09:00:00Z');
        });

        test('should assign candidateRemoteDigest.created if present', async () => {
            const result: any = {};
            await resolveCandidateConfig({
                registryProvider: mockRegistry,
                container: mockContainer,
                candidateTag: '1.1.0',
                candidateRemoteDigest: {
                    digest: 'sha256:cand',
                    created: '2026-01-01T00:00:00Z',
                    version: 1,
                },
                result,
                logContainer: mockLog,
            });

            expect(mockRegistry.getImageConfig).not.toHaveBeenCalled();
            expect(result.created).toBe('2026-01-01T00:00:00Z');
        });

        test('should do nothing if candidateRemoteDigest is version 1 or missing digest', async () => {
            const result: any = {};
            await resolveCandidateConfig({
                registryProvider: mockRegistry,
                container: mockContainer,
                candidateTag: '1.1.0',
                candidateRemoteDigest: { version: 1 },
                result,
                logContainer: mockLog,
            });

            expect(mockRegistry.getImageConfig).not.toHaveBeenCalled();
            expect(result.created).toBeUndefined();
        });

        test('should fetch and assign image config for v2 candidate tag', async () => {
            mockRegistry.getImageConfig.mockResolvedValue({
                created: '2026-11-08T11:00:00Z',
                version: '1.1.0',
            });
            const result: any = {};
            await resolveCandidateConfig({
                registryProvider: mockRegistry,
                container: mockContainer,
                candidateTag: '1.1.0',
                candidateRemoteDigest: {
                    digest: 'sha256:cand',
                    configDigest: 'sha256:cfg',
                    version: 2,
                },
                result,
                logContainer: mockLog,
            });

            expect(mockRegistry.getImageConfig).toHaveBeenCalledWith(
                expect.objectContaining({
                    tag: expect.objectContaining({ value: '1.1.0' }),
                }),
                'sha256:cand',
                'sha256:cfg',
            );
            expect(result.created).toBe('2026-11-08T11:00:00Z');
            expect(result.version).toBe('1.1.0');
        });
    });

    describe('resolveDigestConfig', () => {
        test('should return immediately when remoteDigest is version 1', async () => {
            const result: any = { digest: 'sha256:new' };
            await resolveDigestConfig({
                registryProvider: mockRegistry,
                container: mockContainer,
                imageToGetDigestFrom: mockContainer.image,
                remoteDigest: { version: 1, digest: 'sha256:new' },
                result,
                logContainer: mockLog,
            });

            expect(mockRegistry.getImageConfig).not.toHaveBeenCalled();
        });

        test('should return immediately when result.digest is undefined', async () => {
            const result: any = {};
            await resolveDigestConfig({
                registryProvider: mockRegistry,
                container: mockContainer,
                imageToGetDigestFrom: mockContainer.image,
                remoteDigest: { version: 2, digest: 'sha256:new' },
                result,
                logContainer: mockLog,
            });

            expect(mockRegistry.getImageConfig).not.toHaveBeenCalled();
        });

        test('should return immediately when digest has not moved', async () => {
            const result: any = { digest: 'sha256:current' };
            await resolveDigestConfig({
                registryProvider: mockRegistry,
                container: mockContainer,
                imageToGetDigestFrom: mockContainer.image,
                remoteDigest: { version: 2, digest: 'sha256:current' },
                result,
                logContainer: mockLog,
            });

            expect(mockRegistry.getImageConfig).not.toHaveBeenCalled();
        });

        test('should fetch and assign image config when digest changed', async () => {
            mockRegistry.getImageConfig.mockResolvedValue({
                created: '2026-11-08T11:30:00Z',
                version: '2.0.0',
            });
            const result: any = { digest: 'sha256:new' };
            await resolveDigestConfig({
                registryProvider: mockRegistry,
                container: mockContainer,
                imageToGetDigestFrom: mockContainer.image,
                remoteDigest: {
                    version: 2,
                    digest: 'sha256:new',
                    configDigest: 'sha256:new-cfg',
                },
                result,
                logContainer: mockLog,
            });

            expect(mockRegistry.getImageConfig).toHaveBeenCalledWith(
                mockContainer.image,
                'sha256:new',
                'sha256:new-cfg',
            );
            expect(result.created).toBe('2026-11-08T11:30:00Z');
            expect(result.version).toBe('2.0.0');
        });
    });
});
