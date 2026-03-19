/**
 * Unit tests for the centralized boundary convention utilities.
 *
 * Run with: npx tsx src/lib/tiers/boundary.test.ts
 *
 * Tests cover:
 *  - Canonical exclusive-end lookup
 *  - Inclusive-end conversion (types/ranking.ts convention)
 *  - Boundary detection helpers
 *  - Edge cases: position 0, last position, between tiers, out of range
 *  - All three TierDefinition shapes produce consistent results
 */

import {
  getTierForPositionGeneric,
  isAtBoundaryGeneric,
  isTierTransitionGeneric,
  rangeFromTierDef,
  rangeFromTierConfig,
  rangeFromInclusiveBoundary,
  inclusiveToExclusive,
  exclusiveToInclusive,
  type TierRange,
} from './boundary';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${message} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function section(name: string) {
  console.log(`\n--- ${name} ---`);
}

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

section('getTierForPositionGeneric — lib/tiers shape');
{
  assertEqual(
    getTierForPositionGeneric(0, tiersLibShape, rangeFromTierDef)?.id,
    'elite',
    'position 0 → elite',
  );
  assertEqual(
    getTierForPositionGeneric(9, tiersLibShape, rangeFromTierDef)?.id,
    'elite',
    'position 9 (last in elite) → elite',
  );
  assertEqual(
    getTierForPositionGeneric(10, tiersLibShape, rangeFromTierDef)?.id,
    'core',
    'position 10 (first in core) → core',
  );
  assertEqual(
    getTierForPositionGeneric(19, tiersLibShape, rangeFromTierDef)?.id,
    'core',
    'position 19 (last in core) → core',
  );
  assertEqual(
    getTierForPositionGeneric(20, tiersLibShape, rangeFromTierDef)?.id,
    'rising',
    'position 20 (first in rising) → rising',
  );
  assertEqual(
    getTierForPositionGeneric(34, tiersLibShape, rangeFromTierDef)?.id,
    'rising',
    'position 34 (last in rising) → rising',
  );
  assertEqual(
    getTierForPositionGeneric(35, tiersLibShape, rangeFromTierDef)?.id,
    'reserves',
    'position 35 (first in reserves) → reserves',
  );
  assertEqual(
    getTierForPositionGeneric(49, tiersLibShape, rangeFromTierDef)?.id,
    'reserves',
    'position 49 (last in reserves) → reserves',
  );
  assertEqual(
    getTierForPositionGeneric(50, tiersLibShape, rangeFromTierDef),
    null,
    'position 50 (out of range) → null',
  );
  assertEqual(
    getTierForPositionGeneric(-1, tiersLibShape, rangeFromTierDef),
    null,
    'position -1 (negative) → null',
  );
}

section('getTierForPositionGeneric — tierConfig shape');
{
  assertEqual(
    getTierForPositionGeneric(0, tierConfigShape, rangeFromTierConfig)?.id,
    'elite',
    'position 0 → elite',
  );
  assertEqual(
    getTierForPositionGeneric(9, tierConfigShape, rangeFromTierConfig)?.id,
    'elite',
    'position 9 → elite',
  );
  assertEqual(
    getTierForPositionGeneric(10, tierConfigShape, rangeFromTierConfig)?.id,
    'core',
    'position 10 → core',
  );
  assertEqual(
    getTierForPositionGeneric(49, tierConfigShape, rangeFromTierConfig)?.id,
    'reserves',
    'position 49 → reserves',
  );
  assertEqual(
    getTierForPositionGeneric(50, tierConfigShape, rangeFromTierConfig),
    null,
    'position 50 → null',
  );
}

section('getTierForPositionGeneric — inclusive-end ranking shape');
{
  assertEqual(
    getTierForPositionGeneric(0, rankingShape, rangeFromInclusiveBoundary)?.tierId,
    'elite',
    'position 0 → elite',
  );
  assertEqual(
    getTierForPositionGeneric(9, rankingShape, rangeFromInclusiveBoundary)?.tierId,
    'elite',
    'position 9 (inclusive end) → elite',
  );
  assertEqual(
    getTierForPositionGeneric(10, rankingShape, rangeFromInclusiveBoundary)?.tierId,
    'core',
    'position 10 → core (NOT elite — no off-by-one)',
  );
  assertEqual(
    getTierForPositionGeneric(19, rankingShape, rangeFromInclusiveBoundary)?.tierId,
    'core',
    'position 19 (inclusive end) → core',
  );
  assertEqual(
    getTierForPositionGeneric(34, rankingShape, rangeFromInclusiveBoundary)?.tierId,
    'rising',
    'position 34 (inclusive end) → rising',
  );
  assertEqual(
    getTierForPositionGeneric(35, rankingShape, rangeFromInclusiveBoundary)?.tierId,
    'reserves',
    'position 35 → reserves (NOT rising)',
  );
  assertEqual(
    getTierForPositionGeneric(49, rankingShape, rangeFromInclusiveBoundary)?.tierId,
    'reserves',
    'position 49 (inclusive end) → reserves',
  );
  assertEqual(
    getTierForPositionGeneric(50, rankingShape, rangeFromInclusiveBoundary),
    null,
    'position 50 → null (out of range)',
  );
}

