# Testing Patterns

**Analysis Date:** 2026-03-14

## Test Framework

**Runner:**
- Playwright — E2E tests only
- Config: `playwright.config.ts` (project root)
- Version: `@playwright/test ^1.57.0`

**No unit test runner detected** — Jest and Vitest are absent from `package.json`. The `src/components/visual/__tests__/visual-components.test.tsx` file is a TypeScript compile-time verification file, not a runtime test. The `src/lib/hooks/useLoadingStateMachine.test.md` is documentation of manual test scenarios, not automated tests.

**Assertion Library:**
- Playwright's built-in `expect` from `@playwright/test`

**Run Commands:**
```bash
npm run test:e2e              # Run all E2E tests (headless Chromium)
npm run test:e2e:ui           # Run with Playwright UI mode
npm run test:e2e:headed       # Run with visible browser
```

**Storybook** (component development/visual testing):
```bash
npm run storybook             # Dev server on port 6006
npm run build-storybook       # Build static Storybook
```

## Test File Organization

**Location:**
- E2E tests: `e2e/` directory at project root (separate from `src/`)
- Compile-time verification: `src/components/visual/__tests__/` (not runtime tests)
- No co-located unit test files in `src/` — unit testing infrastructure is not set up

**Naming:**
- E2E spec files: `kebab-case.spec.ts` — `drag-drop-ranking.spec.ts`, `list-play-journey.spec.ts`
- Story files: `ComponentName.stories.tsx` — `Badge.stories.tsx`

**Structure:**
```
goat/
├── e2e/
│   ├── drag-drop-ranking.spec.ts   # Core drag-drop workflow tests
│   └── list-play-journey.spec.ts   # Landing → match navigation journey
├── playwright.config.ts
└── src/
    ├── components/
    │   └── visual/
    │       └── __tests__/
    │           └── visual-components.test.tsx  # TypeScript compile verification only
    └── lib/
        └── hooks/
            ├── useLoadingStateMachine.test.md           # Manual test documentation
            └── useLoadingStateMachine.test-scenarios.md # Manual test scenarios
```

## Test Structure

**Suite Organization:**
```typescript
import { test, expect } from "@playwright/test";

test.describe("Drag-Drop Ranking Workflow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should drag item from collection to grid slot and persist on reload", async ({
    page,
  }) => {
    // Arrange: navigate to page and wait for elements
    const featuredSection = page.getByTestId("featured-lists-section");
    await expect(featuredSection).toBeVisible({ timeout: 15000 });

    // Act: perform interaction

    // Assert: verify outcome
    await expect(emptyIndicator).not.toBeVisible({ timeout: 5000 });
  });
});
```

**Patterns:**
- `test.beforeEach` sets up navigation state shared across all tests in a describe block
- Timeouts are explicit on each `expect` call — `{ timeout: 15000 }` for data-load waits, `{ timeout: 5000 }` for UI-state checks
- `test.skip()` used conditionally when preconditions aren't met (e.g., insufficient items for a swap test)
- Helper functions defined inline as `const dragAndDrop = async (source, target) => { ... }` within tests that need reuse
- `page.waitForTimeout()` used sparingly for animation completion (500ms after drops, 300ms after drag init)

## Mocking

**Framework:** None — Playwright tests run against a live dev server.

**What is NOT mocked:**
- Network requests — tests rely on the real Supabase backend responding to API calls
- Authentication — tests operate as an unauthenticated user
- Zustand stores — tested through real UI interactions and localStorage inspection

**Indirect state verification via localStorage:**
```typescript
// Verify Zustand persist state after navigation
const listStoreData = await page.evaluate(() => {
  const stored = localStorage.getItem("list-store");
  return stored ? JSON.parse(stored) : null;
});
expect(listStoreData?.state?.currentList?.id).toBe(listId);
```

## Fixtures and Factories

