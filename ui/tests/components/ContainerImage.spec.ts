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

  it('does not render the upstream row when the image has no upstream', () => {
    wrapper = mount(ContainerImage, {
      props: { image: baseImage },
    });

    expect(wrapper.text()).not.toContain('Tracks upstream image');
  });

  it('renders the tracked upstream image when declared by label', () => {
    wrapper = mount(ContainerImage, {
      props: {
        image: {
          ...baseImage,
          upstream: {
            ref: 'caddy',
            source: 'label',
            name: 'library/caddy',
            registry: { name: 'hub', url: 'https://registry-1.docker.io/v2' },
            tag: '2.9.1-alpine',
          },
        },
      },
    });

    expect(wrapper.text()).toContain('Tracks upstream image');
    expect(wrapper.text()).toContain('label');
    expect(wrapper.text()).toContain('hub / library/caddy:2.9.1-alpine');
  });

  it('flags an upstream image declared by the OCI base image annotation', () => {
    wrapper = mount(ContainerImage, {
      props: {
        image: {
          ...baseImage,
          upstream: {
            ref: 'docker.io/library/caddy:2.9.1-alpine',
            source: 'oci',
            name: 'library/caddy',
            registry: { name: 'hub', url: 'https://registry-1.docker.io/v2' },
            tag: '2.9.1-alpine',
          },
        },
      },
    });

    expect(wrapper.text()).toContain('OCI base image');
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
