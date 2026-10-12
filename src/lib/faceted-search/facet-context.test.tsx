// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FacetProvider, useFacetContext } from './FacetContext';

import type { FacetDefinition } from './types';

/**
 * FacetProvider is the module's React seam. Two things it must not do:
 *
 * 1. Write state during render. `setComputeTime(result.computeTime)` sat inside
 *    the aggregation `useMemo` — the shape `react-hooks/set-state-in-render`
 *    flags on the sibling `useFacets.ts`. `computeTime` is derivable from the
 *    aggregation result and needs no state at all.
 *
 *    What this is NOT: measured 2026-09-05 with 600 items, consumers rendered
 *    ONCE either way. React processes a render-phase update by re-invoking the
 *    provider's own body before it descends, so the extra work never reaches a
 *    consumer and a render-count assertion cannot tell the two versions apart.
 *    Asserting it would be coverage theater, so this file does not; it pins the
 *    derived value instead (a `computeTime` left on stale state reads 0).
 *
 * 2. Carry API nobody can use. `isComputing` was declared, initialised false and
 *    never set; `recompute()` ran an aggregation and discarded its result. Both
 *    are gone; the key assertions below pin their absence and are what actually
 *    goes red on the old shape.
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/collections',
  useSearchParams: () => new URLSearchParams(''),
}));

const CATEGORIES = ['Games', 'Films', 'Books', 'Music'];
const SUBCATEGORIES = ['RPG', 'FPS', 'Drama', 'Jazz', 'Essay'];

const items = Array.from({ length: 600 }, (_, i) => ({
  id: `i${i}`,
  category: CATEGORIES[i % CATEGORIES.length],
  subcategory: SUBCATEGORIES[i % SUBCATEGORIES.length],
  tags: [`t${i % 17}`, `t${i % 5}`],
  used: i % 3 === 0,
  item_year: 1980 + (i % 40),
}));

describe('FacetProvider', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    if (root) {
      const r = root;
      await act(async () => r.unmount());
      root = null;
    }
    container.remove();
  });

  it('publishes a computeTime derived from the aggregation, not from state', async () => {
    // Recorded by pushing, not by reassignment: react-hooks/globals forbids
    // reassigning an outer binding from a component body.
    const computeTimes: number[] = [];
    const totals: number[] = [];
    function Probe() {
      const ctx = useFacetContext();
      computeTimes.push(ctx.computeTime);
      totals.push(ctx.totalItems);
      return null;
    }

    root = createRoot(container);
    const r = root;
    await act(async () => {
      r.render(
        <FacetProvider items={items}>
          <Probe />
        </FacetProvider>,
      );
    });

    expect(totals[0]).toBe(items.length);
    expect(computeTimes[0]).toBeGreaterThan(0);
    expect(computeTimes).toHaveLength(1);
  });

  it('re-aggregates when the definitions prop changes', async () => {
    const seenFacetIds: string[][] = [];
    const seenLabels: string[][] = [];
    function Probe() {
      const ctx = useFacetContext();
      seenFacetIds.push(ctx.facets.map((f) => f.definition.id));
      seenLabels.push(ctx.facets.map((f) => f.definition.label));
      return null;
    }

    const byCategory: FacetDefinition[] = [
      { id: 'category', field: 'category', label: 'Category', type: 'enum' },
    ];
    const byStatus: FacetDefinition[] = [
      { id: 'used', field: 'used', label: 'Status', type: 'boolean' },
    ];

    root = createRoot(container);
    const r = root;
    await act(async () => {
      r.render(
        <FacetProvider items={items} definitions={byCategory}>
          <Probe />
        </FacetProvider>,
      );
    });
    expect(seenFacetIds.at(-1)).toEqual(['category']);

    // The aggregator used to be built once into a ref, so a caller that swaps
    // its facet definitions kept getting facets for the old ones forever.
    await act(async () => {
      r.render(
        <FacetProvider items={items} definitions={byStatus}>
          <Probe />
        </FacetProvider>,
      );
    });
    expect(seenFacetIds.at(-1)).toEqual(['used']);
    expect(seenLabels.at(-1)).toEqual(['Status']);
  });

  it('exposes no dead members: no isComputing flag, no recompute()', async () => {
    const seenKeys: string[][] = [];
    function Probe() {
      seenKeys.push(Object.keys(useFacetContext()));
      return null;
    }
    root = createRoot(container);
    const r = root;
    await act(async () => {
      r.render(
        <FacetProvider items={items}>
          <Probe />
        </FacetProvider>,
      );
    });
    const keys = seenKeys[0];
    expect(keys).not.toContain('isComputing');
    expect(keys).not.toContain('recompute');
    expect(keys).toContain('applyFacetFilters');
    expect(keys).toContain('computeTime');
  });
});
