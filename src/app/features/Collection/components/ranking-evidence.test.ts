import { describe, expect, it } from 'vitest';

import { hasRankingEvidence } from './RankingDistribution';

/**
 * One rule — "zero rankings is the empty state, not a chart" — had two
 * implementations. RankingDistribution checked `totalRankings === 0` (fixed for
 * ledger finding f2bd97e0280a); ItemDetailPopup's compact chart still rendered
 * the API's ZEROED stats object as "Stable / 25th #0 / Med #0 / 75th #0".
 * Both now read this predicate.
 *
 * Negative control (recorded 2026-09-05): before the predicate existed, the
 * zeroed object below satisfied ItemDetailPopup's `data.rankingStats &&` guard
 * and the compact chart rendered — 1 of 2 surfaces honoured the rule.
 */

// Exactly what /api/items/[id]/details returns for an item nobody has ranked.
const ZEROED = {
  totalRankings: 0,
  averagePosition: 0,
  medianPosition: 0,
  distribution: {},
  volatility: 0,
  confidence: 0,
  percentiles: { p25: 0, p50: 0, p75: 0 },
};

describe('hasRankingEvidence', () => {
  it('is false for null and undefined', () => {
    expect(hasRankingEvidence(null)).toBe(false);
    expect(hasRankingEvidence(undefined)).toBe(false);
  });

  it('is false for the API\'s zeroed placeholder object', () => {
    expect(hasRankingEvidence(ZEROED)).toBe(false);
  });

  it('is true once at least one ranking exists', () => {
    expect(hasRankingEvidence({ ...ZEROED, totalRankings: 1, averagePosition: 3 })).toBe(true);
  });
});
