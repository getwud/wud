import { mount } from '@vue/test-utils';
import ConfigurationUsersView from '@/views/ConfigurationUsersView.vue';
import * as userService from '@/services/user';
import * as authService from '@/services/auth';

jest.mock('@/services/user', () => ({
  listUsers: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
}));

jest.mock('@/services/auth', () => ({
  getUser: jest.fn(),
}));

const mockUsers: any[] = [
  {
    id: 'u1',
    username: 'admin',
    role: 'admin',
    provider: 'local',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'u2',
    username: 'operator',
    role: 'rw',
    provider: 'oidc',
    createdAt: '2026-01-02T00:00:00.000Z',
  },
];

describe('ConfigurationUsersView.vue', () => {
  beforeEach(() => {
    (userService.listUsers as jest.Mock).mockResolvedValue([...mockUsers]);
    (authService.getUser as jest.Mock).mockResolvedValue({ id: 'u1', username: 'admin', role: 'admin' });
  });

  it('renders users list and handles filtering', async () => {
    const wrapper = mount(ConfigurationUsersView, {
      global: {
        provide: {
          eventBus: { emit: jest.fn() },
        },
      },
    });
    const vm = wrapper.vm as any;
    await vm.loadUsers();

    expect(vm.filteredUsers).toHaveLength(2);

    vm.search = 'operator';
    expect(vm.filteredUsers).toHaveLength(1);
    expect(vm.filteredUsers[0].username).toBe('operator');

    vm.search = '';
    expect(vm.filteredUsers).toHaveLength(2);
  });

  it('opens add user dialog and creates a user', async () => {
    (userService.createUser as jest.Mock).mockResolvedValue({
      id: 'u3',
      username: 'newuser',
      role: 'ro',
      provider: 'local',
    });

    const wrapper = mount(ConfigurationUsersView, {
      global: {
        provide: {
          eventBus: { emit: jest.fn() },
        },
      },
    });
    const vm = wrapper.vm as any;

    vm.openAddDialog();
    expect(vm.addDialog).toBe(true);

    vm.newUser = { username: 'newuser', password: 'password123', role: 'ro' };
    await vm.submitAddUser();

    expect(userService.createUser).toHaveBeenCalledWith({
      username: 'newuser',
      password: 'password123',
      role: 'ro',
    });
    expect(vm.addDialog).toBe(false);
  });

  it('opens edit user dialog and updates a user', async () => {
    (userService.updateUser as jest.Mock).mockResolvedValue({
      ...mockUsers[1],
      role: 'admin',
    });

    const wrapper = mount(ConfigurationUsersView, {
      global: {
        provide: {
          eventBus: { emit: jest.fn() },
        },
      },
    });
    const vm = wrapper.vm as any;

    vm.openEditDialog(mockUsers[1]);
    expect(vm.editDialog).toBe(true);
    expect(vm.selectedUser.id).toBe('u2');

    vm.editUserRole = 'admin';
    await vm.submitEditUser();

    expect(userService.updateUser).toHaveBeenCalledWith('u2', { role: 'admin' });
    expect(vm.editDialog).toBe(false);
  });

  it('opens delete dialog and deletes user', async () => {
    (userService.deleteUser as jest.Mock).mockResolvedValue(undefined);

    const wrapper = mount(ConfigurationUsersView, {
      global: {
        provide: {
          eventBus: { emit: jest.fn() },
        },
      },
    });
    const vm = wrapper.vm as any;

    vm.openDeleteDialog(mockUsers[1]);
    expect(vm.deleteDialog).toBe(true);

    await vm.submitDeleteUser();
    expect(userService.deleteUser).toHaveBeenCalledWith('u2');
    expect(vm.deleteDialog).toBe(false);
  });
});
