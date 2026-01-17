import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/');

    // Check we are on login page
    await expect(page).toHaveURL(/.*login/);

    // Use getByLabel for better reliability with Vuetify inputs
    await page.getByLabel('Username').fill('john');
    await page.getByLabel('Password').fill('doe');
    await page.getByRole('button', { name: 'Login' }).click();

    // Verify redirect to home
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
  });

  test('should fail login with invalid credentials', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Username').fill('wrong');
    await page.getByLabel('Password').fill('pass');
    await page.getByRole('button', { name: 'Login' }).click();

    // Verify still on login or error message (Basic auth might trigger browser prompt or just 401,
    // but the app handles 401 by showing login page again or error.
    // Assuming the app UI stays on login or shows notification).
    // In this specific app, let's verify we are NOT redirected to home.
    await expect(page).toHaveURL(/.*login/);
  });
});
