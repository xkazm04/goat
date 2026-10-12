/**
 * Tests for the choreography tokens: roles bind to the ladder, they do not
 * restate it.
 *
 * Registry: design-tokens/token-taxonomy (two layers, one direction — semantic
 * roles consume raw scale values; a role that carries its own literal is a
 * second copy of the scale waiting to drift); findings ledger f542f6f538ff
 * ("Duplicated, drifting DURATION scales across the animation libs",
 * anchored at ENTRANCE_DURATION).
 *
 * Values are unchanged by the aliasing (0.3 / 0.5 / 0.8 / 0.6), so this suite is
 * green on both sides of the fix by construction. What it guards is the NEXT
 * edit: re-hardcoding a role, or retuning a ladder rung without the role
 * following.
 *
 * NEGATIVE CONTROL (test-harness/negative-control-tests), run 2026-09-05:
 * `normal: DURATION.normal` seeded back to the literal `0.35` reds 3 of these 3
 * tests (measured), then restored.
 */

import { describe, expect, it } from 'vitest';

import { DURATION } from './motion-presets';
import { ENTRANCE_DURATION } from './motion-tokens';

describe('ENTRANCE_DURATION — roles over the DURATION ladder', () => {
  it('each role IS a ladder rung', () => {
    expect(ENTRANCE_DURATION.normal).toBe(DURATION.normal);
    expect(ENTRANCE_DURATION.slow).toBe(DURATION.slow);
    expect(ENTRANCE_DURATION.ambient).toBe(DURATION.dramatic);
    expect(ENTRANCE_DURATION.scenic).toBe(DURATION.emphasis);
  });

  it('no role carries a value the ladder does not have', () => {
    const rungs = new Set<number>(Object.values(DURATION));
    for (const [role, value] of Object.entries(ENTRANCE_DURATION)) {
      expect(rungs.has(value), `${role}=${value} is not on the ladder`).toBe(true);
    }
  });

  it('the roles still say what they said (no silent retune)', () => {
    expect(ENTRANCE_DURATION).toEqual({ normal: 0.3, slow: 0.5, ambient: 0.8, scenic: 0.6 });
  });
});
