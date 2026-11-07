import { mount } from '@vue/test-utils';
import ContainerImage from '@/components/ContainerImage.vue';

describe('ContainerImage', () => {
  let wrapper: any;

  const baseImage = {
    id: 'img123456789',
    name: 'test-image',
    registry: { name: 'hub', url: 'https://hub.docker.com' },
    tag: { value: 'latest', semver: false },
    digest: { value: 'sha256:123456789' },
    os: 'linux',
    architecture: 'amd64',
  };

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it('renders image properties correctly', () => {
    wrapper = mount(ContainerImage, {
      props: { image: baseImage },
    });

    expect(wrapper.text()).toContain('img123456789');
    expect(wrapper.text()).toContain('test-image');
    expect(wrapper.text()).toContain('hub');
    expect(wrapper.text()).toContain('latest');
    expect(wrapper.text()).toContain('linux / amd64');
    expect(wrapper.text()).not.toContain('Version');
  });

  it('renders version when present on image', () => {
    wrapper = mount(ContainerImage, {
      props: {
        image: {
          ...baseImage,
          version: '1.2.3',
        },
      },
    });

    expect(wrapper.text()).toContain('Version');
    expect(wrapper.text()).toContain('1.2.3');
  });
});
