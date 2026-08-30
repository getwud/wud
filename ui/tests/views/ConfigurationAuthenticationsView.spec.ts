import { mount } from '@vue/test-utils';
import ConfigurationAuthenticationsView from '@/views/ConfigurationAuthenticationsView.vue';
import * as authService from '@/services/authentication';

jest.mock('@/services/authentication', () => ({
  getAllAuthentications: jest.fn(),
  getAuthenticationIcon: jest.fn(() => 'mdi-lock'),
}));

const mockAuthentications = [
  {
    id: 'basic.admin',
    type: 'basic',
    name: 'admin',
    configuration: { user: 'admin' },
  },
  {
    id: 'oidc.keycloak',
    type: 'oidc',
    name: 'keycloak',
    configuration: { issuer: 'https://auth.example.com' },
  },
];

describe('ConfigurationAuthenticationsView.vue', () => {
  beforeEach(() => {
    (authService.getAllAuthentications as jest.Mock).mockResolvedValue(mockAuthentications);
  });

  it('renders table and handles search filtering', async () => {
    const wrapper = mount(ConfigurationAuthenticationsView);
    await wrapper.setData({ authentications: mockAuthentications });

    const vm = wrapper.vm as any;
    expect(vm.authenticationsFiltered).toHaveLength(2);

    vm.search = 'keycloak';
    expect(vm.authenticationsFiltered).toHaveLength(1);
    expect(vm.authenticationsFiltered[0].name).toBe('keycloak');

    vm.search = '';
    expect(vm.authenticationsFiltered).toHaveLength(2);
  });

  it('opens drawer on row click', async () => {
    const wrapper = mount(ConfigurationAuthenticationsView);
    await wrapper.setData({ authentications: mockAuthentications });

    const vm = wrapper.vm as any;
    expect(vm.drawerOpen).toBe(false);

    vm.onRowClick({}, { item: mockAuthentications[0] });
    expect(vm.drawerOpen).toBe(true);
    expect(vm.selectedAuthentication).toEqual(mockAuthentications[0]);
  });

  it('refreshes authentications on refreshAuthentications', async () => {
    const wrapper = mount(ConfigurationAuthenticationsView);
    const vm = wrapper.vm as any;

    await vm.refreshAuthentications();
    expect(authService.getAllAuthentications).toHaveBeenCalled();
  });
});
