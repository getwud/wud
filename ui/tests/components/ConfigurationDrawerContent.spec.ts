import { mount } from '@vue/test-utils';
import ConfigurationDrawerContent from '@/components/ConfigurationDrawerContent.vue';

describe('ConfigurationDrawerContent.vue', () => {
  const mockItem = {
    id: 'hub.myhub',
    type: 'hub',
    name: 'myhub',
    icon: 'si-docker',
    configuration: {
      url: 'https://registry.hub.docker.com',
      active: true,
      emptyVal: '',
      extra: { foo: 'bar' },
    },
  };

  it('renders item header with name and type', () => {
    const wrapper = mount(ConfigurationDrawerContent, {
      props: {
        item: mockItem,
      },
    });

    expect(wrapper.text()).toContain('myhub');
    expect(wrapper.text()).toContain('hub');
    expect(wrapper.text()).toContain('ID: hub.myhub');
  });

  it('computes and formats configuration items', () => {
    const wrapper = mount(ConfigurationDrawerContent, {
      props: {
        item: mockItem,
      },
    });

    const vm = wrapper.vm as any;
    expect(vm.configurationItems).toHaveLength(4);
    expect(vm.configurationItems[0].key).toBe('active');
    expect(vm.configurationItems[1].key).toBe('emptyVal');
    expect(vm.configurationItems[2].key).toBe('extra.foo');
    expect(vm.configurationItems[3].key).toBe('url');
  });

  it('shows empty configuration message when configuration is empty', () => {
    const wrapper = mount(ConfigurationDrawerContent, {
      props: {
        item: {
          id: 'test.empty',
          type: 'test',
          name: 'empty',
          configuration: {},
        },
      },
    });

    expect(wrapper.text()).toContain('Default configuration');
  });

  it('copies value to clipboard', () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn(),
      },
    });

    const wrapper = mount(ConfigurationDrawerContent, {
      props: {
        item: mockItem,
      },
    });

    (wrapper.vm as any).copyValue('url', 'https://registry.hub.docker.com');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://registry.hub.docker.com');
  });
});
