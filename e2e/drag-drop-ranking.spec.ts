import { test, expect, type Page } from "@playwright/test";

import { dndDrag, openFirstFeaturedList } from "./helpers/test-utils";

/**
 * E2E Test: Drag-Drop Ranking Workflow
 *
 * Tests the core drag-and-drop ranking functionality:
 * 1. Navigate to goat page with a list
 * 2. Wait for collection panel to load with items
 * 3. Drag an item from collection panel to grid slot
 * 4. Verify the slot shows the dropped item
 * 5. Verify session persists on page reload
 *
 * This ensures the complete drag-drop-persist cycle works correctly,
 * testing the integration of dnd-kit, grid-store, and session-store.
 *
 * ---------------------------------------------------------------------------
 * Rewritten 2026-09-05. Every test here addressed the grid through identifiers
 * the app has never rendered — `match-grid-slot-1`, `grid-slot-empty-1`,
 * `grid-item-image-1`, `grid-item-title-1` — so all four failed on their first
 * `toBeVisible`, before any dragging happened, and reported it as a broken
 * grid. The identifiers the grid actually publishes are:
 *
 *   drop-zone-wrapper-<position>   the slot's outer node        (SimpleDropZone)
 *   drop-zone-<position>           the droppable card           (DropZoneCard)
 *   remove-item-btn-<position>     present ONLY when occupied   (DropZoneOccupied)
 *   drop-zone-image-<position>     the item's image when occupied
 *
 * and `<position>` is ZERO-based: `DropZoneOccupied` renders the visible rank
 * as `position + 1`. The old constants were 1-based as well as misnamed, so
 * even a corrected name would have addressed the wrong slot.
 *
 * There is no empty-state test id at all — `DropZoneEmpty` renders none — so
 * "this slot is empty" is asserted as the ABSENCE of `remove-item-btn-<n>`,
 * which is the same oracle `countFilledSlots` in the helpers already uses.
 * ---------------------------------------------------------------------------
 */

/** The grid publishes 0-based positions; the UI labels them from 1. */
const SLOT_A = 0;
const SLOT_B = 1;

const slot = (page: Page, position: number) =>
  page.getByTestId(`drop-zone-wrapper-${position}`);
/** Occupied ⇔ the slot carries a remove button. DropZoneEmpty renders no id. */
const occupancyMarker = (page: Page, position: number) =>
  page.getByTestId(`remove-item-btn-${position}`);

async function openMatchPageWithItems(page: Page) {
  const featuredSection = page.getByTestId("featured-lists-section");
  await expect(featuredSection).toBeVisible({ timeout: 15000 });
  await openFirstFeaturedList(page);
  await page.waitForLoadState("networkidle");

  const collectionPanel = page.getByTestId("collection-panel");
  await expect(collectionPanel).toBeVisible({ timeout: 20000 });

  const items = page.locator('[data-testid^="collection-item-wrapper-"]');
  await expect(
    items.first(),
    "the collection panel rendered no items, so nothing can be dragged",
  ).toBeVisible({ timeout: 15000 });

  await expect(slot(page, SLOT_A)).toBeVisible({ timeout: 10000 });
  return items;
}

