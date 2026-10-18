import { mount } from '@vue/test-utils';
import ContainerItem from '@/components/ContainerItem.vue';

const mockContainer = {
  id: 'test-container-id',
  name: 'test-container',
  displayName: 'Test Container',
  displayIcon: 'mdi-docker',
  watcher: 'local',
  image: {
    registry: { name: 'hub' },
    tag: { value: '1.0.0', semver: true },
    created: '2023-01-01T00:00:00Z',
    os: 'linux',
    architecture: 'amd64'
  },
  updateAvailable: true,
  updateKind: {
    kind: 'tag',
    semverDiff: 'minor',
    remoteValue: '1.1.0',
    localValue: '1.0.0'
  },
  result: {
    created: '2023-01-02T00:00:00Z',
    tag: '1.1.0'
  },
  labels: {
    'app': 'test-app',
    'env': 'production'
  },
  status: 'running'
};

describe('ContainerItem', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mount(ContainerItem, {
      props: {
        container: mockContainer,
        groupingLabel: '',
        oldestFirst: false
      }
    });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it('renders container information correctly', () => {
    expect(wrapper.text()).toContain('Test Container');
    expect(wrapper.text()).toContain('1.0.0');
    expect(wrapper.text()).toContain('hub');
  });

  it('displays stack chip when container has stack', async () => {
    await wrapper.setProps({
      container: {
        ...mockContainer,
        stack: 'my-compose-stack'
      }
    });
    expect(wrapper.text()).toContain('my-compose-stack');
  });

  it('shows update available indicator when update is available', () => {
    expect(wrapper.vm.newVersion).toBe('1.1.0');
  });

  it('renders new version badge before v-spacer in container title', () => {
    const cardTitle = wrapper.find('.v-card-title');
    expect(cardTitle.exists()).toBe(true);
    const html = cardTitle.html();
    const arrowIndex = html.indexOf('mdi-arrow-right');
    const spacerIndex = html.indexOf('v-spacer');
    expect(arrowIndex).toBeGreaterThan(-1);
    expect(spacerIndex).toBeGreaterThan(-1);
    expect(arrowIndex).toBeLessThan(spacerIndex);
  });

  it('displays correct update severity color for minor update', () => {
    expect(wrapper.vm.newVersionClass).toBe('warning');
  });

  it('displays correct update severity color for major update', async () => {
    await wrapper.setProps({
      container: {
        ...mockContainer,
        updateKind: { ...mockContainer.updateKind, semverDiff: 'major' }
      }
    });
    expect(wrapper.vm.newVersionClass).toBe('error');
  });

  it('displays correct update severity color for patch update', async () => {
    await wrapper.setProps({
      container: {
        ...mockContainer,
        updateKind: { ...mockContainer.updateKind, semverDiff: 'patch' }
      }
    });
    expect(wrapper.vm.newVersionClass).toBe('success');
  });

  it('shows grouping header when grouping label changes', async () => {
    const previousContainer = {
      ...mockContainer,
      labels: { 'app': 'different-app' }
    };

    await wrapper.setProps({
      groupingLabel: 'app',
      previousContainer
    });

    expect(wrapper.text()).toContain('app = test-app');
  });

  it('toggles detail view when header is clicked', async () => {
    expect(wrapper.vm.showDetail).toBe(false);
    
    await wrapper.find('[style*="cursor: pointer"]').trigger('click');
    
    expect(wrapper.vm.showDetail).toBe(true);
  });

  it('emits delete-container event when delete is called', async () => {
    await wrapper.vm.deleteContainer();
    expect(wrapper.emitted('delete-container')).toBeTruthy();
  });

  it('computes correct registry icon', () => {
    expect(wrapper.vm.registryIcon).toBe('si-docker');
  });

  it('computes correct OS icon for linux', () => {
    expect(wrapper.vm.osIcon).toBe('mdi-linux');
  });

  it('computes correct OS icon for windows', async () => {
    await wrapper.setProps({
      container: {
        ...mockContainer,
        image: { ...mockContainer.image, os: 'windows' }
      }
    });
    expect(wrapper.vm.osIcon).toBe('mdi-microsoft-windows');
  });

  it('formats digest version correctly', async () => {
    await wrapper.setProps({
      container: {
        ...mockContainer,
        updateKind: {
          kind: 'digest',
          remoteValue: 'sha256:1234567890abcdef1234567890abcdef1234567890abcdef'
        }
      }
    });
    expect(wrapper.vm.newVersion).toBe('sha256:12345678...');
  });

  it('shows update button when update is available and user has write access', async () => {
    wrapper.vm.showDetail = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.canWrite).toBe(true);
    expect(wrapper.vm.dialogUpdate).toBe(false);

    const updateBtn = wrapper.findAll('.v-btn').find((btn) => btn.text().includes('Update'));
    expect(updateBtn).toBeDefined();

    await updateBtn.trigger('click');
    expect(wrapper.vm.dialogUpdate).toBe(true);
  });

  it('hides update button when update is not available', async () => {
    wrapper.vm.showDetail = true;
    await wrapper.setProps({
      container: {
        ...mockContainer,
        updateAvailable: false,
      },
    });
    await wrapper.vm.$nextTick();

    const updateBtn = wrapper.findAll('.v-btn').find((btn) => btn.text().includes('Update'));
    expect(updateBtn).toBeUndefined();
  });

  it('hides update button when user is read-only', async () => {
    wrapper.vm.showDetail = true;
    await wrapper.setProps({
      canWriteProp: false,
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.canWrite).toBe(false);
    const updateBtn = wrapper.findAll('.v-btn').find((btn) => btn.text().includes('Update'));
    expect(updateBtn).toBeUndefined();
  });

  it('displays official badge when isOfficial is true', async () => {
    await wrapper.setProps({
      container: {
        ...mockContainer,
        isOfficial: true,
      },
    });
    expect(wrapper.text()).toContain('Official');
  });

  it('hides official badge when isOfficial is false or not set', async () => {
    await wrapper.setProps({
      container: {
        ...mockContainer,
        isOfficial: false,
      },
    });
    expect(wrapper.text()).not.toContain('Official');
  });

  it('computes docUrl from documentationUrl or link', async () => {
    expect(wrapper.vm.docUrl).toBeUndefined();

    await wrapper.setProps({
      container: {
        ...mockContainer,
        link: 'https://example.com/legacy-link',
      },
    });
    expect(wrapper.vm.docUrl).toBe('https://example.com/legacy-link');

    await wrapper.setProps({
      container: {
        ...mockContainer,
        link: 'https://example.com/legacy-link',
        documentationUrl: 'https://example.com/docs',
      },
    });
    expect(wrapper.vm.docUrl).toBe('https://example.com/docs');
  });

  it('renders Docs, Changelog, and Source action buttons when URLs are present', async () => {
    wrapper.vm.showDetail = true;
    await wrapper.setProps({
      container: {
        ...mockContainer,
        updateAvailable: false,
        documentationUrl: 'https://docs.example.com',
        changelogUrl: 'https://github.com/org/repo/releases',
        upstreamUrl: 'https://github.com/org/repo',
      },
    });
    await wrapper.vm.$nextTick();

    const buttons = wrapper.findAll('.v-card-actions .v-btn');
    const docsBtn = buttons.find((btn) => btn.text().includes('Docs'));
    const changelogBtn = buttons.find((btn) => btn.text().includes('Changelog'));
    const sourceBtn = buttons.find((btn) => btn.text().includes('Source'));

    expect(docsBtn).toBeDefined();
    expect(docsBtn.attributes('href')).toBe('https://docs.example.com');

    expect(changelogBtn).toBeDefined();
    expect(changelogBtn.attributes('href')).toBe('https://github.com/org/repo/releases');

    expect(sourceBtn).toBeDefined();
    expect(sourceBtn.attributes('href')).toBe('https://github.com/org/repo');
  });

  it('renders Release notes action button pointing to result.changelogUrl when updateAvailable is true', async () => {
    wrapper.vm.showDetail = true;
    await wrapper.setProps({
      container: {
        ...mockContainer,
        updateAvailable: true,
        changelogUrl: 'https://github.com/org/repo/releases',
        result: {
          tag: '2.0.0',
          changelogUrl: 'https://github.com/org/repo/releases/tag/v2.0.0',
        },
      },
    });
    await wrapper.vm.$nextTick();

    const buttons = wrapper.findAll('.v-card-actions .v-btn');
    const releaseNotesBtn = buttons.find((btn) => btn.text().includes('Release notes'));

    expect(releaseNotesBtn).toBeDefined();
    expect(releaseNotesBtn.attributes('href')).toBe('https://github.com/org/repo/releases/tag/v2.0.0');
    expect(releaseNotesBtn.attributes('title')).toBe('Release notes (2.0.0)');
  });
});