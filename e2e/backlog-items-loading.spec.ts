import { test, expect } from "@playwright/test";

import { E2E_LISTS } from "../scripts/seed-e2e-fixtures";

/**
 * E2E Test: Backlog Items Loading
 *
 * Opens the match page for a FIXTURE list directly by id and asserts that the
 * data the page depends on actually arrives and renders: the list metadata
 * request, at least one item-source request, the grid, and the backlog items.
 *
 * Rewritten 2026-09-05. The previous version could not pass anywhere but one
 * machine: it overrode `baseURL` to http://localhost:3001 while
 * playwright.config.ts starts the app on :3000; it hard-coded a list id
 * (`06ca05fd-…`) that no seed writes; and its store diagnostics read
 * `window.__backlogStore`, which no module exposes, so the "diagnose" test
 * asserted `undefined > 0`. It also slept for a fixed 10 s + 15 s + 2 s per
 * run. The list id now comes from the seed's own namespace, waits poll for the
 * event they are waiting for, and the oracle is what the user sees.
 */

const FIXTURE_LIST = E2E_LISTS[0];
const MATCH_URL = `/goat?list=${FIXTURE_LIST.id}`;

interface ApiCall {
  url: string;
  status: number;
}

function trackApiCalls(page: import("@playwright/test").Page): ApiCall[] {
  const calls: ApiCall[] = [];
  page.on("response", (response) => {
    const url = response.url();
    if (url.includes("/api/")) calls.push({ url, status: response.status() });
  });
  return calls;
}

test.describe("Backlog Items Loading", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the origin first so storage APIs are reachable, then start
    // every test from an empty persisted state.
    await page.goto("/");
    await page.evaluate(() => {
      indexedDB.deleteDatabase("backlog-store");
      localStorage.clear();
    });
  });

  test("the match page requests the fixture list and at least one item source", async ({
    context,
  }) => {
    // A fresh page so React Query's in-memory cache from beforeEach cannot
    // satisfy the requests this test is counting.
    const page = await context.newPage();
    const apiCalls = trackApiCalls(page);

    await page.goto(MATCH_URL);

    const matchGrid = page.locator('[data-testid="match-grid-container"]');
    await expect(matchGrid).toBeVisible({ timeout: 15000 });

    const listMetadataCalls = () =>
      apiCalls.filter((c) => c.url.includes(`/api/lists/${FIXTURE_LIST.id}`));
    const itemSourceCalls = () =>
      apiCalls.filter(
        (c) =>
          c.url.includes("/api/top/groups/categories/") ||
          (c.url.includes("/api/top/groups/") && c.url.includes("include_items")) ||
          c.url.includes("/api/top/items"),
      );

    await expect
      .poll(() => listMetadataCalls().length, {
        message: `no request for /api/lists/${FIXTURE_LIST.id} was observed`,
        timeout: 30000,
      })
      .toBeGreaterThan(0);
    expect(listMetadataCalls()[0].status, "list metadata request did not succeed").toBe(200);

    await expect
      .poll(() => itemSourceCalls().length, {
        message:
          "neither the backlog store nor the collection made an API call for items or groups",
        timeout: 30000,
      })
      .toBeGreaterThan(0);

    await page.close();
  });

  test("backlog items render in the collection panel for the fixture list", async ({
    context,
  }) => {
    const page = await context.newPage();
    await page.goto(MATCH_URL);

    const collectionPanel = page.locator('[data-testid="collection-panel"]');
    await expect(collectionPanel).toBeVisible({ timeout: 20000 });

    // The fixture list is seeded with more items than it has slots
    // (scripts/seed-e2e-fixtures.ts), so an empty backlog here is a data or
    // plumbing failure, not "nothing to show".
    const items = page.locator('[data-testid^="collection-item-wrapper-"]');
    await expect
      .poll(() => items.count(), {
        message:
          `no backlog item rendered for "${FIXTURE_LIST.title}" ` +
          `(${FIXTURE_LIST.itemCount} items seeded, ${FIXTURE_LIST.size} ranked). ` +
          "If npm run seed:e2e -- --check is green, the category -> groups -> items path is broken.",
        timeout: 30000,
      })
      .toBeGreaterThan(0);

    await page.close();
  });

  test("match grid renders a drop zone per slot", async ({ page }) => {
    await page.goto(MATCH_URL);

    const matchGrid = page.locator('[data-testid="match-grid-container"]');
    await expect(matchGrid).toBeVisible({ timeout: 15000 });

    const dropZones = page.locator('[data-testid^="drop-zone-wrapper-"]');
    await expect
      .poll(() => dropZones.count(), {
        message: "no drop zones rendered in the match grid",
        timeout: 10000,
      })
      .toBe(FIXTURE_LIST.size);
  });

  test("no stuck loading or error states", async ({ page }) => {
    await page.goto(MATCH_URL);

    const matchGrid = page.locator('[data-testid="match-grid-container"]');
    await expect(matchGrid).toBeVisible({ timeout: 15000 });

    await expect(page.locator("text=Failed to load list")).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=No list selected")).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="collection-loading"]')).not.toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator('[data-testid="collection-error"]')).not.toBeVisible({
      timeout: 5000,
    });
  });
});
