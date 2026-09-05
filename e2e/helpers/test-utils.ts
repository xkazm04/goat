import { Page, expect } from '@playwright/test';

/**
 * Shared E2E test utilities for the G.O.A.T. app.
 *
 * Actual data-testid patterns (from component source):
 *   Drop zones:        drop-zone-{pos}  |  drop-zone-wrapper-{pos}
 *   Grid slots:        grid-slot-{pos}  (positions 3+ in podium view)
 *   Remove buttons:    remove-item-btn-{pos}  (only on occupied slots)
 *   Collection items:  collection-item-wrapper-{itemId}
 *   Collection panel:  collection-panel
 *   Collection grid:   virtualized-collection-grid  |  virtualized-collection-grid-empty
 *   Match container:   match-grid-container
 *   Header:            match-grid-header
 *   Auto-fill:         auto-fill-btn
 *   Share:             share-results-btn
 *   View buttons:      view-{id}-btn  (podium, goat, rushmore, bracket, tierlist)
 *   Completion modal:  [data-modal="completion"]
 */

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

export async function clearAppStorage(page: Page) {
  await page.goto('/', { waitUntil: 'commit' });
  await page.evaluate(() => {
    try { localStorage.clear(); } catch { /* ignore */ }
    for (const name of ['backlog-store', 'session-store', 'grid-store', 'match-store']) {
      indexedDB.deleteDatabase(name);
    }
  });
}

// ---------------------------------------------------------------------------
// Navigation helpers
// ---------------------------------------------------------------------------

export async function goToLanding(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
}

export async function goToStudio(page: Page) {
  await page.goto('/studio', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('studio-page')).toBeVisible({ timeout: 15000 });
}

/**
 * Click the first featured card and return the list id the app navigated to.
 *
 * WHERE THE LIST ID ACTUALLY IS. The card's own attribute is
 * `featured-list-item-${index}` (FeaturedListsSection.tsx) — the suffix is the
 * card's position in the mosaic, not the list. Four files used to read it as an
 * id and then wait for `/goat?list=0`, a URL the app never produces, so every
 * one of those journeys failed on its navigation step and reported it as a
 * product defect. The id exists in exactly one place the harness can see: the
 * query parameter `usePlayList` puts in the URL. Read it from there.
 *
 * The identifier itself is the app's to fix (registry test-harness/
 * live-app-harness: an identifier for a repeated element composes the role with
 * the entity's stable id, never with its index) and is recorded as such — but
 * the harness must not encode a value the attribute does not carry meanwhile.
 */
export async function openFirstFeaturedList(page: Page): Promise<string> {
  const card = page.locator('[data-testid^="featured-list-item-"]').first();
  await expect(card, 'no featured list card rendered on the landing page')
    .toBeVisible({ timeout: 20000 });
  await card.click();
  await page.waitForURL(/\/goat\?list=/, { timeout: 15000 });
  const listId = new URL(page.url()).searchParams.get('list') ?? '';
  expect(listId, `the goat URL carried no list parameter: ${page.url()}`).not.toBe('');
  return listId;
}

/**
 * Navigate to /goat?list=X by finding a playable list.
 * Tries featured items, page links, then the API.
 */
export async function navigateToGoatWithList(page: Page): Promise<string> {
  await goToLanding(page);
  await page.waitForTimeout(3000);

  // Strategy 1: Featured list items
  const featuredItem = page.locator('[data-testid^="featured-list-item-"]').first();
  if (await featuredItem.isVisible({ timeout: 3000 }).catch(() => false)) {
    const listId = await openFirstFeaturedList(page);
    await page.waitForLoadState('networkidle');
    return listId;
  }

  // Strategy 2: Any link to /goat
  const goatLink = page.locator('a[href*="/goat?list="]').first();
  if (await goatLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    const href = await goatLink.getAttribute('href');
    const match = href?.match(/list=([^&]+)/);
    const listId = match?.[1] ?? '';
    if (listId) {
      await goatLink.click();
      await page.waitForURL('**/goat**', { timeout: 15000 });
      await page.waitForLoadState('networkidle');
      return listId;
    }
  }

  // Strategy 3: Fetch from API
  const listId = await page.evaluate(async () => {
    for (const endpoint of ['/api/lists/featured', '/api/lists']) {
      try {
        const res = await fetch(endpoint);
        if (!res.ok) continue;
        const json = await res.json();
        const lists = json.data ?? json.lists ?? (Array.isArray(json) ? json : []);
        if (Array.isArray(lists) && lists.length > 0) return lists[0].id as string;
      } catch { /* next */ }
    }
    return null;
  });

  if (listId) {
    await page.goto(`/goat?list=${listId}`, { waitUntil: 'networkidle' });
    return listId;
  }

  throw new Error('No playable list found — seed the database first.');
}

