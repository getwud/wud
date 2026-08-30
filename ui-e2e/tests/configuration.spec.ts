import { test, expect } from '@playwright/test';

test.describe('Configuration Views', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Username').fill('john');
    await page.getByLabel('Password').fill('doe');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL('/');
  });

  test('should display Registries table with search and drawer', async ({ page }) => {
    await page.locator('nav a[href*="/configuration/registries"]').click();
    await expect(page).toHaveURL(/.*configuration\/registries/);

    const searchInput = page.getByPlaceholder('Search registries...');
    await expect(searchInput).toBeVisible();

    const table = page.locator('.v-data-table');
    await expect(table).toBeVisible();

    const row = table.locator('tbody tr').first();
    if (await row.count() > 0 && await row.isVisible()) {
      await row.click();
      const drawer = page.locator('.v-navigation-drawer--temporary.v-navigation-drawer--active');
      await expect(drawer).toBeVisible();
      await expect(drawer.getByText('Configuration Parameters')).toBeVisible();
      await drawer.getByTitle('Close details').click();
      await expect(page.locator('.v-navigation-drawer--temporary.v-navigation-drawer--active')).toHaveCount(0);
    }
  });

  test('should display Triggers table with search and drawer', async ({ page }) => {
    await page.locator('nav a[href*="/configuration/triggers"]').click();
    await expect(page).toHaveURL(/.*configuration\/triggers/);

    const searchInput = page.getByPlaceholder('Search triggers...');
    await expect(searchInput).toBeVisible();

    const table = page.locator('.v-data-table');
    await expect(table).toBeVisible();

    const row = table.locator('tbody tr').first();
    if (await row.count() > 0 && await row.isVisible()) {
      await row.click();
      const drawer = page.locator('.v-navigation-drawer--temporary.v-navigation-drawer--active');
      await expect(drawer).toBeVisible();
      await expect(drawer.getByRole('button', { name: /test/i }).first()).toBeVisible();
      await drawer.getByTitle('Close details').click();
    }
  });

  test('should display Authentications table with search', async ({ page }) => {
    await page.locator('nav a[href*="/configuration/authentications"]').click();
    await expect(page).toHaveURL(/.*configuration\/authentications/);

    const searchInput = page.getByPlaceholder('Search authentications...');
    await expect(searchInput).toBeVisible();

    const table = page.locator('.v-data-table');
    await expect(table).toBeVisible();
  });

  test('should display Watchers table with search', async ({ page }) => {
    await page.locator('nav a[href*="/configuration/watchers"]').click();
    await expect(page).toHaveURL(/.*configuration\/watchers/);

    const searchInput = page.getByPlaceholder('Search watchers...');
    await expect(searchInput).toBeVisible();

    const table = page.locator('.v-data-table');
    await expect(table).toBeVisible();
  });

  test('should display Server configuration dashboard with search and cards', async ({ page }) => {
    await page.locator('nav a[href*="/configuration/server"]').click();
    await expect(page).toHaveURL(/.*configuration\/server/);

    const searchInput = page.getByPlaceholder('Filter parameters...');
    await expect(searchInput).toBeVisible();

    const serverCard = page.locator('.dashboard-card').filter({ hasText: 'Server' });
    await expect(serverCard).toBeVisible();

    const logsCard = page.locator('.dashboard-card').filter({ hasText: 'Logs' });
    await expect(logsCard).toBeVisible();

    const storeCard = page.locator('.dashboard-card').filter({ hasText: 'Store' });
    await expect(storeCard).toBeVisible();
  });
});

