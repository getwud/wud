import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/screenshots.spec.ts',
  workers: 1,
  retries: 0,
  timeout: 60000,
  use: {
    baseURL: process.env.DEMO_URL || 'http://127.0.0.1:3001',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
  },
  webServer: {
    command: 'node serve-demo.mjs',
    port: 3001,
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
