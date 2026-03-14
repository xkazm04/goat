import { test, expect } from '@playwright/test';

test.describe('List Search (FLOW-07)', () => {
  test.skip('search bar is visible on landing page', async ({ page }) => {
    // TODO: Navigate to /, verify search input or GlobalSearchBar is visible
  });

  test.skip('searching for a list name returns relevant results', async ({ page }) => {
    // TODO: Type a known list name in search, verify matching results appear
  });

  test.skip('clicking a search result navigates to that list', async ({ page }) => {
    // TODO: Search, click result, verify navigation to list ranking page
  });
});
