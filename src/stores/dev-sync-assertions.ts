/**
 * Dev-Mode Store Sync Drift Assertions
 *
 * Detects when stores that manage related data drift out of sync.
 * Only active in development mode — completely tree-shaken in production.
 *
 * Checks:
 * 1. Grid ↔ Ranking size consistency (both should agree on max positions)
 * 2. Grid ↔ Ranking item overlap (items placed in grid should match ranking)
 * 3. Ranking ↔ Tier assignment coverage (all ranked items should have a tier)
 */

import { useGridStore } from './grid-store';
import { useRankingStore } from './ranking-store';

/** Throttle interval for drift checks (ms) */
const CHECK_INTERVAL_MS = 2000;

let lastCheckTime = 0;
let unsubGrid: (() => void) | null = null;
let unsubRanking: (() => void) | null = null;

function shouldSkipCheck(): boolean {
  const now = Date.now();
  if (now - lastCheckTime < CHECK_INTERVAL_MS) return true;
  lastCheckTime = now;
  return false;
}

/**
 * Check that ranking tier assignments cover all filled ranking positions.
 * If an item is ranked but not assigned to any tier (in computed mode),
 * that indicates the tier derivation is stale.
 */
function assertTierCoverage(): void {
  const { ranking, tierState, tierConfig } = useRankingStore.getState();
  if (tierConfig.derivationMode !== 'computed') return;

  const filledItemIds = new Set(
    ranking.filter(r => r.itemId !== null).map(r => r.itemId!)
  );
  if (filledItemIds.size === 0) return;

  const tieredItemIds = new Set(
    tierState.tiers.flatMap(t => t.itemIds)
  );

  const untiered: string[] = [];
  Array.from(filledItemIds).forEach(id => {
    if (!tieredItemIds.has(id)) {
      untiered.push(id);
    }
  });

  if (untiered.length > 0) {
    console.warn(
      `[Store Sync Drift] ${untiered.length} ranked item(s) have no tier assignment. ` +
      `This suggests ranking-store tier state is stale. Call syncTiersFromRanking().`,
      { untiered: untiered.slice(0, 5) }
    );
  }
}

/**
 * Check that grid size and ranking size are consistent when both are initialized.
 */
function assertSizeConsistency(): void {
  const { gridItems } = useGridStore.getState();
  const { ranking } = useRankingStore.getState();

  // Only check when both stores have been initialized (non-empty)
  if (gridItems.length === 0 || ranking.length === 0) return;

  if (gridItems.length !== ranking.length) {
    console.warn(
      `[Store Sync Drift] Grid size (${gridItems.length}) !== Ranking size (${ranking.length}). ` +
      `Both stores should agree on the number of positions after initialization.`
    );
  }
}

/**
 * Check that items placed in the grid match items in the ranking.
 * When both stores are active, their filled positions should agree.
 */
function assertItemOverlap(): void {
  const { gridItems } = useGridStore.getState();
  const { ranking } = useRankingStore.getState();

  if (gridItems.length === 0 || ranking.length === 0) return;

  const gridItemIds = new Set(
    gridItems
      .filter(g => g.matched && g.id)
      .map(g => g.id)
  );
  const rankingItemIds = new Set(
    ranking
      .filter(r => r.itemId !== null)
      .map(r => r.itemId!)
  );

  // Only warn if both stores have items but they significantly diverge
  if (gridItemIds.size === 0 || rankingItemIds.size === 0) return;

  let missingFromRanking = 0;
  Array.from(gridItemIds).forEach(id => {
    if (!rankingItemIds.has(id)) missingFromRanking++;
  });

  let missingFromGrid = 0;
  Array.from(rankingItemIds).forEach(id => {
    if (!gridItemIds.has(id)) missingFromGrid++;
  });

  const totalItems = Math.max(gridItemIds.size, rankingItemIds.size);
  const driftRatio = (missingFromRanking + missingFromGrid) / (totalItems * 2);

  // Only warn on significant drift (>30%) to avoid noise during transitions
  if (driftRatio > 0.3 && totalItems > 2) {
    console.warn(
      `[Store Sync Drift] Grid and Ranking items diverge significantly. ` +
      `Grid has ${missingFromRanking} item(s) not in ranking; ` +
      `Ranking has ${missingFromGrid} item(s) not in grid. ` +
      `This may indicate stores were initialized independently.`,
    );
  }
}

/**
 * Run all drift checks (throttled).
 */
function runDriftChecks(): void {
  if (shouldSkipCheck()) return;

  try {
    assertSizeConsistency();
    assertItemOverlap();
    assertTierCoverage();
  } catch {
    // Never crash the app for dev assertions
  }
}

/**
 * Enable dev-mode sync drift monitoring.
 * Subscribes to both grid-store and ranking-store changes.
 * Call the returned function to tear down subscriptions.
 */
export function enableSyncDriftAssertions(): () => void {
  if (process.env.NODE_ENV !== 'development') {
    return () => {};
  }

  // Subscribe to grid changes (plain subscribe — grid-store has no subscribeWithSelector)
  unsubGrid = useGridStore.subscribe(() => runDriftChecks());

  // Subscribe to ranking changes (ranking-store uses subscribeWithSelector)
  unsubRanking = useRankingStore.subscribe(() => runDriftChecks());

  console.log('[Store Sync] Dev-mode drift assertions enabled');

  return () => {
    unsubGrid?.();
    unsubRanking?.();
    unsubGrid = null;
    unsubRanking = null;
  };
}