export const navigateToFirstFeaturedList = navigateToGoatWithList;

// ---------------------------------------------------------------------------
// Drag-and-drop helpers
// ---------------------------------------------------------------------------

interface Point { x: number; y: number }

function center(box: { x: number; y: number; width: number; height: number }): Point {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Simulate a drag-and-drop via stepped mouse moves (dnd-kit compatible).
 */
export async function dndDrag(
  page: Page,
  sourceLocator: ReturnType<Page['locator']>,
  targetLocator: ReturnType<Page['locator']>,
  options?: { steps?: number; stepDelay?: number },
) {
  const steps = options?.steps ?? 25;
  const stepDelay = options?.stepDelay ?? 25;

  const sourceBox = await sourceLocator.boundingBox();
  const targetBox = await targetLocator.boundingBox();
  expect(sourceBox, 'Source must be visible').not.toBeNull();
  expect(targetBox, 'Target must be visible').not.toBeNull();
  if (!sourceBox || !targetBox) return;

  const src = center(sourceBox);
  const tgt = center(targetBox);

  await page.mouse.move(src.x, src.y);
  await page.mouse.down();

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await page.mouse.move(
      src.x + (tgt.x - src.x) * t,
      src.y + (tgt.y - src.y) * t,
    );
    await page.waitForTimeout(stepDelay);
  }

  await page.mouse.up();
  await page.waitForTimeout(500);
}

// ---------------------------------------------------------------------------
// Grid helpers
// ---------------------------------------------------------------------------

/** Wait for collection panel with items. Returns true if items exist. */
export async function waitForCollectionPanel(page: Page): Promise<boolean> {
  const panel = page.getByTestId('collection-panel');
  const panelVisible = await panel.isVisible({ timeout: 20000 }).catch(() => false);
  if (!panelVisible) return false;

  // Check for empty state
  const emptyState = page.getByTestId('virtualized-collection-grid-empty');
  const isEmpty = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);
  if (isEmpty) return false;

  const firstItem = page.locator('[data-testid^="collection-item-wrapper-"]').first();
  return firstItem.isVisible({ timeout: 10000 }).catch(() => false);
}

/** Wait for the match grid to be visible. */
export async function waitForMatchGrid(page: Page) {
  const container = page.getByTestId('match-grid-container');
  await expect(container).toBeVisible({ timeout: 15000 });

  const slot = page.locator('[data-testid^="drop-zone-wrapper-"]').first();
  await expect(slot).toBeVisible({ timeout: 15000 });
}

/**
 * Count filled grid slots.
 * Occupied slots have a remove-item-btn-{pos} inside them.
 */
export async function countFilledSlots(page: Page): Promise<number> {
  const removeButtons = page.locator('[data-testid^="remove-item-btn-"]');
  return removeButtons.count();
}

/** Get total number of grid drop zone wrappers. */
export async function getTotalSlots(page: Page): Promise<number> {
  return page.locator('[data-testid^="drop-zone-wrapper-"]').count();
}

/**
 * Use the Auto-fill button to automatically fill all grid slots.
 * Caller must ensure backlog items are loaded before calling.
 */
export async function autoFillGrid(page: Page) {
  const autoFillBtn = page.getByTestId('auto-fill-btn');
  await expect(autoFillBtn).toBeVisible({ timeout: 5000 });
  await autoFillBtn.click();
  // Auto-fill places items synchronously via store — wait for render
  await page.waitForTimeout(2000);
}

// ---------------------------------------------------------------------------
// API monitoring
// ---------------------------------------------------------------------------

export function trackApiRequests(page: Page, pattern: string | RegExp) {
  const requests: { url: string; status: number }[] = [];
  page.on('response', (response) => {
    const url = response.url();
    const matches = typeof pattern === 'string' ? url.includes(pattern) : pattern.test(url);
    if (matches) requests.push({ url, status: response.status() });
  });
  return requests;
}
