import { test, expect } from "@playwright/test";

const TEST_LIST_ID = "06ca05fd-ecd0-40f2-bc21-6ddbca60e481";
const MATCH_URL = `/goat?list=${TEST_LIST_ID}`;

test.describe("Backlog Items Loading", () => {
  // Override baseURL to 3001 for this test suite
  test.use({ baseURL: "http://localhost:3001" });

  test.beforeEach(async ({ page }) => {
    // Navigate to origin first so we have access to storage APIs
    await page.goto("/");
    await page.evaluate(() => {
      indexedDB.deleteDatabase("backlog-store");
      localStorage.clear();
    });
  });

  test("API endpoints return items for the test list", async ({ context }) => {
    // Use a fresh page to avoid React Query in-memory cache from beforeEach
    const page = await context.newPage();

    // Track all API responses passively via response event
    const apiCalls: Array<{ url: string; status: number; contentLength: number }> = [];

    page.on("response", (response) => {
      const url = response.url();
      if (url.includes("/api/")) {
        apiCalls.push({
          url,
          status: response.status(),
          contentLength: parseInt(response.headers()["content-length"] || "0", 10),
        });
      }
    });

    // Navigate directly to match page
    await page.goto(`http://localhost:3001${MATCH_URL}`);
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    // Wait longer for progressive loading (batches of 6 groups × 50ms delays)
    await page.waitForTimeout(10000);

    // Categorize API calls
    const listMetadataCalls = apiCalls.filter(c => c.url.includes(`/api/lists/${TEST_LIST_ID}`));
    const backlogGroupCalls = apiCalls.filter(c => c.url.includes("/api/top/groups/categories/"));
    const groupItemCalls = apiCalls.filter(c => c.url.includes("/api/top/groups/") && c.url.includes("include_items"));
    const collectionItemCalls = apiCalls.filter(c => c.url.includes("/api/top/items"));

    console.log("=== API Response Summary ===");
    console.log(`Total API calls: ${apiCalls.length}`);
    console.log(`List metadata: ${listMetadataCalls.length} calls`);
    console.log(`Backlog groups (categories): ${backlogGroupCalls.length} calls`);
    console.log(`Group item requests (include_items): ${groupItemCalls.length} calls`);
    console.log(`Collection items (/top/items): ${collectionItemCalls.length} calls`);
    console.log("All API URLs:\n  " + apiCalls.map(c => `${c.status} ${c.url}`).join("\n  "));

    // The match grid should have loaded
    const matchGrid = page.locator('[data-testid="match-grid-container"]');
    await expect(matchGrid).toBeVisible({ timeout: 15000 });

    // Verify list metadata was fetched
    expect(listMetadataCalls.length, "List metadata API was not called").toBeGreaterThan(0);
    expect(listMetadataCalls[0].status).toBe(200);

    // At least one item data source should have been called
    expect(
      backlogGroupCalls.length > 0 || collectionItemCalls.length > 0 || groupItemCalls.length > 0,
      "Neither BacklogStore nor useCollection made any API calls for items/groups"
    ).toBe(true);

    await page.close();
  });

  test("diagnose backlog store state and item rendering", async ({ context }) => {
    // Use a fresh page for clean state
    const page = await context.newPage();

    // Capture console logs from the browser
    const consoleLogs: string[] = [];
    page.on("console", (msg) => {
      const text = msg.text();
      if (text.includes("[DEBUG-") || text.includes("backlog") || text.includes("Backlog") || text.includes("group") || text.includes("✅") || text.includes("❌") || text.includes("🔄") || text.includes("items") || text.includes("progressive") || text.includes("batch") || text.includes("cache") || text.includes("Received")) {
        consoleLogs.push(`[${msg.type()}] ${text}`);
      }
    });

    // Track API calls
    const apiCalls: string[] = [];
    page.on("response", (response) => {
      const url = response.url();
      if (url.includes("/api/")) {
        apiCalls.push(`${response.status()} ${url}`);
      }
    });

    // Enable debug logging for backlog category before navigating
    await page.goto(`http://localhost:3001${MATCH_URL}`);

    // Enable backlog debug logging
    await page.evaluate(() => {
      if ((window as any).__DEBUG_GOAT__) {
        (window as any).__DEBUG_GOAT__.enableAll();
      }
    });

    await page.waitForLoadState("networkidle", { timeout: 30000 });

    // Wait generously for progressive loading to complete
    await page.waitForTimeout(15000);

    // === DIAGNOSE BACKLOG STORE STATE ===
    const storeState = await page.evaluate(() => {
      const store = (window as any).__backlogStore?.getState?.();
      if (!store) return { error: "__backlogStore not available on window" };

      return {
        groupCount: store.groups?.length ?? 0,
        groupsWithItems: store.groups?.filter((g: any) => g.items && g.items.length > 0).length ?? 0,
        totalItems: store.groups?.reduce((sum: number, g: any) => sum + (g.items?.length || 0), 0) ?? 0,
        isLoading: store.isLoading,
        loadingProgress: store.loadingProgress,
        loadingGroupIds: store.loadingGroupIds ? Array.from(store.loadingGroupIds) : [],
        error: store.error?.message || null,
        cacheKeys: Object.keys(store.cache || {}),
        sampleGroups: store.groups?.slice(0, 3).map((g: any) => ({
          id: g.id,
          name: g.name,
          itemCount: g.item_count,
          actualItems: g.items?.length ?? 0,
          hasItems: !!(g.items && g.items.length > 0),
        })),
      };
    });

    console.log("\n=== BACKLOG STORE STATE ===");
    console.log(JSON.stringify(storeState, null, 2));

    console.log("\n=== RELEVANT CONSOLE LOGS ===");
    consoleLogs.forEach(log => console.log(log));

    console.log("\n=== API CALLS ===");
    apiCalls.forEach(call => console.log(call));

    // === CHECK COLLECTION PANEL ===
    const collectionPanel = page.locator('[data-testid="collection-panel"]');
    const isPanelVisible = await collectionPanel.isVisible().catch(() => false);
    console.log(`\nCollection panel visible: ${isPanelVisible}`);

    if (isPanelVisible) {
      const collectionGrid = page.locator('[data-testid="collection-grid-container"]');
      const isGridVisible = await collectionGrid.isVisible().catch(() => false);
      console.log(`Collection grid visible: ${isGridVisible}`);

      if (isGridVisible) {
        // Check for actual rendered items (not just the virtualized container)
        // VirtualizedCollectionGrid renders rows with item cards inside
        const allItemElements = await collectionGrid.locator('[data-testid^="collection-item-"]').count();
        const draggableItems = await collectionGrid.locator('[draggable="true"], [data-dnd-draggable]').count();
        const anyDivs = await collectionGrid.locator("div").count();

        console.log(`  Item elements ([data-testid^="collection-item-"]): ${allItemElements}`);
        console.log(`  Draggable items: ${draggableItems}`);
        console.log(`  Total divs inside grid: ${anyDivs}`);

        // Get grid innerHTML for deep inspection
        const gridHTML = await collectionGrid.innerHTML();
        console.log(`  Grid innerHTML length: ${gridHTML.length}`);
        if (gridHTML.length < 500) {
          console.log(`  Grid innerHTML: ${gridHTML}`);
        } else {
          console.log(`  Grid innerHTML (first 500 chars): ${gridHTML.substring(0, 500)}`);
        }
      }
    }

    // === KEY DIAGNOSTIC ASSERTIONS ===
    // Store should have groups
    expect(storeState.groupCount, "BacklogStore has no groups").toBeGreaterThan(0);

    // Groups should have items loaded (progressive loading completed)
    if (storeState.groupsWithItems === 0 && storeState.groupCount > 0) {
      console.log("\n❌ CRITICAL: Groups exist but NO items loaded!");
      console.log("This means startFastProgressiveLoading() failed or never ran.");
      console.log("Check loadingProgress:", storeState.loadingProgress);
      console.log("Check loadingGroupIds (stuck?):", storeState.loadingGroupIds);
    }

    expect(storeState.totalItems, "BacklogStore has 0 total items across all groups").toBeGreaterThan(0);

    await page.close();
  });

  test("match grid renders empty drop zones", async ({ page }) => {
    await page.goto(MATCH_URL);
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    const matchGrid = page.locator('[data-testid="match-grid-container"]');
    await expect(matchGrid).toBeVisible({ timeout: 15000 });

    const dropZones = page.locator('[data-testid^="drop-zone-wrapper-"]');
    await page.waitForTimeout(2000);

    const dropZoneCount = await dropZones.count();
    console.log(`Match grid has ${dropZoneCount} drop zones`);

    expect(dropZoneCount, "No drop zones rendered in the match grid").toBeGreaterThan(0);
  });

  test("no stuck loading or error states", async ({ page }) => {
    await page.goto(MATCH_URL);
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    const errorMessage = page.locator("text=Failed to load list");
    await expect(errorMessage).not.toBeVisible({ timeout: 5000 });

    const noListMessage = page.locator("text=No list selected");
    await expect(noListMessage).not.toBeVisible({ timeout: 5000 });

    const collectionLoading = page.locator('[data-testid="collection-loading"]');
    await expect(collectionLoading).not.toBeVisible({ timeout: 15000 });

    const collectionError = page.locator('[data-testid="collection-error"]');
    await expect(collectionError).not.toBeVisible({ timeout: 5000 });

    const matchGrid = page.locator('[data-testid="match-grid-container"]');
    await expect(matchGrid).toBeVisible({ timeout: 15000 });

    console.log("No stuck loading or error states detected");
  });
});
