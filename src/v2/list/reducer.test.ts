import { describe, expect, it } from 'vitest';

import { demoDoc } from './fixtures';
import { apply, isConsistent, normalizeDoc } from './reducer';
import { DEFAULT_TIERS, type Command, type ListDoc } from './types';

function doc(order: string[], pool: string[], size: ListDoc['size'] = 10): ListDoc {
  return { id: 't', title: 'Test', topic: 'x', size, order, pool, tiers: DEFAULT_TIERS, notes: {}, canvasX: {}, stagePreset: 'podium' };
}

describe('place', () => {
  it('moves a pool item into the ranking at the given index', () => {
    const next = apply(doc(['a', 'b'], ['c']), { type: 'place', id: 'c', at: 1 });
    expect(next.order).toEqual(['a', 'c', 'b']);
    expect(next.pool).toEqual([]);
  });

  it('moves a ranked item up or down', () => {
    expect(apply(doc(['a', 'b', 'c'], []), { type: 'place', id: 'c', at: 0 }).order).toEqual(['c', 'a', 'b']);
    expect(apply(doc(['a', 'b', 'c'], []), { type: 'place', id: 'a', at: 2 }).order).toEqual(['b', 'c', 'a']);
  });

  it('clamps an index past the end to the next open rank', () => {
    expect(apply(doc(['a'], ['b']), { type: 'place', id: 'b', at: 99 }).order).toEqual(['a', 'b']);
    expect(apply(doc(['a'], ['b']), { type: 'place', id: 'b', at: -4 }).order).toEqual(['b', 'a']);
  });

  it('bumps the last item to the front of the pool when the list is full', () => {
    const full = doc(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'], ['k', 'l']);
    const next = apply(full, { type: 'place', id: 'k', at: 0 });
    expect(next.order[0]).toBe('k');
    expect(next.order).toHaveLength(10);
    expect(next.pool).toEqual(['j', 'l']);
  });

  it('returns the same document for a no-op or an unknown item', () => {
    const d = doc(['a', 'b'], ['c']);
    expect(apply(d, { type: 'place', id: 'a', at: 0 })).toBe(d);
    expect(apply(d, { type: 'place', id: 'zzz', at: 0 })).toBe(d);
  });
});

describe('unrank', () => {
  it('sends the item to the front of the pool', () => {
    const next = apply(doc(['a', 'b'], ['c']), { type: 'unrank', id: 'a' });
    expect(next.order).toEqual(['b']);
    expect(next.pool).toEqual(['a', 'c']);
  });

  it('ignores items that are not ranked', () => {
    const d = doc(['a'], ['b']);
    expect(apply(d, { type: 'unrank', id: 'b' })).toBe(d);
  });
});

describe('setNote and setTitle', () => {
  it('stores, trims away and caps notes', () => {
    const d = doc(['a'], []);
    const withNote = apply(d, { type: 'setNote', id: 'a', text: 'Best ending.' });
    expect(withNote.notes).toEqual({ a: 'Best ending.' });
    expect(apply(withNote, { type: 'setNote', id: 'a', text: '   ' }).notes).toEqual({});
    expect(apply(d, { type: 'setNote', id: 'a', text: 'x'.repeat(5000) }).notes.a).toHaveLength(2000);
  });

  it('collapses whitespace in titles and ignores an empty title', () => {
    const d = doc([], []);
    expect(apply(d, { type: 'setTitle', title: '  Best   RPGs ' }).title).toBe('Best RPGs');
    expect(apply(d, { type: 'setTitle', title: '   ' })).toBe(d);
  });
});

describe('resize', () => {
  it('returns overflow to the front of the pool, best first', () => {
    const big = doc(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'], ['m'], 25);
    const small = apply(big, { type: 'resize', size: 10 });
    expect(small.order).toHaveLength(10);
    expect(small.pool).toEqual(['k', 'l', 'm']);
  });
});

describe('place with x (Canvas)', () => {
  it('moves and positions in one step, and is a no-op when nothing changes', () => {
    const d = doc(['a', 'b'], ['c']);
    const next = apply(d, { type: 'place', id: 'c', at: 0, x: 0.333333 });
    expect(next.order).toEqual(['c', 'a', 'b']);
    expect(next.canvasX).toEqual({ c: 0.333 });
    expect(apply(next, { type: 'place', id: 'c', at: 0, x: 0.333 })).toBe(next);
    expect(apply(next, { type: 'place', id: 'c', at: 0, x: 0.9 }).canvasX.c).toBe(0.9);
  });

  it('clamps x into the board', () => {
    expect(apply(doc(['a'], []), { type: 'setX', id: 'a', x: 4 }).canvasX.a).toBe(1);
    expect(apply(doc(['a'], []), { type: 'setX', id: 'a', x: -1 }).canvasX.a).toBe(0);
  });
});

describe('reorder (tournament result)', () => {
  it('rewrites the top of the ranking and leaves the rest', () => {
    const d = doc(['a', 'b', 'c', 'd', 'e'], []);
    expect(apply(d, { type: 'reorder', ids: ['c', 'a', 'd', 'b'] }).order).toEqual(['c', 'a', 'd', 'b', 'e']);
  });

  it('refuses ids that are not exactly the current top', () => {
    const d = doc(['a', 'b', 'c'], ['z']);
    expect(apply(d, { type: 'reorder', ids: ['z', 'a'] })).toBe(d);
    expect(apply(d, { type: 'reorder', ids: ['a', 'a'] })).toBe(d);
    expect(apply(d, { type: 'reorder', ids: ['a', 'b'] })).toBe(d);
  });
});

describe('tiers', () => {
  it('moves a cut between its neighbours and never past them', () => {
    const d = doc([], []);
    expect(apply(d, { type: 'setTierCut', index: 0, until: 5 }).tiers[0].until).toBe(5);
    expect(apply(d, { type: 'setTierCut', index: 0, until: 40 }).tiers[0].until).toBe(9);
    expect(apply(d, { type: 'setTierCut', index: 1, until: 1 }).tiers[1].until).toBe(4);
    expect(apply(d, { type: 'setTierCut', index: 3, until: 30 })).toBe(d);
  });

  it('renames a tier, ignoring blanks', () => {
    const d = doc([], []);
    expect(apply(d, { type: 'renameTier', index: 0, name: '  Holy   trinity ' }).tiers[0].name).toBe('Holy trinity');
    expect(apply(d, { type: 'renameTier', index: 0, name: '  ' })).toBe(d);
  });

  it('switches the stage preset', () => {
    expect(apply(doc([], []), { type: 'setPreset', preset: 'throne' }).stagePreset).toBe('throne');
  });
});

describe('normalizeDoc', () => {
  it('fills the fields an M1 save does not have', () => {
    const old = { id: 'x', title: 'T', topic: 't', size: 10, order: [], pool: [], tiers: DEFAULT_TIERS, notes: {} };
    const n = normalizeDoc(old as unknown as ListDoc);
    expect(n.canvasX).toEqual({});
    expect(n.stagePreset).toBe('podium');
  });
});

describe('invariants', () => {
  it('holds for every item under a long random command sequence', () => {
    let d = demoDoc();
    const ids = [...d.order, ...d.pool];
    let seed = 7;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % n;
    };
    const sizes = [10, 25, 50] as const;
    for (let step = 0; step < 2000; step++) {
      const id = ids[rand(ids.length)];
      const roll = rand(6);
      const cmd: Command =
        roll === 0
          ? { type: 'unrank', id }
          : roll === 1
            ? { type: 'resize', size: sizes[rand(3)] }
            : roll === 2
              ? { type: 'setTierCut', index: rand(4), until: rand(60) }
              : roll === 3
                ? { type: 'reorder', ids: [...d.order.slice(0, 4)].reverse() }
                : { type: 'place', id, at: rand(60) - 5, x: rand(100) / 100 };
      d = apply(d, cmd);
      expect(isConsistent(d)).toBe(true);
    }
    expect([...d.order, ...d.pool].sort()).toEqual([...ids].sort());
  });
});

describe('addToPool', () => {
  it('puts new items at the front of the pool, once, and ignores ones already listed', () => {
    const next = apply(doc(['a'], ['b']), { type: 'addToPool', ids: ['n1', 'a', 'b', 'n2', 'n1'] });
    expect(next.pool).toEqual(['n1', 'n2', 'b']);
    expect(next.order).toEqual(['a']);
    expect(isConsistent(next)).toBe(true);
  });

  it('is a no-op, by identity, when nothing is new', () => {
    const d = doc(['a'], ['b']);
    expect(apply(d, { type: 'addToPool', ids: ['a', 'b'] })).toBe(d);
  });
});
