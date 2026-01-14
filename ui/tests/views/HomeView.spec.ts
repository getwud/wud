import { mount } from '@vue/test-utils';
import HomeView from '@/views/HomeView.vue';

jest.mock('@/services/container', () => ({
  getContainerIcon: jest.fn(() => 'mdi-docker'),
  getAllContainers: jest.fn(() => Promise.resolve([]))
}));

describe('HomeView', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mount(HomeView);
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it('renders home view', () => {
    expect(wrapper.exists()).toBe(true);
  });

  it('displays welcome content', () => {
    expect(wrapper.find('.v-container').exists()).toBe(true);
  });
});