import { getTriggerIcon, getAllTriggers } from '@/services/trigger';

describe('Trigger Service', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('should return trigger icon', () => {
    expect(getTriggerIcon()).toBe('mdi-bell-ring');
  });

  it('should get all triggers', async () => {
    const mockResponse = { triggers: [] };
    global.fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockResponse)
    });

    const result = await getAllTriggers();

    expect(global.fetch).toHaveBeenCalledWith('/api/triggers', { credentials: 'include' });
    expect(result).toEqual(mockResponse);
  });
});