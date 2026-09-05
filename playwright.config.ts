import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for G.O.A.T. E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./e2e",
  /**
   * Environment preconditions are owned by a launcher, not by each test.
   * Before this existed, specs called `test.skip()` when their fixture data
   * was missing, so against an empty database the whole suite ran, executed
   * nothing, and reported green. See e2e/global-setup.ts.
   */
  globalSetup: "./e2e/global-setup.ts",
  /**
   * The stub specs `list-search`, `ranking-completion` and `session-persistence`
   * were deleted on 2026-08-24: 10 tests, zero assertions, hard-skipped since
   * the day they were written and listed in docs/E2E_BROWSER_TESTING.md with
   * behavioural descriptions as though they were coverage. A quarantine nobody
   * reviews is worse than an honest gap. The gaps are now recorded in that
   * document's "Not covered" table instead.
   */
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",

    /* Take screenshot on failure */
    screenshot: "only-on-failure",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "npm run dev",
    url: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
