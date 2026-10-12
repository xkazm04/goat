import { describe, expect, it } from 'vitest';

import { calculateSimilarity } from './string-similarity';

/**
 * `calculateSimilarity` is the confidence floor for every enrichment fetcher:
 * TMDB, IGDB, Spotify and Wikipedia all seed their match confidence with it and
 * accept a result at 0.25-0.3. A score it returns too generously is a wrong
 * item attached to a user's list, so the containment case is pinned here.
 */
describe('calculateSimilarity', () => {
  it('scores an exact match 1 and an unrelated pair 0', () => {
    expect(calculateSimilarity('The Matrix', 'the matrix')).toBe(1);
    expect(calculateSimilarity('Her', 'Tenet')).toBe(0);
  });

  it('does not award a near-exact score to a short title swallowed by a longer one', () => {
    // "Her" (2013) against "Hercules": containment used to short-circuit to 0.9,
    // which clears every fetcher's accept threshold and the pipeline's 0.6
    // minConfidence, so the wrong film was attached with high confidence.
    const score = calculateSimilarity('Her', 'Hercules');
    expect(score).toBeLessThan(0.6);

    // The same shape for the other short titles that are common list items.
    expect(calculateSimilarity('Up', 'Up in the Air')).toBeLessThan(0.6);
    expect(calculateSimilarity('It', 'Italy national football team')).toBeLessThan(0.6);
  });

  it('still scores a genuine title variant well above an unrelated title', () => {
    const variant = calculateSimilarity('The Matrix', 'The Matrix Resurrections');
    const unrelated = calculateSimilarity('The Matrix', 'Hercules');
    expect(variant).toBeGreaterThan(unrelated);
    expect(variant).toBeGreaterThan(0.5);
  });

  it('keeps a long containment near-exact when the two strings are close in length', () => {
    // "The Matrix" inside "The Matrix " (a trailing-space payload) is the case
    // containment exists for and must stay high.
    expect(calculateSimilarity('The Matrix (1999)', 'The Matrix (1999)')).toBe(1);
    expect(calculateSimilarity('Blade Runner 2049', 'Blade Runner 204')).toBeGreaterThan(0.8);
  });

  it('is symmetric', () => {
    expect(calculateSimilarity('Her', 'Hercules')).toBe(calculateSimilarity('Hercules', 'Her'));
    expect(calculateSimilarity('Alien', 'Alien Resurrection')).toBe(
      calculateSimilarity('Alien Resurrection', 'Alien')
    );
  });
});
