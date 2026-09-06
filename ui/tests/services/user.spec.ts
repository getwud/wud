import { listUsers, createUser, updateUser, deleteUser, getUserIcon } from '@/services/user';

global.fetch = jest.fn();

describe('User Service', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('returns user icon', () => {
    expect(getUserIcon()).toBe('mdi-account-group');
  });

  describe('listUsers', () => {
    it('fetches users list successfully', async () => {
      const mockUsers = [
        { id: '1', username: 'admin', role: 'admin', provider: 'local' },
        { id: '2', username: 'john', role: 'rw', provider: 'oidc' },
      ];
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers,
      });

      const users = await listUsers();
      expect(global.fetch).toHaveBeenCalledWith('/api/users', { credentials: 'include' });
      expect(users).toEqual(mockUsers);
    });

    it('throws error when request fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Forbidden',
      });

      await expect(listUsers()).rejects.toThrow('Failed to load users: Forbidden');
    });
  });

  describe('createUser', () => {
    it('creates a new user', async () => {
      const newUser = { id: '3', username: 'alice', role: 'ro', provider: 'local' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => newUser,
      });

      const result = await createUser({ username: 'alice', password: 'password123', role: 'ro' });
      expect(global.fetch).toHaveBeenCalledWith('/api/users', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }));
      expect(result).toEqual(newUser);
    });

    it('throws server error message if creation fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'User already exists' }),
      });

      await expect(
        createUser({ username: 'alice', password: 'password123', role: 'ro' }),
      ).rejects.toThrow('User already exists');
    });
  });

  describe('updateUser', () => {
    it('updates user role', async () => {
      const updatedUser = { id: '2', username: 'john', role: 'admin', provider: 'oidc' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedUser,
      });

      const result = await updateUser('2', { role: 'admin' });
      expect(global.fetch).toHaveBeenCalledWith('/api/users/2', expect.objectContaining({
        method: 'PUT',
      }));
      expect(result).toEqual(updatedUser);
    });
  });

  describe('deleteUser', () => {
    it('deletes user successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      await deleteUser('2');
      expect(global.fetch).toHaveBeenCalledWith('/api/users/2', {
        method: 'DELETE',
        credentials: 'include',
      });
    });

    it('throws server error on deletion failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Cannot delete last admin' }),
      });

      await expect(deleteUser('1')).rejects.toThrow('Cannot delete last admin');
    });
  });
});
