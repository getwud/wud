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
    expect(style.objectFit).toBe('contain');
  });

  describe('image URLs', () => {
    it('renders img tag for http URLs', () => {
      const wrapper = mount(IconRenderer, {
        props: { icon: 'http://example.com/icon.png' }
      });

      const img = wrapper.find('img');
      expect(img.exists()).toBe(true);
      expect(img.attributes('src')).toBe('http://example.com/icon.png');
      expect(img.classes()).toContain('icon-renderer');
      expect(img.classes()).toContain('icon-image');
      expect(img.attributes('alt')).toBe('');
      expect(img.attributes('loading')).toBe('lazy');
      expect(wrapper.findComponent(Icon).exists()).toBe(false);
    });

    it('renders img tag for https URLs', () => {
      const wrapper = mount(IconRenderer, {
        props: { icon: 'https://example.com/logo.svg' }
      });

      const img = wrapper.find('img');
      expect(img.exists()).toBe(true);
      expect(img.attributes('src')).toBe('https://example.com/logo.svg');
      expect(img.classes()).toContain('icon-renderer');
      expect(img.classes()).toContain('icon-image');
      expect(img.attributes('alt')).toBe('');
      expect(img.attributes('loading')).toBe('lazy');
      expect(wrapper.findComponent(Icon).exists()).toBe(false);
    });

    it('renders img tag for data:image URLs', () => {
      const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const wrapper = mount(IconRenderer, {
        props: { icon: dataUri }
      });

      const img = wrapper.find('img');
      expect(img.exists()).toBe(true);
      expect(img.attributes('src')).toBe(dataUri);
      expect(img.classes()).toContain('icon-renderer');
      expect(img.classes()).toContain('icon-image');
      expect(img.attributes('alt')).toBe('');
      expect(img.attributes('loading')).toBe('lazy');
      expect(wrapper.findComponent(Icon).exists()).toBe(false);
    });

    it('falls back to Iconify mdi:docker on error', async () => {
      const wrapper = mount(IconRenderer, {
        props: { icon: 'https://example.com/broken.png' }
      });

      expect(wrapper.find('img').exists()).toBe(true);
      expect(wrapper.findComponent(Icon).exists()).toBe(false);

      await wrapper.find('img').trigger('error');

      expect(wrapper.find('img').exists()).toBe(false);
      expect(wrapper.findComponent(Icon).exists()).toBe(true);
      expect(wrapper.findComponent(Icon).props('icon')).toBe('mdi:docker');
      expect(wrapper.vm.normalizedIcon).toBe('mdi:docker');
    });

    it('resets error state when icon prop changes', async () => {
      const wrapper = mount(IconRenderer, {
        props: { icon: 'https://example.com/broken.png' }
      });

      await wrapper.find('img').trigger('error');
      expect(wrapper.find('img').exists()).toBe(false);
      expect(wrapper.findComponent(Icon).exists()).toBe(true);

      await wrapper.setProps({ icon: 'https://example.com/new.png' });
      expect(wrapper.find('img').exists()).toBe(true);
      expect(wrapper.findComponent(Icon).exists()).toBe(false);
    });

    it('continues to render Icon component for regular icon strings', () => {
      const mdiWrapper = mount(IconRenderer, {
        props: { icon: 'mdi:docker' }
      });
      expect(mdiWrapper.find('img').exists()).toBe(false);
      expect(mdiWrapper.findComponent(Icon).exists()).toBe(true);
      expect(mdiWrapper.vm.normalizedIcon).toBe('mdi:docker');

      const siWrapper = mount(IconRenderer, {
        props: { icon: 'si:nginx' }
      });
      expect(siWrapper.find('img').exists()).toBe(false);
      expect(siWrapper.findComponent(Icon).exists()).toBe(true);
      expect(siWrapper.vm.normalizedIcon).toBe('simple-icons:nginx');

      const nameWrapper = mount(IconRenderer, {
        props: { icon: 'nginx' }
      });
      expect(nameWrapper.find('img').exists()).toBe(false);
      expect(nameWrapper.findComponent(Icon).exists()).toBe(true);
      expect(nameWrapper.vm.normalizedIcon).toBe('simple-icons:nginx');
    });
  });
});
