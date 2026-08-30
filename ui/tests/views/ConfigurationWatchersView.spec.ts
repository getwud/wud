import { mount } from '@vue/test-utils';
import ConfigurationWatchersView from '@/views/ConfigurationWatchersView.vue';
import * as watcherService from '@/services/watcher';

jest.mock('@/services/watcher', () => ({
  getAllWatchers: jest.fn(),
  getWatcherIcon: jest.fn(() => 'mdi-update'),
}));

const mockWatchers = [
  {
    id: 'docker.local',
    type: 'docker',
    name: 'local',
    configuration: { socket: '/var/run/docker.sock' },
  },
  {
    id: 'containerd.remote',
    type: 'containerd',
    name: 'remote',
    configuration: { endpoint: 'unix:///run/containerd.sock' },
  },
];

describe('ConfigurationWatchersView.vue', () => {
  beforeEach(() => {
    (watcherService.getAllWatchers as jest.Mock).mockResolvedValue(mockWatchers);
  });

  it('renders table and handles search filtering', async () => {
    const wrapper = mount(ConfigurationWatchersView);
    await wrapper.setData({ watchers: mockWatchers });

    const vm = wrapper.vm as any;
    expect(vm.watchersFiltered).toHaveLength(2);

    vm.search = 'remote';
    expect(vm.watchersFiltered).toHaveLength(1);
    expect(vm.watchersFiltered[0].name).toBe('remote');

    vm.search = '';
    expect(vm.watchersFiltered).toHaveLength(2);
  });

  it('opens drawer on row click', async () => {
    const wrapper = mount(ConfigurationWatchersView);
    await wrapper.setData({ watchers: mockWatchers });

    const vm = wrapper.vm as any;
    expect(vm.drawerOpen).toBe(false);

    vm.onRowClick({}, { item: mockWatchers[0] });
    expect(vm.drawerOpen).toBe(true);
    expect(vm.selectedWatcher).toEqual(mockWatchers[0]);
  });

  it('refreshes watchers on refreshWatchers', async () => {
    const wrapper = mount(ConfigurationWatchersView);
    const vm = wrapper.vm as any;

    await vm.refreshWatchers();
    expect(watcherService.getAllWatchers).toHaveBeenCalled();
  });
});
