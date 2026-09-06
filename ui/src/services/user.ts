import { url } from './base';
import { isDemoMode, mockService } from './mock';

export interface UserItem {
  id: string;
  username: string;
  role: 'admin' | 'rw' | 'ro';
  provider: 'local' | 'oidc';
  preferences?: { theme?: 'light' | 'dark' };
  createdAt?: string;
  updatedAt?: string;
}

export async function listUsers(): Promise<UserItem[]> {
  if (isDemoMode()) {
    return mockService.listUsers();
  }
  const response = await fetch(url('api/users'), { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Failed to load users: ${response.statusText}`);
  }
  return response.json();
}

export async function createUser(data: {
  username: string;
  password?: string;
  role: 'admin' | 'rw' | 'ro';
}): Promise<UserItem> {
  if (isDemoMode()) {
    return mockService.createUser(data);
  }
  const response = await fetch(url('api/users'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error || 'Failed to create user');
  }
  return response.json();
}

export async function updateUser(
  id: string,
  data: { role?: 'admin' | 'rw' | 'ro'; password?: string },
): Promise<UserItem> {
  if (isDemoMode()) {
    return mockService.updateUser(id, data);
  }
  const response = await fetch(url(`api/users/${id}`), {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error || 'Failed to update user');
  }
  return response.json();
}

export async function deleteUser(id: string): Promise<void> {
  if (isDemoMode()) {
    return mockService.deleteUser(id);
  }
  const response = await fetch(url(`api/users/${id}`), {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error || 'Failed to delete user');
  }
}

export function getUserIcon(): string {
  return 'mdi-account-group';
}
