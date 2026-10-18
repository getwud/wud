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

  describe('Loading state', () => {
    it('shows loading spinner initially and hides content until resolved', async () => {
      let resolvePromise: (value: any) => void;
      mockedGetHubStatus.mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const wrapper = mount(HubView);

      // During initial loading
      expect(wrapper.find('v-progress-circular').exists() || wrapper.find('.py-16').exists()).toBe(true);
      expect(wrapper.text()).not.toContain('Automagic Tag Rules');
      expect(wrapper.text()).not.toContain('Cloud Connection & API Key');

      // Resolve API call
      resolvePromise!({
        enabled: false,
        status: 'standalone',
        endpoint: '',
        hasKey: false,
      });
      await flushPromises();

      expect(wrapper.find('v-progress-circular').exists()).toBe(false);
      expect(wrapper.find('.py-16').exists()).toBe(false);
      expect(wrapper.text()).toContain('Automagic Tag Rules');
    });
  });

  describe('Standalone mode', () => {
    it('renders showcase, superpowers, and compose instructions in English', async () => {
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
      expect(wrapper.text()).toContain('Supercharge your Docker fleet with WUD Hub');
      expect(wrapper.text()).toContain('Automagic Tag Rules');
      expect(wrapper.text()).toContain('Changelog Intelligence');
      expect(wrapper.text()).toContain('CVE & SBOM Detection');
      expect(wrapper.text()).toContain('How to configure WUD_HUB_API_KEY?');

      // Test copy snippet
      await wrapper.find('.code-container button').trigger('click');
      expect(mockedCopyToClipboard).toHaveBeenCalledWith(
        expect.stringContaining('WUD_HUB_API_KEY=wud_live_xxxxxxxxxxxxxxxx')
      );
      expect(emitMock).toHaveBeenCalledWith('notify', 'Snippet copied to clipboard');
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

    it('renders connected cards, cloud key, and fleet quota in English', async () => {
      mockedGetHubStatus.mockResolvedValueOnce(connectedData);

      const wrapper = mount(HubView);
      await flushPromises();

      expect(wrapper.text()).toContain('Connected');
      expect(wrapper.text()).toContain('Cyberdyne Systems');
      expect(wrapper.text()).toContain('wud_...8899');
      expect(wrapper.text()).toContain('https://hub.getwud.app');
      expect(wrapper.text()).toContain('Smart Updates');
      expect(wrapper.text()).toContain('Free Trial (7 days remaining)');
      expect(wrapper.text()).toContain('18 / 25');
      expect(wrapper.text()).toContain('Manage Subscription');

      // Copy API key
      const copyKeyBtn = wrapper.find('button[title="Copy preview"]');
      expect(copyKeyBtn.exists()).toBe(true);
      await copyKeyBtn.trigger('click');
      expect(mockedCopyToClipboard).toHaveBeenCalledWith('wud_...8899');
      expect(emitMock).toHaveBeenCalledWith('notify', 'API key copied to clipboard');
    });

    it('tests connection when clicking Test Connection', async () => {
      mockedGetHubStatus
        .mockResolvedValueOnce(connectedData)
        .mockResolvedValueOnce(connectedData);

      const wrapper = mount(HubView);
      await flushPromises();

      const testBtn = wrapper
        .findAll('button')
        .find((b) => b.text().includes('Test Connection'));
      expect(testBtn).toBeDefined();
      await testBtn!.trigger('click');
      await flushPromises();

      expect(mockedGetHubStatus).toHaveBeenCalledWith({ refresh: true });
      expect(emitMock).toHaveBeenCalledWith('notify', 'Connected to WUD Hub successfully');
    });
  });

  describe('Error mode', () => {
    it('renders error alert with details and retry buttons in English', async () => {
      mockedGetHubStatus.mockResolvedValueOnce({
        enabled: true,
        status: 'error',
        endpoint: 'https://hub.getwud.app',
        hasKey: true,
        errorMessage: '(401) Invalid API Key',
      });

      const wrapper = mount(HubView);
      await flushPromises();

      expect(wrapper.text()).toContain('Error');
      expect(wrapper.text()).toContain('Invalid or Revoked API Key');
      expect(wrapper.text()).toContain('(401) Invalid API Key');
      expect(wrapper.text()).toContain('Test Connection');
      expect(wrapper.text()).toContain('Get a new key');
    });

    it('handles unexpected failure when loading status', async () => {
      mockedGetHubStatus.mockRejectedValueOnce(new Error('Network connection failure'));

      const wrapper = mount(HubView);
      await flushPromises();

      expect(wrapper.text()).toContain('Error');
      expect(wrapper.text()).toContain('Network connection failure');
    });
  });
});
