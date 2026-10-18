import { mount, flushPromises } from '@vue/test-utils';
import HubView from '@/views/HubView.vue';
import * as hubService from '@/services/hub';
import * as clipboardService from '@/services/clipboard';

const emitMock = jest.fn();
jest.mock('@/composables/useEventBus', () => ({
  useEventBus: () => ({
    emit: emitMock,
  }),
}));

jest.mock('@/services/hub', () => ({
  getHubStatus: jest.fn(),
}));

jest.mock('@/services/clipboard', () => ({
  copyToClipboard: jest.fn(() => Promise.resolve(true)),
}));

describe('HubView.vue', () => {
  const mockedGetHubStatus = hubService.getHubStatus as jest.Mock;
  const mockedCopyToClipboard = clipboardService.copyToClipboard as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Standalone mode', () => {
    it('renders showcase, superpowers, and compose instructions', async () => {
      mockedGetHubStatus.mockResolvedValueOnce({
        enabled: false,
        status: 'standalone',
        endpoint: '',
        hasKey: false,
      });

      const wrapper = mount(HubView);
      await flushPromises();

      expect(wrapper.text()).toContain('WUD Hub');
      expect(wrapper.text()).toContain('Standalone');
      expect(wrapper.text()).toContain('Passez à la vitesse supérieure avec WUD Hub');
      expect(wrapper.text()).toContain('Règles automatiques de tags');
      expect(wrapper.text()).toContain('Intelligence IA Changelogs');
      expect(wrapper.text()).toContain('Détection CVE & SBOM');
      expect(wrapper.text()).toContain('Comment ajouter WUD_HUB_API_KEY ?');

      // Test copy snippet
      await wrapper.find('.code-container button').trigger('click');
      expect(mockedCopyToClipboard).toHaveBeenCalledWith(
        expect.stringContaining('WUD_HUB_API_KEY=wud_live_xxxxxxxxxxxxxxxx')
      );
      expect(emitMock).toHaveBeenCalledWith('notify', 'Exemple docker-compose copié');
    });
  });

  describe('Connected mode', () => {
    const connectedData = {
      enabled: true,
      status: 'connected',
      endpoint: 'https://hub.getwud.app',
      hasKey: true,
      lastCheck: '2026-10-18T10:00:00.000Z',
      remote: {
        organization: {
          id: 'org_123',
          name: 'Cyberdyne Systems',
          slug: 'cyberdyne',
        },
        apiKey: {
          preview: 'wud_...8899',
          valid: true,
          scopes: ['metadata:read'],
        },
        subscription: {
          planTier: 'smart_updates',
          status: 'trialing',
          trialDaysRemaining: 7,
          portalUrl: 'https://polar.sh/purchases/subscriptions/sub_123',
        },
        quota: {
          monitoredContainers: 18,
          limit: 25,
        },
      },
    };

    it('renders connected cards, cloud key, and fleet quota', async () => {
      mockedGetHubStatus.mockResolvedValueOnce(connectedData);

      const wrapper = mount(HubView);
      await flushPromises();

      expect(wrapper.text()).toContain('Connecté');
      expect(wrapper.text()).toContain('Cyberdyne Systems');
      expect(wrapper.text()).toContain('wud_...8899');
      expect(wrapper.text()).toContain('https://hub.getwud.app');
      expect(wrapper.text()).toContain('Smart Updates');
      expect(wrapper.text()).toContain('Essai gratuit (7 j restants)');
      expect(wrapper.text()).toContain('18 / 25');
      expect(wrapper.text()).toContain('Gérer mon abonnement');

      // Copy API key
      const copyKeyBtn = wrapper.find('button[title="Copier la prévisualisation"]');
      expect(copyKeyBtn.exists()).toBe(true);
      await copyKeyBtn.trigger('click');
      expect(mockedCopyToClipboard).toHaveBeenCalledWith('wud_...8899');
      expect(emitMock).toHaveBeenCalledWith('notify', "Clé d'API copiée dans le presse-papiers");
    });

    it('tests connection when clicking Tester la connexion', async () => {
      mockedGetHubStatus
        .mockResolvedValueOnce(connectedData)
        .mockResolvedValueOnce(connectedData);

      const wrapper = mount(HubView);
      await flushPromises();

      const testBtn = wrapper
        .findAll('button')
        .find((b) => b.text().includes('Tester la connexion'));
      expect(testBtn).toBeDefined();
      await testBtn!.trigger('click');
      await flushPromises();

      expect(mockedGetHubStatus).toHaveBeenCalledWith({ refresh: true });
      expect(emitMock).toHaveBeenCalledWith('notify', 'Connexion au WUD Hub réussie');
    });
  });

  describe('Error mode', () => {
    it('renders error alert with details and retry buttons', async () => {
      mockedGetHubStatus.mockResolvedValueOnce({
        enabled: true,
        status: 'error',
        endpoint: 'https://hub.getwud.app',
        hasKey: true,
        errorMessage: '(401) Invalid API Key',
      });

      const wrapper = mount(HubView);
      await flushPromises();

      expect(wrapper.text()).toContain('Erreur');
      expect(wrapper.text()).toContain('Clé API invalide ou révoquée');
      expect(wrapper.text()).toContain('(401) Invalid API Key');
      expect(wrapper.text()).toContain('Tester la connexion');
      expect(wrapper.text()).toContain('Obtenir une nouvelle clé');
    });

    it('handles unexpected failure when loading status', async () => {
      mockedGetHubStatus.mockRejectedValueOnce(new Error('Network connection failure'));

      const wrapper = mount(HubView);
      await flushPromises();

      expect(wrapper.text()).toContain('Erreur');
      expect(wrapper.text()).toContain('Network connection failure');
    });
  });
});
