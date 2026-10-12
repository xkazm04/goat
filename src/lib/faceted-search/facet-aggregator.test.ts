import { describe, expect, it } from 'vitest';

import { createFacetAggregator } from './FacetAggregator';

import type { FacetSelection } from './types';

/**
 * The counts a facet panel shows are claims, and there are two defensible
 * conventions for which predicate each count assumes (registry:
 * software-engineering / search / faceting-and-filters, law
 * count-carries-predicate):
 *
 *  - conditioned on the FULL current predicate, or
 *  - the disjunctive convention: for values inside a facet the user has already
 *    selected in, counts are taken as if THAT facet's own selection were lifted,
 *    while every other facet's selection still applies.
 *
 * The second is the conventional one, and it is the only one under which the
 * panel can be used to WIDEN a selection: under the first, every unselected
 * sibling of the current selection reads zero and the dimension looks empty.
 *
 * These tests pin the disjunctive convention on `aggregate()`. They are also a
 * parity pin: `computeSingleFacet()` on the same class already implemented it
 * (it filters by `otherSelections`), so the class shipped one rule with two
 * implementations and only one of them was right.
 */

type Item = {
  id: string;
  category: string;
  subcategory: string;
  used: boolean;
  item_year: number;
  tags: string[];
};

const items: Item[] = [
  { id: '1', category: 'Games', subcategory: 'RPG', used: false, item_year: 2001, tags: ['co-op'] },
  { id: '2', category: 'Games', subcategory: 'RPG', used: true, item_year: 2002, tags: ['co-op'] },
  { id: '3', category: 'Games', subcategory: 'FPS', used: false, item_year: 2003, tags: ['shooter'] },
  { id: '4', category: 'Games', subcategory: 'FPS', used: true, item_year: 2004, tags: ['shooter'] },
  { id: '5', category: 'Films', subcategory: 'Drama', used: false, item_year: 1999, tags: [] },
  { id: '6', category: 'Films', subcategory: 'Drama', used: true, item_year: 1998, tags: [] },
  { id: '7', category: 'Books', subcategory: 'Essay', used: false, item_year: 1990, tags: ['old'] },
];

const sel = (facetId: string, field: string, values: (string | number | boolean)[]): FacetSelection => ({
  facetId,
  field,
  values,
});

/** value -> count, for one facet of an aggregation result. */
function counts(
  result: ReturnType<ReturnType<typeof createFacetAggregator<Item>>['aggregate']>,
  facetId: string,
): Record<string, number> {
  const facet = result.facets.find((f) => f.definition.id === facetId);
  if (!facet) throw new Error(`no facet ${facetId} in result`);
  return Object.fromEntries(facet.values.map((v) => [String(v.value), v.count]));
}

describe('FacetAggregator.aggregate — counts carry their predicate', () => {
  it('lifts a facet’s own selection before counting that facet, so siblings stay reachable', () => {
    const agg = createFacetAggregator<Item>();
    const result = agg.aggregate(items, [sel('subcategory', 'subcategory', ['RPG'])]);

    // The user selected RPG. The other subcategories must still show how many
    // items they would add, or the panel cannot be used to widen.
    expect(counts(result, 'subcategory')).toEqual({ RPG: 2, FPS: 2, Drama: 2, Essay: 1 });

    // Every OTHER facet still answers under the full predicate: only the two RPG
    // items are in play, one used and one not.
    expect(counts(result, 'used')).toEqual({ true: 1, false: 1 });

    // The result set itself is unchanged by the counting convention.
    expect(result.filteredItems).toBe(2);
    expect(result.totalItems).toBe(7);
  });

  it('applies every OTHER facet’s selection while lifting the facet’s own', () => {
    const agg = createFacetAggregator<Item>();
    const result = agg.aggregate(items, [
      sel('subcategory', 'subcategory', ['RPG']),
      sel('used', 'used', [false]),
    ]);

    // subcategory: its own selection lifted, used=false still applied.
    expect(counts(result, 'subcategory')).toEqual({ RPG: 1, FPS: 1, Drama: 1, Essay: 1 });
    // used: its own selection lifted, subcategory=RPG still applied.
    expect(counts(result, 'used')).toEqual({ true: 1, false: 1 });

    expect(result.filteredItems).toBe(1);
  });

  it('holds for hierarchical facets too', () => {
    const agg = createFacetAggregator<Item>();
    const result = agg.aggregate(items, [sel('category', 'category', ['Games'])]);

    const tree = result.hierarchicalFacets.find((f) => f.definition.id === 'category');
    expect(tree).toBeDefined();
    const byValue = Object.fromEntries(tree!.nodes.map((n) => [n.value, n.count]));
    expect(byValue).toEqual({ Games: 4, Films: 2, Books: 1 });

    // ...while a non-hierarchical facet stays conditioned on the category choice.
    expect(counts(result, 'used')).toEqual({ true: 2, false: 2 });
  });

  it('agrees with computeSingleFacet(), which already used this convention', () => {
    const agg = createFacetAggregator<Item>();
    const selections = [
      sel('subcategory', 'subcategory', ['RPG']),
      sel('used', 'used', [false]),
    ];
    const fromAggregate = counts(agg.aggregate(items, selections), 'subcategory');

    const single = agg.computeSingleFacet(items, 'subcategory', selections);
    expect(single).not.toBeNull();
    const fromSingle = Object.fromEntries(single!.values.map((v) => [String(v.value), v.count]));

    expect(fromAggregate).toEqual(fromSingle);
  });

  it('percentages stay within 0..100 under the lifted denominator', () => {
    const agg = createFacetAggregator<Item>();
    const result = agg.aggregate(items, [sel('subcategory', 'subcategory', ['RPG'])]);
    for (const facet of result.facets) {
      for (const value of facet.values) {
        expect(value.percentage).toBeGreaterThanOrEqual(0);
        expect(value.percentage).toBeLessThanOrEqual(100);
      }
    }
  });

  it('is unchanged when nothing is selected', () => {
    const agg = createFacetAggregator<Item>();
    const result = agg.aggregate(items, []);
    expect(counts(result, 'subcategory')).toEqual({ RPG: 2, FPS: 2, Drama: 2, Essay: 1 });
    expect(counts(result, 'used')).toEqual({ true: 3, false: 4 });
    expect(result.filteredItems).toBe(7);
  });
});
