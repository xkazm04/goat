// @vitest-environment jsdom

/**
 * ONE rule, six implementations: "read the user's reduced-motion preference".
 * Two of them wrote `window.matchMedia?.(...)` and four wrote `window.matchMedia(...)`
 * bare behind a `typeof window === "undefined"` guard — which tests the wrong
 * thing, because a window can exist without the API (jsdom ships none; so do
 * some embedded webviews).
 *
 * That divergence was invisible until a decorative surface started reading the
 * preference: two `CollectionErrorBoundary` tests began failing with
 * "window.matchMedia is not a function", in a component that has nothing to do
 * with motion. The crash is a render throw, so in a browser without the API the
 * failure is a blank subtree, not a missing animation.
 *
 * This is a source-level parity gate rather than a behaviour test: it reads the
 * six modules and asserts none of them calls `matchMedia` without either an
 * optional call or a `typeof` check on the same expression. It strips comments
 * first — prose ABOUT the rule must not satisfy the matcher (this file's own
 * header would otherwise pass it).
 *
 * Negative control (recorded 2026-09-05, before the fix): 4 of 6 sites were
 * unguarded and this test reported them by path.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO = path.resolve(__dirname, '..', '..');

const SITES = [
  'src/hooks/use-motion-preference.ts',
  'src/hooks/use-reduced-motion.ts',
  'src/hooks/useMediaQuery.ts',
  'src/app/features/Match/sub_MatchGrid/lib/hapticFeedback.ts',
  'src/lib/animations/motion-presets.ts',
  'src/components/ui/themed-scores/ThemedScoreDisplay.tsx',
];

/** Remove line and block comments so prose about the rule cannot satisfy it. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('matchMedia is never called without a guard for its absence', () => {
  it('every reduced-motion / media-query read tolerates a window without matchMedia', () => {
    const unguarded: string[] = [];

    for (const rel of SITES) {
      const code = stripComments(readFileSync(path.join(REPO, rel), 'utf8'));
      const optionalCalls = (code.match(/matchMedia\?\.\(/g) ?? []).length;
      const allCalls = (code.match(/matchMedia\s*\??\.?\(/g) ?? []).length;
      const bareCalls = allCalls - optionalCalls;
      if (bareCalls === 0) continue;

      // A bare call is fine when the same module tests for the function first.
      const hasTypeofGuard = /typeof\s+window\.matchMedia\s*!==\s*['"]function['"]/.test(code);
      if (!hasTypeofGuard) unguarded.push(rel);
    }

    expect(unguarded).toEqual([]);
  });

  it('the guard actually holds when matchMedia is missing (this environment has none)', async () => {
    expect(typeof window.matchMedia).not.toBe('function');

    const { prefersReducedMotion } = await import('@/lib/animations/motion-presets');
    expect(prefersReducedMotion()).toBe(false);

    const motion = await import('@/hooks/use-motion-preference');
    expect(() => motion.prefersReducedMotion()).not.toThrow();
    expect(() => motion.getCurrentMotionTier()).not.toThrow();
  });
});
