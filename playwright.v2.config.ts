import { defineConfig, devices } from '@playwright/test';

/**
 * GOAT v2 smoke suite (docs/v2/TECHNICAL_PACKAGE.md §8). Unlike the v1 suite
 * (playwright.config.ts) it needs no database: it ranks the bundled demo list
 * at /v2/l/demo, which lives in the browser. The Supabase settings below are
 * placeholders that only satisfy v1's session middleware; nothing connects.
 *
 *   npx playwright test -c playwright.v2.config.ts
 */
const PORT = Number(process.env.V2_SMOKE_PORT ?? 3210);

export default defineConfig({
  testDir: './e2e-v2',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 90_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1440, height: 1700 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1700 },
        // CI installs Playwright's own browser; elsewhere a preinstalled one can be named.
        launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
      },
    },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/v2`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:9',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'placeholder-anon-key-for-the-v2-smoke',
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },
});
