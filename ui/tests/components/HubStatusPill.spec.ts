import { mount, flushPromises } from '@vue/test-utils';
import HubStatusPill from '@/components/HubStatusPill.vue';
import * as hubService from '@/services/hub';

const pushMock = jest.fn();
jest.mock('vue-router', () => ({
  useRouter: jest.fn(() => ({
    push: pushMock,
  })),
}));

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
    expect((wrapper.vm as any).tooltipText).toBe(
      'WUD Standalone mode. Set WUD_HUB_API_KEY to enable automagic discovery.'
    );
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
    expect((wrapper.vm as any).tooltipText).toBe(
      'Connected to WUD Hub — Automagic configuration discovery active.'
    );
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
    expect((wrapper.vm as any).tooltipText).toBe('Rate limit exceeded');
  });

  it('renders Hub Error when getHubStatus throws', async () => {
    mockedGetHubStatus.mockRejectedValueOnce(new Error('Network error'));

    const wrapper = mount(HubStatusPill);
    await flushPromises();

    expect(wrapper.text()).toContain('Hub Error');
    expect(wrapper.find('.hub-status-pill').classes()).toContain('status-error');
    expect((wrapper.vm as any).tooltipText).toBe(
      'WUD Hub API key invalid or rejected (401/403). Check your environment variable.'
    );
  });

  it('redirects to /hub on click', async () => {
    mockedGetHubStatus.mockResolvedValueOnce({
      enabled: true,
      status: 'connected',
      endpoint: 'https://hub.getwud.com',
      hasKey: true,
    });

    const wrapper = mount(HubStatusPill);
    await flushPromises();

    await wrapper.find('.hub-status-pill').trigger('click');
    expect(pushMock).toHaveBeenCalledWith('/hub');
  });
});
