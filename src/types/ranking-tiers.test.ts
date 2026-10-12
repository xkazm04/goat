import { describe, expect, it } from 'vitest';

import { computeTierBoundaries, getTierForPosition } from './ranking';

/**
 * `computeTierBoundaries` promises, in its own comment, to "ensure all positions
 * are covered". Measured 2026-09-05 over sizes 1..12 before the fix: size 1
 * returned ZERO boundaries — a Top-1 ranking had no tier at all, and
 * `getTierForPosition(0, …)` answered null — because every tier's
 * `Math.round(1 * pct)` was 0 and the "extend the last boundary" step has no
 * last boundary to extend. Sizes 2..64 were covered. The percentages that put a
 * Top-2's first item in B rather than S are the documented distribution and are
 * not asserted here; coverage and contiguity are.
 *
 * Negative control (recorded 2026-09-05, before the fix): the size-1 case in the
 * first test was red (`covered` 0, expected 1).
 */

describe('computeTierBoundaries', () => {
  it('covers every position exactly once for sizes 1..64', () => {
    for (let n = 1; n <= 64; n++) {
      const { boundaries } = computeTierBoundaries(n);
      const covered = boundaries.reduce((s, b) => s + (b.endPosition - b.startPosition + 1), 0);
      expect(covered, `size ${n}`).toBe(n);
      let next = 0;
      for (const b of boundaries) {
        expect(b.startPosition, `size ${n} tier ${b.tierId} start`).toBe(next);
        expect(b.endPosition, `size ${n} tier ${b.tierId} end`).toBeGreaterThanOrEqual(b.startPosition);
        next = b.endPosition + 1;
      }
      expect(next, `size ${n} last end`).toBe(n);
    }
  });

  it('a Top-1 ranking puts its only item in the first tier', () => {
    const boundaries = computeTierBoundaries(1);
    expect(boundaries.boundaries).toEqual([{ tierId: 'S', startPosition: 0, endPosition: 0 }]);
    expect(getTierForPosition(0, boundaries)).toBe('S');
  });

  it('keeps tier order for custom tier ids', () => {
    const { boundaries } = computeTierBoundaries(20, ['gold', 'silver', 'bronze']);
    expect(boundaries.map((b) => b.tierId)).toEqual(['gold', 'silver', 'bronze']);
    expect(boundaries[boundaries.length - 1].endPosition).toBe(19);
  });

  it('returns no boundaries for an empty ranking', () => {
    expect(computeTierBoundaries(0).boundaries).toEqual([]);
  });
});
