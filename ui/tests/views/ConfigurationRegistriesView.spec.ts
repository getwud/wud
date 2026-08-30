import { mount } from '@vue/test-utils';
import ConfigurationRegistriesView from '@/views/ConfigurationRegistriesView.vue';
import * as registryService from '@/services/registry';

jest.mock('@/services/registry', () => ({
  getAllRegistries: jest.fn(),
  getRegistryIcon: jest.fn(() => 'mdi-database-search'),
  getRegistryProviderIcon: jest.fn(() => 'si-docker'),
}));

const mockRegistries = [
  {
    id: 'hub.docker',
    type: 'hub',
    name: 'docker',
    configuration: { url: 'https://hub.docker.com' },
  },
  {
    id: 'ghcr.github',
    type: 'ghcr',
    name: 'github',
    configuration: { token: 'secret' },
  },
];

describe('ConfigurationRegistriesView.vue', () => {
  beforeEach(() => {
    (registryService.getAllRegistries as jest.Mock).mockResolvedValue(mockRegistries);
  });

  it('renders table and handles search filtering', async () => {
    const wrapper = mount(ConfigurationRegistriesView);
    await wrapper.setData({ registries: mockRegistries });

    const vm = wrapper.vm as any;
    expect(vm.registriesFiltered).toHaveLength(2);

    vm.search = 'github';
    expect(vm.registriesFiltered).toHaveLength(1);
    expect(vm.registriesFiltered[0].name).toBe('github');

    vm.search = '';
    expect(vm.registriesFiltered).toHaveLength(2);
  });

  it('opens drawer on row click', async () => {
    const wrapper = mount(ConfigurationRegistriesView);
    await wrapper.setData({ registries: mockRegistries });

    const vm = wrapper.vm as any;
    expect(vm.drawerOpen).toBe(false);

    vm.onRowClick({}, { item: mockRegistries[0] });
    expect(vm.drawerOpen).toBe(true);
    expect(vm.selectedRegistry).toEqual(mockRegistries[0]);
  });

  it('refreshes registries on refreshRegistries', async () => {
    const wrapper = mount(ConfigurationRegistriesView);
    const vm = wrapper.vm as any;

    await vm.refreshRegistries();
    expect(registryService.getAllRegistries).toHaveBeenCalled();
  });
});
