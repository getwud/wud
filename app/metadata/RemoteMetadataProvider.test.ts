import axios from 'axios';
import {
    RemoteMetadataProvider,
    getRemoteMetadataProvider,
    resetRemoteMetadataProvider,
} from './RemoteMetadataProvider';
import { RemoteSettingsResponse } from './types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('RemoteMetadataProvider', () => {
    let mockClient: {
        post: jest.Mock;
        get: jest.Mock;
    };

    beforeEach(() => {
        jest.clearAllMocks();
        resetRemoteMetadataProvider();
        mockClient = {
            post: jest.fn(),
            get: jest.fn(),
        };
        mockedAxios.create.mockReturnValue(mockClient as any);
    });

    test('Standalone mode when no API key is provided', async () => {
        const provider = new RemoteMetadataProvider({
            enabled: false,
            key: undefined,
        });

        const status = provider.getStatus();
        expect(status.status).toBe('standalone');
        expect(status.hasKey).toBe(false);

        const result = await provider.resolveSettings({ image: 'postgres' });
        expect(result).toBeNull();
        expect(mockClient.post).not.toHaveBeenCalled();
    });

    test('Connected mode: resolves settings from Hub', async () => {
        const provider = new RemoteMetadataProvider({
            enabled: true,
            key: 'wud_live_test123',
            endpoint: 'https://hub.getwud.com',
        });

        const mockResponseData: RemoteSettingsResponse = {
            image: 'postgres',
            tagFilterRegex: '^16\\.\\d+$',
            isOfficial: true,
            iconUrl: 'si:postgresql',
        };

        mockClient.post.mockResolvedValueOnce({
            status: 200,
            data: mockResponseData,
        });

        const res1 = await provider.resolveSettings({
            image: 'postgres',
            tag: '16.1',
        });
        expect(res1).toEqual(mockResponseData);
        expect(mockClient.post).toHaveBeenCalledTimes(1);
        expect(mockClient.post).toHaveBeenCalledWith(
            '/api/v1/settings/resolve',
            {
                image: 'postgres',
                tag: '16.1',
                labels: undefined,
            },
        );

        const status = provider.getStatus();
        expect(status.status).toBe('connected');
    });

    test('Circuit breaker on 401 Unauthorized: moves to error status and disables calls', async () => {
        const provider = new RemoteMetadataProvider({
            enabled: true,
            key: 'wud_live_invalid',
        });

        mockClient.post.mockRejectedValueOnce({
            response: {
                status: 401,
                data: { message: 'Invalid API key' },
            },
            message: 'Request failed with status code 401',
        });

        const res1 = await provider.resolveSettings({ image: 'redis' });
        expect(res1).toBeNull();

        const status = provider.getStatus();
        expect(status.status).toBe('error');
        expect(status.errorMessage).toContain('401');

        // Subsequent call should be blocked immediately
        const res2 = await provider.resolveSettings({ image: 'redis' });
        expect(res2).toBeNull();
        expect(mockClient.post).toHaveBeenCalledTimes(1);
    });

    test('Circuit breaker on 429 Too Many Requests: moves to degraded and applies 1h backoff', async () => {
        const provider = new RemoteMetadataProvider({
            enabled: true,
            key: 'wud_live_quota',
        });

        mockClient.post.mockRejectedValueOnce({
            response: {
                status: 429,
                data: { message: 'Rate limit exceeded' },
            },
        });

        const res1 = await provider.resolveSettings({ image: 'nginx' });
        expect(res1).toBeNull();

        const status = provider.getStatus();
        expect(status.status).toBe('degraded');

        // Subsequent call in backoff window is ignored
        const res2 = await provider.resolveSettings({ image: 'alpine' });
        expect(res2).toBeNull();
        expect(mockClient.post).toHaveBeenCalledTimes(1);
    });

    test('Circuit breaker on 5xx: degrades after 3 consecutive failures', async () => {
        const provider = new RemoteMetadataProvider({
            enabled: true,
            key: 'wud_live_server_err',
        });

        mockClient.post.mockRejectedValue({
            response: {
                status: 500,
                data: { message: 'Internal Server Error' },
            },
        });

        await provider.resolveSettings({ image: 'img1' });
        expect(provider.getStatus().status).toBe('connected');

        await provider.resolveSettings({ image: 'img2' });
        expect(provider.getStatus().status).toBe('connected');

        await provider.resolveSettings({ image: 'img3' });
        expect(provider.getStatus().status).toBe('degraded');
    });

    test('Singleton helper getRemoteMetadataProvider works as expected', () => {
        const instance1 = getRemoteMetadataProvider();
        const instance2 = getRemoteMetadataProvider();
        expect(instance1).toBe(instance2);
    });

    test('stores, retrieves, and deletes container metadata in-memory', () => {
        const provider = new RemoteMetadataProvider();
        expect(provider.getContainerMetadata('c-123')).toBeUndefined();

        const mockMeta = {
            enriched: true,
            sources: {
                includeTags: 'hub' as const,
                displayIcon: 'label' as const,
                link: 'default' as const,
            },
        };

        provider.setContainerMetadata('c-123', mockMeta);
        expect(provider.getContainerMetadata('c-123')).toEqual(mockMeta);

        provider.deleteContainerMetadata('c-123');
        expect(provider.getContainerMetadata('c-123')).toBeUndefined();
    });

    test('fetchRemoteStatus returns null when standalone', async () => {
        const provider = new RemoteMetadataProvider({
            enabled: false,
            key: undefined,
        });
        const res = await provider.fetchRemoteStatus();
        expect(res).toBeNull();
        expect(mockClient.get).not.toHaveBeenCalled();
    });

    test('fetchRemoteStatus fetches remote details from Hub and updates status', async () => {
        const provider = new RemoteMetadataProvider({
            enabled: true,
            key: 'wud_live_valid',
        });

        const mockDetails = {
            organization: { id: 'org_1', name: 'Test Org', slug: 'test-org' },
            apiKey: {
                preview: 'wud_...1234',
                valid: true,
                scopes: ['metadata:read'],
            },
            subscription: {
                planTier: 'smart_updates',
                status: 'active',
                trialDaysRemaining: null,
                portalUrl: null,
            },
            quota: { monitoredContainers: 10, limit: 25 },
        };

        mockClient.get.mockResolvedValueOnce({
            status: 200,
            data: mockDetails,
        });

        const details = await provider.fetchRemoteStatus();
        expect(details).toEqual(mockDetails);
        expect(mockClient.get).toHaveBeenCalledWith('/api/v1/hub/status');

        const status = provider.getStatus();
        expect(status.status).toBe('connected');
        expect(status.remote).toEqual(mockDetails);
    });

    test('fetchRemoteStatus handles 401 error and marks status as error', async () => {
        const provider = new RemoteMetadataProvider({
            enabled: true,
            key: 'wud_live_invalid',
        });

        mockClient.get.mockRejectedValueOnce({
            response: {
                status: 401,
                data: { message: 'Invalid API Key' },
            },
        });

        const details = await provider.fetchRemoteStatus();
        expect(details).toBeNull();

        const status = provider.getStatus();
        expect(status.status).toBe('error');
        expect(status.remote).toBeUndefined();
    });

    test('getOrFetchStatus uses cache and forceRefresh bypasses cache', async () => {
        const provider = new RemoteMetadataProvider({
            enabled: true,
            key: 'wud_live_valid',
        });

        const mockDetails = {
            organization: { id: 'org_1', name: 'Test Org', slug: 'test-org' },
            apiKey: { preview: 'wud_...1234', valid: true, scopes: [] },
            subscription: {
                planTier: 'free',
                status: 'active',
                trialDaysRemaining: null,
                portalUrl: null,
            },
            quota: { monitoredContainers: 2, limit: 10 },
        };

        mockClient.get.mockResolvedValue({
            status: 200,
            data: mockDetails,
        });

        // 1st call fetches
        const s1 = await provider.getOrFetchStatus();
        expect(s1.remote).toEqual(mockDetails);
        expect(mockClient.get).toHaveBeenCalledTimes(1);

        // 2nd call uses cache
        const s2 = await provider.getOrFetchStatus();
        expect(s2.remote).toEqual(mockDetails);
        expect(mockClient.get).toHaveBeenCalledTimes(1);

        // Force refresh calls again
        const s3 = await provider.getOrFetchStatus(true);
        expect(s3.remote).toEqual(mockDetails);
        expect(mockClient.get).toHaveBeenCalledTimes(2);
    });

    describe('getRiskAnalysis', () => {
        const mockRiskResponse = {
            imageRef: 'redis',
            currentTag: '7.0.15',
            targetTag: '7.2.4',
            riskScore: 'high',
            breakingChanges: ['Persistence format changes'],
            envVarChanges: [
                {
                    name: 'REDIS_PASSWORD',
                    changeType: 'modified',
                    description: 'Requires explicit ACL',
                },
            ],
            databaseImpact: 'Format migration on first start',
            summary: 'Upgrade includes breaking changes',
            cached: false,
        };

        test('returns null when Hub is disabled or in standalone mode', async () => {
            const provider = new RemoteMetadataProvider({
                enabled: false,
                key: undefined,
            });

            const result = await provider.getRiskAnalysis(
                'redis',
                '7.0.15',
                '7.2.4',
            );
            expect(result).toBeNull();
            expect(mockClient.post).not.toHaveBeenCalled();
        });

        test('fetches risk analysis from Hub and caches it', async () => {
            const provider = new RemoteMetadataProvider({
                enabled: true,
                key: 'wud_live_valid',
            });

            mockClient.post.mockResolvedValueOnce({
                status: 200,
                data: mockRiskResponse,
            });

            const res1 = await provider.getRiskAnalysis(
                'redis',
                '7.0.15',
                '7.2.4',
            );
            expect(res1).toBeDefined();
            expect(res1?.riskScore).toBe('high');
            expect(res1?.breakingChanges).toHaveLength(1);
            expect(mockClient.post).toHaveBeenCalledTimes(1);
            expect(mockClient.post).toHaveBeenCalledWith(
                '/api/v1/changelogs/risk-analysis',
                {
                    imageRef: 'redis',
                    currentTag: '7.0.15',
                    targetTag: '7.2.4',
                },
                { timeout: 4000 },
            );

            // Synchronous cached lookup
            const cachedSync = provider.getCachedRiskAnalysis(
                'redis',
                '7.0.15',
                '7.2.4',
            );
            expect(cachedSync).toBeDefined();
            expect(cachedSync?.cached).toBe(true);

            // Second call reuses in-memory cache without HTTP query
            const res2 = await provider.getRiskAnalysis(
                'redis',
                '7.0.15',
                '7.2.4',
            );
            expect(res2?.cached).toBe(true);
            expect(mockClient.post).toHaveBeenCalledTimes(1);
        });

        test('forceRefresh bypasses cache and queries Hub again', async () => {
            const provider = new RemoteMetadataProvider({
                enabled: true,
                key: 'wud_live_valid',
            });

            mockClient.post.mockResolvedValue({
                status: 200,
                data: mockRiskResponse,
            });

            await provider.getRiskAnalysis('redis', '7.0.15', '7.2.4');
            expect(mockClient.post).toHaveBeenCalledTimes(1);

            // Force refresh call
            await provider.getRiskAnalysis('redis', '7.0.15', '7.2.4', true);
            expect(mockClient.post).toHaveBeenCalledTimes(2);

            // Also test with object option { forceRefresh: true, timeout: 2000 }
            await provider.getRiskAnalysis('redis', '7.0.15', '7.2.4', {
                forceRefresh: true,
                timeout: 2000,
            });
            expect(mockClient.post).toHaveBeenCalledTimes(3);
            expect(mockClient.post).toHaveBeenLastCalledWith(
                '/api/v1/changelogs/risk-analysis',
                expect.any(Object),
                { timeout: 2000 },
            );
        });

        test('invalidateRiskCache removes cache entry', async () => {
            const provider = new RemoteMetadataProvider({
                enabled: true,
                key: 'wud_live_valid',
            });

            mockClient.post.mockResolvedValue({
                status: 200,
                data: mockRiskResponse,
            });

            await provider.getRiskAnalysis('redis', '7.0.15', '7.2.4');
            expect(
                provider.getCachedRiskAnalysis('redis', '7.0.15', '7.2.4'),
            ).toBeDefined();

            provider.invalidateRiskCache('redis', '7.0.15', '7.2.4');
            expect(
                provider.getCachedRiskAnalysis('redis', '7.0.15', '7.2.4'),
            ).toBeUndefined();
        });

        test('handles HTTP 429 quota exceeded with 1h backoff and returns null', async () => {
            const provider = new RemoteMetadataProvider({
                enabled: true,
                key: 'wud_live_valid',
            });

            mockClient.post.mockRejectedValueOnce({
                response: {
                    status: 429,
                    data: { message: 'Plan quota exceeded' },
                },
                message: 'Request failed with status code 429',
            });

            const res = await provider.getRiskAnalysis(
                'redis',
                '7.0.15',
                '7.2.4',
            );
            expect(res).toBeNull();
            expect(provider.getStatus().status).toBe('degraded');

            // Next call within backoff window is skipped
            const res2 = await provider.getRiskAnalysis('postgres', '15', '16');
            expect(res2).toBeNull();
            expect(mockClient.post).toHaveBeenCalledTimes(1);
        });

        test('handles network error or timeout gracefully without throwing', async () => {
            const provider = new RemoteMetadataProvider({
                enabled: true,
                key: 'wud_live_valid',
            });

            mockClient.post.mockRejectedValueOnce(
                new Error('timeout of 4000ms exceeded'),
            );

            const res = await provider.getRiskAnalysis(
                'redis',
                '7.0.15',
                '7.2.4',
            );
            expect(res).toBeNull();
        });

        test('parses multi-version payload with intermediate releases and skipped versions', async () => {
            const provider = new RemoteMetadataProvider({
                enabled: true,
                key: 'wud_live_valid',
            });

            const multiVersionPayload = {
                imageRef: 'postgres',
                currentTag: '14.2',
                targetTag: '16.1',
                riskScore: 'critical',
                skippedVersionsCount: 2,
                intermediateReleases: [
                    {
                        tag: '15.0',
                        name: 'PostgreSQL 15',
                        isTarget: false,
                        breakingChanges: [
                            'Removed public schema default grant',
                        ],
                    },
                    {
                        tag: '16.1',
                        name: 'PostgreSQL 16.1',
                        isTarget: true,
                        breakingChanges: [],
                    },
                ],
                breakingChanges: ['Removed public schema default grant'],
                envVarChanges: [],
                databaseImpact: 'pg_upgrade required',
                summary:
                    'Major multi-version upgrade across PostgreSQL 15 & 16',
                freemiumGated: false,
            };

            mockClient.post.mockResolvedValueOnce({
                status: 200,
                data: multiVersionPayload,
            });

            const result = await provider.getRiskAnalysis(
                'postgres',
                '14.2',
                '16.1',
            );
            expect(result).toBeDefined();
            expect(result?.riskScore).toBe('critical');
            expect(result?.skippedVersionsCount).toBe(2);
            expect(result?.intermediateReleases).toHaveLength(2);
            expect(result?.intermediateReleases?.[0].breakingChanges).toEqual([
                'Removed public schema default grant',
            ]);
            expect(result?.databaseImpact).toBe('pg_upgrade required');
        });

        test('uses composite key with normalization (trim & lowercase)', async () => {
            const provider = new RemoteMetadataProvider({
                enabled: true,
                key: 'wud_live_valid',
            });

            mockClient.post.mockResolvedValueOnce({
                status: 200,
                data: mockRiskResponse,
            });

            // First call with mixed case and whitespace
            const res1 = await provider.getRiskAnalysis(
                '  REDIS  ',
                ' 7.0.15 ',
                ' 7.2.4 ',
            );
            expect(res1).toBeDefined();
            expect(mockClient.post).toHaveBeenCalledTimes(1);

            // Second call with normalized args should hit cache without posting again
            const res2 = await provider.getRiskAnalysis(
                'redis',
                '7.0.15',
                '7.2.4',
            );
            expect(res2?.cached).toBe(true);
            expect(mockClient.post).toHaveBeenCalledTimes(1);
        });

        test('handles HTTP 402 Payment Required with 1h backoff', async () => {
            const provider = new RemoteMetadataProvider({
                enabled: true,
                key: 'wud_live_valid',
            });

            mockClient.post.mockRejectedValueOnce({
                response: {
                    status: 402,
                    data: { message: 'Subscription required' },
                },
            });

            const res = await provider.getRiskAnalysis(
                'redis',
                '7.0.15',
                '7.2.4',
            );
            expect(res).toBeNull();
            expect(provider.getStatus().status).toBe('degraded');

            // Blocked during backoff
            const res2 = await provider.getRiskAnalysis(
                'redis',
                '7.0.15',
                '7.2.4',
            );
            expect(res2).toBeNull();
            expect(mockClient.post).toHaveBeenCalledTimes(1);
        });
    });
});
