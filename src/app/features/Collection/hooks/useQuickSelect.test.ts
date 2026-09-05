import { describe, it, expect } from 'vitest';

import { resolvePlacementItem } from './useQuickSelect';

import type { CollectionItem } from '../types';
import type { BacklogItem } from '@/types/backlog-groups';

/**
 * Keyboard placement (`q`, then digits) must write the SAME record into the
 * grid that touch placement (`useSwipeToRank`) writes: the BacklogItem the
 * store holds, not a stand-in rebuilt from the panel's display shape.
 *
 * Negative control (recorded 2026-09-05): with the lookup ignored - the pre-fix
 * keyboard path, which always synthesised - 2 of the 3 tests below went red
 * (`expected { …(8) } to be { …(10) }`; `expected 'display-only' to be 'movies'`).
 * The fallback test stays green under both, which is the point of it.
 */
const stored: BacklogItem = {
  id: 'item-1',
  name: 'Blade Runner',
  title: 'Blade Runner',
  description: 'A blade runner must pursue and terminate four replicants.',
  category: 'movies',
  subcategory: 'sci-fi',
  item_year: 1982,
  image_url: 'https://img/blade-runner.jpg',
  created_at: '2024-01-15T10:00:00.000Z',
  updated_at: '2024-06-01T10:00:00.000Z',
  tags: ['cult'],
};

// The panel's display shape carries less than the store does - no years, no
// timestamps, and often no category.
const shown: CollectionItem = {
  id: 'item-1',
  title: 'Blade Runner',
  image_url: 'https://img/blade-runner.jpg',
};

describe('resolvePlacementItem', () => {
  it('places the record the backlog store holds, field for field', () => {
    const placed = resolvePlacementItem(shown, (id) => (id === 'item-1' ? stored : null));

    expect(placed).toBe(stored);
    // The fields the old keyboard path got wrong, each asserted on its own so a
    // regression names the field rather than the object.
    expect(placed.category).toBe('movies');
    expect(placed.description).toBe(stored.description);
    expect(placed.item_year).toBe(1982);
    expect(placed.updated_at).toBe(stored.updated_at);
    expect(placed.created_at).toBe('2024-01-15T10:00:00.000Z');
  });

  it('falls back to a stand-in only when the store does not hold the item', () => {
    const before = Date.now();
    const placed = resolvePlacementItem(shown, () => null);

    expect(placed.id).toBe('item-1');
    expect(placed.name).toBe('Blade Runner');
    expect(placed.title).toBe('Blade Runner');
    expect(placed.category).toBe('unknown');
    expect(placed.description).toBe('');
    expect(placed.tags).toEqual([]);
    expect(Date.parse(placed.created_at)).toBeGreaterThanOrEqual(before);
  });

  it('never consults the stand-in when the lookup succeeds', () => {
    // A stand-in has `created_at: now`; a stored record has its own. If the
    // resolver ever merged the two, the stored timestamp would be overwritten.
    const placed = resolvePlacementItem({ ...shown, category: 'display-only' }, () => stored);
    expect(placed.category).toBe('movies');
    expect(placed.created_at).toBe(stored.created_at);
  });
});
