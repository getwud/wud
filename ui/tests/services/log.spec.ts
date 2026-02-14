import { getLogIcon, getLog } from '@/services/log';

describe('Log Service', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('should return log icon', () => {
    expect(getLogIcon()).toBe('mdi-bug');
  });

  it('should get log', async () => {
    const mockResponse = { logs: [] };
    global.fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockResponse)
    });

    const result = await getLog();

    expect(global.fetch).toHaveBeenCalledWith('/api/log', { credentials: 'include' });
    expect(result).toEqual(mockResponse);
  });
});