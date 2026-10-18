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
});
