import { test, expect } from '@playwright/test';

import {
  clearAppStorage,
  navigateToGoatWithList,
  waitForCollectionPanel,
  waitForMatchGrid,
  dndDrag,
  countFilledSlots,
  getTotalSlots,
  autoFillGrid,
} from './helpers/test-utils';

/**
 * E2E Test: Goat Voting & Completion Flow
 *
 * Tests the core ranking journey via /goat?list=X:
 * 1. Page load — grid, header, view switcher, auto-fill button
 * 2. Drag-and-drop from collection to grid
 * 3. Auto-fill → completion modal → actions → share button
 * 4. Session persistence across reload
 */

test.describe('Goat: Page Load & Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppStorage(page);
  });

  test('should load match page with grid, header, views, and auto-fill', async ({ page }) => {
    await navigateToGoatWithList(page);
    await waitForMatchGrid(page);

    // Header visible
    await expect(page.getByTestId('match-grid-header')).toBeVisible({ timeout: 5000 });

    // Drop zones present
    const totalSlots = await getTotalSlots(page);
    expect(totalSlots).toBeGreaterThan(0);

    // View switcher
    await expect(page.getByTestId('view-podium-btn')).toBeVisible();
    await expect(page.getByTestId('view-goat-btn')).toBeVisible();

    // Auto-fill button
    await expect(page.getByTestId('auto-fill-btn')).toBeVisible();
  });
});

test.describe('Goat: Drag & Drop', () => {
  test('should attempt drag from collection to grid slot', async ({ page }) => {
    test.setTimeout(60_000);

    await clearAppStorage(page);
    await navigateToGoatWithList(page);
    await waitForMatchGrid(page);

    // `test.skip(true, 'No backlog items…')` used to stand here. global-setup
    // establishes the fixture precondition before any worker starts, so an
    // empty collection panel is a data or plumbing failure that already got
    // past a check minutes ago — not a reason to opt out.
    const hasItems = await waitForCollectionPanel(page);
    expect(
      hasItems,
      'the collection panel rendered no backlog items. global-setup verified ' +
        'the lists API is non-empty, so this is a plumbing failure, not a ' +
        'missing fixture.',
    ).toBe(true);

    const collectionItem = page.locator('[data-testid^="collection-item-wrapper-"]').first();
    const dropZone = page.getByTestId('drop-zone-0');
    await dndDrag(page, collectionItem, dropZone);

    // Was: log "sensor timing issue (expected)" and pass. A drag that does not
    // register IS the failure this test exists to report; if it turns out to be
    // intermittent it belongs in a named quarantine with an owner and a date
    // (registry test-harness/flake-lifecycle), not behind a console.log.
    await expect(
      page.getByTestId('remove-item-btn-0'),
      'the dragged item did not land in position 1',
    ).toHaveCount(1, { timeout: 5000 });
  });
});

test.describe('Goat: Complete Voting Journey', () => {
  /**
   * COMPREHENSIVE FLOW TEST
   *
   * Covers the full journey: auto-fill → modal → actions → share → persistence.
   *
   * IMPORTANT: Do NOT clear storage before this test — the backlog store
   * depends on cached list metadata + API responses. Clearing storage
   * removes the list config that tells the backlog which category to fetch.
   */
  test('should complete full voting journey: auto-fill, completion modal, share, persist', async ({ page }) => {
    test.setTimeout(120_000);

    // --- Step 1: Navigate and wait for backlog ---
    await page.goto('/', { waitUntil: 'commit' });
    await navigateToGoatWithList(page);
    await waitForMatchGrid(page);
    // Wait for backlog items. The backlog loads via: list metadata → category →
    // initializeGroups → API fetch → render.
    //
    // This used to accept `hasCollectionItems || noItemsGone`, where
    // `noItemsGone` was the ABSENCE of the empty-state marker. A page on which
    // the collection panel never rendered at all has no empty-state marker
    // either, so the disjunction was satisfied on the first poll by a blank
    // screen — and the auto-fill below then had nothing to place. The absence
    // of an "it is empty" sign is not evidence that it is full.
    await expect
      .poll(
        () => page.locator('[data-testid^="collection-item-wrapper-"]').count(),
        {
          message:
            'the collection panel rendered no backlog items within 45s, so ' +
            'auto-fill has nothing to place',
          timeout: 45_000,
          intervals: [2000, 3000, 5000],
        },
      )
      .toBeGreaterThan(0);

    const totalSlots = await getTotalSlots(page);
    expect(totalSlots).toBeGreaterThan(0);

    // --- Step 2: Auto-fill all grid slots ---
    await autoFillGrid(page);

    // --- Step 3: Completion modal should appear ---
    const congratsHeading = page.getByRole('heading', { name: /congratulations/i });
    await expect(congratsHeading).toBeVisible({ timeout: 15_000 });

    // --- Step 4: Verify action buttons ---
    const keepEditingBtn = page.getByRole('button', { name: /keep editing/i });
    const startNewBtn = page.getByRole('button', { name: /start new/i });
    await expect(keepEditingBtn).toBeVisible({ timeout: 3000 });
    await expect(startNewBtn).toBeVisible({ timeout: 3000 });

    // --- Step 5: Dismiss modal with Keep Editing ---
    await keepEditingBtn.click();
    await expect(congratsHeading).not.toBeVisible({ timeout: 5000 });

    // Grid should still be visible and filled
    await expect(page.getByTestId('match-grid-container')).toBeVisible();
    const filledAfterDismiss = await countFilledSlots(page);
    expect(filledAfterDismiss).toBeGreaterThan(0);

    // --- Step 6: Share button should be visible after completion ---
    const shareBtn = page.getByTestId('share-results-btn');
    await expect(shareBtn).toBeVisible({ timeout: 5000 });

    // --- Step 7: Verify session persistence across reload ---
    await page.reload();
    await page.waitForLoadState('networkidle');
    await waitForMatchGrid(page);

    await expect(async () => {
      const filledAfterReload = await countFilledSlots(page);
      expect(filledAfterReload).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 15_000 });
  });

  /*
   * REMOVED 2026-09-05: `should show auth prompt for guest users after
   * completion`.
   *
   * It spent 90 s driving a full ranking to completion and then asserted
   * `expect(true).toBeTruthy()`, having declared both outcomes acceptable
   * ("Both states valid — pass regardless"). A test that cannot fail on its own
   * title is not coverage of that title, and leaving it in place asserted to
   * the next reader that guest-completion behaviour was tested. Whether a
   * signed-out user is prompted to save is a real question with a real answer,
   * and this run cannot execute the suite to find out which it is; the gap is
   * recorded in docs/E2E_BROWSER_TESTING.md under "Not covered" rather than
   * implied by a green test.
   */
});
