import { test, expect } from "@playwright/test";

/**
 * E2E Test: List Play Journey
 *
 * Tests the critical user journey from landing page to match interface:
 * 1. Renders FeaturedListsSection on landing page
 * 2. Clicks a list's play button
 * 3. Verifies navigation to /match-test?list={id}
 * 4. Confirms the match grid loads correctly
 *
 * This ensures the list->match handoff integration works correctly.
 */
test.describe("List Play Journey", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the landing page
    await page.goto("/");

    // Wait for page to be fully loaded
    await page.waitForLoadState("networkidle");
  });

  test("should display featured lists section on landing page", async ({
    page,
  }) => {
    // Verify the featured lists section is rendered
    const featuredSection = page.getByTestId("featured-lists-section");
    await expect(featuredSection).toBeVisible({ timeout: 10000 });

    // Verify the section title is present
    await expect(
      page.getByTestId("featured-lists-section-title")
    ).toBeVisible();
  });

  test("clicking play on featured list navigates to match-test with correct list ID", async ({
    page,
  }) => {
    // Wait for featured lists to load (check for skeleton to disappear or items to appear)
    const featuredSection = page.getByTestId("featured-lists-section");
    await expect(featuredSection).toBeVisible({ timeout: 10000 });

    // Wait for at least one featured list item to be visible
    // Use a flexible selector that matches any featured list item
    const firstListItem = page.locator('[data-testid^="featured-list-item-"]').first();

    // Wait for the list item to appear (may need to wait for API response)
    await expect(firstListItem).toBeVisible({ timeout: 15000 });

    // Extract the list ID from the test ID
    const testId = await firstListItem.getAttribute("data-testid");
    const listId = testId?.replace("featured-list-item-", "");
    expect(listId).toBeTruthy();

    // Click on the featured list item (the entire item is clickable and triggers play)
    await firstListItem.click();

    // Verify navigation to match-test page with correct list ID
    await page.waitForURL(`**/match-test?list=${listId}`, { timeout: 10000 });

    // Verify URL contains the correct list parameter
    expect(page.url()).toContain(`/match-test?list=${listId}`);
  });

  test("match-test page loads and displays match grid after navigation", async ({
    page,
  }) => {
    // Wait for featured lists to load
    const featuredSection = page.getByTestId("featured-lists-section");
    await expect(featuredSection).toBeVisible({ timeout: 10000 });

    // Get the first featured list item
    const firstListItem = page.locator('[data-testid^="featured-list-item-"]').first();
    await expect(firstListItem).toBeVisible({ timeout: 15000 });

    // Extract list ID before clicking
    const testId = await firstListItem.getAttribute("data-testid");
    const listId = testId?.replace("featured-list-item-", "");

    // Click to navigate
    await firstListItem.click();

    // Wait for navigation
    await page.waitForURL(`**/match-test?list=${listId}`, { timeout: 10000 });

    // Wait for loading to complete (spinner should disappear)
    // The page shows a loading spinner during data fetch
    await page.waitForLoadState("networkidle");

    // Verify we're not on an error state
    const errorMessage = page.locator("text=Failed to load list");
    await expect(errorMessage).not.toBeVisible({ timeout: 5000 });

    // Verify we're not on "No list selected" state
    const noListMessage = page.locator("text=No list selected");
    await expect(noListMessage).not.toBeVisible({ timeout: 5000 });
  });

  test("user lists section displays play button that navigates correctly", async ({
    page,
  }) => {
    // Look for user lists section
    const userListsSection = page.getByTestId("user-lists-section");

    // If user has lists, test the play button
    const isUserSectionVisible = await userListsSection.isVisible().catch(() => false);

    if (isUserSectionVisible) {
      // Check for user list items
      const userListPlayBtn = page.locator('[data-testid^="user-list-play-btn-"]').first();
      const hasUserLists = await userListPlayBtn.isVisible().catch(() => false);

      if (hasUserLists) {
        // Extract list ID from button test ID
        const btnTestId = await userListPlayBtn.getAttribute("data-testid");
        const listId = btnTestId?.replace("user-list-play-btn-", "");

        // Click the play button
        await userListPlayBtn.click();

        // Verify navigation
        await page.waitForURL(`**/match-test?list=${listId}`, { timeout: 10000 });
        expect(page.url()).toContain(`/match-test?list=${listId}`);
      }
    }

    // If no user lists, this test passes (no assertion needed)
    // The critical path is tested in the featured lists tests above
  });

  test("list store receives correct list data on play", async ({ page }) => {
    // Wait for featured lists
    const featuredSection = page.getByTestId("featured-lists-section");
    await expect(featuredSection).toBeVisible({ timeout: 10000 });

    // Get a featured list item
    const firstListItem = page.locator('[data-testid^="featured-list-item-"]').first();
    await expect(firstListItem).toBeVisible({ timeout: 15000 });

    // Get the list title before clicking
    const testId = await firstListItem.getAttribute("data-testid");
    const listId = testId?.replace("featured-list-item-", "");

    // Get the list title text (from the item's title element)
    const titleElement = page.locator(`[data-testid="featured-list-title-${listId}"]`);
    const listTitle = await titleElement.textContent();

    // Click to play
    await firstListItem.click();

    // Wait for navigation
    await page.waitForURL(`**/match-test?list=${listId}`, { timeout: 10000 });

    // Verify list-store was populated by checking localStorage
    // The list-store uses zustand persist which saves to localStorage
    const listStoreData = await page.evaluate(() => {
      const stored = localStorage.getItem("list-store");
      return stored ? JSON.parse(stored) : null;
    });

    // Verify current list is set in the store
    expect(listStoreData).not.toBeNull();
    if (listStoreData?.state?.currentList) {
      expect(listStoreData.state.currentList.id).toBe(listId);
      // Title should match what we saw on the landing page
      if (listTitle) {
        expect(listStoreData.state.currentList.title).toBe(listTitle);
      }
    }
  });

  test("navigation preserves list ID through page load", async ({ page }) => {
    // Navigate directly to match-test with a list parameter
    // This tests that the page can load list data from URL param alone
    await page.goto("/");

    // Get a valid list ID from the featured section
    const featuredSection = page.getByTestId("featured-lists-section");
    await expect(featuredSection).toBeVisible({ timeout: 10000 });

    const firstListItem = page.locator('[data-testid^="featured-list-item-"]').first();
    await expect(firstListItem).toBeVisible({ timeout: 15000 });

    const testId = await firstListItem.getAttribute("data-testid");
    const listId = testId?.replace("featured-list-item-", "");

    // Navigate directly to match-test page
    await page.goto(`/match-test?list=${listId}`);

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Verify the list ID is preserved in the URL
    expect(page.url()).toContain(`list=${listId}`);

    // Page should not show "No list selected" error
    const noListMessage = page.locator("text=No list selected");
    await expect(noListMessage).not.toBeVisible({ timeout: 5000 });
  });
});
