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
            apiKey: { preview: 'wud_...1234', valid: true, scopes: ['metadata:read'] },
            subscription: { planTier: 'smart_updates', status: 'active', trialDaysRemaining: null, portalUrl: null },
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
            subscription: { planTier: 'free', status: 'active', trialDaysRemaining: null, portalUrl: null },
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
});
