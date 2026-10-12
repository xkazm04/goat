/**
 * Tests for the shared comparators.
 *
 * These encode the two properties the previous per-call-site sorts violated:
 * absent values land last in BOTH directions, and equal keys resolve
 * deterministically by identity.
 *
 * NEGATIVE CONTROL (test-harness/negative-control-tests): proved able to go red
 * on 2026-08-24 by changing `compareAbsence`'s `if (aAbsent) return 1` to
 * `return -1` in comparators.ts — a coarse mutation that reinstates exactly the
 * old absent-first behaviour and that nothing can normalize away. Reds 14 of
 * these 31 tests. Restored after.
 */

import { describe, expect, it } from 'vitest';

import {
  compareInstant,
  compareNumeric,
  compareText,
  sortedBy,
  withIdTiebreak,
  type SortDirection,
} from './comparators';

const BOTH: SortDirection[] = ['asc', 'desc'];

describe('compareNumeric', () => {
  it('orders ascending and descending', () => {
    expect(compareNumeric(1, 2, 'asc')).toBeLessThan(0);
    expect(compareNumeric(1, 2, 'desc')).toBeGreaterThan(0);
  });

  it.each(BOTH)('puts null last under %s', (direction) => {
    expect(compareNumeric(null, 5, direction)).toBeGreaterThan(0);
    expect(compareNumeric(5, null, direction)).toBeLessThan(0);
  });

  it.each(BOTH)('puts undefined last under %s', (direction) => {
    expect(compareNumeric(undefined, 5, direction)).toBeGreaterThan(0);
    expect(compareNumeric(5, undefined, direction)).toBeLessThan(0);
  });

  it.each(BOTH)('puts NaN last under %s', (direction) => {
    // NaN compares false against everything; left in the value channel it makes
    // the whole sort non-deterministic rather than merely wrong.
    expect(compareNumeric(Number.NaN, 5, direction)).toBeGreaterThan(0);
    expect(compareNumeric(5, Number.NaN, direction)).toBeLessThan(0);
  });

  it('treats two absent values as equal, so the tiebreak decides', () => {
    expect(compareNumeric(null, undefined, 'asc')).toBe(0);
  });

  it('treats 0 as a present value, not an absent one', () => {
    // The whole defect being fixed was `?? 0` making these the same thing.
    expect(compareNumeric(0, 5, 'asc')).toBeLessThan(0);
    expect(compareNumeric(0, null, 'asc')).toBeLessThan(0);
  });

  it('handles negative values', () => {
    expect(compareNumeric(-10, -1, 'asc')).toBeLessThan(0);
    expect(compareNumeric(-10, null, 'asc')).toBeLessThan(0);
  });
});

describe('compareText', () => {
  it('is case-insensitive', () => {
    expect(compareText('apple', 'Apple', 'asc')).toBe(0);
  });

  it('collates accents next to their base letter rather than after z', () => {
    expect(compareText('Ångström', 'Zulu', 'asc')).toBeLessThan(0);
  });

  it('orders embedded numbers numerically, not lexicographically', () => {
    // "Top 9" before "Top 10" — the classic tell of a table with no column model.
    expect(compareText('Top 9', 'Top 10', 'asc')).toBeLessThan(0);
  });

  it('reverses under desc', () => {
    expect(compareText('a', 'b', 'desc')).toBeGreaterThan(0);
  });

  it.each(BOTH)('puts absent titles last under %s', (direction) => {
    expect(compareText(null, 'anything', direction)).toBeGreaterThan(0);
    expect(compareText('anything', undefined, direction)).toBeLessThan(0);
  });

  it('treats the empty string as present, sorting it first ascending', () => {
    expect(compareText('', 'a', 'asc')).toBeLessThan(0);
    // ...but still ahead of an absent value in both directions.
    expect(compareText('', null, 'asc')).toBeLessThan(0);
    expect(compareText('', null, 'desc')).toBeLessThan(0);
  });
});

