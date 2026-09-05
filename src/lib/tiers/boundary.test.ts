/**
 * Unit tests for the centralized boundary convention utilities.
 *
 * Run with: npm test
 *
 * History: until 2026-08-24 this file was a hand-run `tsx` script with its own
 * pass/fail counters and a `process.exit(1)`. Nothing ran it, and its name
 * claimed a runner the repo did not have. It is now a real vitest suite.
 *
 * NEGATIVE CONTROL (test-harness/negative-control-tests): proved able to go red
 * by changing `position < range.end` to `position <= range.end` in
 * `getTierForPositionGeneric` (boundary.ts:97). That single coarse mutation —
 * one the module has no way to normalize away — reddens 10 of these 41 tests,
 * including every out-of-range case and the cross-convention consistency sweep.
 * Restored after.
 */

import { describe, expect, it } from 'vitest';

import {
  getTierForPositionGeneric,
  isAtBoundaryGeneric,
  isTierTransitionGeneric,
  rangeFromTierDef,
  rangeFromTierConfig,
  rangeFromInclusiveBoundary,
  inclusiveToExclusive,
  exclusiveToInclusive,
} from './boundary';

// ---------------------------------------------------------------------------
// Test data: three representations of the same 4-tier layout (50 positions)
// ---------------------------------------------------------------------------

// Shape 1: lib/tiers TierDefinition (startPosition/endPosition, exclusive)
const tiersLibShape = [
  { id: 'elite', startPosition: 0, endPosition: 10 },
  { id: 'core', startPosition: 10, endPosition: 20 },
  { id: 'rising', startPosition: 20, endPosition: 35 },
  { id: 'reserves', startPosition: 35, endPosition: 50 },
];

// Shape 2: tierConfig TierDefinition (range.start/range.end, exclusive)
const tierConfigShape = [
  { id: 'elite', range: { start: 0, end: 10 } },
  { id: 'core', range: { start: 10, end: 20 } },
  { id: 'rising', range: { start: 20, end: 35 } },
  { id: 'reserves', range: { start: 35, end: 50 } },
];

// Shape 3: types/ranking TierBoundary (startPosition/endPosition, INCLUSIVE)
const rankingShape = [
  { tierId: 'elite', startPosition: 0, endPosition: 9 },
  { tierId: 'core', startPosition: 10, endPosition: 19 },
  { tierId: 'rising', startPosition: 20, endPosition: 34 },
  { tierId: 'reserves', startPosition: 35, endPosition: 49 },
];

describe('getTierForPositionGeneric — lib/tiers shape', () => {
  it.each([
    [0, 'elite'],
    [9, 'elite'],
    [10, 'core'],
    [19, 'core'],
    [20, 'rising'],
    [34, 'rising'],
    [35, 'reserves'],
    [49, 'reserves'],
  ])('position %i resolves to %s', (position, expected) => {
    expect(getTierForPositionGeneric(position, tiersLibShape, rangeFromTierDef)?.id).toBe(expected);
  });

  it('returns null past the last tier', () => {
    expect(getTierForPositionGeneric(50, tiersLibShape, rangeFromTierDef)).toBeNull();
  });

  it('returns null for a negative position', () => {
    expect(getTierForPositionGeneric(-1, tiersLibShape, rangeFromTierDef)).toBeNull();
  });
});

describe('getTierForPositionGeneric — tierConfig shape', () => {
  it.each([
    [0, 'elite'],
    [9, 'elite'],
    [10, 'core'],
    [49, 'reserves'],
  ])('position %i resolves to %s', (position, expected) => {
    expect(getTierForPositionGeneric(position, tierConfigShape, rangeFromTierConfig)?.id).toBe(
      expected,
    );
  });

  it('returns null past the last tier', () => {
    expect(getTierForPositionGeneric(50, tierConfigShape, rangeFromTierConfig)).toBeNull();
  });
});

