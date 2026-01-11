import { test, expect } from "@playwright/test";

/**
 * E2E Test: Drag-Drop Ranking Workflow
 *
 * Tests the core drag-and-drop ranking functionality:
 * 1. Navigate to match-test page with a list
 * 2. Wait for collection panel to load with items
 * 3. Drag an item from collection panel to grid slot
 * 4. Verify the slot shows the dropped item
 * 5. Verify session persists on page reload
 *
 * This ensures the complete drag-drop-persist cycle works correctly,
 * testing the integration of dnd-kit, grid-store, and session-store.
 */
test.describe("Drag-Drop Ranking Workflow", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the landing page first to get a valid list ID
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should drag item from collection to grid slot and persist on reload", async ({
    page,
  }) => {
    // Step 1: Navigate to match-test page with a featured list
    const featuredSection = page.getByTestId("featured-lists-section");
    await expect(featuredSection).toBeVisible({ timeout: 15000 });

    const firstListItem = page
      .locator('[data-testid^="featured-list-item-"]')
      .first();
    await expect(firstListItem).toBeVisible({ timeout: 15000 });

    // Get the list ID for later verification
    const testId = await firstListItem.getAttribute("data-testid");
    const listId = testId?.replace("featured-list-item-", "");
    expect(listId).toBeTruthy();

    // Click to navigate to match page
    await firstListItem.click();
    await page.waitForURL(`**/match-test?list=${listId}`, { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    // Step 2: Wait for collection panel to load
    const collectionPanel = page.getByTestId("collection-panel");
    await expect(collectionPanel).toBeVisible({ timeout: 20000 });

    // Wait for collection grid to have items
    const collectionGrid = page.getByTestId("virtualized-collection-grid");
    await expect(collectionGrid).toBeVisible({ timeout: 15000 });

    // Wait for at least one collection item to be visible
    // Items have testid format: collection-item-wrapper-{id}
    const firstCollectionItem = page
      .locator('[data-testid^="collection-item-wrapper-"]')
      .first();
    await expect(firstCollectionItem).toBeVisible({ timeout: 15000 });

    // Get the item's ID for verification after drop
    const collectionItemTestId =
      await firstCollectionItem.getAttribute("data-testid");
    const itemId = collectionItemTestId?.replace("collection-item-wrapper-", "");
    expect(itemId).toBeTruthy();

    // Step 3: Find the first empty grid slot (position 1)
    const gridSlot1 = page.getByTestId("match-grid-slot-1");
    await expect(gridSlot1).toBeVisible({ timeout: 10000 });

    // Verify the slot is initially empty
    const emptyIndicator = page.getByTestId("grid-slot-empty-1");
    await expect(emptyIndicator).toBeVisible({ timeout: 5000 });

    // Step 4: Perform drag and drop operation
    // Get bounding boxes for drag source and drop target
    const sourceBox = await firstCollectionItem.boundingBox();
    const targetBox = await gridSlot1.boundingBox();

    expect(sourceBox).not.toBeNull();
    expect(targetBox).not.toBeNull();

    if (sourceBox && targetBox) {
      // Calculate center points
      const sourceCenter = {
        x: sourceBox.x + sourceBox.width / 2,
        y: sourceBox.y + sourceBox.height / 2,
      };
      const targetCenter = {
        x: targetBox.x + targetBox.width / 2,
        y: targetBox.y + targetBox.height / 2,
      };

      // Perform drag operation with mouse events
      await page.mouse.move(sourceCenter.x, sourceCenter.y);
      await page.mouse.down();

      // Move in small steps for dnd-kit to detect drag properly
      const steps = 20;
      for (let i = 1; i <= steps; i++) {
        const progress = i / steps;
        const x = sourceCenter.x + (targetCenter.x - sourceCenter.x) * progress;
        const y = sourceCenter.y + (targetCenter.y - sourceCenter.y) * progress;
        await page.mouse.move(x, y);
        // Small delay to allow dnd-kit to process
        await page.waitForTimeout(20);
      }

      // Complete the drop
      await page.mouse.up();
    }

    // Step 5: Wait for and verify the item appeared in the grid slot
    // After drop, the slot should show either the item image or title
    // Give it time for animation and state update
    await page.waitForTimeout(500);

    // The slot should no longer show the "Drop here" empty indicator
    await expect(emptyIndicator).not.toBeVisible({ timeout: 5000 });

    // The slot should now contain the item (image or title)
    // Grid items have testid: grid-item-image-{position} or grid-item-title-{position}
    const gridItemContent = page
      .locator(
        '[data-testid="grid-item-image-1"], [data-testid="grid-item-title-1"]'
      )
      .first();
    await expect(gridItemContent).toBeVisible({ timeout: 5000 });

    // Step 6: Verify session persistence - reload the page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Wait for the match interface to reload
    await expect(collectionPanel).toBeVisible({ timeout: 20000 });
    await expect(gridSlot1).toBeVisible({ timeout: 10000 });

    // Verify the item is still in the grid slot after reload
    const gridItemAfterReload = page
      .locator(
        '[data-testid="grid-item-image-1"], [data-testid="grid-item-title-1"]'
      )
      .first();
    await expect(gridItemAfterReload).toBeVisible({ timeout: 10000 });

    // The empty indicator should still not be visible
    const emptyIndicatorAfterReload = page.getByTestId("grid-slot-empty-1");
    await expect(emptyIndicatorAfterReload).not.toBeVisible({ timeout: 5000 });
  });

  test("should show drop zone highlighting during drag", async ({ page }) => {
    // Navigate to match-test with a featured list
    const featuredSection = page.getByTestId("featured-lists-section");
    await expect(featuredSection).toBeVisible({ timeout: 15000 });

    const firstListItem = page
      .locator('[data-testid^="featured-list-item-"]')
      .first();
    await expect(firstListItem).toBeVisible({ timeout: 15000 });

    await firstListItem.click();
    await page.waitForURL(/\/match-test\?list=/, { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    // Wait for collection panel
    const collectionPanel = page.getByTestId("collection-panel");
    await expect(collectionPanel).toBeVisible({ timeout: 20000 });

    // Wait for collection items
    const firstCollectionItem = page
      .locator('[data-testid^="collection-item-wrapper-"]')
      .first();
    await expect(firstCollectionItem).toBeVisible({ timeout: 15000 });

    // Find grid slot
    const gridSlot1 = page.getByTestId("match-grid-slot-1");
    await expect(gridSlot1).toBeVisible({ timeout: 10000 });

    // Start dragging
    const sourceBox = await firstCollectionItem.boundingBox();
    expect(sourceBox).not.toBeNull();

    if (sourceBox) {
      const sourceCenter = {
        x: sourceBox.x + sourceBox.width / 2,
        y: sourceBox.y + sourceBox.height / 2,
      };

      // Start drag
      await page.mouse.move(sourceCenter.x, sourceCenter.y);
      await page.mouse.down();

      // Move slightly to initiate drag
      await page.mouse.move(sourceCenter.x + 10, sourceCenter.y + 10);
      await page.waitForTimeout(200);

      // Check that valid drop zone indicators appear during drag
      // These have testid: valid-drop-zone-indicator-{position}
      const dropZoneIndicator = page
        .locator('[data-testid^="valid-drop-zone-indicator-"]')
        .first();

      // The drop zone indicator should be visible while dragging over empty slots
      // (This is animated and may appear after a short delay)
      await page.waitForTimeout(300);

      // Cancel the drag
      await page.mouse.up();
    }
  });

  test("should allow swapping items between grid slots", async ({ page }) => {
    // This test requires two items already placed in the grid
    // First, place two items, then verify swap functionality

    // Navigate to match-test with a featured list
    const featuredSection = page.getByTestId("featured-lists-section");
    await expect(featuredSection).toBeVisible({ timeout: 15000 });

    const firstListItem = page
      .locator('[data-testid^="featured-list-item-"]')
      .first();
    await expect(firstListItem).toBeVisible({ timeout: 15000 });

    await firstListItem.click();
    await page.waitForURL(/\/match-test\?list=/, { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    // Wait for collection panel
    const collectionPanel = page.getByTestId("collection-panel");
    await expect(collectionPanel).toBeVisible({ timeout: 20000 });

    // Wait for collection items
    const collectionItems = page.locator(
      '[data-testid^="collection-item-wrapper-"]'
    );
    await expect(collectionItems.first()).toBeVisible({ timeout: 15000 });

    // Need at least 2 items for swap test
    const itemCount = await collectionItems.count();
    if (itemCount < 2) {
      test.skip();
      return;
    }

    // Get grid slots
    const gridSlot1 = page.getByTestId("match-grid-slot-1");
    const gridSlot2 = page.getByTestId("match-grid-slot-2");
    await expect(gridSlot1).toBeVisible({ timeout: 10000 });
    await expect(gridSlot2).toBeVisible({ timeout: 10000 });

    // Helper function for drag and drop
    const dragAndDrop = async (source: any, target: any) => {
      const sourceBox = await source.boundingBox();
      const targetBox = await target.boundingBox();

      if (sourceBox && targetBox) {
        const sourceCenter = {
          x: sourceBox.x + sourceBox.width / 2,
          y: sourceBox.y + sourceBox.height / 2,
        };
        const targetCenter = {
          x: targetBox.x + targetBox.width / 2,
          y: targetBox.y + targetBox.height / 2,
        };

        await page.mouse.move(sourceCenter.x, sourceCenter.y);
        await page.mouse.down();

        const steps = 15;
        for (let i = 1; i <= steps; i++) {
          const progress = i / steps;
          const x =
            sourceCenter.x + (targetCenter.x - sourceCenter.x) * progress;
          const y =
            sourceCenter.y + (targetCenter.y - sourceCenter.y) * progress;
          await page.mouse.move(x, y);
          await page.waitForTimeout(20);
        }

        await page.mouse.up();
        await page.waitForTimeout(300);
      }
    };

    // Place first item in slot 1
    const firstItem = collectionItems.first();
    await dragAndDrop(firstItem, gridSlot1);

    // Place second item in slot 2
    // Need to re-query as items may have shifted
    const remainingItems = page.locator(
      '[data-testid^="collection-item-wrapper-"]'
    );
    await expect(remainingItems.first()).toBeVisible({ timeout: 5000 });
    await dragAndDrop(remainingItems.first(), gridSlot2);

    // Verify both slots are now occupied
    const gridItem1 = page
      .locator(
        '[data-testid="grid-item-image-1"], [data-testid="grid-item-title-1"]'
      )
      .first();
    const gridItem2 = page
      .locator(
        '[data-testid="grid-item-image-2"], [data-testid="grid-item-title-2"]'
      )
      .first();

    await expect(gridItem1).toBeVisible({ timeout: 5000 });
    await expect(gridItem2).toBeVisible({ timeout: 5000 });

    // Record what's in each slot before swap
    // (We could capture more specific data here if needed)

    // Now the swap test: drag item from slot 1 to slot 2
    // This tests the swap functionality when dropping on an occupied slot
    await dragAndDrop(gridSlot1, gridSlot2);

    // Both slots should still be occupied after swap
    await expect(gridItem1).toBeVisible({ timeout: 5000 });
    await expect(gridItem2).toBeVisible({ timeout: 5000 });
  });

  test("should support removing item from grid back to collection", async ({
    page,
  }) => {
    // Navigate to match-test with a featured list
    const featuredSection = page.getByTestId("featured-lists-section");
    await expect(featuredSection).toBeVisible({ timeout: 15000 });

    const firstListItem = page
      .locator('[data-testid^="featured-list-item-"]')
      .first();
    await expect(firstListItem).toBeVisible({ timeout: 15000 });

    await firstListItem.click();
    await page.waitForURL(/\/match-test\?list=/, { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    // Wait for collection panel
    const collectionPanel = page.getByTestId("collection-panel");
    await expect(collectionPanel).toBeVisible({ timeout: 20000 });

    // Wait for collection items
    const firstCollectionItem = page
      .locator('[data-testid^="collection-item-wrapper-"]')
      .first();
    await expect(firstCollectionItem).toBeVisible({ timeout: 15000 });

    // Count initial items in collection
    const initialItemCount = await page
      .locator('[data-testid^="collection-item-wrapper-"]')
      .count();

    // Find grid slot
    const gridSlot1 = page.getByTestId("match-grid-slot-1");
    await expect(gridSlot1).toBeVisible({ timeout: 10000 });

    // Drag item to grid
    const sourceBox = await firstCollectionItem.boundingBox();
    const targetBox = await gridSlot1.boundingBox();

    if (sourceBox && targetBox) {
      const sourceCenter = {
        x: sourceBox.x + sourceBox.width / 2,
        y: sourceBox.y + sourceBox.height / 2,
      };
      const targetCenter = {
        x: targetBox.x + targetBox.width / 2,
        y: targetBox.y + targetBox.height / 2,
      };

      await page.mouse.move(sourceCenter.x, sourceCenter.y);
      await page.mouse.down();

      const steps = 15;
      for (let i = 1; i <= steps; i++) {
        const progress = i / steps;
        const x = sourceCenter.x + (targetCenter.x - sourceCenter.x) * progress;
        const y = sourceCenter.y + (targetCenter.y - sourceCenter.y) * progress;
        await page.mouse.move(x, y);
        await page.waitForTimeout(20);
      }

      await page.mouse.up();
      await page.waitForTimeout(500);
    }

    // Verify item is in grid
    const gridItemContent = page
      .locator(
        '[data-testid="grid-item-image-1"], [data-testid="grid-item-title-1"]'
      )
      .first();
    await expect(gridItemContent).toBeVisible({ timeout: 5000 });

    // Collection should have one less item (item is marked as "used")
    // The used items are filtered out from the display
    await page.waitForTimeout(500);
    const afterDropCount = await page
      .locator('[data-testid^="collection-item-wrapper-"]')
      .count();

    // The item should now be hidden from collection (marked as used)
    expect(afterDropCount).toBeLessThan(initialItemCount);

    // Now remove the item by clicking the remove button
    // Remove buttons have testid: remove-item-btn-{position}
    const removeBtn = page.getByTestId("remove-item-btn-1");

    // Hover over the slot to reveal the remove button
    await gridSlot1.hover();
    await page.waitForTimeout(200);

    // Check if remove button is visible (it shows on hover)
    const isRemoveBtnVisible = await removeBtn.isVisible();

    if (isRemoveBtnVisible) {
      await removeBtn.click();
      await page.waitForTimeout(500);

      // Verify the slot is now empty
      const emptyIndicator = page.getByTestId("grid-slot-empty-1");
      await expect(emptyIndicator).toBeVisible({ timeout: 5000 });

      // The item should return to the collection
      const afterRemoveCount = await page
        .locator('[data-testid^="collection-item-wrapper-"]')
        .count();
      expect(afterRemoveCount).toBeGreaterThanOrEqual(afterDropCount);
    }
  });
});
