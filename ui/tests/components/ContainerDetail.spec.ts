import { mount } from '@vue/test-utils';
import ContainerDetail from '@/components/ContainerDetail.vue';
import * as clipboardService from '@/services/clipboard';

jest.mock('@/services/clipboard');

describe('ContainerDetail', () => {
  let wrapper: any;

  const baseContainer = {
    id: 'c123456789',
    name: 'test-container',
    status: 'running',
    watcher: 'local',
  };

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    jest.clearAllMocks();
  });

  it('renders basic container properties', () => {
    wrapper = mount(ContainerDetail, {
      props: {
        container: baseContainer,
      },
    });

    expect(wrapper.text()).toContain('c123456789');
    expect(wrapper.text()).toContain('test-container');
    expect(wrapper.text()).toContain('running');
    expect(wrapper.text()).toContain('local');
  });

  it('renders official badge when container.isOfficial is true', () => {
    wrapper = mount(ContainerDetail, {
      props: {
        container: {
          ...baseContainer,
          isOfficial: true,
        },
      },
    });

    expect(wrapper.text()).toContain('Official');
    expect(wrapper.text()).toContain('Official Docker Image');
  });

  it('does not render official badge when container.isOfficial is false or omitted', () => {
    wrapper = mount(ContainerDetail, {
      props: {
        container: {
          ...baseContainer,
          isOfficial: false,
        },
      },
    });

    expect(wrapper.text()).not.toContain('Official Docker Image');
  });

  it('renders documentationUrl, changelogUrl, and upstreamUrl links', () => {
    wrapper = mount(ContainerDetail, {
      props: {
        container: {
          ...baseContainer,
          documentationUrl: 'https://docs.example.com',
          changelogUrl: 'https://github.com/example/app/releases',
          upstreamUrl: 'https://github.com/example/app',
        },
      },
    });

    expect(wrapper.text()).toContain('Documentation');
    expect(wrapper.text()).toContain('https://docs.example.com');
    expect(wrapper.text()).toContain('Changelog');
    expect(wrapper.text()).toContain('https://github.com/example/app/releases');
    expect(wrapper.text()).toContain('Source Code');
    expect(wrapper.text()).toContain('https://github.com/example/app');
  });

  it('does not render legacy link or linkTemplate', () => {
    wrapper = mount(ContainerDetail, {
      props: {
        container: {
          ...baseContainer,
          documentationUrl: 'https://docs.example.com',
          upstreamUrl: 'https://github.com/example/app',
          link: 'https://custom-portal.example.com',
          linkTemplate: 'https://example.com/${tag}',
        },
      },
    });

    const listTitles = wrapper.findAll('.v-list-item-title').map((el: any) => el.text());
    expect(listTitles).toContain('Documentation');
    expect(listTitles).toContain('Source Code');
    expect(listTitles).not.toContain('Link');
    expect(listTitles).not.toContain('Link template');
  });

  it('calls copyToClipboard when copy button is clicked', async () => {
    (clipboardService.copyToClipboard as jest.Mock).mockResolvedValue(true);

    wrapper = mount(ContainerDetail, {
      props: {
        container: baseContainer,
      },
    });

    await wrapper.vm.copyToClipboard('container id', 'c123456789');
    expect(clipboardService.copyToClipboard).toHaveBeenCalledWith('c123456789');
  });
});
