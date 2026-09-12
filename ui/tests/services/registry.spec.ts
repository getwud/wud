import { getRegistryProviderIcon, getAllRegistries } from '@/services/registry';

// Mock fetch globally
global.fetch = jest.fn();

describe('Registry Service', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  describe('getRegistryProviderIcon', () => {
    it('returns correct icons for different providers', () => {
      expect(getRegistryProviderIcon('acr.example.com')).toBe('si-microsoftazure');
      expect(getRegistryProviderIcon('custom.registry.com')).toBe('si-opencontainersinitiative');
      expect(getRegistryProviderIcon('dhi.io')).toBe('si-docker');
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

    it('returns custom icon when registryItem has configuration.icon', () => {
      const registryItem = {
        id: 'custom.myreg',
        type: 'custom',
        name: 'myreg',
        configuration: { icon: 'mdi:server' },
      };
      expect(getRegistryProviderIcon('custom', registryItem)).toBe('mdi:server');
    });

    it('returns custom icon from cache when provider matches registry id', async () => {
      const mockRegistries = [
        {
          id: 'custom.myreg',
          type: 'custom',
          name: 'myreg',
          configuration: { icon: 'logos:gitlab' },
        },
      ];
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegistries,
      });

      await getAllRegistries();

      expect(getRegistryProviderIcon('custom.myreg')).toBe('logos:gitlab');
    });

    it('returns custom icon from cache when provider matches type.name', async () => {
      const mockRegistries = [
        {
          id: 'custom-1',
          type: 'custom',
          name: 'myreg2',
          configuration: { icon: 'mdi:server' },
        },
      ];
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegistries,
      });

      await getAllRegistries();

      expect(getRegistryProviderIcon('custom.myreg2')).toBe('mdi:server');
    });
  });

  describe('getAllRegistries', () => {
    it('fetches all registries successfully', async () => {
      const mockRegistries = [
        { name: 'hub', type: 'docker' },
        { name: 'ghcr', type: 'github' }
      ];
      (fetch as jest.Mock).mockResolvedValueOnce({
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