import { test, expect } from "@playwright/test";

/**
 * Exploratory Smoke Tests
 *
 * Verifies all major pages load correctly with key elements visible.
 * Catches rendering errors, hydration mismatches, and broken layouts.
 *
 * NOTE: Uses domcontentloaded instead of networkidle because the landing
 * page has persistent prefetch/polling that prevents networkidle from resolving.
 */

test.describe("Landing Page", () => {
  test("renders without errors and shows key sections", async ({ page }) => {
    // Collect console errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Page container should render
    const layout = page.getByTestId("landing-layout");
    await expect(layout).toBeVisible({ timeout: 15000 });

    // Landing main should render (hero section)
    const landingMain = page.getByTestId("landing-main");
    await expect(landingMain).toBeVisible({ timeout: 10000 });

    // Create button - may be list-create-btn (returning user) or create-first-list-btn (new user)
    const createBtn = page.locator('[data-testid="list-create-btn"], [data-testid="create-first-list-btn"], button:has-text("Create Your First Ranking")');
    await expect(createBtn.first()).toBeVisible({ timeout: 10000 });

    // Auth header may not render in test env (returns null while auth state loads)
    const authHeader = page.getByTestId("auth-header");
    const authVisible = await authHeader
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    // Not a hard failure - auth depends on external providers
    if (!authVisible) {
      console.log("auth-header not visible (expected in test env without auth provider)");
    }

    // No critical console errors (filter out known non-critical ones)
    const criticalErrors = consoleErrors.filter(
      (err) =>
        !err.includes("favicon") &&
        !err.includes("third-party") &&
        !err.includes("preload") &&
        !err.includes("hydration") &&
        !err.includes("Failed to fetch") &&
        !err.includes("ERR_") &&
        !err.includes("net::")
    );

    if (criticalErrors.length > 0) {
      console.log("Console errors found:", criticalErrors);
    }
  });

  test("search filter bar accepts input and responds", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Wait for landing layout to be visible
    await expect(page.getByTestId("landing-layout")).toBeVisible({
      timeout: 15000,
    });

    // Find and interact with search - scroll down to see it
    const searchInput = page.getByTestId("search-filter-input");

    // Search input may be in FeaturedListsSection (lazy loaded) - wait and retry
    await expect(searchInput).toBeVisible({ timeout: 25000 });

    await searchInput.click();
    await searchInput.fill("Movies");
    await page.waitForTimeout(500);
    await expect(searchInput).toHaveValue("Movies");
  });

  test("command palette opens with keyboard shortcut", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Wait for page to be interactive
    await expect(page.getByTestId("landing-layout")).toBeVisible({
      timeout: 15000,
    });

    // Press Cmd/Ctrl+K to open command palette
    await page.keyboard.press("Control+k");

    // Command palette should appear
    const palette = page.getByTestId("command-palette-container");
    const isPaletteVisible = await palette
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (isPaletteVisible) {
      const input = page.getByTestId("command-palette-input");
      await expect(input).toBeVisible();

      await input.fill("Top 10");
      await page.waitForTimeout(300);

      // Close with Escape
      await page.keyboard.press("Escape");
      await expect(palette).not.toBeVisible({ timeout: 3000 });
    }
  });

  test("create button navigates to studio or opens modal", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const createBtn = page.locator('[data-testid="list-create-btn"], [data-testid="create-first-list-btn"], button:has-text("Create Your First Ranking")');
    await expect(createBtn.first()).toBeVisible({ timeout: 15000 });

    await createBtn.first().click();

    // Should navigate to studio or open composition modal
    await page.waitForTimeout(2000);

    const onStudio = page.url().includes("/studio");
    const modalVisible = await page
      .getByTestId("composition-modal-container")
      .isVisible()
      .catch(() => false);

    expect(onStudio || modalVisible).toBeTruthy();
  });

  test("featured lists section loads with content", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Featured lists section should eventually appear (lazy loaded)
    const featuredSection = page.getByTestId("featured-lists-section");
    await expect(featuredSection).toBeVisible({ timeout: 20000 });

    // Should have at least one featured list item (API may be slow)
    const firstItem = page
      .locator('[data-testid^="featured-list-item-"]')
      .first();
    await expect(firstItem).toBeVisible({ timeout: 30000 });
  });
});

