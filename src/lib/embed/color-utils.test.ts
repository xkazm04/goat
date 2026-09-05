/**
 * Tests for ColorUtils: what the validator admits, the parser must read.
 *
 * Registry: _laws one-validation-door (a value that passed the door is a value
 * every consumer behind the door can handle).
 *
 * `ThemeCustomizer.validateColors` accepts `#abc` (its regex has the 3-digit
 * branch); `ColorUtils.hexToRgb` had only the 6-digit branch and returned null
 * for the same string. Every derived value then silently degraded: adjustLightness
 * returned the input unchanged (no hover state), getRelativeLuminance returned 0
 * so `isDark('#fff')` was TRUE, and getContrastRatio treated the colour as pure
 * black. A palette the validator blessed rendered with the wrong hover, the wrong
 * shadow, and a contrast figure that was fiction.
 *
 * NEGATIVE CONTROL (test-harness/negative-control-tests), run 2026-09-05
 * against the 6-digit-only parser: reds 3 of these 5 tests (measured).
 */

import { describe, expect, it } from 'vitest';

import { ColorUtils, ThemeCustomizer } from './ThemeCustomizer';

describe('ColorUtils.hexToRgb — parses everything validateColors admits', () => {
  it('reads 6-digit hex with or without the hash', () => {
    expect(ColorUtils.hexToRgb('#ff8000')).toEqual({ r: 255, g: 128, b: 0 });
    expect(ColorUtils.hexToRgb('FF8000')).toEqual({ r: 255, g: 128, b: 0 });
  });

  it('reads 3-digit shorthand by doubling each digit', () => {
    expect(ColorUtils.hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(ColorUtils.hexToRgb('#f80')).toEqual({ r: 255, g: 136, b: 0 });
  });

  it('agrees with validateColors on what is a colour', () => {
    for (const c of ['#fff', '#FFF', '#abcdef', '#000']) {
      expect(ThemeCustomizer.validateColors({ accent: c })).toBe(true);
      expect(ColorUtils.hexToRgb(c)).not.toBeNull();
    }
    for (const c of ['red', '#ffff', '#12345', '']) {
      expect(ThemeCustomizer.validateColors({ accent: c })).toBe(false);
      expect(ColorUtils.hexToRgb(c)).toBeNull();
    }
  });

  it('derived values are the same for #fff and #ffffff', () => {
    expect(ColorUtils.isDark('#fff')).toBe(ColorUtils.isDark('#ffffff'));
    expect(ColorUtils.getContrastRatio('#fff', '#000')).toBeCloseTo(21, 1);
    expect(ColorUtils.adjustLightness('#fff', -10)).toBe(ColorUtils.adjustLightness('#ffffff', -10));
  });

  it('still returns null for garbage rather than throwing', () => {
    expect(ColorUtils.hexToRgb('not a colour')).toBeNull();
    expect(ColorUtils.adjustLightness('not a colour', 5)).toBe('not a colour');
  });
});
