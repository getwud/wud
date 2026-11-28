import {
  getAllContainers,
  refreshAllContainers,
  refreshContainer,
  deleteContainer,
  getContainerTriggers,
  runTrigger,
  runTriggerBatch
} from '@/services/container';

// Mock fetch globally
global.fetch = jest.fn();

describe('Container Service', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('getAllContainers', () => {
    it('fetches all containers successfully', async () => {
      const mockContainers = [
        { id: '1', name: 'container1' },
        { id: '2', name: 'container2' }
      ];
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockContainers
      });

      const containers = await getAllContainers();

      expect(fetch).toHaveBeenCalledWith('/api/containers', {
        credentials: 'include'
      });
      expect(containers).toEqual(mockContainers);
    });
  });

  describe('refreshAllContainers', () => {
    it('refreshes all containers successfully', async () => {
      const mockResult = { refreshed: 10 };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult
      });

      const result = await refreshAllContainers();

      expect(fetch).toHaveBeenCalledWith('/api/containers/watch?async=true', {
        method: 'POST',
        credentials: 'include'
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('refreshContainer', () => {
    it('refreshes specific container successfully', async () => {
      const mockResult = { id: 'container1', refreshed: true };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult
      });

      const result = await refreshContainer('container1');

      expect(fetch).toHaveBeenCalledWith('/api/containers/container1/watch', {
        method: 'POST',
        credentials: 'include'
      });
      expect(result).toEqual(mockResult);
    });

    it('returns undefined when container not found', async () => {
      fetch.mockResolvedValueOnce({
        status: 404
      });

      const result = await refreshContainer('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('deleteContainer', () => {
    it('deletes container successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true
      });

      const result = await deleteContainer('container1');

      expect(fetch).toHaveBeenCalledWith('/api/containers/container1', {
        method: 'DELETE',
        credentials: 'include'
      });
      expect(result).toBeDefined();
    });
  });

  describe('getContainerTriggers', () => {
    it('fetches container triggers successfully', async () => {
      const mockTriggers = [
        { type: 'webhook', name: 'trigger1' },
        { type: 'email', name: 'trigger2' }
      ];
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTriggers
      });

      const triggers = await getContainerTriggers('container1');

      expect(fetch).toHaveBeenCalledWith('/api/containers/container1/triggers', {
        credentials: 'include'
      });
      expect(triggers).toEqual(mockTriggers);
    });
  });

  describe('runTrigger', () => {
    it('runs trigger successfully', async () => {
      const mockResult = { success: true, message: 'Trigger executed' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult
      });

      const result = await runTrigger({
        containerId: 'container1',
        triggerType: 'webhook',
        triggerName: 'trigger1'
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/containers/container1/triggers/webhook/trigger1',
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }
      );
      expect(result).toEqual(mockResult);
    });

    it('throws error when response is not ok', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Execution error' })
      });

      await expect(
        runTrigger({
          containerId: 'container1',
          triggerType: 'webhook',
          triggerName: 'trigger1'
        })
      ).rejects.toThrow('Execution error');
    });
  });

  describe('runTriggerBatch', () => {
    it('runs trigger for several containers in one call', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      const result = await runTriggerBatch({
        containerIds: ['container1', 'container2'],
        triggerType: 'dockercompose',
        triggerName: 'main'
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/containers/triggers/dockercompose/main',
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ containers: ['container1', 'container2'] })
        }
      );
      expect(result).toEqual({});
    });

    it('sends overrideCooldown when provided', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await runTriggerBatch({
        containerIds: ['container1'],
        triggerType: 'dockercompose',
        triggerName: 'main',
        overrideCooldown: true
      });

      expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
        containers: ['container1'],
        overrideCooldown: true
      });
    });

    it('throws the server message when response is not ok', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
        json: async () => ({ message: 'Container not found (nope)' })
      });

      await expect(
        runTriggerBatch({
          containerIds: ['nope'],
          triggerType: 'dockercompose',
          triggerName: 'main'
        })
      ).rejects.toThrow('Container not found (nope)');
    });

    it('falls back to statusText when the error body is not json', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Gateway',
        json: async () => { throw new Error('not json'); }
      });

      await expect(
        runTriggerBatch({
          containerIds: ['container1'],
          triggerType: 'dockercompose',
          triggerName: 'main'
        })
      ).rejects.toThrow('Bad Gateway');
    });
  });
});