/**
 * The list preview's completion percentage.
 *
 * One quantity — "how full is this list" — is computed twice in this context.
 * `RankingProgressIndicator.tsx:48-51` guards `total === 0`; the preview
 * popover's `Math.round((data.itemCount / data.size) * 100)` guarded nothing,
 * and the two inputs are independent: `itemCount` is `items.length`
 * (use-list-preview.ts:80) while `size` is the list's DECLARED size, straight
 * from the API (use-list-preview.ts:79). So a list with no declared size paints
 * the literal string `NaN%` and a `width: NaN%` bar, and a list holding more
 * items than it declares paints a figure above 100 beside a bar that has been
 * visually full since 100.
 *
 * Negative control (recorded 2026-09-05, before the fix): the four cases below
 * yielded NaN, NaN, 120 and -50 against the unguarded expression.
 */
import { describe, expect, it } from 'vitest';

import { completionPercent } from './ListPreviewPopover';

describe('completionPercent', () => {
  it('reports 0 rather than NaN for a list with no declared size', () => {
    expect(completionPercent(3, 0)).toBe(0);
  });

  it('reports 0 rather than NaN when either input is not a number', () => {
    expect(completionPercent(3, undefined as unknown as number)).toBe(0);
    expect(completionPercent(undefined as unknown as number, 10)).toBe(0);
    expect(completionPercent(3, NaN)).toBe(0);
  });

  it('clamps a list holding more items than it declares to 100', () => {
    expect(completionPercent(12, 10)).toBe(100);
  });

  it('clamps a negative count to 0', () => {
    expect(completionPercent(-5, 10)).toBe(0);
  });

  it('is unchanged for ordinary values', () => {
    expect(completionPercent(0, 10)).toBe(0);
    expect(completionPercent(3, 10)).toBe(30);
    expect(completionPercent(7, 20)).toBe(35);
    expect(completionPercent(10, 10)).toBe(100);
  });

  it('agrees with RankingProgressIndicator on the shared zero-total rule', () => {
    // RankingProgressIndicator: `if (total === 0) return 0;`
    expect(completionPercent(0, 0)).toBe(0);
    expect(completionPercent(9, 0)).toBe(0);
  });
});