describe('getTierForPositionGeneric — inclusive-end ranking shape', () => {
  it.each([
    [0, 'elite'],
    [9, 'elite'],
    // 10 must be core, not elite — this is the off-by-one the converter exists for
    [10, 'core'],
    [19, 'core'],
    [34, 'rising'],
    [35, 'reserves'],
    [49, 'reserves'],
  ])('position %i resolves to %s', (position, expected) => {
    expect(
      getTierForPositionGeneric(position, rankingShape, rangeFromInclusiveBoundary)?.tierId,
    ).toBe(expected);
  });

  it('returns null past the last tier', () => {
    expect(getTierForPositionGeneric(50, rankingShape, rangeFromInclusiveBoundary)).toBeNull();
  });
});

describe('cross-convention consistency', () => {
  // The point of the module: all three shapes must agree at every position,
  // most importantly at the tier seams where the inclusive/exclusive mismatch
  // would show up.
  it('all three shapes agree at every position 0-49', () => {
    const disagreements: string[] = [];
    for (let pos = 0; pos < 50; pos++) {
      const fromLib = getTierForPositionGeneric(pos, tiersLibShape, rangeFromTierDef)?.id;
      const fromConfig = getTierForPositionGeneric(pos, tierConfigShape, rangeFromTierConfig)?.id;
      const fromRanking = getTierForPositionGeneric(
        pos,
        rankingShape,
        rangeFromInclusiveBoundary,
      )?.tierId;
      if (fromLib !== fromConfig || fromLib !== fromRanking) {
        disagreements.push(`${pos}: lib=${fromLib} config=${fromConfig} ranking=${fromRanking}`);
      }
    }
    expect(disagreements).toEqual([]);
  });
});

describe('isAtBoundaryGeneric', () => {
  it.each([9, 19, 34, 49])('position %i is the last slot of a tier', (position) => {
    expect(isAtBoundaryGeneric(position, tiersLibShape, rangeFromTierDef)).toBe(true);
  });

  it.each([0, 10])('position %i is not the last slot of a tier', (position) => {
    expect(isAtBoundaryGeneric(position, tiersLibShape, rangeFromTierDef)).toBe(false);
  });
});

describe('isTierTransitionGeneric', () => {
  it.each([10, 20, 35])('position %i is a transition point', (position) => {
    expect(isTierTransitionGeneric(position, tiersLibShape, rangeFromTierDef)).toBe(true);
  });

  it.each([
    [0, 'first position of the first tier'],
    [5, 'mid-tier'],
    [50, 'past the last tier — the last tier has no successor to transition into'],
  ])('position %i is not a transition (%s)', (position) => {
    expect(isTierTransitionGeneric(position, tiersLibShape, rangeFromTierDef)).toBe(false);
  });
});

describe('conversion helpers', () => {
  it('round-trips inclusive -> exclusive -> inclusive', () => {
    for (const inclusive of [0, 9, 19, 34, 49]) {
      expect(exclusiveToInclusive(inclusiveToExclusive(inclusive))).toBe(inclusive);
    }
  });

  it('inclusiveToExclusive adds one', () => {
    expect(inclusiveToExclusive(9)).toBe(10);
    expect(inclusiveToExclusive(49)).toBe(50);
  });

  it('exclusiveToInclusive subtracts one', () => {
    expect(exclusiveToInclusive(10)).toBe(9);
    expect(exclusiveToInclusive(50)).toBe(49);
  });
});

describe('edge cases', () => {
  const singleTier = [{ id: 'all', startPosition: 0, endPosition: 5 }];

  it('single-tier list resolves inside its range and nowhere else', () => {
    expect(getTierForPositionGeneric(0, singleTier, rangeFromTierDef)?.id).toBe('all');
    expect(getTierForPositionGeneric(4, singleTier, rangeFromTierDef)?.id).toBe('all');
    expect(getTierForPositionGeneric(5, singleTier, rangeFromTierDef)).toBeNull();
  });

  it('empty tiers array resolves to null and never reports a boundary', () => {
    const noRange = () => ({ start: 0, end: 0 });
    expect(getTierForPositionGeneric(0, [] as never[], noRange)).toBeNull();
    expect(isAtBoundaryGeneric(0, [] as never[], noRange)).toBe(false);
    expect(isTierTransitionGeneric(0, [] as never[], noRange)).toBe(false);
  });
});
