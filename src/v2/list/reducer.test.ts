import { describe, expect, it } from 'vitest';

import { demoDoc } from './fixtures';
import { apply, isConsistent } from './reducer';
import { DEFAULT_TIERS, type Command, type ListDoc } from './types';

function doc(order: string[], pool: string[], size: ListDoc['size'] = 10): ListDoc {
  return { id: 't', title: 'Test', topic: 'x', size, order, pool, tiers: DEFAULT_TIERS, notes: {} };
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
      const roll = rand(4);
      const cmd: Command =
        roll === 0
          ? { type: 'unrank', id }
          : roll === 1
            ? { type: 'resize', size: sizes[rand(3)] }
            : { type: 'place', id, at: rand(60) - 5 };
      d = apply(d, cmd);
      expect(isConsistent(d)).toBe(true);
    }
    expect([...d.order, ...d.pool].sort()).toEqual([...ids].sort());
  });
});