describe('compareInstant', () => {
  it('compares as instants, not display strings', () => {
    expect(compareInstant('2026-01-02', '2026-01-10', 'asc')).toBeLessThan(0);
    expect(compareInstant('2026-01-02', '2026-01-10', 'desc')).toBeGreaterThan(0);
  });

  it('accepts Date, epoch millis and ISO strings interchangeably', () => {
    const d = new Date('2026-03-01T00:00:00.000Z');
    expect(compareInstant(d, d.getTime(), 'asc')).toBe(0);
    expect(compareInstant(d.toISOString(), d.getTime(), 'asc')).toBe(0);
  });

  it.each(BOTH)('puts a missing date last under %s, NOT at the epoch', (direction) => {
    // `?? 0` used to make undated rows 1 January 1970 — the extreme of the
    // range, where they read as real data at one end of the sort.
    expect(compareInstant(null, '2026-01-01', direction)).toBeGreaterThan(0);
    expect(compareInstant('2026-01-01', null, direction)).toBeLessThan(0);
  });

  it.each(BOTH)('puts an unparseable date last under %s', (direction) => {
    expect(compareInstant('not a date', '2026-01-01', direction)).toBeGreaterThan(0);
  });

  it('does not treat the actual epoch as absent', () => {
    expect(compareInstant(0, '2026-01-01', 'asc')).toBeLessThan(0);
    expect(compareInstant(0, null, 'asc')).toBeLessThan(0);
  });
});

describe('withIdTiebreak', () => {
  type Row = { id: string; score: number | null };
  const byScore = (dir: SortDirection) =>
    withIdTiebreak<Row>((a, b) => compareNumeric(a.score, b.score, dir), (r) => r.id);

  it('never reports two distinct rows as equal', () => {
    const rows: Row[] = [
      { id: 'c', score: 5 },
      { id: 'a', score: 5 },
      { id: 'b', score: 5 },
    ];
    const cmp = byScore('asc');
    for (const a of rows) {
      for (const b of rows) {
        if (a.id !== b.id) expect(cmp(a, b)).not.toBe(0);
      }
    }
  });

  it('produces the same order regardless of input order', () => {
    const rows: Row[] = [
      { id: 'c', score: 5 },
      { id: 'a', score: 5 },
      { id: 'b', score: 5 },
    ];
    const cmp = byScore('asc');
    const forward = sortedBy(rows, cmp).map((r) => r.id);
    const reversed = sortedBy([...rows].reverse(), cmp).map((r) => r.id);
    expect(forward).toEqual(['a', 'b', 'c']);
    expect(reversed).toEqual(forward);
  });

  it('keeps the tiebreak ascending even when the sort is descending', () => {
    // The tiebreak's job is determinism, not meaning. Flipping it with the
    // direction would reshuffle equal-keyed rows for no reason a user could name.
    const rows: Row[] = [
      { id: 'b', score: 5 },
      { id: 'a', score: 5 },
    ];
    expect(sortedBy(rows, byScore('desc')).map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('groups all absent-score rows at the end, ordered by id', () => {
    const rows: Row[] = [
      { id: 'z', score: null },
      { id: 'm', score: 3 },
      { id: 'a', score: null },
      { id: 'q', score: 1 },
    ];
    expect(sortedBy(rows, byScore('asc')).map((r) => r.id)).toEqual(['q', 'm', 'a', 'z']);
    // Absent rows stay at the END under desc too — that is the whole point.
    expect(sortedBy(rows, byScore('desc')).map((r) => r.id)).toEqual(['m', 'q', 'a', 'z']);
  });

  it('is idempotent — sorting an already-sorted array changes nothing', () => {
    const rows: Row[] = [
      { id: 'b', score: null },
      { id: 'a', score: 2 },
      { id: 'c', score: 1 },
    ];
    const cmp = byScore('asc');
    const once = sortedBy(rows, cmp);
    const twice = sortedBy(once, cmp);
    expect(twice.map((r) => r.id)).toEqual(once.map((r) => r.id));
  });
});

describe('sortedBy', () => {
  it('does not mutate its input', () => {
    // Sorting a derived array in place inside a useMemo mutates that memo's own
    // input — a "pure" derivation reordering the thing it derived from.
    const input = [3, 1, 2];
    const snapshot = [...input];
    const out = sortedBy(input, (a, b) => a - b);
    expect(input).toEqual(snapshot);
    expect(out).toEqual([1, 2, 3]);
    expect(out).not.toBe(input);
  });

  it('accepts a readonly array', () => {
    const input: readonly number[] = Object.freeze([2, 1]);
    expect(sortedBy(input, (a, b) => a - b)).toEqual([1, 2]);
  });
});
