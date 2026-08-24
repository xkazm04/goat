import { test, expect } from '@playwright/test';

test.describe('Session Persistence (FLOW-05)', () => {
  test.skip('grid state persists after page reload', async ({ page }) => {
    // TODO: Drag items to grid, reload page, verify grid state is restored
  });

  test.skip('grid state persists after browser close and reopen', async ({ page, context }) => {
    // TODO: Drag items, close context, create new context, verify state
  });

  test.skip('LRU eviction keeps at most 15 cached lists', async ({ page }) => {
    // TODO: Open 16+ different lists, verify only 15 most recent in localStorage
  });
});
