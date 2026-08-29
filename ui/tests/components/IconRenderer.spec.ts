import { mount } from '@vue/test-utils';
import IconRenderer from '@/components/IconRenderer.vue';
import { Icon } from '@iconify/vue';

describe('IconRenderer', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('renders Icon component when icon is provided', () => {
    const wrapper = mount(IconRenderer, {
      props: { icon: 'mdi:docker' }
    });

    expect(wrapper.findComponent(Icon).exists()).toBe(true);
    expect(wrapper.vm.normalizedIcon).toBe('mdi:docker');
  });

  it('normalizes homarr icons to selfhst and logs a deprecation warning', () => {
    const wrapper = mount(IconRenderer, {
      props: { icon: 'hl:plex' }
    });

    expect(wrapper.vm.normalizedIcon).toBe('selfhst:plex');
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[WUD] Icon prefix 'hl:'/'hl-' is deprecated")
    );
  });

  it('normalizes homarr with hyphen to selfhst', () => {
    const wrapper = mount(IconRenderer, {
      props: { icon: 'hl-plex' }
    });

    expect(wrapper.vm.normalizedIcon).toBe('selfhst:plex');
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it('normalizes selfhst icons correctly', () => {
    const colonWrapper = mount(IconRenderer, {
      props: { icon: 'sh:authentik' }
    });
    expect(colonWrapper.vm.normalizedIcon).toBe('selfhst:authentik');

    const hyphenWrapper = mount(IconRenderer, {
      props: { icon: 'sh-authentik' }
    });
    expect(hyphenWrapper.vm.normalizedIcon).toBe('selfhst:authentik');
  });

  it('normalizes simple-icons correctly', () => {
    const colonWrapper = mount(IconRenderer, {
      props: { icon: 'si:docker' }
    });
    expect(colonWrapper.vm.normalizedIcon).toBe('simple-icons:docker');

    const hyphenWrapper = mount(IconRenderer, {
      props: { icon: 'si-docker' }
    });
    expect(hyphenWrapper.vm.normalizedIcon).toBe('simple-icons:docker');
  });

  it('normalizes mdi icons correctly', () => {
    const colonWrapper = mount(IconRenderer, {
      props: { icon: 'mdi:docker' }
    });
    expect(colonWrapper.vm.normalizedIcon).toBe('mdi:docker');

    const hyphenWrapper = mount(IconRenderer, {
      props: { icon: 'mdi-docker' }
    });
    expect(hyphenWrapper.vm.normalizedIcon).toBe('mdi:docker');
  });

  it('normalizes font awesome icons correctly', () => {
    expect(mount(IconRenderer, { props: { icon: 'fa:docker' } }).vm.normalizedIcon).toBe('fa6-solid:docker');
    expect(mount(IconRenderer, { props: { icon: 'fa-docker' } }).vm.normalizedIcon).toBe('fa6-solid:docker');
    expect(mount(IconRenderer, { props: { icon: 'fas:heart' } }).vm.normalizedIcon).toBe('fa6-solid:heart');
    expect(mount(IconRenderer, { props: { icon: 'far:heart' } }).vm.normalizedIcon).toBe('fa6-regular:heart');
    expect(mount(IconRenderer, { props: { icon: 'fab:github' } }).vm.normalizedIcon).toBe('fa6-brands:github');
  });

  it('preserves custom Iconify collection prefixes', () => {
    const wrapper = mount(IconRenderer, {
      props: { icon: 'logos:docker-icon' }
    });

    expect(wrapper.vm.normalizedIcon).toBe('logos:docker-icon');
  });

  it('defaults to simple-icons when no prefix is provided', () => {
    const wrapper = mount(IconRenderer, {
      props: { icon: 'nginx' }
    });

    expect(wrapper.vm.normalizedIcon).toBe('simple-icons:nginx');
  });

  it('handles empty and null icon gracefully', () => {
    const emptyWrapper = mount(IconRenderer, {
      props: { icon: '' }
    });
    expect(emptyWrapper.vm.normalizedIcon).toBe('');
    expect(emptyWrapper.findComponent(Icon).exists()).toBe(false);
  });

  it('applies correct styling based on props', () => {
    const wrapper = mount(IconRenderer, {
      props: {
        icon: 'mdi:docker',
        size: 32,
        marginRight: 16
      }
    });

    const style = wrapper.vm.iconStyle;
    expect(style.width).toBe('32px');
    expect(style.height).toBe('32px');
    expect(style.marginRight).toBe('16px');
  });

  it('uses default size and margin when not specified', () => {
    const wrapper = mount(IconRenderer, {
      props: { icon: 'mdi:docker' }
    });

    const style = wrapper.vm.iconStyle;
    expect(style.width).toBe('24px');
    expect(style.height).toBe('24px');
    expect(style.marginRight).toBe('8px');
  });
});