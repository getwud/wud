import { mount } from '@vue/test-utils';
import ProfileView from '@/views/ProfileView.vue';
import * as profileService from '@/services/profile';

jest.mock('@/services/profile', () => ({
  getProfile: jest.fn(),
  updatePreferences: jest.fn(),
  updatePassword: jest.fn(),
  listTokens: jest.fn(),
  createToken: jest.fn(),
  deleteToken: jest.fn(),
}));

const mockProfile: any = {
  id: 'u1',
  username: 'admin',
  role: 'admin',
  provider: 'local',
  preferences: { theme: 'dark' },
  createdAt: '2026-01-01T00:00:00.000Z',
};

const mockTokens: any[] = [
  {
    id: 'tok1',
    name: 'Home Assistant',
    scopes: ['read', 'write'],
    expiresAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('ProfileView.vue', () => {
  beforeEach(() => {
    (profileService.getProfile as jest.Mock).mockResolvedValue({ ...mockProfile });
    (profileService.listTokens as jest.Mock).mockResolvedValue([...mockTokens]);
    (profileService.updatePreferences as jest.Mock).mockResolvedValue({ ...mockProfile });
    (profileService.updatePassword as jest.Mock).mockResolvedValue({ message: 'Success' });
    (profileService.createToken as jest.Mock).mockResolvedValue({
      token: { id: 'tok2', name: 'CI', scopes: ['read'] },
      rawSecret: 'wud_secret123',
    });
    (profileService.deleteToken as jest.Mock).mockResolvedValue(undefined);
  });

  it('loads profile and tokens on mount', async () => {
    const wrapper = mount(ProfileView, {
      global: {
        provide: {
          eventBus: { emit: jest.fn() },
        },
      },
    });
    const vm = wrapper.vm as any;
    await vm.loadProfileData();

    expect(vm.profile.username).toBe('admin');
    expect(vm.tokens).toHaveLength(1);
    expect(vm.selectedTheme).toBe('dark');
  });

  it('updates theme preferences', async () => {
    const wrapper = mount(ProfileView, {
      global: {
        provide: {
          eventBus: { emit: jest.fn() },
        },
      },
    });
    const vm = wrapper.vm as any;

    await vm.onThemeChange('light');
    expect(profileService.updatePreferences).toHaveBeenCalledWith({ theme: 'light' });
  });

  it('submits password change', async () => {
    const wrapper = mount(ProfileView, {
      global: {
        provide: {
          eventBus: { emit: jest.fn() },
        },
      },
    });
    const vm = wrapper.vm as any;

    vm.currentPassword = 'oldPassword';
    vm.newPassword = 'newPassword123';
    vm.confirmPassword = 'newPassword123';

    await vm.submitPasswordChange();
    expect(profileService.updatePassword).toHaveBeenCalledWith('oldPassword', 'newPassword123');
  });

  it('creates API token and displays secret dialog', async () => {
    const wrapper = mount(ProfileView, {
      global: {
        provide: {
          eventBus: { emit: jest.fn() },
        },
      },
    });
    const vm = wrapper.vm as any;

    vm.openCreateTokenDialog();
    expect(vm.createTokenDialog).toBe(true);

    vm.newToken = { name: 'CI Token', scopes: ['read'], expiration: 'never' };
    await vm.submitCreateToken();

    expect(profileService.createToken).toHaveBeenCalledWith({
      name: 'CI Token',
      scopes: ['read'],
      expiresAt: null,
    });
    expect(vm.createTokenDialog).toBe(false);
    expect(vm.showSecretDialog).toBe(true);
    expect(vm.generatedSecret).toBe('wud_secret123');
  });

  it('revokes an API token', async () => {
    const wrapper = mount(ProfileView, {
      global: {
        provide: {
          eventBus: { emit: jest.fn() },
        },
      },
    });
    const vm = wrapper.vm as any;

    vm.openDeleteTokenDialog(mockTokens[0]);
    expect(vm.deleteTokenDialog).toBe(true);

    await vm.submitDeleteToken();
    expect(profileService.deleteToken).toHaveBeenCalledWith('tok1');
    expect(vm.deleteTokenDialog).toBe(false);
  });
});
