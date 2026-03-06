import { test, expect } from '@playwright/test';

test.describe('Home Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Username').fill('john');
    await page.getByLabel('Password').fill('doe');
    await page.getByRole('button', { name: 'Login' }).click();
  });

  test('should display dashboard tiles with counts', async ({ page }) => {
    const homeCard = page.locator('.home-card');
    await expect(homeCard.filter({ hasText: 'containers' })).toBeVisible();
    await expect(homeCard.filter({ hasText: 'triggers' })).toBeVisible();
    await expect(homeCard.filter({ hasText: 'watchers' })).toBeVisible();
    await expect(homeCard.filter({ hasText: 'registries' })).toBeVisible();

    // We expect some containers to be loaded by setup-test-containers.sh
    // The exact number might vary, but should be > 0.
    const containersText = await homeCard.filter({ hasText: 'containers' }).textContent();
    expect(containersText).toMatch(/\d+ containers/);

    // Check if the count is not 0
    const count = parseInt(containersText?.match(/(\d+)/)?.[1] || '0');
    expect(count).toBeGreaterThan(0);
  });
});
