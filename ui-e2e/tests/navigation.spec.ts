import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Username').fill('john');
    await page.getByLabel('Password', { exact: true }).fill('doe');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL('/');
  });

  test('should navigate to Containers', async ({ page }) => {
    await page.locator('nav').getByRole('link', { name: 'Containers' }).click();
    await expect(page).toHaveURL(/.*containers/);
  });

  test('should navigate to Configuration sections', async ({ page }) => {
    const sections = ['triggers', 'watchers', 'registries', 'authentications', 'server'];

    for (const section of sections) {
      const navItem = page.locator(`nav a[href*="/configuration/${section}"]`);
      await navItem.click();
      await expect(page).toHaveURL(new RegExp(`.*configuration/${section}`), { timeout: 10000 });
      await page.waitForTimeout(500);
    }
  });

  test('should toggle sidebar and open user menu', async ({ page }) => {
    // 1. Toggle collapse/expand sidebar
    const toggleBtn = page.locator('.drawer-header button');
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
      await page.waitForTimeout(300);
    }

    // 2. Open user menu popover
    const userItem = page.locator('.user-item');
    if (await userItem.isVisible()) {
      await userItem.click();
      await expect(page.getByText('Dark mode')).toBeVisible();
    }
  });
});

