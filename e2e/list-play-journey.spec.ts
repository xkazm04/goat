import { test, expect } from "@playwright/test";

import { openFirstFeaturedList } from "./helpers/test-utils";

/**
 * E2E Test: List Play Journey
 *
 * Tests the critical user journey from landing page to match interface:
 * 1. Renders FeaturedListsSection on landing page
 * 2. Clicks a list's play button
 * 3. Verifies navigation to /goat?list={id}
 * 4. Confirms the match grid loads correctly
 *
 * This ensures the list->match handoff integration works correctly.
 *
 * Rewritten 2026-09-05. Four of these six tests derived the list id from the
 * featured card's `data-testid`, whose suffix is the card INDEX, and then
 * waited for `/goat?list=0` — a URL the app never produces. A fifth read a
 * title out of `featured-list-title-<id>`, which no component renders. Both are
 * the same mistake: inventing an identifier instead of reading what the surface
 * actually exposes. The id now comes from the URL the app navigated to, and the
 * title from the card's own accessible name (`aria-label="Play <title>"`,
 * FeaturedListsSection.tsx), which is readable BEFORE the click and is a
 * user-visible fact rather than a private attribute.
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

  test("clicking play on featured list navigates to goat with correct list ID", async ({
    page,
  }) => {
    const featuredSection = page.getByTestId("featured-lists-section");
    await expect(featuredSection).toBeVisible({ timeout: 10000 });

    const listId = await openFirstFeaturedList(page);

    // The id in the URL must be the list's own id, not a card index. A bare
    // integer here is the exact regression this test was blind to.
    expect(
      listId,
      `the goat URL carried "${listId}", which is a card index, not a list id`,
    ).not.toMatch(/^\d+$/);
    expect(page.url()).toContain(`/goat?list=${listId}`);
  });

  test("goat page loads and displays match grid after navigation", async ({
    page,
  }) => {
    const featuredSection = page.getByTestId("featured-lists-section");
    await expect(featuredSection).toBeVisible({ timeout: 10000 });

    await openFirstFeaturedList(page);

    // Wait for loading to complete (spinner should disappear)
    // The page shows a loading spinner during data fetch
    await page.waitForLoadState("networkidle");

    // Verify we're not on an error state
    const errorMessage = page.locator("text=Failed to load list");
    await expect(errorMessage).not.toBeVisible({ timeout: 5000 });

    // Verify we're not on "No list selected" state
    const noListMessage = page.locator("text=No list selected");
    await expect(noListMessage).not.toBeVisible({ timeout: 5000 });

    // The point of the journey: the grid the user came for actually renders.
    await expect(page.getByTestId("match-grid-container")).toBeVisible({
      timeout: 20000,
    });
  });

  test("user lists section displays play button that navigates correctly", async ({
    page,
  }) => {
    // The user-lists section only renders for a signed-in account with lists,
    // which this suite does not have. `user-list-play-btn-<id>` DOES carry the
    // list id (UserListCard.tsx), so when the section is present the assertion
    // is exact; when it is absent the test states that it skipped rather than
    // reporting a pass it did not earn.
    const userListPlayBtn = page.locator('[data-testid^="user-list-play-btn-"]').first();
    const hasUserLists = await userListPlayBtn
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    test.skip(!hasUserLists, "no user lists rendered — this suite has no signed-in account");

    const btnTestId = await userListPlayBtn.getAttribute("data-testid");
    const listId = btnTestId?.replace("user-list-play-btn-", "");
    expect(listId).toBeTruthy();

    await userListPlayBtn.click();
    await page.waitForURL(`**/goat?list=${listId}`, { timeout: 10000 });
    expect(page.url()).toContain(`/goat?list=${listId}`);
  });

  test("list store receives correct list data on play", async ({ page }) => {
    const featuredSection = page.getByTestId("featured-lists-section");
    await expect(featuredSection).toBeVisible({ timeout: 10000 });

    // The card's accessible name is `Play <title>` — the only place the title
    // is legible to the harness before the click.
    const card = page.locator('[data-testid^="featured-list-item-"]').first();
    await expect(card).toBeVisible({ timeout: 15000 });
    const ariaLabel = (await card.getAttribute("aria-label")) ?? "";
    const listTitle = ariaLabel.replace(/^Play\s+/, "");
    expect(listTitle, `card had no readable title (aria-label was "${ariaLabel}")`).not.toBe("");

    const listId = await openFirstFeaturedList(page);

    // Verify list-store was populated by checking localStorage
    // The list-store uses zustand persist which saves to localStorage
    const listStoreData = await page.evaluate(() => {
      const stored = localStorage.getItem("list-store");
      return stored ? JSON.parse(stored) : null;
    });

    // Verify current list is set in the store
    expect(listStoreData).not.toBeNull();
    expect(
      listStoreData?.state?.currentList,
      "list-store persisted no currentList after a play click",
    ).toBeTruthy();
    expect(listStoreData.state.currentList.id).toBe(listId);
    expect(listStoreData.state.currentList.title).toBe(listTitle);
  });

  test("navigation preserves list ID through page load", async ({ page }) => {
    // Navigate directly to goat with a list parameter
    // This tests that the page can load list data from URL param alone
    const featuredSection = page.getByTestId("featured-lists-section");
    await expect(featuredSection).toBeVisible({ timeout: 10000 });

    const listId = await openFirstFeaturedList(page);

    // Come back and enter by URL alone — no click, no store priming.
    await page.goto("/");
    await page.goto(`/goat?list=${listId}`);
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain(`list=${listId}`);

    // Page should not show "No list selected" error
    const noListMessage = page.locator("text=No list selected");
    await expect(noListMessage).not.toBeVisible({ timeout: 5000 });
  });
});
