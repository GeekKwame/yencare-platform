// @ts-check
import { defineConfig, devices } from '@playwright/test';

const GUARD_SPEC = /staff[\\/]visit-day-guards\.spec\.js/;

const e2eMongoUri = process.env.E2E_MONGODB_URI;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  globalSetup: './e2e/global-setup.js',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'guards',
      testMatch: GUARD_SPEC,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      testIgnore: GUARD_SPEC,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testIgnore: GUARD_SPEC,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testIgnore: GUARD_SPEC,
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: [
    {
      command: 'npm run dev:api',
      url: 'http://localhost:4000/health',
      reuseExistingServer: !e2eMongoUri && !process.env.CI,
      timeout: 30_000,
      env: {
        ...(e2eMongoUri ? { MONGODB_URI: e2eMongoUri } : {}),
        ...(e2eMongoUri ? { RATE_LIMIT_DISABLED: 'true' } : {}),
      },
    },
    {
      command: 'npm run dev:frontend',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
