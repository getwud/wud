import {
  getProfile,
  updatePreferences,
  updatePassword,
  listTokens,
  createToken,
  deleteToken,
} from '@/services/profile';

global.fetch = jest.fn();

describe('Profile Service', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  describe('getProfile', () => {
    it('fetches profile data', async () => {
      const mockProfile = { id: '1', username: 'admin', role: 'admin', provider: 'local' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile,
      });

      const profile = await getProfile();
      expect(global.fetch).toHaveBeenCalledWith('/api/profile', { credentials: 'include' });
      expect(profile).toEqual(mockProfile);
    });
  });

  describe('updatePreferences', () => {
    it('updates preferences', async () => {
      const updated = { id: '1', username: 'admin', preferences: { theme: 'light' } };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => updated,
      });

      const res = await updatePreferences({ theme: 'light' });
      expect(global.fetch).toHaveBeenCalledWith('/api/profile/preferences', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ theme: 'light' }),
      }));
      expect(res).toEqual(updated);
    });
  });

  describe('updatePassword', () => {
    it('updates password successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Password updated' }),
      });

      const res = await updatePassword('oldpwd', 'newpwd123');
      expect(global.fetch).toHaveBeenCalledWith('/api/profile/password', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ currentPassword: 'oldpwd', newPassword: 'newpwd123' }),
      }));
      expect(res.message).toBe('Password updated');
    });

    it('handles incorrect password error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid current password' }),
      });

      await expect(updatePassword('wrong', 'newpwd123')).rejects.toThrow('Invalid current password');
    });
  });

  describe('tokens', () => {
    it('lists tokens', async () => {
      const mockTokens = [{ id: 't1', name: 'token1', scopes: ['read'] }];
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokens,
      });

      const tokens = await listTokens();
      expect(global.fetch).toHaveBeenCalledWith('/api/profile/tokens', { credentials: 'include' });
      expect(tokens).toEqual(mockTokens);
    });

    it('creates token and returns raw secret', async () => {
      const created = {
        token: { id: 't2', name: 'token2', scopes: ['read', 'write'] },
        rawSecret: 'wud_abc123',
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => created,
      });

      const res = await createToken({ name: 'token2', scopes: ['read', 'write'] });
      expect(res).toEqual(created);
    });

    it('deletes a token', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      await deleteToken('t1');
      expect(global.fetch).toHaveBeenCalledWith('/api/profile/tokens/t1', {
        method: 'DELETE',
        credentials: 'include',
      });
    });
  });
});
