import { url } from './base';
import { isDemoMode, mockService } from './mock';
import { UserItem } from './user';

export interface ApiTokenItem {
  id: string;
  userId: string;
  name: string;
  scopes: ('read' | 'write')[];
  expiresAt?: string | null;
  createdAt?: string | null;
  lastUsedAt?: string | null;
}

export async function getProfile(): Promise<UserItem> {
  if (isDemoMode()) {
    return mockService.getProfile();
  }
  const response = await fetch(url('api/profile'), { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Failed to load profile: ${response.statusText}`);
  }
  return response.json();
}

export async function updatePreferences(preferences: {
  theme?: 'light' | 'dark';
  [key: string]: any;
}): Promise<UserItem> {
  if (isDemoMode()) {
    return mockService.updatePreferences(preferences);
  }
  const response = await fetch(url('api/profile/preferences'), {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preferences),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error || 'Failed to update preferences');
  }
  return response.json();
}

export async function updatePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ message: string }> {
  if (isDemoMode()) {
    return mockService.updatePassword(currentPassword, newPassword);
  }
  const response = await fetch(url('api/profile/password'), {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error || 'Failed to update password');
  }
  return response.json();
}

export async function listTokens(): Promise<ApiTokenItem[]> {
  if (isDemoMode()) {
    return mockService.listTokens();
  }
  const response = await fetch(url('api/profile/tokens'), { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Failed to load API tokens: ${response.statusText}`);
  }
  return response.json();
}

export async function createToken(data: {
  name: string;
  scopes: ('read' | 'write')[];
  expiresAt?: string | null;
}): Promise<{ token: ApiTokenItem; rawSecret: string }> {
  if (isDemoMode()) {
    return mockService.createToken(data);
  }
  const response = await fetch(url('api/profile/tokens'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error || 'Failed to create token');
  }
  return response.json();
}

export async function deleteToken(id: string): Promise<void> {
  if (isDemoMode()) {
    return mockService.deleteToken(id);
  }
  const response = await fetch(url(`api/profile/tokens/${id}`), {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error || 'Failed to revoke token');
  }
}
