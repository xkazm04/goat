import { describe, expect, it } from 'vitest';

import { assertIntRange } from '@/lib/errors/api-error-handler';
import { GRID_LIMITS } from '@/lib/grid/constants';

import { createListIntent, validateListIntent } from './list-intent';

/**
 * ONE rule — "a list size is a whole number inside [MIN_SIZE, MAX_SIZE]" — has
 * two implementations on two sides of the network: `validateListIntent` here on
 * the client, and `assertIntRange` on every list/blueprint POST route
 * (src/app/api/lists/route.ts:98, blueprints/route.ts:136,
 * blueprints/publish/route.ts:40). Only the server one checked integrality, so
 * a NaN size — the value `showcasePresetToIntent` produces from a hierarchy
 * string it cannot parse — was accepted by the client and rejected by the
 * server with a 400. `<` and `>` are BOTH false for NaN, which is why neither
 * bound caught it.
 *
 * This test pins the pair rather than either side: every sample is put through
 * both validators and their verdicts must agree.
 */

const SAMPLES: Array<{ size: number; label: string }> = [
  { size: Number.NaN, label: 'NaN (unparseable hierarchy)' },
  { size: 10.5, label: 'a fraction' },
  { size: Number.POSITIVE_INFINITY, label: 'Infinity' },
  { size: GRID_LIMITS.MIN_SIZE - 1, label: 'below the minimum' },
  { size: GRID_LIMITS.MAX_SIZE + 1, label: 'above the maximum' },
  { size: GRID_LIMITS.MIN_SIZE, label: 'the minimum' },
  { size: GRID_LIMITS.DEFAULT_SIZE, label: 'the default' },
  { size: GRID_LIMITS.MAX_SIZE, label: 'the maximum' },
];

function serverAccepts(size: number): boolean {
  try {
    assertIntRange(size, 'size', GRID_LIMITS.MIN_SIZE, GRID_LIMITS.MAX_SIZE);
    return true;
  } catch {
    return false;
  }
}

describe('validateListIntent — size agrees with the server it submits to', () => {
  it.each(SAMPLES)('$label ($size): client and server reach the same verdict', ({ size }) => {
    const clientAccepts = validateListIntent(createListIntent({ size })).isValid;
    expect(clientAccepts).toBe(serverAccepts(size));
  });

  it('rejects a non-integer size with its own message, not the range message', () => {
    const result = validateListIntent(createListIntent({ size: Number.NaN }));
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Size must be a whole number');
  });

  it('still reports the range message for an out-of-range whole number', () => {
    const result = validateListIntent(createListIntent({ size: GRID_LIMITS.MAX_SIZE + 1 }));
    expect(result.errors).toContain(
      `Size must be between ${GRID_LIMITS.MIN_SIZE} and ${GRID_LIMITS.MAX_SIZE}`
    );
  });

  it('emits exactly one size error per bad size, so the merged set in validateListIntentComplete stays one line', () => {
    for (const { size } of SAMPLES) {
      const errors = validateListIntent(createListIntent({ size })).errors;
      expect(errors.filter((e) => e.toLowerCase().startsWith('size ')).length).toBeLessThanOrEqual(1);
    }
  });
});
