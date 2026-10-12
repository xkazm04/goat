import { describe, expect, it } from 'vitest';

import { createFacetAggregator } from './FacetAggregator';

/**
 * The aggregator caches an inverted index across calls. What it keys that cache
 * on decides whether the counts it returns describe the items it was handed or
 * the items it saw last time.
 *
 * The key used to be `length:firstId:midId:lastId`. Every field the index is
 * built FROM was absent from it, so an immutable edit — the normal shape of a
 * store update: same rows, same order, one field changed — produced a key the
 * aggregator had already seen, and it returned the previous index's counts.
 * Nothing failed; the panel just showed numbers for data that no longer existed.
 */

type Item = {
  id: string;
  category: string;
  subcategory: string;
  used: boolean;
  item_year: number;
  tags: string[];
};

const base: Item[] = [
  { id: '1', category: 'Games', subcategory: 'RPG', used: false, item_year: 2001, tags: ['co-op'] },
  { id: '2', category: 'Games', subcategory: 'RPG', used: true, item_year: 2002, tags: ['co-op'] },
  { id: '3', category: 'Games', subcategory: 'FPS', used: false, item_year: 2003, tags: ['shooter'] },
  { id: '4', category: 'Films', subcategory: 'Drama', used: true, item_year: 1999, tags: [] },
];

function counts(
  result: { facets: Array<{ definition: { id: string }; values: Array<{ value: unknown; count: number }> }> },
  facetId: string,
): Record<string, number> {
  const facet = result.facets.find((f) => f.definition.id === facetId);
  if (!facet) throw new Error(`no facet ${facetId}`);
  return Object.fromEntries(facet.values.map((v) => [String(v.value), v.count]));
}

describe('FacetAggregator index cache', () => {
  it('re-counts after an immutable edit that keeps every id and the length', () => {
    const agg = createFacetAggregator<Item>();

    expect(counts(agg.aggregate(base, []), 'subcategory')).toEqual({ RPG: 2, FPS: 1, Drama: 1 });

    // The store shape: new array, same rows in the same order, one field changed.
    const edited = base.map((i) => (i.id === '3' ? { ...i, subcategory: 'RPG' } : i));
    expect(counts(agg.aggregate(edited, []), 'subcategory')).toEqual({ RPG: 3, Drama: 1 });
  });

  it('re-filters after an immutable edit — applyFacetFilters used the same key', () => {
    const agg = createFacetAggregator<Item>();
    const selection = [{ facetId: 'used', field: 'used', values: [true] }];

    // Seed the index. Without this the filter falls through to the item-level
    // path, which was never stale and so proves nothing.
    agg.aggregate(base, []);
    expect(agg.applyFacetFilters(base, selection).map((i) => i.id)).toEqual(['2', '4']);

    const edited = base.map((i) => (i.id === '1' ? { ...i, used: true } : i));
    expect(agg.applyFacetFilters(edited, selection).map((i) => i.id)).toEqual(['1', '2', '4']);
  });

  it('still reuses the index when handed the very same array', () => {
    const agg = createFacetAggregator<Item>();
    agg.aggregate(base, []);
    const afterFirst = agg.getCacheStats();
    agg.aggregate(base, []);
    agg.aggregate(base, [{ facetId: 'used', field: 'used', values: [true] }]);
    const afterThird = agg.getCacheStats();

    expect(afterFirst.rebuilds).toBe(1);
    expect(afterThird.rebuilds).toBe(1);
    expect(afterThird.hits).toBe(afterFirst.hits + 2);
  });
});
