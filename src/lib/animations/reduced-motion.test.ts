/**
 * Tests for the non-hook reduced-motion read: ONE implementation, three entry
 * points, one answer.
 *
 * Registry: motion/reduced-motion-mechanics (the preference is honored in one
 * place); _laws one-authority-per-vocabulary.
 *
 * Before 2026-09-05 `prefersReducedMotion` was defined three times —
 * motion-presets.ts, micro-interactions.ts, sharing.ts — and the copy in
 * sharing.ts called `window.matchMedia(...)` without the optional-call guard
 * the other two carry, so in any environment that has a `window` but no
 * `matchMedia` (jsdom before 20, some embedded WebViews, test runners) the
 * sharing surfaces threw where the rest of the app quietly animated.
 *
 * NEGATIVE CONTROL (test-harness/negative-control-tests), run 2026-09-05
 * against the three separate definitions: reds 2 of these 4 tests (measured) —
 * the no-matchMedia case for sharing.ts and the same-function identity check.
 *
 * Why `./micro-interactions` is NOT imported here: knip counts that module as
 * an unreachable FILE (its two importers are themselves unreachable), and a
 * test import would re-file its 34 dead exports under `knip:unusedExports`
 * instead — the same debt, moved between two ratchet buckets. Its re-export is
 * `export { prefersReducedMotion }` straight from motion-presets, identity by
 * construction; the check below covers the copy that actually diverged.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { prefersReducedMotion as fromPresets } from './motion-presets';
import { prefersReducedMotion as fromSharing } from './sharing';

afterEach(() => vi.unstubAllGlobals());

describe('prefersReducedMotion — one door', () => {
  it('is the same function from every module that exports it', () => {
    expect(fromSharing).toBe(fromPresets);
  });

  it('is false on the server (no window)', () => {
    expect(fromPresets()).toBe(false);
    expect(fromSharing()).toBe(false);
  });

  it('is false, not a throw, when window exists but matchMedia does not', () => {
    vi.stubGlobal('window', {});
    expect(() => fromSharing()).not.toThrow();
    expect(fromSharing()).toBe(false);
    expect(fromPresets()).toBe(false);
  });

  it('reads the media query when it is there', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
    expect(fromPresets()).toBe(true);
    expect(fromSharing()).toBe(true);
  });
});
