import { mount } from '@vue/test-utils';
import ContainerItem from '@/components/ContainerItem';

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

  it('shows update available indicator when update is available', () => {
    expect(wrapper.vm.newVersion).toBe('1.1.0');
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
});