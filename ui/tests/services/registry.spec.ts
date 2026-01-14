import { getRegistryProviderIcon, getAllRegistries } from '@/services/registry';

// Mock fetch globally
global.fetch = jest.fn();

describe('Registry Service', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('getRegistryProviderIcon', () => {
    it('returns correct icons for different providers', () => {
      expect(getRegistryProviderIcon('acr.example.com')).toBe('si-microsoftazure');
      expect(getRegistryProviderIcon('custom.registry.com')).toBe('si-opencontainersinitiative');
      expect(getRegistryProviderIcon('ecr.amazonaws.com')).toBe('si-amazonaws');
      expect(getRegistryProviderIcon('gcr.io')).toBe('si-googlecloud');
      expect(getRegistryProviderIcon('ghcr.io')).toBe('si-github');
      expect(getRegistryProviderIcon('gitlab.com')).toBe('si-gitlab');
      expect(getRegistryProviderIcon('hub.docker.com')).toBe('si-docker');
      expect(getRegistryProviderIcon('quay.io')).toBe('si-redhat');
      expect(getRegistryProviderIcon('unknown.registry')).toBe('si-linuxcontainers');
    });

    it('handles provider names with dots correctly', () => {
      expect(getRegistryProviderIcon('hub.docker.com')).toBe('si-docker');
      expect(getRegistryProviderIcon('gcr.io')).toBe('si-googlecloud');
    });
  });

  describe('getAllRegistries', () => {
    it('fetches all registries successfully', async () => {
      const mockRegistries = [
        { name: 'hub', type: 'docker' },
        { name: 'ghcr', type: 'github' }
      ];
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegistries
      });

      const registries = await getAllRegistries();

      expect(fetch).toHaveBeenCalledWith('/api/registries', {
        credentials: 'include'
      });
      expect(registries).toEqual(mockRegistries);
    });
  });
});