import { defineConfig, devices } from '@playwright/test';

/**
 * GOAT smoke suite (docs/v2/TECHNICAL_PACKAGE.md §8). It needs no database: it
 * ranks the bundled demo list at /l/demo, which lives in the browser, and the
 * AI routes answer from the fixture provider. The Supabase settings below are
 * placeholders; nothing connects.
 *
 *   npx playwright test
 */
const PORT = Number(process.env.V2_SMOKE_PORT ?? 3210);

export default defineConfig({
  testDir: './e2e',
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
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:9',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'placeholder-anon-key-for-the-v2-smoke',
      // /v2/new streams from the free fixture provider, never a model.
      V2_AI_PROVIDER: 'fixture',
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },
});