section('Cross-convention consistency at every boundary');
{
  // Every position 0–49 should resolve to the same tier across all three shapes
  for (let pos = 0; pos < 50; pos++) {
    const fromLib = getTierForPositionGeneric(pos, tiersLibShape, rangeFromTierDef)?.id;
    const fromConfig = getTierForPositionGeneric(pos, tierConfigShape, rangeFromTierConfig)?.id;
    const fromRanking = getTierForPositionGeneric(pos, rankingShape, rangeFromInclusiveBoundary)?.tierId;
    assertEqual(fromLib, fromConfig, `position ${pos}: lib === config`);
    assertEqual(fromLib, fromRanking, `position ${pos}: lib === ranking`);
  }
}

section('isAtBoundaryGeneric');
{
  // Position 9 = last in elite (end=10, so 10-1=9)
  assert(
    isAtBoundaryGeneric(9, tiersLibShape, rangeFromTierDef),
    'position 9 is at elite boundary',
  );
  assert(
    isAtBoundaryGeneric(19, tiersLibShape, rangeFromTierDef),
    'position 19 is at core boundary',
  );
  assert(
    isAtBoundaryGeneric(34, tiersLibShape, rangeFromTierDef),
    'position 34 is at rising boundary',
  );
  assert(
    isAtBoundaryGeneric(49, tiersLibShape, rangeFromTierDef),
    'position 49 is at reserves boundary',
  );
  assert(
    !isAtBoundaryGeneric(10, tiersLibShape, rangeFromTierDef),
    'position 10 is NOT at a boundary (it is first in core)',
  );
  assert(
    !isAtBoundaryGeneric(0, tiersLibShape, rangeFromTierDef),
    'position 0 is NOT at a boundary',
  );
}

section('isTierTransitionGeneric');
{
  // Position 10 = transition point (elite ends at 10, core starts at 10)
  assert(
    isTierTransitionGeneric(10, tiersLibShape, rangeFromTierDef),
    'position 10 is a tier transition (elite→core)',
  );
  assert(
    isTierTransitionGeneric(20, tiersLibShape, rangeFromTierDef),
    'position 20 is a tier transition (core→rising)',
  );
  assert(
    isTierTransitionGeneric(35, tiersLibShape, rangeFromTierDef),
    'position 35 is a tier transition (rising→reserves)',
  );
  assert(
    !isTierTransitionGeneric(50, tiersLibShape, rangeFromTierDef),
    'position 50 is NOT a transition (reserves is last tier)',
  );
  assert(
    !isTierTransitionGeneric(0, tiersLibShape, rangeFromTierDef),
    'position 0 is NOT a transition',
  );
  assert(
    !isTierTransitionGeneric(5, tiersLibShape, rangeFromTierDef),
    'position 5 is NOT a transition',
  );
}

section('Conversion helpers');
{
  assertEqual(inclusiveToExclusive(9), 10, 'inclusive 9 → exclusive 10');
  assertEqual(inclusiveToExclusive(49), 50, 'inclusive 49 → exclusive 50');
  assertEqual(exclusiveToInclusive(10), 9, 'exclusive 10 → inclusive 9');
  assertEqual(exclusiveToInclusive(50), 49, 'exclusive 50 → inclusive 49');
}

section('Edge case: single-tier list');
{
  const singleTier = [{ id: 'all', startPosition: 0, endPosition: 5 }];
  assertEqual(
    getTierForPositionGeneric(0, singleTier, rangeFromTierDef)?.id,
    'all',
    'single tier: position 0',
  );
  assertEqual(
    getTierForPositionGeneric(4, singleTier, rangeFromTierDef)?.id,
    'all',
    'single tier: position 4 (last)',
  );
  assertEqual(
    getTierForPositionGeneric(5, singleTier, rangeFromTierDef),
    null,
    'single tier: position 5 (out of range)',
  );
}

section('Edge case: empty tiers array');
{
  assertEqual(
    getTierForPositionGeneric(0, [], (t: never) => ({ start: 0, end: 0 })),
    null,
    'empty tiers → null',
  );
  assert(
    !isAtBoundaryGeneric(0, [], (t: never) => ({ start: 0, end: 0 })),
    'empty tiers → not at boundary',
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All tests passed!');
}
