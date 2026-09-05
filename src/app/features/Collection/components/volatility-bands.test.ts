import { describe, expect, it } from 'vitest';

import { getVolatilityInfo } from './RankingDistribution';

/**
 * One volatility vocabulary for both ranking surfaces. Before 2026-09-05 the
 * threshold table lived twice — RankingDistribution (class-styled) and
 * ItemDetailPopup (inline-styled) — and the first band carried two names:
 * "Very Stable" in the panel, "Stable" in the popup. Same number, two words.
 *
 * Negative control (recorded 2026-09-05): grepping the two files for the
 * `< 2` band gave two tables and two labels; this file did not exist.
 */
describe('getVolatilityInfo', () => {
  it('maps the four bands with their boundaries', () => {
    expect(getVolatilityInfo(0).level).toBe('stable');
    expect(getVolatilityInfo(1.99).level).toBe('stable');
    expect(getVolatilityInfo(2).level).toBe('moderate');
    expect(getVolatilityInfo(3.99).level).toBe('moderate');
    expect(getVolatilityInfo(4).level).toBe('contested');
    expect(getVolatilityInfo(5.99).level).toBe('contested');
    expect(getVolatilityInfo(6).level).toBe('polarizing');
    expect(getVolatilityInfo(50).level).toBe('polarizing');
  });

  it('carries one label per band and both colour representations', () => {
    for (const v of [0, 3, 5, 9]) {
      const info = getVolatilityInfo(v);
      expect(info.label).toMatch(/^(Stable|Moderate|Contested|Polarizing)$/);
      expect(info.hex).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(info.className).toMatch(/^text-/);
      expect(info.bgColor).toMatch(/^rgba\(/);
    }
  });
});
