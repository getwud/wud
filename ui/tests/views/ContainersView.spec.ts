import { mount } from '@vue/test-utils';
import ContainersView from '@/views/ContainersView.vue';

// Mock the container service
jest.mock('@/services/container', () => ({
  getAllContainers: jest.fn(),
  deleteContainer: jest.fn()
}));

const mockContainers = [
  {
    id: '1',
    displayName: 'Container 1',
    watcher: 'local',
    image: { registry: { name: 'hub' }, created: '2023-01-01T00:00:00Z' },
    updateAvailable: true,
    updateKind: { semverDiff: 'minor' },
    labels: { app: 'web', env: 'prod' }
  },
  {
    id: '2',
    displayName: 'Container 2',
    watcher: 'docker',
    image: { registry: { name: 'ghcr' }, created: '2023-01-02T00:00:00Z' },
    updateAvailable: false,
    labels: { app: 'api', env: 'dev' }
  }
];

describe('ContainersView', () => {
  let wrapper;

  beforeEach(() => {
    const { getAllContainers } = require('@/services/container');
    getAllContainers.mockResolvedValue(mockContainers);

    wrapper = mount(ContainersView, {
      global: {
        stubs: {
          'container-filter': true,
          'container-item': true
        }
      }
    });
    wrapper.vm.onRefreshAllContainers(mockContainers);
  });

  afterEach(() => {
    wrapper.unmount();
  });

  it('renders container filter and container items', () => {
    expect(wrapper.vm.containers).toHaveLength(2);
    expect(wrapper.vm.containersFiltered).toHaveLength(2);
  });

  it('computes registries correctly', () => {
    expect(wrapper.vm.registries).toEqual(['ghcr', 'hub']);
  });

  it('computes watchers correctly', () => {
    expect(wrapper.vm.watchers).toEqual(['docker', 'local']);
  });

  it('computes update kinds correctly', () => {
    expect(Array.isArray(wrapper.vm.updateKinds)).toBe(true);
  });

  it('computes all container labels correctly', () => {
    const labels = wrapper.vm.allContainerLabels;
    expect(labels).toContain('app');
    expect(labels).toContain('env');
  });

  it('filters containers by registry', async () => {
    wrapper.vm.registrySelected = 'hub';
    await wrapper.vm.$nextTick();

    const filtered = wrapper.vm.containersFiltered;
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('1');
  });

  it('filters containers by watcher', async () => {
    wrapper.vm.watcherSelected = 'docker';
    await wrapper.vm.$nextTick();

    const filtered = wrapper.vm.containersFiltered;
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('2');
  });

  it('filters containers by update available', async () => {
    wrapper.vm.updateAvailableSelected = true;
    await wrapper.vm.$nextTick();

    const filtered = wrapper.vm.containersFiltered;
    expect(filtered).toHaveLength(1);
    expect(filtered[0].updateAvailable).toBe(true);
  });

  it('sorts containers by oldest first when enabled', async () => {
    wrapper.vm.oldestFirst = true;
    await wrapper.vm.$nextTick();

    const filtered = wrapper.vm.containersFiltered;
    expect(filtered[0].id).toBe('1'); // Created 2023-01-01
    expect(filtered[1].id).toBe('2'); // Created 2023-01-02
  });

  it('groups containers by label', async () => {
    wrapper.vm.groupByLabel = 'app';
    await wrapper.vm.$nextTick();

    const filtered = wrapper.vm.containersFiltered;
    // Should be sorted by label value
    expect(filtered[0].labels.app).toBe('api');
    expect(filtered[1].labels.app).toBe('web');
  });

  it('handles registry filter change', async () => {
    await wrapper.vm.onRegistryChanged('hub');

    expect(wrapper.vm.registrySelected).toBe('hub');
  });

  it('handles watcher filter change', async () => {
    await wrapper.vm.onWatcherChanged('docker');

    expect(wrapper.vm.watcherSelected).toBe('docker');
  });

  it('handles update available toggle', async () => {
    const initialValue = wrapper.vm.updateAvailableSelected;
    await wrapper.vm.onUpdateAvailableChanged();

    expect(wrapper.vm.updateAvailableSelected).toBe(!initialValue);
  });

  it('handles oldest first toggle', async () => {
    const initialValue = wrapper.vm.oldestFirst;
    await wrapper.vm.onOldestFirstChanged();

    expect(wrapper.vm.oldestFirst).toBe(!initialValue);
  });

  it('handles group by label change', async () => {
    await wrapper.vm.onGroupByLabelChanged('env');

    expect(wrapper.vm.groupByLabel).toBe('env');
  });

  it('removes container from list when deleted', async () => {
    const containerToDelete = mockContainers[0];
    
    wrapper.vm.removeContainerFromList(containerToDelete);

    expect(wrapper.vm.containers).toHaveLength(1);
    expect(wrapper.vm.containers[0].id).toBe('2');
  });

  it('deletes container successfully', async () => {
    const { deleteContainer } = require('@/services/container');
    deleteContainer.mockResolvedValue();

    const containerToDelete = mockContainers[0];
    await wrapper.vm.deleteContainer(containerToDelete);

    expect(deleteContainer).toHaveBeenCalledWith('1');
    expect(wrapper.vm.containers).toHaveLength(1);
  });

  it('handles delete container error', async () => {
    const { deleteContainer } = require('@/services/container');
    deleteContainer.mockRejectedValue(new Error('Delete failed'));

    const containerToDelete = mockContainers[0];
    await wrapper.vm.deleteContainer(containerToDelete);

    // Container should still be in the list
    expect(wrapper.vm.containers).toHaveLength(2);
  });

  it('shows no containers message when list is empty', async () => {
    wrapper.vm.containers = [];
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.containersFiltered).toHaveLength(0);
  });
});
