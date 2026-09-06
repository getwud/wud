import { test, expect } from '@playwright/test';

test.describe('Users Management & Route Guard', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    // Log in as default admin
    await page.goto('/');
    await page.getByLabel('Username').fill('john');
    await page.getByLabel('Password', { exact: true }).fill('doe');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL('/');
  });

  test('should display Users table and allow Admin to create, edit, and delete user', async ({ page }) => {
    const testUsername = `testuser_${Date.now()}`;

    // Navigate to User Management
    await page.locator('nav a[href*="/configuration/users"]').click();
    await expect(page).toHaveURL(/.*configuration\/users/);

    // Verify header and table elements
    await expect(page.getByText('User Management')).toBeVisible();
    await expect(page.getByPlaceholder('Search users...')).toBeVisible();
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Verify current admin user is present
    await expect(table.getByText('john')).toBeVisible();

    // 1. Create a new user
    await page.getByRole('button', { name: 'Add User' }).click();
    const addDialog = page.locator('.v-dialog');
    await expect(addDialog).toBeVisible();
    await expect(addDialog.getByText('Create New User')).toBeVisible();

    await addDialog.getByLabel('Username').fill(testUsername);
    await addDialog.getByLabel('Password', { exact: true }).fill('SecurePassword123!');
    
    // Select role
    await addDialog.locator('.v-select').click();
    await page.locator('.v-overlay .v-list-item').filter({ hasText: 'Read / Write' }).click();

    await addDialog.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(addDialog).not.toBeVisible();

    // Verify new user exists in table
    const userRow = table.locator('tr').filter({ hasText: testUsername });
    await expect(userRow).toBeVisible();
    await expect(userRow.getByText('Read/Write')).toBeVisible();

    // 2. Edit user role
    await userRow.locator('button[title="Edit user"]').click();
    const editDialog = page.locator('.v-dialog');
    await expect(editDialog).toBeVisible();
    await expect(editDialog.getByText(/Edit User/i)).toBeVisible();

    // Change role to Read Only
    await editDialog.locator('.v-select').click();
    await page.locator('.v-overlay .v-list-item').filter({ hasText: 'Read Only' }).click();
    await editDialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(editDialog).not.toBeVisible();

    // Verify updated role chip
    await expect(userRow.getByText('Read-Only')).toBeVisible();

    // 3. Delete user
    await userRow.locator('button[title="Delete user"]').click();
    const deleteDialog = page.locator('.v-dialog');
    await expect(deleteDialog).toBeVisible();
    await expect(deleteDialog.locator('.v-card-title').getByText('Delete User', { exact: true })).toBeVisible();
    await deleteDialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(deleteDialog).not.toBeVisible();

    // Verify user removed from table
    await expect(table.locator('tr').filter({ hasText: testUsername })).toHaveCount(0);
  });

  test('should hide Users link in navigation and redirect non-admin users away from /configuration/users', async ({ page, playwright }) => {
    const roUsername = `guard_${Date.now()}`;
    const apiContext = await playwright.request.newContext({
      baseURL: 'http://127.0.0.1:3000',
      extraHTTPHeaders: {
        Authorization: 'Basic ' + Buffer.from('john:doe').toString('base64'),
      },
    });

    // Create an RO user via API first
    const createRes = await apiContext.post('/api/users', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        username: roUsername,
        password: 'Password123!',
        role: 'ro',
      },
    });
    const createdUser = createRes.ok() ? await createRes.json() : null;

    try {
      // Log out by clicking user avatar at bottom of navigation
      await page.locator('nav .v-avatar').last().click();
      await page.getByText('Log out').click();
      await expect(page).toHaveURL(/.*login/);

      // Log in as RO user
      await page.getByLabel('Username').fill(roUsername);
      await page.getByLabel('Password', { exact: true }).fill('Password123!');
      await page.getByRole('button', { name: 'Login' }).click();
      await expect(page).toHaveURL('/');

      // Verify "Users" link is NOT present in navigation
      const usersNavLink = page.locator('nav a[href*="/configuration/users"]');
      await expect(usersNavLink).toHaveCount(0);

      // Attempt direct navigation to /configuration/users
      await page.goto('/configuration/users');

      // Should be redirected back to / (home) by the navigation guard
      await expect(page).toHaveURL('/');
    } finally {
      // Clean up created user
      if (createdUser && createdUser.id) {
        await apiContext.delete(`/api/users/${createdUser.id}`);
      }
      await apiContext.dispose();
    }
  });
});
