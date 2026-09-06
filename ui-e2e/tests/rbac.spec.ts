import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('Role-Based Access Control (RBAC)', () => {
  const roUsername = `rbac_ro_${Date.now()}`;
  const rwUsername = `rbac_rw_${Date.now()}`;
  const testPassword = 'Password123!';

  let roUserId = '';
  let rwUserId = '';

  test.beforeAll(async ({ playwright }) => {
    // Admin API context to provision test users
    const apiContext = await playwright.request.newContext({
      baseURL: 'http://127.0.0.1:3000',
      extraHTTPHeaders: {
        Authorization: 'Basic ' + Buffer.from('john:doe').toString('base64'),
      },
    });

    // Create Read-Only (ro) user
    const roRes = await apiContext.post('/api/users', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        username: roUsername,
        password: testPassword,
        role: 'ro',
      },
    });
    if (roRes.ok()) {
      const roData = await roRes.json();
      roUserId = roData.id;
    }

    // Create Read-Write (rw) user
    const rwRes = await apiContext.post('/api/users', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        username: rwUsername,
        password: testPassword,
        role: 'rw',
      },
    });
    if (rwRes.ok()) {
      const rwData = await rwRes.json();
      rwUserId = rwData.id;
    }

    await apiContext.dispose();
  });

  test.afterAll(async ({ playwright }) => {
    const apiContext = await playwright.request.newContext({
      baseURL: 'http://127.0.0.1:3000',
      extraHTTPHeaders: {
        Authorization: 'Basic ' + Buffer.from('john:doe').toString('base64'),
      },
    });

    if (roUserId) {
      await apiContext.delete(`/api/users/${roUserId}`);
    }
    if (rwUserId) {
      await apiContext.delete(`/api/users/${rwUserId}`);
    }

    await apiContext.dispose();
  });

  test('ReadOnly (ro) role should have mutating UI controls hidden and backend mutations forbidden', async ({ page }) => {
    // 1. Log in as RO user
    await page.goto('/login');
    await page.getByLabel('Username').fill(roUsername);
    await page.getByLabel('Password', { exact: true }).fill(testPassword);
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL('/');

    // 2. Navigation: Users menu link is NOT visible
    await expect(page.locator('a[href="/configuration/users"]')).toHaveCount(0);

    // 3. Route Guard: Accessing /configuration/users redirects to /
    await page.goto('/configuration/users');
    await expect(page).toHaveURL('http://127.0.0.1:3000/');

    // 4. Containers view: "Watch now" button is hidden
    await page.goto('/containers');
    await expect(page.getByRole('button', { name: 'Watch now' })).toHaveCount(0);

    // Open first container details if present and verify delete button is hidden
    const containerCards = page.locator('.container-item-wrapper, .v-card.cursor-pointer');
    if (await containerCards.count() > 0) {
      await containerCards.first().click();
      await expect(page.locator('button[title="Delete container"]')).toHaveCount(0);
      // Close drawer if open
      const closeBtn = page.locator('button[title="Close details"]');
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }

    // 5. Triggers view: Test buttons are hidden
    await page.goto('/configuration/triggers');
    const triggerRow = page.locator('table tbody tr').first();
    if (await triggerRow.isVisible()) {
      await triggerRow.click();
      await expect(page.getByRole('button', { name: 'Test', exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Test this trigger' })).toHaveCount(0);
    }

    // 6. Backend API enforcement: Direct mutation requests return 403 Forbidden
    const watchRes = await page.request.post('/api/containers/watch');
    expect(watchRes.status()).toBe(403);

    const userRes = await page.request.post('/api/users', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        username: 'unauthorized_user',
        password: 'password123',
        role: 'admin',
      },
    });
    expect(userRes.status()).toBe(403);
  });

  test('ReadWrite (rw) role should have mutation UI controls enabled but admin management blocked', async ({ page }) => {
    // 1. Log in as RW user
    await page.goto('/login');
    await page.getByLabel('Username').fill(rwUsername);
    await page.getByLabel('Password', { exact: true }).fill(testPassword);
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL('/');

    // 2. Navigation: Users menu link is NOT visible for rw
    await expect(page.locator('a[href="/configuration/users"]')).toHaveCount(0);

    // 3. Route Guard: Accessing /configuration/users redirects to /
    await page.goto('/configuration/users');
    await expect(page).toHaveURL('http://127.0.0.1:3000/');

    // 4. Containers view: "Watch now" button IS visible
    await page.goto('/containers');
    await expect(page.getByRole('button', { name: 'Watch now' })).toBeVisible();

    // 5. Triggers view: Test trigger buttons ARE visible
    await page.goto('/configuration/triggers');
    const triggerRow = page.locator('table tbody tr').first();
    if (await triggerRow.isVisible()) {
      await triggerRow.click();
      await expect(page.getByRole('button', { name: 'Test', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Test this trigger' })).toBeVisible();
    }

    // 6. Backend API enforcement: RW cannot manage users (403), but CAN watch containers (not 403)
    const userRes = await page.request.post('/api/users', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        username: 'unauthorized_user',
        password: 'password123',
        role: 'admin',
      },
    });
    expect(userRes.status()).toBe(403);

    const watchRes = await page.request.post('/api/containers/watch');
    expect(watchRes.status()).not.toBe(403);
  });

  test('Admin role should have full access to user management, container mutations, and trigger tests', async ({ page }) => {
    // 1. Log in as Admin
    await page.goto('/login');
    await page.getByLabel('Username').fill('john');
    await page.getByLabel('Password', { exact: true }).fill('doe');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL('/');

    // 2. Users link is visible and accessible
    await page.goto('/configuration/users');
    await expect(page).toHaveURL(/.*configuration\/users/);
    await expect(page.getByText('User Management')).toBeVisible();

    // 3. Containers view: "Watch now" button IS visible
    await page.goto('/containers');
    await expect(page.getByRole('button', { name: 'Watch now' })).toBeVisible();

    // 4. Triggers view: Test trigger buttons ARE visible
    await page.goto('/configuration/triggers');
    const triggerRow = page.locator('table tbody tr').first();
    if (await triggerRow.isVisible()) {
      await triggerRow.click();
      await expect(page.getByRole('button', { name: 'Test', exact: true })).toBeVisible();
    }
  });
});
