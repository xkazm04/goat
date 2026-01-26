# Testing Patterns

**Analysis Date:** 2026-01-26

## Test Framework

**Runner:**
- Playwright Test (v1.57.0)
- Config: `playwright.config.ts`

**Assertion Library:**
- Playwright's native `expect()` API

**Run Commands:**
```bash
npm run test:e2e              # Run all E2E tests
npm run test:e2e:ui          # Run with Playwright UI
npm run test:e2e:headed      # Run with visible browser
```

## Test File Organization

**Location:**
- E2E tests in `e2e/` directory at project root
- Files: `e2e/[feature].spec.ts`

**Naming:**
- Pattern: `[feature].spec.ts` (e.g., `drag-drop-ranking.spec.ts`, `list-play-journey.spec.ts`)

**Structure:**
```
e2e/
├── drag-drop-ranking.spec.ts    # Drag & drop workflows
├── list-play-journey.spec.ts    # User journey from list selection to match
```

## Test Structure

**Suite Organization:**
```typescript
test.describe("Feature Name", () => {
  test.beforeEach(async ({ page }) => {
    // Setup - runs before each test
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should verify specific behavior", async ({ page }) => {
    // Test steps
  });
});
```

**Patterns:**
- `test.describe()` groups related tests
- `test.beforeEach()` common setup (navigation, waits)
- `async ({ page })` provides Playwright page fixture
- `await` all navigation and waits
- Timeout handling: explicit timeouts on waits (e.g., `{ timeout: 15000 }`)

**Example Test:**
```typescript
test("should drag item from collection to grid slot and persist on reload", async ({ page }) => {
  // Step 1: Navigate
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Step 2: Query elements
  const featuredSection = page.getByTestId("featured-lists-section");
  await expect(featuredSection).toBeVisible({ timeout: 15000 });

  // Step 3: Extract data for verification
  const testId = await firstListItem.getAttribute("data-testid");
  const listId = testId?.replace("featured-list-item-", "");
  expect(listId).toBeTruthy();

  // Step 4: Interact
  await firstListItem.click();
  await page.waitForURL(`**/match-test?list=${listId}`, { timeout: 15000 });

  // Step 5: Verify results
  const gridItem = page.locator('[data-testid="grid-item-image-1"]').first();
  await expect(gridItem).toBeVisible({ timeout: 5000 });
});
```

## Waiting and Synchronization

**Network Waits:**
- `await page.waitForLoadState("networkidle")` — for initial page load
- `await page.waitForLoadState("load")` — for DOM ready
- `await page.waitForURL(pattern, { timeout })` — for navigation

**Element Waits:**
- `await expect(element).toBeVisible({ timeout: 15000 })` — wait for visibility
- `await expect(element).not.toBeVisible()` — wait for invisibility
- Explicit timeouts: `{ timeout: 15000 }` for slow data loads (15s on landing, 10s on subsequent)

**Delay Synchronization:**
- `await page.waitForTimeout(500)` for animations/state updates
- Used after drag operations to let state settle

## Selection Patterns

**Test ID Selectors (Primary):**
- Pattern: `data-testid="[feature]-[element]-[id]"`
- Examples:
  - `featured-lists-section` — container for featured lists
  - `featured-list-item-{id}` — individual featured list
  - `collection-panel` — collection sidebar
  - `collection-item-wrapper-{id}` — collection item container
  - `match-grid-slot-{position}` — grid position slot
  - `grid-item-image-{position}` — item image in grid
  - `grid-slot-empty-{position}` — empty slot indicator
  - `remove-item-btn-{position}` — remove button on grid item

**Locator Patterns:**
```typescript
// Single element
page.getByTestId("collection-panel")

// Multiple with selector
page.locator('[data-testid^="featured-list-item-"]').first()

// Composite selectors
page.locator(
  '[data-testid="grid-item-image-1"], [data-testid="grid-item-title-1"]'
).first()

// Text selectors
page.locator("text=Failed to load list")
```

## Drag & Drop Testing

