import { getHubStatus } from '@/services/hub';
import * as mockService from '@/services/mock';

describe('Hub Service', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns mock status in demo mode', async () => {
    jest.spyOn(mockService, 'isDemoMode').mockReturnValue(true);

    const status = await getHubStatus();
    expect(status.status).toBe('connected');
    expect(status.remote).toBeDefined();
    expect(status.remote?.organization.name).toBe('Acme Corp');
    expect(status.remote?.quota.monitoredContainers).toBe(8);
  });

  it('fetches api/hub/status when not in demo mode', async () => {
    jest.spyOn(mockService, 'isDemoMode').mockReturnValue(false);

    const mockResponse = {
      enabled: true,
      status: 'connected',
      endpoint: 'https://hub.getwud.app',
      hasKey: true,
    };

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as any)
    );

    const status = await getHubStatus();
    expect(status).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith('/api/hub/status', {
      credentials: 'include',
    });
  });

  it('fetches with refresh query param when options.refresh is true', async () => {
    jest.spyOn(mockService, 'isDemoMode').mockReturnValue(false);

    const mockResponse = {
      enabled: true,
      status: 'connected',
      endpoint: 'https://hub.getwud.app',
      hasKey: true,
    };

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as any)
    );

    const status = await getHubStatus({ refresh: true });
    expect(status).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith('/api/hub/status?refresh=true', {
      credentials: 'include',
    });
  });

  it('throws an error when fetch fails', async () => {
    jest.spyOn(mockService, 'isDemoMode').mockReturnValue(false);

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        statusText: 'Internal Server Error',
      } as any)
    );

    await expect(getHubStatus()).rejects.toThrow('Failed to fetch Hub status: Internal Server Error');
  });
});
