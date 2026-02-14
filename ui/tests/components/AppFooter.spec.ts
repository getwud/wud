import { mount } from '@vue/test-utils';
import AppFooter from '@/components/AppFooter';

// Mock the app service
jest.mock('@/services/app', () => ({
  getAppInfos: jest.fn(() => Promise.resolve({ version: '1.0.0' }))
}));

describe('AppFooter', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mount(AppFooter);
  });

  afterEach(() => {
    wrapper.unmount();
  });

  it('renders footer content', () => {
    expect(wrapper.exists()).toBe(true);
  });

  it('displays version information', async () => {
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.version).toBe('1.0.0');
  });

  it('displays current year', () => {
    const currentYear = new Date().getFullYear();
    expect(wrapper.text()).toContain(currentYear.toString());
  });
});