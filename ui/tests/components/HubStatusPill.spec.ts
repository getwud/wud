import { mount, flushPromises } from '@vue/test-utils';
import HubStatusPill from '@/components/HubStatusPill.vue';
import * as hubService from '@/services/hub';

jest.mock('@/services/hub', () => ({
  getHubStatus: jest.fn(),
}));

describe('HubStatusPill', () => {
  const mockedGetHubStatus = hubService.getHubStatus as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Standalone by default when Hub is in standalone status', async () => {
    mockedGetHubStatus.mockResolvedValueOnce({
      enabled: false,
      status: 'standalone',
      endpoint: '',
      hasKey: false,
    });

    const wrapper = mount(HubStatusPill);
    await flushPromises();

    expect(wrapper.text()).toContain('Standalone');
    expect(wrapper.find('.hub-status-pill').classes()).toContain('status-standalone');
  });

  it('renders Hub and connected status class when Hub is connected', async () => {
    mockedGetHubStatus.mockResolvedValueOnce({
      enabled: true,
      status: 'connected',
      endpoint: 'https://hub.getwud.com',
      hasKey: true,
    });

    const wrapper = mount(HubStatusPill);
    await flushPromises();

    expect(wrapper.text()).toContain('Hub');
    expect(wrapper.find('.hub-status-pill').classes()).toContain('status-connected');
  });

  it('renders Hub Degraded when status is degraded', async () => {
    mockedGetHubStatus.mockResolvedValueOnce({
      enabled: true,
      status: 'degraded',
      endpoint: 'https://hub.getwud.com',
      hasKey: true,
      errorMessage: 'Rate limit exceeded',
    });

    const wrapper = mount(HubStatusPill);
    await flushPromises();

    expect(wrapper.text()).toContain('Hub Degraded');
    expect(wrapper.find('.hub-status-pill').classes()).toContain('status-degraded');
  });

  it('renders Hub Error when getHubStatus throws', async () => {
    mockedGetHubStatus.mockRejectedValueOnce(new Error('Network error'));

    const wrapper = mount(HubStatusPill);
    await flushPromises();

    expect(wrapper.text()).toContain('Hub Error');
    expect(wrapper.find('.hub-status-pill').classes()).toContain('status-error');
  });
});
