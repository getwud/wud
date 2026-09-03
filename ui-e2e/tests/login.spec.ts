import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should login successfully with valid credentials and redirect to home', async ({ page }) => {
    await page.goto('/');

    // Check we are on login page
    await expect(page).toHaveURL(/.*login/);

    // Use getByLabel for better reliability with Vuetify inputs
    await page.getByLabel('Username').fill('john');
    await page.getByLabel('Password', { exact: true }).fill('doe');
    await page.getByRole('button', { name: 'Login' }).click();

    // Verify redirect to home
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
  });

  test('should redirect to initially targeted page after login', async ({ page }) => {
    // Navigate directly to /containers while unauthenticated
    await page.goto('/containers');

    // Should be intercepted and redirected to login with next query parameter
    await expect(page).toHaveURL(/.*login\?next=(%2F|\/)containers/);

    // Log in
    await page.getByLabel('Username').fill('john');
    await page.getByLabel('Password', { exact: true }).fill('doe');
    await page.getByRole('button', { name: 'Login' }).click();

    // Should be redirected to initially targeted page
    await expect(page).toHaveURL(/\/containers/);
  });

  test('should fail login with invalid credentials and stay on login page', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Username').fill('wrong');
    await page.getByLabel('Password', { exact: true }).fill('pass');
    await page.getByRole('button', { name: 'Login' }).click();

    // Verify still on login page
    await expect(page).toHaveURL(/.*login/);
  });

  test('should display provider tabs when multiple auth strategies exist', async ({ page }) => {
    // Mock /auth/strategies to return both basic and oidc
    await page.route('**/auth/strategies', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { type: 'basic', name: 'Login' },
          { type: 'oidc', name: 'authentik', redirect: false }
        ]),
      });
    });

    await page.goto('/login');

    // Verify tabs are present
    const tabs = page.getByRole('tab');
    await expect(tabs).toHaveCount(2);
    await expect(page.getByRole('tab', { name: 'Credentials' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Authentik' })).toBeVisible();

    // Switch to OIDC tab
    await page.getByRole('tab', { name: 'Authentik' }).click();
    await expect(page.getByRole('button', { name: /Sign in with Authentik/i })).toBeVisible();
  });

  test('should auto-redirect to OIDC when ONLY OIDC strategy is available', async ({ page }) => {
    // Mock /auth/strategies to return only OIDC
    await page.route('**/auth/strategies', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { type: 'oidc', name: 'keycloak', redirect: false }
        ]),
      });
    });

    // Mock OIDC redirect API
    let capturedNextQuery: string | null = null;
    await page.route('**/auth/oidc/keycloak/redirect*', async (route) => {
      const url = new URL(route.request().url());
      capturedNextQuery = url.searchParams.get('next');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://idp.example.com/auth/realms/master' }),
      });
    });

    // Intercept external IdP navigation so test doesn't try to load external domain
    await page.route('https://idp.example.com/**', async (route) => {
      await route.fulfill({ status: 200, body: 'Mock IdP login page' });
    });

    // Navigate to /configuration/server directly
    await page.goto('/configuration/server');

    // Verify user was immediately forwarded to the IdP auth URL without manual clicks
    await expect(page).toHaveURL(/https:\/\/idp\.example\.com/);
    expect(capturedNextQuery).toBe('/configuration/server');
  });
});
