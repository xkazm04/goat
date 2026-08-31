import { describe, it, expect } from 'vitest';

import { computePlacementStats } from './useVisibleCollectionItems';

/**
 * `completionPercentage` is a ratio over the grid. Its numerator (`placedCount`)
 * counts matched cells across the whole grid; its denominator must therefore be
 * the grid's capacity and not the size of the collection page the panel happens
 * to be showing.
 *
 * These are regression tests. The previous implementation passed the page size
 * in as a proxy for the grid size, which made the two terms count over different
 * populations, and then clamped the result at 100% - so the impossible value was
 * computed, detected, and destroyed at the point of detection.
 */
describe('computePlacementStats', () => {
  const GRID_MIN = 5;
  const GRID_MAX = 50;
  const PAGE_SIZES = [20, 50];

  it('measures completion against the grid capacity, not the collection page', () => {
    // Five-slot grid, one item placed, sitting on a 50-item collection page.
    const stats = computePlacementStats({
      pageItemCount: 50,
      placedCount: 1,
      remainingCount: 49,
      gridCapacity: 5,
    });

    // 1 of 5 slots filled. The old page-size denominator gave 1/50 = 2%.
    expect(stats.completionPercentage).toBe(20);
  });

  it('reports a full grid as complete even when the page still lists items', () => {
    const stats = computePlacementStats({
      pageItemCount: 50,
      placedCount: 5,
      remainingCount: 45,
      gridCapacity: 5,
    });

    expect(stats.completionPercentage).toBe(100);
    expect(stats.isComplete).toBe(true);
  });

  it('does not report completion from an exhausted page while the grid has room', () => {
    // Every item on this page is placed, but the grid is only half full - the
    // remaining slots are filled from other pages. The old implementation keyed
    // `isComplete` off `remainingCount === 0` whenever no grid size was passed.
    const stats = computePlacementStats({
      pageItemCount: 10,
      placedCount: 10,
      remainingCount: 0,
      gridCapacity: 20,
    });

    expect(stats.isComplete).toBe(false);
    expect(stats.completionPercentage).toBe(50);
  });

  it('falls back to the caller-supplied size only until the store reports a capacity', () => {
    const preMount = computePlacementStats({
      pageItemCount: 10,
      placedCount: 5,
      remainingCount: 5,
      gridCapacity: 0,
      fallbackGridSize: 25,
    });
    expect(preMount.completionPercentage).toBe(20);

    // Once the store reports, the fallback is ignored entirely.
    const mounted = computePlacementStats({
      pageItemCount: 10,
      placedCount: 5,
      remainingCount: 5,
      gridCapacity: 10,
      fallbackGridSize: 25,
    });
    expect(mounted.completionPercentage).toBe(50);
  });

  it('reports 0% rather than dividing by an unknown capacity', () => {
    const stats = computePlacementStats({
      pageItemCount: 10,
      placedCount: 3,
      remainingCount: 7,
      gridCapacity: 0,
    });

    expect(stats.completionPercentage).toBe(0);
    expect(stats.isComplete).toBe(false);
  });

  /**
   * The invariant sweep. With both terms counted over the grid, the ratio cannot
   * leave [0, 100] for any reachable state - which is why the implementation
   * carries no clamp. A clamp here would not be caution; it would be the thing
   * that hid the defect these tests exist to prevent.
   */
  it('never publishes a percentage outside its own declared range', () => {
    for (const gridCapacity of [GRID_MIN, 10, 20, 30, GRID_MAX]) {
      for (const pageSize of PAGE_SIZES) {
        for (const pageItemCount of [7, 25, pageSize]) {
          for (const placedCount of [0, 1, Math.floor(gridCapacity / 2), gridCapacity]) {
            const stats = computePlacementStats({
              pageItemCount,
              placedCount,
              remainingCount: pageItemCount - Math.min(pageItemCount, placedCount),
              gridCapacity,
            });

            const where = `capacity=${gridCapacity} page=${pageItemCount} placed=${placedCount}`;

            expect(stats.completionPercentage, where).toBeGreaterThanOrEqual(0);
            expect(stats.completionPercentage, where).toBeLessThanOrEqual(100);
            // The percentage is recomputable from the pair it was derived from.
            expect(stats.completionPercentage, where)
              .toBe(Math.round((placedCount / gridCapacity) * 100));
            // isComplete and the percentage agree; they are two views of one fact.
            expect(stats.isComplete, where).toBe(stats.completionPercentage === 100);
          }
        }
      }
    }
  });
});
