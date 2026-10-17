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
    };

    beforeEach(() => {
        jest.clearAllMocks();
        resetRemoteMetadataProvider();
        mockClient = {
            post: jest.fn(),
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

    test('Connected mode: resolves settings from Hub and caches response', async () => {
        const provider = new RemoteMetadataProvider({
            enabled: true,
            key: 'wud_live_test123',
            endpoint: 'https://hub.getwud.com',
            cacheTtl: 86400,
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

        // First call: cache miss
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

        // Second call: cache hit
        const res2 = await provider.resolveSettings({
            image: 'postgres',
            tag: '16.1',
        });
        expect(res2).toEqual(mockResponseData);
        expect(mockClient.post).toHaveBeenCalledTimes(1); // Not called again!

        const status = provider.getStatus();
        expect(status.status).toBe('connected');
        expect(status.cacheStats.hits).toBe(1);
        expect(status.cacheStats.misses).toBe(1);
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

    test('clearCache resets cache and restores connected status if not in error', async () => {
        const provider = new RemoteMetadataProvider({
            enabled: true,
            key: 'wud_live_reset',
        });

        mockClient.post.mockResolvedValueOnce({
            status: 200,
            data: { image: 'test' },
        });

        await provider.resolveSettings({ image: 'test' });
        expect(provider.getStatus().cacheStats.size).toBe(1);

        provider.clearCache();
        const status = provider.getStatus();
        expect(status.cacheStats.size).toBe(0);
        expect(status.cacheStats.hits).toBe(0);
        expect(status.cacheStats.misses).toBe(0);
        expect(status.status).toBe('connected');
    });

    test('Singleton helper getRemoteMetadataProvider works as expected', () => {
        const instance1 = getRemoteMetadataProvider();
        const instance2 = getRemoteMetadataProvider();
        expect(instance1).toBe(instance2);
    });
});