**Pattern:**
```typescript
// 1. Get bounding boxes
const sourceBox = await sourceElement.boundingBox();
const targetBox = await targetElement.boundingBox();

if (sourceBox && targetBox) {
  // 2. Calculate center points
  const sourceCenter = {
    x: sourceBox.x + sourceBox.width / 2,
    y: sourceBox.y + sourceBox.height / 2,
  };
  const targetCenter = {
    x: targetBox.x + targetBox.width / 2,
    y: targetBox.y + targetBox.height / 2,
  };

  // 3. Move to source and press
  await page.mouse.move(sourceCenter.x, sourceCenter.y);
  await page.mouse.down();

  // 4. Move in steps to trigger drag detection
  const steps = 20;
  for (let i = 1; i <= steps; i++) {
    const progress = i / steps;
    const x = sourceCenter.x + (targetCenter.x - sourceCenter.x) * progress;
    const y = sourceCenter.y + (targetCenter.y - sourceCenter.y) * progress;
    await page.mouse.move(x, y);
    await page.waitForTimeout(20);  // Small delay for dnd-kit
  }

  // 5. Release
  await page.mouse.up();
  await page.waitForTimeout(500);  // Wait for state update
}
```

**Key Points:**
- Use `boundingBox()` to get element positions
- Calculate center points (not corners) for more reliable detection
- Move in steps (15-20 iterations) for dnd-kit to detect drag
- Small delays (20ms) between moves
- Wait 500ms after drop for state to settle

## Test Data

**Loading Test Data:**
- Tests navigate to real endpoints (no mocking)
- Featured lists loaded from API on landing page
- Test expects at least one featured list available
- Backlog items loaded from collection panel API

**Skipping Tests:**
```typescript
if (itemCount < 2) {
  test.skip();  // Skip if insufficient data
  return;
}
```

## Configuration

**Config Location:** `playwright.config.ts`

**Key Settings:**
- `testDir: "./e2e"` — where to find tests
- `fullyParallel: true` — run tests in parallel (except on CI)
- `forbidOnly: true` on CI — fail if `test.only` left in code
- `retries: 0` locally, `2` on CI — retry failures
- `workers: undefined` locally (auto), `1` on CI — single worker on CI
- `baseURL: "http://localhost:3000"` — test server URL
- `webServer: { command: "npm run dev" }` — auto-start dev server

**Timeout Settings:**
- Default page timeout: not explicitly set (uses Playwright default ~30s)
- Wait timeouts: explicit per-wait (e.g., `{ timeout: 15000 }`)
- Test timeout: not set (uses default ~30s)

**Reporters:**
- `reporter: "html"` — generates HTML report in `playwright-report/`

**Screenshots & Traces:**
- `screenshot: "only-on-failure"` — capture on failure
- `trace: "on-first-retry"` — trace on first retry

## Test Examples

**E2E Test: Drag-Drop Ranking** (`e2e/drag-drop-ranking.spec.ts`)
- Verifies drag item from collection → grid slot
- Checks persistence on page reload
- Tests swap between slots
- Tests removing items back to collection

**E2E Test: List Play Journey** (`e2e/list-play-journey.spec.ts`)
- Verifies featured lists render on landing
- Tests clicking play button navigates to match interface
- Confirms URL contains correct list ID
- Verifies match grid loads after navigation

## Unit Testing

**Status:** No unit test framework configured (no Jest, Vitest, etc.)

**Testing Strategy:**
- E2E tests cover critical user journeys
- No isolated unit tests for stores or utilities
- Testing relies on Playwright E2E coverage

**Recommendation for Future:**
- Consider adding Vitest for store unit tests
- Consider adding React Testing Library for component tests
- Focus on async store actions and drag-drop logic

## Mock/Stub Patterns

**Current Approach:** No mocking

**Live Testing:**
- All tests hit real API endpoints
- Tests depend on database state (featured lists, backlog)
- No service worker mocking or fetch interception

**If Needed:**
```typescript
// Playwright route interception
await page.route('**/api/**', async (route) => {
  await route.abort();  // Block or
  await route.continue();  // Allow
});
```

## Coverage

**Requirements:** Not enforced

**View Coverage:** Not applicable (no unit test coverage tooling)

**Gaps:**
- No testing for error handling paths
- No testing for keyboard navigation
- No testing for edge cases in drag-drop
- No accessibility (a11y) testing

## CI/CD Integration

**Playwright Config for CI:**
```typescript
forbidOnly: !!process.env.CI,
retries: process.env.CI ? 2 : 0,
workers: process.env.CI ? 1 : undefined,
```

**When CI Detected:**
- Single worker (no parallelization)
- Retries on failure (2 attempts)
- Fails if `test.only` left in code

---

*Testing analysis: 2026-01-26*