**Test Data:**
- No fixtures or factories — tests discover data dynamically from the live app
- List IDs and item IDs extracted from `data-testid` attributes at runtime:
```typescript
const testId = await firstListItem.getAttribute("data-testid");
const listId = testId?.replace("featured-list-item-", "");
expect(listId).toBeTruthy();
```

**Location:**
- No static fixture files — all test data is runtime-discovered

## Coverage

**Requirements:** None enforced — no coverage thresholds configured

**View Coverage:**
- Not configured (no unit test runner)

## Test Types

**Unit Tests:**
- Not implemented. No Jest/Vitest setup exists.
- The `src/components/visual/__tests__/visual-components.test.tsx` file performs TypeScript compile-time type checking only, not runtime behavior testing.

**Integration Tests:**
- Not explicitly separated; E2E tests cover integration scenarios (store sync, persistence, navigation handoffs)

**E2E Tests (Playwright):**
- Framework: Playwright with Chromium only
- Base URL: `http://localhost:3000`
- Runs against local dev server (`npm run dev`) started automatically by `webServer` config
- CI behavior: retries 2x, single worker, fails build on `test.only`
- Trace collected on first retry; screenshots on failure

**Component Development (Storybook):**
- One story file found: `src/components/patterns/badges/Badge.stories.tsx`
- Pattern uses `Meta<typeof Component>` and `StoryObj<typeof Component>` from `@storybook/react`
- Stories use `render:` function for complex multi-variant examples
- `tags: ['autodocs']` enables automatic documentation generation

## Common Patterns

**Navigation + wait pattern (every E2E test):**
```typescript
await page.goto("/");
await page.waitForLoadState("networkidle");
const section = page.getByTestId("featured-lists-section");
await expect(section).toBeVisible({ timeout: 10000 });
```

**Dynamic testid-based element selection:**
```typescript
// Prefix matching for dynamic lists
const firstListItem = page.locator('[data-testid^="featured-list-item-"]').first();
// Exact testid for known elements
const gridSlot1 = page.getByTestId("match-grid-slot-1");
```

**Multi-step drag simulation for dnd-kit:**
```typescript
await page.mouse.move(sourceCenter.x, sourceCenter.y);
await page.mouse.down();
const steps = 20;
for (let i = 1; i <= steps; i++) {
  const progress = i / steps;
  await page.mouse.move(
    sourceCenter.x + (targetCenter.x - sourceCenter.x) * progress,
    sourceCenter.y + (targetCenter.y - sourceCenter.y) * progress
  );
  await page.waitForTimeout(20);
}
await page.mouse.up();
```
Note: dnd-kit requires incremental mouse movement (not `dragTo`) to detect drag properly.

**Conditional test skip:**
```typescript
const itemCount = await collectionItems.count();
if (itemCount < 2) {
  test.skip();
  return;
}
```

**Negative assertions (verifying absence):**
```typescript
const errorMessage = page.locator("text=Failed to load list");
await expect(errorMessage).not.toBeVisible({ timeout: 5000 });
```

## Storybook Pattern

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Patterns/Badges/Badge',   // Slash-separated path in Storybook sidebar
  component: Badge,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: { size: { control: 'select', options: ['xs', 'sm', 'md', 'lg'] } },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = { args: { children: 'Badge' } };

export const MultiVariant: Story = {
  render: () => (
    <div className="flex gap-4">
      <Badge size="xs">XS</Badge>
      <Badge size="md">MD</Badge>
    </div>
  ),
};
```

## Gap Summary

The codebase has **no unit test infrastructure**. There are no Jest/Vitest configs, no mock utilities, no test utilities for React components. The only automated tests are Playwright E2E tests covering user journeys. Adding unit tests would require:
1. Installing Vitest or Jest with `@testing-library/react`
2. Setting up mock factories for Zustand stores and TanStack Query
3. Creating test utilities for the drag-and-drop system

---

*Testing analysis: 2026-03-14*
