import { describe, expect, it } from 'vitest';

import { MOTIFS, artOrFallback, fallbackArt } from './art';

describe('fallbackArt', () => {
  it('is stable for the same title, whatever its case or padding', () => {
    expect(fallbackArt('Disco Elysium')).toEqual(fallbackArt('  disco elysium '));
  });

  it('gives valid, distinct hues and a known motif', () => {
    for (const title of ['Elden Ring', 'Pizza', 'Abbey Road', 'Gattaca', 'x']) {
      const { hues, motif } = fallbackArt(title);
      for (const h of hues) expect(h >= 0 && h < 360).toBe(true);
      const gap = Math.abs(hues[0] - hues[1]);
      expect(Math.min(gap, 360 - gap)).toBeGreaterThanOrEqual(60);
      expect(MOTIFS).toContain(motif);
    }
  });
});

describe('artOrFallback', () => {
  it('keeps well-formed stored art', () => {
    expect(artOrFallback({ hues: [10, 200], motif: 'moon' }, 'x')).toEqual({ hues: [10, 200], motif: 'moon' });
  });

  it('replaces malformed art with the fallback', () => {
    for (const bad of [null, 'red', { hues: [10], motif: 'moon' }, { hues: [10, 400], motif: 'moon' }, { hues: [1, 2], motif: 'cube' }]) {
      expect(artOrFallback(bad, 'Elden Ring')).toEqual(fallbackArt('Elden Ring'));
    }
  });
});
