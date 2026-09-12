import { mount } from '@vue/test-utils';
import ContainersView from '@/views/ContainersView.vue';

// Mock the container service
jest.mock('@/services/container', () => ({
  getAllContainers: jest.fn(),
  deleteContainer: jest.fn(),
  snoozeContainer: jest.fn(),
  unsnoozeContainer: jest.fn(),
}));

const mockContainers = [
  {
    id: '1',
    displayName: 'Container 1',
    watcher: 'local',
    image: { registry: { name: 'hub' }, created: '2023-01-01T00:00:00Z' },
    updateAvailable: true,
    updateKind: { semverDiff: 'minor' },
    labels: { app: 'web', env: 'prod' },
    stack: 'monitoring'
  },
  {
    id: '2',
    displayName: 'Container 2',
    watcher: 'docker',
    image: { registry: { name: 'ghcr' }, created: '2023-01-02T00:00:00Z' },
    updateAvailable: false,
    labels: { app: 'api', env: 'dev' },
    stack: 'web'
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

  it('computes stacks correctly', () => {
    expect(wrapper.vm.stacks).toEqual(['monitoring', 'web']);
  });

  it('filters containers by stack', async () => {
    wrapper.vm.stackSelected = 'monitoring';
    await wrapper.vm.$nextTick();

    const filtered = wrapper.vm.containersFiltered;
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('1');
  });

  it('filters containers by search query matching name or stack', async () => {
    wrapper.vm.searchQuery = 'web';
    await wrapper.vm.$nextTick();

    const filtered = wrapper.vm.containersFiltered;
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('2');
  });

  it('sets stack filter when onStackChipClick is called', async () => {
    wrapper.vm.onStackChipClick('web');
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.stackSelected).toBe('web');
    expect(wrapper.vm.containersFiltered).toHaveLength(1);
    expect(wrapper.vm.containersFiltered[0].id).toBe('2');
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
    expect(wrapper.vm.groupBy).toEqual([]);

    wrapper.vm.groupByLabel = 'app';
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.groupBy).toEqual([{ key: 'containerGroup', order: 'asc' }]);
  });

  it('correctly sets containerGroup and sorts items with dotted labels (e.g. com.docker.compose.project)', async () => {
    wrapper.vm.containers = [
      {
        id: '1',
        displayName: 'Container Z',
        image: { registry: { name: 'hub' } },
        labels: { 'com.docker.compose.project': 'project-z' }
      },
      {
        id: '2',
        displayName: 'Container A',
        image: { registry: { name: 'hub' } },
        labels: { 'com.docker.compose.project': 'project-a' }
      },
      {
        id: '3',
        displayName: 'Container No Label',
        image: { registry: { name: 'hub' } },
        labels: {}
      }
    ];

    wrapper.vm.groupByLabel = 'com.docker.compose.project';
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.groupBy).toEqual([{ key: 'containerGroup', order: 'asc' }]);

    const filtered = wrapper.vm.containersFiltered;
    expect(filtered).toHaveLength(3);
    // Group 'project-a' comes first
    expect(filtered[0].id).toBe('2');
    expect(filtered[0].containerGroup).toBe('project-a');
    // Group 'project-z' comes second
    expect(filtered[1].id).toBe('1');
    expect(filtered[1].containerGroup).toBe('project-z');
    // Containers with missing label group under '(empty)' and come last
    expect(filtered[2].id).toBe('3');
    expect(filtered[2].containerGroup).toBe('(empty)');
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

  it('confirms container for deletion', async () => {
    const containerToDelete = mockContainers[0];
    
    wrapper.vm.confirmDelete(containerToDelete);

    expect(wrapper.vm.containerToDelete).toEqual(containerToDelete);
    expect(wrapper.vm.dialogDelete).toBe(true);
  });

  it('deletes container successfully', async () => {
    const { deleteContainer } = require('@/services/container');
    deleteContainer.mockResolvedValue();

    const containerToDelete = mockContainers[0];
    wrapper.vm.confirmDelete(containerToDelete);
    await wrapper.vm.executeDelete();

    expect(deleteContainer).toHaveBeenCalledWith('1');
    expect(wrapper.vm.containers).toHaveLength(1);
    expect(wrapper.vm.containerToDelete).toBeNull();
  });

  it('handles delete container error', async () => {
    const { deleteContainer } = require('@/services/container');
    deleteContainer.mockRejectedValue(new Error('Delete failed'));

    wrapper.vm.$eventBus = { emit: jest.fn() };

    const containerToDelete = mockContainers[0];
    wrapper.vm.confirmDelete(containerToDelete);
    await wrapper.vm.executeDelete();

    // Container should still be in the list
    expect(wrapper.vm.containers).toHaveLength(2);
    expect(wrapper.vm.$eventBus.emit).toHaveBeenCalledWith("notify", "Error when trying to delete the container (Delete failed)", "error");
    expect(wrapper.vm.containerToDelete).toBeNull();
  });

  it('shows no containers message when list is empty', async () => {
    wrapper.vm.containers = [];
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.containersFiltered).toHaveLength(0);
  });

  describe('slide-over container drawer', () => {
    it('opens drawer on openContainerDrawer with update tab if result present', () => {
      const containerWithResult = {
        ...mockContainers[0],
        result: { link: 'https://example.com' }
      };

      wrapper.vm.openContainerDrawer(containerWithResult);

      expect(wrapper.vm.drawerOpen).toBe(true);
      expect(wrapper.vm.selectedContainer).toEqual(containerWithResult);
      expect(wrapper.vm.drawerTab).toBe('update');
    });

    it('opens drawer on openContainerDrawer with triggers tab if no result', () => {
      const containerWithoutResult = {
        ...mockContainers[1],
        result: null
      };

      wrapper.vm.openContainerDrawer(containerWithoutResult);

      expect(wrapper.vm.drawerOpen).toBe(true);
      expect(wrapper.vm.selectedContainer).toEqual(containerWithoutResult);
      expect(wrapper.vm.drawerTab).toBe('triggers');
    });

    it('handles onRowClick properly', () => {
      const rowItem = { item: { raw: mockContainers[0] } };
      wrapper.vm.onRowClick({}, rowItem);

      expect(wrapper.vm.drawerOpen).toBe(true);
      expect(wrapper.vm.selectedContainer).toEqual(mockContainers[0]);
    });

    it('closes drawer when the selected container is deleted', async () => {
      const { deleteContainer } = require('@/services/container');
      deleteContainer.mockResolvedValue();

      wrapper.vm.openContainerDrawer(mockContainers[0]);
      expect(wrapper.vm.drawerOpen).toBe(true);

      wrapper.vm.confirmDelete(mockContainers[0]);
      await wrapper.vm.executeDelete();

      expect(wrapper.vm.drawerOpen).toBe(false);
      expect(wrapper.vm.selectedContainer).toBeNull();
    });
  });

  describe('table headers and sorting', () => {
    it('defines sortable headers for all columns', () => {
      const headers = wrapper.vm.headers;
      expect(headers).toHaveLength(7);
      
      const keys = headers.map((h: any) => h.key);
      expect(keys).toEqual(['watcher', 'registry', 'stack', 'displayName', 'currentVersion', 'update', 'actions']);

      headers.filter((h: any) => h.key !== 'actions').forEach((header: any) => {
        expect(header.sortable).toBe(true);
      });
    });

    it('resolves header values correctly for nested properties', () => {
      const headers = wrapper.vm.headers;
      const sampleItem = {
        name: 'test-name',
        displayName: 'Test Display',
        watcher: 'docker-local',
        stack: 'test-stack',
        image: {
          registry: { name: 'quay' },
          tag: { value: '1.2.3' }
        },
        updateAvailable: true,
        updateKind: { remoteValue: '1.3.0' }
      };

      const watcherHeader = headers.find((h: any) => h.key === 'watcher');
      const registryHeader = headers.find((h: any) => h.key === 'registry');
      const stackHeader = headers.find((h: any) => h.key === 'stack');
      const containerHeader = headers.find((h: any) => h.key === 'displayName');
      const versionHeader = headers.find((h: any) => h.key === 'currentVersion');
      const updateHeader = headers.find((h: any) => h.key === 'update');

      expect(watcherHeader.value(sampleItem)).toBe('docker-local');
      expect(registryHeader.value(sampleItem)).toBe('quay');
      expect(stackHeader.value(sampleItem)).toBe('test-stack');
      expect(containerHeader.value(sampleItem)).toBe('Test Display');
      expect(versionHeader.value(sampleItem)).toBe('1.2.3');
      expect(updateHeader.value(sampleItem)).toBe('1.3.0');
    });

    it('sorts versions numerically with sortRaw', () => {
      const versionHeader = wrapper.vm.headers.find((h: any) => h.key === 'currentVersion');
      const item1 = { image: { tag: { value: '1.2.0' } } };
      const item2 = { image: { tag: { value: '1.10.0' } } };

      // 1.2.0 should come before 1.10.0 in numeric order (negative result)
      expect(versionHeader.sortRaw(item1, item2)).toBeLessThan(0);
      expect(versionHeader.sortRaw(item2, item1)).toBeGreaterThan(0);
    });

    it('sorts updates with sortRaw prioritizing available updates', () => {
      const updateHeader = wrapper.vm.headers.find((h: any) => h.key === 'update');
      const itemWithUpdate = {
        displayName: 'b',
        updateAvailable: true,
        updateKind: { remoteValue: '2.0.0' }
      };
      const itemWithoutUpdate = {
        displayName: 'a',
        updateAvailable: false
      };

      // Item with update should come before item without update
      expect(updateHeader.sortRaw(itemWithUpdate, itemWithoutUpdate)).toBeLessThan(0);
      expect(updateHeader.sortRaw(itemWithoutUpdate, itemWithUpdate)).toBeGreaterThan(0);
    });

    it('resets all filter state and updates query params on onResetFilters', () => {
      wrapper.vm.registrySelected = 'hub';
      wrapper.vm.watcherSelected = 'local';
      wrapper.vm.stackSelected = 'monitoring';
      wrapper.vm.searchQuery = 'test';
      wrapper.vm.updateKindSelected = 'minor';
      wrapper.vm.groupByLabel = 'app';
      wrapper.vm.updateAvailableSelected = true;
      wrapper.vm.oldestFirst = true;

      wrapper.vm.onResetFilters();

      expect(wrapper.vm.registrySelected).toBe('');
      expect(wrapper.vm.watcherSelected).toBe('');
      expect(wrapper.vm.stackSelected).toBe('');
      expect(wrapper.vm.searchQuery).toBe('');
      expect(wrapper.vm.updateKindSelected).toBe('');
      expect(wrapper.vm.groupByLabel).toBe('');
      expect(wrapper.vm.updateAvailableSelected).toBe(false);
      expect(wrapper.vm.oldestFirst).toBe(false);
    });
  });

  describe('items-per-page persistence', () => {
    it('defaults itemsPerPage to 10 when not present in localStorage', () => {
      localStorage.removeItem('itemsPerPage');
      const testWrapper = mount(ContainersView, {
        global: {
          stubs: {
            'container-filter': true,
            'container-item': true,
          },
        },
      });
      expect(testWrapper.vm.itemsPerPage).toBe(10);
      testWrapper.unmount();
    });

    it('initializes itemsPerPage from localStorage if present', () => {
      localStorage.setItem('itemsPerPage', '25');
      const testWrapper = mount(ContainersView, {
        global: {
          stubs: {
            'container-filter': true,
            'container-item': true,
          },
        },
      });
      expect(testWrapper.vm.itemsPerPage).toBe(25);
      testWrapper.unmount();
      localStorage.removeItem('itemsPerPage');
    });

    it('persists itemsPerPage to localStorage when changed', async () => {
      localStorage.removeItem('itemsPerPage');
      wrapper.vm.itemsPerPage = 50;
      await wrapper.vm.$nextTick();
      expect(localStorage.getItem('itemsPerPage')).toBe('50');
      localStorage.removeItem('itemsPerPage');
    });
  });

  describe('snooze functionality', () => {
    it('opens snooze dialog with default duration', () => {
      const target = mockContainers[0];
      wrapper.vm.openSnoozeDialog(target);
      expect(wrapper.vm.containerToSnooze).toEqual(target);
      expect(wrapper.vm.snoozeDuration).toBe('indefinitely');
      expect(wrapper.vm.dialogSnooze).toBe(true);
    });

    it('executes snooze indefinitely and updates container', async () => {
      const { snoozeContainer } = require('@/services/container');
      const target = { ...mockContainers[0], result: { tag: '1.2.0' } };
      wrapper.vm.containers = [target];
      wrapper.vm.containerToSnooze = target;
      wrapper.vm.snoozeDuration = 'indefinitely';

      const updated = {
        ...target,
        snoozedVersion: '1.2.0',
        isSnoozed: true,
        updateAvailable: false,
      };
      snoozeContainer.mockResolvedValue(updated);

      await wrapper.vm.executeSnooze();

      expect(snoozeContainer).toHaveBeenCalledWith('1', {
        version: '1.2.0',
        until: undefined,
      });
      expect(wrapper.vm.containers[0].isSnoozed).toBe(true);
      expect(wrapper.vm.containers[0].updateAvailable).toBe(false);
      expect(wrapper.vm.dialogSnooze).toBe(false);
    });

    it('executes snooze with duration 1_day', async () => {
      const { snoozeContainer } = require('@/services/container');
      const target = { ...mockContainers[0], result: { tag: '1.2.0' } };
      wrapper.vm.containers = [target];
      wrapper.vm.containerToSnooze = target;
      wrapper.vm.snoozeDuration = '1_day';

      snoozeContainer.mockResolvedValue({
        ...target,
        snoozedVersion: '1.2.0',
        isSnoozed: true,
        updateAvailable: false,
      });

      const before = Date.now();
      await wrapper.vm.executeSnooze();
      const after = Date.now();

      expect(snoozeContainer).toHaveBeenCalled();
      const callArgs = snoozeContainer.mock.calls[0];
      expect(callArgs[0]).toBe('1');
      expect(callArgs[1].version).toBe('1.2.0');
      expect(callArgs[1].until).toBeGreaterThanOrEqual(before + 24 * 60 * 60 * 1000);
      expect(callArgs[1].until).toBeLessThanOrEqual(after + 24 * 60 * 60 * 1000);
    });

    it('executes unsnooze and updates container', async () => {
      const { unsnoozeContainer } = require('@/services/container');
      const target = {
        ...mockContainers[0],
        snoozedVersion: '1.2.0',
        isSnoozed: true,
        updateAvailable: false,
      };
      wrapper.vm.containers = [target];

      const unsnoozed = {
        ...target,
        snoozedVersion: undefined,
        snoozedUntil: undefined,
        isSnoozed: false,
        updateAvailable: true,
      };
      unsnoozeContainer.mockResolvedValue(unsnoozed);

      await wrapper.vm.executeUnsnooze(target);

      expect(unsnoozeContainer).toHaveBeenCalledWith('1');
      expect(wrapper.vm.containers[0].isSnoozed).toBe(false);
      expect(wrapper.vm.containers[0].updateAvailable).toBe(true);
    });

    it('includes actions header', () => {
      const actionHeader = wrapper.vm.headers.find((h) => h.key === 'actions');
      expect(actionHeader).toBeDefined();
      expect(actionHeader.title).toBe('Actions');
    });
  });
});
