// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useFacets } from './useFacets';

/**
 * The hook half of the pair FacetProvider makes up. Same two defects, pinned the
 * same way:
 *
 *  - `isComputing` was declared, initialised false and never set, so a caller
 *    branching on it branched on a constant.
 *  - `computeTime` was written to state from inside the `useMemo` that produced
 *    it (react-hooks/set-state-in-render), when the aggregation result already
 *    carries the number.
 *
 * The third — an option named `debounceMs`, documented "Debounce aggregation
 * (ms)", destructured to `_debounceMs` and never read — has no runtime surface
 * once removed; `tsc` is its gate, since passing it is now a type error.
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/collections',
  useSearchParams: () => new URLSearchParams(''),
}));

const items = [
  { id: '1', category: 'Games', subcategory: 'RPG', used: false, item_year: 2001, tags: ['co-op'] },
  { id: '2', category: 'Games', subcategory: 'FPS', used: true, item_year: 2004, tags: ['shooter'] },
  { id: '3', category: 'Films', subcategory: 'Drama', used: false, item_year: 1999, tags: [] },
];

describe('useFacets', () => {
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

  it('returns no isComputing flag and a computeTime derived from the aggregation', async () => {
    const seenKeys: string[][] = [];
    const computeTimes: number[] = [];
    const filteredCounts: number[] = [];

    function Probe() {
      const facets = useFacets({ items });
      seenKeys.push(Object.keys(facets));
      computeTimes.push(facets.computeTime);
      filteredCounts.push(facets.filteredCount);
      return null;
    }

    root = createRoot(container);
    const r = root;
    await act(async () => {
      r.render(<Probe />);
    });

    expect(seenKeys[0]).not.toContain('isComputing');
    expect(seenKeys[0]).toContain('computeTime');
    expect(computeTimes[0]).toBeGreaterThanOrEqual(0);
    expect(filteredCounts[0]).toBe(3);
  });
});
