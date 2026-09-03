import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../website/docs/assets/screenshots');
const ASSETS_DIR = path.resolve(__dirname, '../../website/docs/assets');

test.describe('Documentation Screenshots Capture', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Force dark mode for sleek, consistent documentation aesthetic
    await page.addInitScript(() => {
      localStorage.setItem('darkMode', 'true');
    });
  });

  test('capture login page', async ({ page }) => {
    await page.goto('/#/login');
    await expect(page.locator('.login-card')).toBeVisible();
    await page.waitForTimeout(500); // Allow animation to settle
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'login.png'),
      fullPage: false,
    });
  });

  test('capture home dashboard', async ({ page }) => {
    await page.goto('/#/');
    await expect(page.locator('.home-card').first()).toBeVisible();
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'home-dashboard.png'),
      fullPage: false,
    });
  });

  test('capture containers list', async ({ page }) => {
    await page.goto('/#/containers');
    const rows = page.locator('.v-data-table tbody tr');
    await expect(rows.first()).toBeVisible();
    await page.waitForTimeout(600);
    const screenshotPath = path.join(SCREENSHOTS_DIR, 'containers-list.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: false,
    });

    // Also update legacy docs/assets/ui.png
    fs.copyFileSync(screenshotPath, path.join(ASSETS_DIR, 'ui.png'));
  });

  test('capture container detail drawer - update tab', async ({ page }) => {
    await page.goto('/#/containers');
    const traefikRow = page.locator('.v-data-table tbody tr').filter({ hasText: 'Traefik' });
    await expect(traefikRow).toBeVisible();
    await traefikRow.click();

    const drawer = page.locator('.v-navigation-drawer--temporary.v-navigation-drawer--active');
    await expect(drawer).toBeVisible();

    const updateTab = drawer.locator('.v-tab').filter({ hasText: 'Update' });
    await updateTab.click();
    await page.waitForTimeout(600);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'containers-detail-update.png'),
      fullPage: false,
    });
  });

  test('capture container detail drawer - triggers tab', async ({ page }) => {
    await page.goto('/#/containers');
    const traefikRow = page.locator('.v-data-table tbody tr').filter({ hasText: 'Traefik' });
    await expect(traefikRow).toBeVisible();
    await traefikRow.click();

    const drawer = page.locator('.v-navigation-drawer--temporary.v-navigation-drawer--active');
    await expect(drawer).toBeVisible();

    const triggersTab = drawer.locator('.v-tab').filter({ hasText: 'Triggers' });
    await triggersTab.click();
    await page.waitForTimeout(600);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'containers-detail-triggers.png'),
      fullPage: false,
    });
  });

  test('capture container detail drawer - image tab', async ({ page }) => {
    await page.goto('/#/containers');
    const traefikRow = page.locator('.v-data-table tbody tr').filter({ hasText: 'Traefik' });
    await expect(traefikRow).toBeVisible();
    await traefikRow.click();

    const drawer = page.locator('.v-navigation-drawer--temporary.v-navigation-drawer--active');
    await expect(drawer).toBeVisible();

    const imageTab = drawer.locator('.v-tab').filter({ hasText: 'Image' });
    await imageTab.click();
    await page.waitForTimeout(600);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'containers-detail-image.png'),
      fullPage: false,
    });
  });

  test('capture registries configuration', async ({ page }) => {
    await page.goto('/#/configuration/registries');
    await expect(page.locator('.v-data-table tbody tr').first()).toBeVisible();
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'config-registries.png'),
      fullPage: false,
    });
  });

  test('capture triggers configuration', async ({ page }) => {
    await page.goto('/#/configuration/triggers');
    await expect(page.locator('.v-data-table tbody tr').first()).toBeVisible();
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'config-triggers.png'),
      fullPage: false,
    });
  });

  test('capture watchers configuration', async ({ page }) => {
    await page.goto('/#/configuration/watchers');
    await expect(page.locator('.v-data-table tbody tr').first()).toBeVisible();
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'config-watchers.png'),
      fullPage: false,
    });
  });

  test('capture server configuration', async ({ page }) => {
    await page.goto('/#/configuration/server');
    await expect(page.locator('.dashboard-card').first()).toBeVisible();
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'config-server.png'),
      fullPage: false,
    });
  });
});
