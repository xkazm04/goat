/**
 * Tests for the widget theme presets: every text role clears WCAG AA against
 * every surface it is painted on.
 *
 * Registry: design-tokens golden path ("the contrast floor is in the
 * contract" — a foreground role is defined AGAINST the surfaces it may appear
 * on, and the floor is checked by a gate that reads the actual theme
 * definitions); public-verdict-badge (the widget is read on pages we do not
 * control, at 12–14px).
 *
 * The widget CSS (ThemeCustomizer.generateWidgetCSS and the embed route) paints
 * `accent` as TEXT — the rank number and the footer CTA — on both `background`
 * and `surface`, and `textSecondary` as 12px subtitles on both. Measured
 * 2026-09-05 with the repo's own ColorUtils.getContrastRatio:
 *   light  accent on background 3.83 · on surface 3.63 · textSecondary on surface 4.45
 *   dark   accent on background 4.46 · on surface 4.15
 * Five pairings under 4.5:1; the light accent was under 4.5 on everything.
 *
 * NEGATIVE CONTROL (test-harness/negative-control-tests), run 2026-09-05
 * against the pre-fix presets: reds 3 of these 3 tests (measured) — the third
 * because it seeds one bad role onto the light preset and expects that to be
 * the ONLY failure, which the pre-fix light preset could not satisfy.
 */

import { describe, expect, it } from 'vitest';

import { ColorUtils } from './ThemeCustomizer';
import { THEME_PRESETS, type CustomThemeColors } from './types';

const AA_TEXT = 4.5;
const TEXT_ROLES = ['text', 'textSecondary', 'accent'] as const;
const SURFACES = ['background', 'surface'] as const;

function failures(p: CustomThemeColors): string[] {
  const out: string[] = [];
  for (const role of TEXT_ROLES) {
    for (const bg of SURFACES) {
      const r = ColorUtils.getContrastRatio(p[role], p[bg]);
      if (r < AA_TEXT) out.push(`${role} on ${bg} = ${r.toFixed(2)}`);
    }
  }
  return out;
}

describe('THEME_PRESETS — the contrast floor is part of the token contract', () => {
  it('light: every text role ≥ 4.5:1 on background and surface', () => {
    expect(failures(THEME_PRESETS.light)).toEqual([]);
  });

  it('dark: every text role ≥ 4.5:1 on background and surface', () => {
    expect(failures(THEME_PRESETS.dark)).toEqual([]);
  });

  it('the checker itself sees a failing palette (the gate can go red)', () => {
    const bad: CustomThemeColors = { ...THEME_PRESETS.light, accent: '#ffc107' };
    expect(failures(bad)).toEqual(['accent on background = 1.63', 'accent on surface = 1.55']);
  });
});
