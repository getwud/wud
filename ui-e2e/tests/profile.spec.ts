import { test, expect } from '@playwright/test';

test.describe('User Profile & Personal API Tokens', () => {
  test.beforeEach(async ({ page }) => {
    // Log in as default admin
    await page.goto('/');
    await page.getByLabel('Username').fill('john');
    await page.getByLabel('Password', { exact: true }).fill('doe');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL('/');
  });

  test('should display Profile page with user info, theme preference, and manage API tokens', async ({ page }) => {
    // Navigate to Profile page via URL
    await page.goto('/profile');
    await expect(page).toHaveURL(/.*profile/);

    // Verify Profile header
    await expect(page.getByText('My Profile')).toBeVisible();
    await expect(page.locator('.text-h6').getByText('john')).toBeVisible();
    await expect(page.getByText(/Admin/i).first()).toBeVisible();

    // Verify Appearance section & theme radios
    await expect(page.getByText('Appearance')).toBeVisible();
    const darkRadio = page.getByLabel('Dark theme');
    const lightRadio = page.getByLabel('Light theme');
    await expect(darkRadio).toBeVisible();
    await expect(lightRadio).toBeVisible();

    // Toggle theme to dark and verify
    await darkRadio.check();
    await expect(page.locator('.v-application')).toHaveClass(/v-theme--dark/);

    // Toggle theme back to light
    await lightRadio.check();
    await expect(page.locator('.v-application')).toHaveClass(/v-theme--light/);

    // Verify Personal API Tokens section
    await expect(page.getByText('Personal API Tokens')).toBeVisible();
    const generateBtn = page.getByRole('button', { name: 'Generate Token' });
    await expect(generateBtn).toBeVisible();

    // 1. Generate an API Token
    const tokenName = `token_${Date.now()}`;
    await generateBtn.click();

    const createDialog = page.locator('.v-dialog');
    await expect(createDialog).toBeVisible();
    await expect(createDialog.getByText('Generate API Token')).toBeVisible();

    await createDialog.getByLabel('Token Name / Description').fill(tokenName);
    // Read is checked by default; also check Write
    await createDialog.getByLabel('Write (Trigger updates, manage container updates)').check();

    await createDialog.getByRole('button', { name: 'Generate', exact: true }).click();
    await expect(createDialog.getByText('Generate API Token')).not.toBeVisible();

    // 2. Secret Display Dialog
    const secretDialog = page.locator('.v-dialog');
    await expect(secretDialog).toBeVisible();
    await expect(secretDialog.getByText('API Token Generated')).toBeVisible();
    const secretInput = secretDialog.locator('input[readonly]');
    await expect(secretInput).toBeVisible();
    const rawSecret = await secretInput.inputValue();
    expect(rawSecret).toMatch(/^wud_/);

    await secretDialog.getByRole('button', { name: 'I Have Saved This Token' }).click();
    await expect(secretDialog).not.toBeVisible();

    // 3. Verify token appears in tokens table
    const tokenRow = page.locator('table').locator('tr').filter({ hasText: tokenName });
    await expect(tokenRow).toBeVisible();
    await expect(tokenRow.getByText('READ')).toBeVisible();
    await expect(tokenRow.getByText('WRITE')).toBeVisible();

    // 4. Revoke the token
    await tokenRow.locator('button[title="Revoke token"]').click();
    const revokeDialog = page.locator('.v-dialog');
    await expect(revokeDialog).toBeVisible();
    await expect(revokeDialog.locator('.v-card-title').getByText('Revoke Token')).toBeVisible();

    await revokeDialog.getByRole('button', { name: 'Revoke', exact: true }).click();
    await expect(revokeDialog).not.toBeVisible();

    // Verify token removed from table
    await expect(page.locator('table').locator('tr').filter({ hasText: tokenName })).toHaveCount(0);
  });
});