test.describe("Drag-Drop Ranking Workflow", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the landing page first to get a valid list ID
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should drag item from collection to grid slot and persist on reload", async ({
    page,
  }) => {
    const items = await openMatchPageWithItems(page);

    // The slot starts empty: no remove button exists for it.
    await expect(occupancyMarker(page, SLOT_A)).toHaveCount(0);

    await dndDrag(page, items.first(), slot(page, SLOT_A));

    // Occupied now — and this is the assertion the old `grid-item-image-1`
    // locator was trying and failing to make.
    await expect(
      occupancyMarker(page, SLOT_A),
      "the dragged item did not land in the first slot",
    ).toHaveCount(1, { timeout: 5000 });

    // Session persistence across a reload.
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("collection-panel")).toBeVisible({ timeout: 20000 });
    await expect(slot(page, SLOT_A)).toBeVisible({ timeout: 10000 });
    await expect(
      occupancyMarker(page, SLOT_A),
      "the placed item did not survive a reload — session persistence is broken",
    ).toHaveCount(1, { timeout: 10000 });
  });

  test("should highlight a valid drop zone while an item is being dragged", async ({
    page,
  }) => {
    const items = await openMatchPageWithItems(page);

    const box = await items.first().boundingBox();
    const target = await slot(page, SLOT_A).boundingBox();
    expect(box, "the collection item has no bounding box").not.toBeNull();
    expect(target, "the first grid slot has no bounding box").not.toBeNull();
    if (!box || !target) return;

    const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const to = { x: target.x + target.width / 2, y: target.y + target.height / 2 };

    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    // `ValidDropIndicator` is gated on `isOver && !isOccupied`, so the pointer
    // has to actually reach the slot; dnd-kit also needs several moves before
    // it reports a drag at all.
    for (let i = 1; i <= 20; i++) {
      const t = i / 20;
      await page.mouse.move(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
      await page.waitForTimeout(20);
    }

    try {
      // This test previously assigned the indicator locator and asserted
      // NOTHING, so it passed whether or not the highlight ever appeared.
      await expect(
        page.getByTestId(`valid-drop-zone-indicator-${SLOT_A}`),
        "no valid-drop-zone indicator appeared while dragging over an empty slot",
      ).toBeVisible({ timeout: 5000 });
    } finally {
      // Release the button whatever the assertion did, so a failure here does
      // not leave the next test with a stuck drag.
      await page.mouse.up();
    }
  });

  test("should allow swapping items between grid slots", async ({ page }) => {
    const items = await openMatchPageWithItems(page);

    // Two items are needed for the swap. Was `test.skip()`, which made a list
    // with too few items report as a pass; a list that cannot exercise the
    // behaviour under test is a fixture defect, and the run should say so.
    await expect
      .poll(() => items.count(), {
        message:
          "the opened list has fewer than 2 collection items, so the swap " +
          "cannot be exercised. Seed a list with at least 2 items.",
        timeout: 10000,
      })
      .toBeGreaterThanOrEqual(2);

    await expect(slot(page, SLOT_B)).toBeVisible({ timeout: 10000 });

    await dndDrag(page, items.first(), slot(page, SLOT_A));
    await expect(occupancyMarker(page, SLOT_A)).toHaveCount(1, { timeout: 5000 });

    // Re-query: the placed item is filtered out of the collection.
    await dndDrag(
      page,
      page.locator('[data-testid^="collection-item-wrapper-"]').first(),
      slot(page, SLOT_B),
    );
    await expect(occupancyMarker(page, SLOT_B)).toHaveCount(1, { timeout: 5000 });

    // Capture which item is where, so the swap can be asserted rather than
    // merely "both slots are still full", which a no-op also satisfies.
    // `ProgressiveImage` puts its testId on a `role="img"` container whose
    // accessible name is the item title (progressive-image.tsx) — there is no
    // `alt` to read, because there need not be an <img> at all when the image
    // falls back.
    const titleAt = async (position: number) =>
      slot(page, position)
        .getByTestId(`drop-zone-image-${position}`)
        .getAttribute("aria-label");
    const beforeA = await titleAt(SLOT_A);
    const beforeB = await titleAt(SLOT_B);
    expect(beforeA, "slot A rendered no item image to identify").toBeTruthy();
    expect(beforeB, "slot B rendered no item image to identify").toBeTruthy();
    expect(beforeA).not.toBe(beforeB);

    await dndDrag(page, slot(page, SLOT_A), slot(page, SLOT_B));

    await expect(occupancyMarker(page, SLOT_A)).toHaveCount(1, { timeout: 5000 });
    await expect(occupancyMarker(page, SLOT_B)).toHaveCount(1, { timeout: 5000 });
    await expect
      .poll(() => titleAt(SLOT_A), {
        message: "dropping an occupied slot on another did not swap their items",
        timeout: 5000,
      })
      .toBe(beforeB);
    expect(await titleAt(SLOT_B)).toBe(beforeA);
  });

  test("should support removing item from grid back to collection", async ({
    page,
  }) => {
    const items = await openMatchPageWithItems(page);
    const initialItemCount = await items.count();

    await dndDrag(page, items.first(), slot(page, SLOT_A));
    await expect(occupancyMarker(page, SLOT_A)).toHaveCount(1, { timeout: 5000 });

    // A placed item is filtered out of the collection.
    await expect
      .poll(() => items.count(), {
        message: "the placed item was not removed from the collection panel",
        timeout: 5000,
      })
      .toBeLessThan(initialItemCount);
    const afterDropCount = await items.count();

    // The remove button is `opacity-0 group-hover:opacity-100`, so hover first.
    await slot(page, SLOT_A).hover();
    await occupancyMarker(page, SLOT_A).click();

    // Was wrapped in `if (isRemoveBtnVisible)`, so a remove button that never
    // appeared made this a silent pass — the exact case the test is for.
    await expect(
      occupancyMarker(page, SLOT_A),
      "removing the item left the slot occupied",
    ).toHaveCount(0, { timeout: 5000 });
    await expect
      .poll(() => items.count(), {
        message: "the removed item did not return to the collection panel",
        timeout: 5000,
      })
      .toBeGreaterThanOrEqual(afterDropCount);
  });
});
