import { getAppInfos } from '@/services/app';
import { getServerIcon, getServer } from '@/services/server';
import { getStoreIcon, getStore } from '@/services/store';

describe('App Service', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should get app infos', async () => {
    const mockResponse = { name: 'WUD', version: '1.0.0' };
    global.fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockResponse)
    });

    const result = await getAppInfos();

    expect(global.fetch).toHaveBeenCalledWith('/api/app', { credentials: 'include' });
    expect(result).toEqual(mockResponse);
  });
});

describe('Server Service', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('should return server icon', () => {
    expect(getServerIcon()).toBe('mdi-connection');
  });

  it('should get server data', async () => {
    const mockResponse = { configuration: {} };
    global.fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockResponse)
    });

    const result = await getServer();

    expect(global.fetch).toHaveBeenCalledWith('/api/server', { credentials: 'include' });
    expect(result).toEqual(mockResponse);
  });
});

describe('Store Service', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('should return store icon', () => {
    expect(getStoreIcon()).toBe('mdi-file-multiple');
  });

  it('should get store data', async () => {
    const mockResponse = { data: 'store' };
    global.fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockResponse)
    });

    const result = await getStore();

    expect(global.fetch).toHaveBeenCalledWith('/api/store', { credentials: 'include' });
    expect(result).toEqual(mockResponse);
  });
});