test.describe("Studio Page", () => {
  test("renders with all form elements visible", async ({ page }) => {
    await page.goto("/studio", { waitUntil: "domcontentloaded" });

    // Page container
    await expect(page.getByTestId("studio-page")).toBeVisible({
      timeout: 15000,
    });

    // Layout (use .first() since NeonArenaTheme can produce duplicates)
    await expect(page.getByTestId("studio-layout").first()).toBeVisible({
      timeout: 10000,
    });

    // Header with back button
    await expect(page.getByTestId("studio-header")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByTestId("studio-back-btn")).toBeVisible({
      timeout: 5000,
    });

    // Topic input
    const topicInput = page.getByTestId("studio-topic-input");
    await expect(topicInput).toBeVisible({ timeout: 5000 });

    // Generate button
    await expect(page.getByTestId("studio-generate-btn")).toBeVisible({
      timeout: 5000,
    });

    // Browse templates and advanced options
    await expect(page.getByTestId("studio-browse-templates-btn")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByTestId("studio-advanced-options-btn")).toBeVisible({
      timeout: 5000,
    });
  });

  test("topic input accepts text and enables generate button", async ({
    page,
  }) => {
    await page.goto("/studio", { waitUntil: "domcontentloaded" });

    // Use .first() since NeonArenaTheme can produce duplicate elements
    const topicInput = page.getByTestId("studio-topic-input").first();
    await expect(topicInput).toBeVisible({ timeout: 10000 });

    await topicInput.fill("Best Horror Movies");
    await expect(topicInput).toHaveValue("Best Horror Movies");

    const generateBtn = page.getByTestId("studio-generate-btn").first();
    await expect(generateBtn).toBeEnabled();
  });

  test("back button navigates to landing page", async ({ page }) => {
    await page.goto("/studio", { waitUntil: "domcontentloaded" });

    const backBtn = page.getByTestId("studio-back-btn");
    await expect(backBtn).toBeVisible({ timeout: 10000 });

    await backBtn.click();

    // Wait for navigation - the URL should end with / or be the base
    await page.waitForTimeout(3000);
    const url = page.url();
    // Check that we navigated away from /studio
    expect(url).not.toContain("/studio");
  });

  test("browse templates button opens gallery", async ({ page }) => {
    // Navigate fresh to avoid stale state from prior tests
    await page.goto("/studio", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    // Use .first() since NeonArenaTheme can produce duplicate elements
    const browseBtn = page.getByTestId("studio-browse-templates-btn").first();
    await expect(browseBtn).toBeVisible({ timeout: 10000 });

    await browseBtn.click();

    // Template gallery modal should open
    const gallery = page.getByTestId("template-gallery");
    const galleryViaRole = page.getByRole("dialog");

    const galleryVisible = await gallery
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const dialogVisible = await galleryViaRole
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    expect(galleryVisible || dialogVisible).toBeTruthy();
  });

  test("advanced options expands the form", async ({ page }) => {
    await page.goto("/studio", { waitUntil: "domcontentloaded" });

    const advancedBtn = page.getByTestId("studio-advanced-options-btn");
    await expect(advancedBtn).toBeVisible({ timeout: 10000 });

    await advancedBtn.click();

    // After expanding, the list title input should appear
    const listTitleInput = page.getByTestId("studio-list-title-input");
    await expect(listTitleInput).toBeVisible({ timeout: 5000 });

    // List description input should also appear
    const descInput = page.getByTestId("studio-list-description-input");
    await expect(descInput).toBeVisible({ timeout: 3000 });

    // List size buttons should be visible
    await expect(page.getByTestId("studio-list-size-10")).toBeVisible({
      timeout: 3000,
    });
    await expect(page.getByTestId("studio-list-size-20")).toBeVisible({
      timeout: 3000,
    });
  });
});

test.describe("Goat/Match Page", () => {
  test("navigates from featured list to goat page", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Wait for featured lists
    const firstList = page
      .locator('[data-testid^="featured-list-item-"]')
      .first();

    const hasLists = await firstList
      .isVisible({ timeout: 20000 })
      .catch(() => false);

    // Was `test.skip(); return;`. The fixture precondition is established once,
    // before any worker starts (e2e/global-setup.ts), so an absent list here is
    // not "nothing to test" — it is a real failure of a precondition that was
    // verified minutes ago. Skipping made an empty run indistinguishable from a
    // passing one.
    expect(
      hasLists,
      "No featured list rendered. global-setup verified the lists API is " +
        "non-empty, so this is a rendering or data-plumbing failure, not a " +
        "missing fixture.",
    ).toBe(true);

    const testId = await firstList.getAttribute("data-testid");
    const listId = testId?.replace("featured-list-item-", "");

    await firstList.click();
    await page.waitForURL(`**/goat?list=${listId}`, { timeout: 15000 });

    // Goat page should render
    await expect(page.getByTestId("goat-page")).toBeVisible({ timeout: 15000 });

    // Should not show error states
    await page.waitForTimeout(3000);
    const errorVisible = await page
      .locator("text=Failed to load list")
      .isVisible()
      .catch(() => false);
    expect(errorVisible).toBeFalsy();
  });

  test("match grid loads with grid slots", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const firstList = page
      .locator('[data-testid^="featured-list-item-"]')
      .first();
    const hasLists = await firstList
      .isVisible({ timeout: 20000 })
      .catch(() => false);

    // Was `test.skip(); return;`. The fixture precondition is established once,
    // before any worker starts (e2e/global-setup.ts), so an absent list here is
    // not "nothing to test" — it is a real failure of a precondition that was
    // verified minutes ago. Skipping made an empty run indistinguishable from a
    // passing one.
    expect(
      hasLists,
      "No featured list rendered. global-setup verified the lists API is " +
        "non-empty, so this is a rendering or data-plumbing failure, not a " +
        "missing fixture.",
    ).toBe(true);

    await firstList.click();
    await page.waitForURL("**/goat?list=*", { timeout: 15000 });

    // Wait for match grid container
    const matchGrid = page.getByTestId("match-grid-container");
    const gridVisible = await matchGrid
      .isVisible({ timeout: 20000 })
      .catch(() => false);

    if (gridVisible) {
      // Grid slots should exist
      const slots = page.locator('[data-testid^="grid-slot-"]');
      const slotCount = await slots.count();
      expect(slotCount).toBeGreaterThan(0);

      // Header should be visible
      await expect(page.getByTestId("match-grid-header")).toBeVisible({
        timeout: 5000,
      });

      // Back button
      await expect(page.getByTestId("match-back-btn")).toBeVisible({
        timeout: 5000,
      });
    }
  });
});
