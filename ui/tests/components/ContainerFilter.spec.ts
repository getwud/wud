import { mount } from '@vue/test-utils';
import ContainerFilter from '@/components/ContainerFilter';

const mockProps = {
  registries: ['hub', 'ghcr'],
  registrySelectedInit: '',
  watchers: ['local', 'docker'],
  watcherSelectedInit: '',
  updateKinds: ['major', 'minor', 'patch'],
  updateKindSelectedInit: '',
  updateAvailable: false,
  oldestFirst: false,
  groupLabels: ['app', 'env', 'version'],
  groupByLabel: ''
};

// Mock the container service
jest.mock('@/services/container', () => ({
  refreshAllContainers: jest.fn(() => Promise.resolve([]))
}));

describe('ContainerFilter', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mount(ContainerFilter, {
      props: mockProps
    });
  });

  afterEach(() => {
    wrapper.unmount();
  });

  it('renders all filter components', () => {
    expect(wrapper.exists()).toBe(true);
  });

  it('emits registry-changed event when registry selection changes', async () => {
    wrapper.vm.registrySelected = 'hub';
    await wrapper.vm.emitRegistryChanged();
    
    expect(wrapper.emitted('registry-changed')).toBeTruthy();
    expect(wrapper.emitted('registry-changed')[0]).toEqual(['hub']);
  });

  it('emits watcher-changed event when watcher selection changes', async () => {
    wrapper.vm.watcherSelected = 'docker';
    await wrapper.vm.emitWatcherChanged();
    
    expect(wrapper.emitted('watcher-changed')).toBeTruthy();
    expect(wrapper.emitted('watcher-changed')[0]).toEqual(['docker']);
  });

  it('emits update-kind-changed event when update kind selection changes', async () => {
    wrapper.vm.updateKindSelected = 'major';
    await wrapper.vm.emitUpdateKindChanged();
    
    expect(wrapper.emitted('update-kind-changed')).toBeTruthy();
    expect(wrapper.emitted('update-kind-changed')[0]).toEqual(['major']);
  });

  it('emits group-by-label-changed event when group by label changes', async () => {
    await wrapper.vm.emitGroupByLabelChanged('app');
    
    expect(wrapper.emitted('group-by-label-changed')).toBeTruthy();
    expect(wrapper.emitted('group-by-label-changed')[0]).toEqual(['app']);
  });

  it('emits update-available-changed event when update available toggle changes', async () => {
    await wrapper.vm.emitUpdateAvailableChanged();
    
    expect(wrapper.emitted('update-available-changed')).toBeTruthy();
  });

  it('emits oldest-first-changed event when oldest first toggle changes', async () => {
    await wrapper.vm.emitOldestFirstChanged();
    
    expect(wrapper.emitted('oldest-first-changed')).toBeTruthy();
  });

  it('handles refresh all containers action', async () => {
    const { refreshAllContainers } = require('@/services/container');
    refreshAllContainers.mockResolvedValue([{ id: 'test' }]);

    await wrapper.vm.refreshAllContainers();

    expect(refreshAllContainers).toHaveBeenCalled();
    expect(wrapper.emitted('refresh-all-containers')).toBeTruthy();
  });

  it('handles refresh error gracefully', async () => {
    const { refreshAllContainers } = require('@/services/container');
    refreshAllContainers.mockRejectedValue(new Error('Network error'));

    await wrapper.vm.refreshAllContainers();

    expect(wrapper.vm.isRefreshing).toBe(false);
  });

  it('updates local state when props change', async () => {
    await wrapper.setProps({
      registrySelectedInit: 'ghcr',
      watcherSelectedInit: 'docker',
      updateAvailable: true,
      oldestFirst: true,
      groupByLabel: 'app'
    });

    await wrapper.vm.$nextTick();
    
    expect(wrapper.vm.registrySelected).toBe('ghcr');
    expect(wrapper.vm.watcherSelected).toBe('docker');
    expect(wrapper.vm.updateAvailableLocal).toBe(true);
    expect(wrapper.vm.oldestFirstLocal).toBe(true);
    expect(wrapper.vm.groupByLabelLocal).toBe('app');
  });

  it('handles null values in emit functions', async () => {
    await wrapper.vm.emitRegistryChanged();
    expect(wrapper.emitted('registry-changed')[0]).toEqual(['']);

    await wrapper.vm.emitGroupByLabelChanged(null);
    expect(wrapper.emitted('group-by-label-changed')[0]).toEqual(['']);
  });
});