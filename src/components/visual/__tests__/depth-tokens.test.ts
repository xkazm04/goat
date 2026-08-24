/**
 * Runtime tests for the depth-token system.
 *
 * These are the assertions the old `visual-components.test.tsx` could not make:
 * it verified that the exports *type-check*, which is a different claim from
 * their values being right. That file survives as
 * `../visual-exports.type-check.tsx`, honestly named.
 *
 * NEGATIVE CONTROL (test-harness/negative-control-tests): proved able to go red
 * on 2026-08-24 by changing `GLOW_INTENSITY.intense.blur` from '20px' to '32px'
 * in depth-tokens.ts — a coarse mutation nothing normalizes. Reds 2 of these 17
 * tests, both blur-cap assertions. Restored after.
 */

import { describe, expect, it } from 'vitest';

import {
  DEPTH_PRESET,
  ELEVATION,
  ELEVATION_LAYERED,
  GLOW_COLOR,
  GLOW_INTENSITY,
  GLOW_PRESET,
  INSET,
  SURFACE_ELEVATION,
  getGlow,
  withInset,
  type GlowColor,
  type GlowIntensity,
} from '../depth/depth-tokens';

const INTENSITIES = Object.keys(GLOW_INTENSITY) as GlowIntensity[];
const COLORS = Object.keys(GLOW_COLOR) as GlowColor[];

describe('getGlow', () => {
  it('composes blur and colour into a single box-shadow value', () => {
    expect(getGlow('medium', 'gold')).toBe('0 0 15px rgba(250, 204, 21, 0.5)');
  });

  it('is pure — the same arguments give the same string', () => {
    expect(getGlow('intense', 'bronze')).toBe(getGlow('intense', 'bronze'));
  });

  it('varies with both arguments independently', () => {
    expect(getGlow('subtle', 'gold')).not.toBe(getGlow('intense', 'gold'));
    expect(getGlow('subtle', 'gold')).not.toBe(getGlow('subtle', 'silver'));
  });

  it('produces a distinct value for every intensity x colour pair', () => {
    const all = INTENSITIES.flatMap((i) => COLORS.map((c) => getGlow(i, c)));
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('the 20px blur cap', () => {
  // The module header states blur is capped at 20px for drag performance.
  // Until now that was a comment; this is the enforcement.
  it('holds for every glow intensity', () => {
    for (const intensity of INTENSITIES) {
      const blurPx = Number.parseFloat(GLOW_INTENSITY[intensity].blur);
      expect(
        blurPx,
        `GLOW_INTENSITY.${intensity}.blur is ${GLOW_INTENSITY[intensity].blur}, over the documented 20px cap`,
      ).toBeLessThanOrEqual(20);
    }
  });

  it('holds for every generated glow string', () => {
    for (const intensity of INTENSITIES) {
      for (const color of COLORS) {
        const blur = /0 0 (\d+(?:\.\d+)?)px/.exec(getGlow(intensity, color));
        expect(blur).not.toBeNull();
        expect(Number.parseFloat(blur![1])).toBeLessThanOrEqual(20);
      }
    }
  });
});

describe('GLOW_PRESET', () => {
  it('every computed preset equals its getGlow() derivation', () => {
    // The presets exist to avoid runtime computation; if they ever drift from
    // the function they precompute, the two produce different pixels.
    const drift: string[] = [];
    for (const intensity of INTENSITIES) {
      for (const color of COLORS) {
        const key = `${color}${intensity[0].toUpperCase()}${intensity.slice(1)}` as keyof typeof GLOW_PRESET;
        if (!(key in GLOW_PRESET)) {
          drift.push(`missing preset ${key}`);
          continue;
        }
        if (GLOW_PRESET[key] !== getGlow(intensity, color)) {
          drift.push(`${key}: ${GLOW_PRESET[key]} !== ${getGlow(intensity, color)}`);
        }
      }
    }
    expect(drift).toEqual([]);
  });

  it('covers every colour at every intensity', () => {
    // 5 colours x 3 intensities, plus the three CSS-variable brand glows.
    const computed = Object.keys(GLOW_PRESET).filter((k) => !k.startsWith('brand'));
    expect(computed).toHaveLength(COLORS.length * INTENSITIES.length);
  });
});

describe('withInset', () => {
  it('appends the inset to a real elevation', () => {
    expect(withInset(ELEVATION.low)).toBe(`${ELEVATION.low}, ${INSET.glassHighlight}`);
  });

  it('returns the inset alone when there is no elevation to combine with', () => {
    // 'none, inset ...' would be an invalid box-shadow; the guard is load-bearing.
    expect(withInset('none')).toBe(INSET.glassHighlight);
    expect(withInset(ELEVATION.none)).not.toContain('none');
  });

  it('accepts a custom inset', () => {
    expect(withInset(ELEVATION.high, INSET.focusGlow)).toBe(
      `${ELEVATION.high}, ${INSET.focusGlow}`,
    );
  });
});

describe('token maps are complete and non-empty', () => {
  it.each([
    ['ELEVATION', ELEVATION],
    ['ELEVATION_LAYERED', ELEVATION_LAYERED],
    ['SURFACE_ELEVATION', SURFACE_ELEVATION],
    ['INSET', INSET],
  ])('%s has no empty values', (_name, map) => {
    for (const [key, value] of Object.entries(map)) {
      expect(typeof value, `${_name}.${key}`).toBe('string');
      expect((value as string).length, `${_name}.${key}`).toBeGreaterThan(0);
    }
  });

  it('DEPTH_PRESET pairs a real surface with a real shadow', () => {
    const surfaces = new Set<string>(Object.values(SURFACE_ELEVATION));
    for (const [name, preset] of Object.entries(DEPTH_PRESET)) {
      expect(surfaces.has(preset.surface), `${name}.surface is not a SURFACE_ELEVATION value`).toBe(
        true,
      );
      expect(preset.shadow.length, `${name}.shadow`).toBeGreaterThan(0);
    }
  });

  it('GLOW_COLOR channels are all in 0-255', () => {
    for (const [name, { r, g, b }] of Object.entries(GLOW_COLOR)) {
      for (const [channel, value] of Object.entries({ r, g, b })) {
        expect(value, `GLOW_COLOR.${name}.${channel}`).toBeGreaterThanOrEqual(0);
        expect(value, `GLOW_COLOR.${name}.${channel}`).toBeLessThanOrEqual(255);
      }
    }
  });
});
