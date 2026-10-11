import { describe, expect, it } from 'vitest';

import { demoDoc } from './fixtures';
import { projectMosaic, projectSpread, scaleOf, tierOf } from './projections';

describe('tierOf', () => {
  it('maps ranks to the default tiers', () => {
    const d = demoDoc();
    expect([1, 3, 4, 10, 11, 25, 26, 50].map((r) => tierOf(d, r))).toEqual([
      'GOAT', 'GOAT', 'Essential', 'Essential', 'Great', 'Great', 'Fine', 'Fine',
    ]);
  });
});

describe('projectSpread', () => {
  it('has one row per rank, with tier starts and compact rows after #10', () => {
    const rows = projectSpread(demoDoc());
    expect(rows).toHaveLength(25);
    expect(rows[0]).toMatchObject({ rank: 1, id: 'er', tier: 'GOAT', tierStart: true, compact: false });
    expect(rows.filter((r) => r.tierStart).map((r) => r.rank)).toEqual([1, 4, 11]);
    expect(rows[10].compact).toBe(true);
    expect(rows[12].id).toBeNull();
  });
});

describe('projectMosaic', () => {
  it('groups ranks into tier bands with decaying tile sizes', () => {
    const bands = projectMosaic(demoDoc());
    expect(bands.map((b) => [b.tier, b.from, b.to])).toEqual([
      ['GOAT', 1, 3],
      ['Essential', 4, 10],
      ['Great', 11, 25],
    ]);
    expect(bands[0].tiles.map((t) => t.scale)).toEqual(['hero', 'large', 'large']);
  });

  it('keeps the first open rank as a slot and condenses the rest', () => {
    const great = projectMosaic(demoDoc())[2];
    // 12 ranked: ranks 11–12 filled, 13 is the next open slot, 14–25 condense.
    expect(great.tiles.map((t) => t.rank)).toEqual([11, 12, 13]);
    expect(great.tiles[2].id).toBeNull();
    expect(great.open).toBe(12);
  });

  it('scales by rank', () => {
    expect([1, 2, 4, 11, 30].map(scaleOf)).toEqual(['hero', 'large', 'medium', 'small', 'tiny']);
  });
});
