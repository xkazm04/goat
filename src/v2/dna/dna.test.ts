import { describe, expect, it } from 'vitest';

import { computeDna, fingerprint, matchScore, radarPoints, rankWeight, recencyFactor, type DnaList } from './dna';

const NOW = Date.UTC(2026, 9, 12);
const DAY = 24 * 60 * 60 * 1000;

const item = (id: string, traits: string[], year: number | null = 2000) => ({ id, title: id.toUpperCase(), year, traits });

describe('rank weight and recency', () => {
  it('weights #1 at 1 and the last place at 1/size', () => {
    expect(rankWeight(1, 10)).toBe(1);
    expect(rankWeight(10, 10)).toBeCloseTo(0.1);
    expect(rankWeight(5, 25)).toBeCloseTo(21 / 25);
  });

  it('halves a list every year and never drops below the floor', () => {
    expect(recencyFactor(NOW, NOW)).toBe(1);
    expect(recencyFactor(NOW - 365 * DAY, NOW)).toBeCloseTo(0.5);
    expect(recencyFactor(NOW - 10 * 365 * DAY, NOW)).toBe(0.3);
    expect(recencyFactor(NOW + DAY, NOW)).toBe(1);
  });
});

describe('computeDna', () => {
  const list = (ranked: ReturnType<typeof item>[], over: Partial<DnaList> = {}): DnaList => ({
    id: 'l1',
    size: 10,
    updatedAt: NOW,
    ranked,
    ...over,
  });

  it('puts the trait of the top-ranked items first and normalises to the strongest', () => {
    const dna = computeDna(
      [list([item('a', ['epic']), item('b', ['epic', 'quiet']), item('c', ['quiet']), item('d', ['cozy'])])],
      NOW,
    );
    expect(dna.traits.map((t) => t.name)).toEqual(['epic', 'quiet', 'cozy']);
    expect(dna.traits[0].weight).toBe(1);
    expect(dna.traits[1].weight).toBeLessThan(1);
    expect(dna.listCount).toBe(1);
    expect(dna.itemCount).toBe(4);
  });

  it('counts a trait once per item and ignores lists with too few ranked items', () => {
    const thin = list([item('x', ['solo']), item('y', ['solo'])], { id: 'thin' });
    const dna = computeDna([thin, list([item('a', ['epic', 'epic']), item('b', ['epic']), item('c', ['epic'])])], NOW);
    expect(dna.listCount).toBe(1);
    expect(dna.traits.map((t) => t.name)).toEqual(['epic']);
  });

  it('lets a newer list outweigh an older one', () => {
    const old = list([item('o1', ['retro']), item('o2', ['retro']), item('o3', ['retro'])], { id: 'old', updatedAt: NOW - 2 * 365 * DAY });
    const fresh = list([item('n1', ['modern']), item('n2', ['modern']), item('n3', ['modern'])], { id: 'new' });
    expect(computeDna([old, fresh], NOW).traits[0].name).toBe('modern');
  });

  it('keeps the top 8 traits and lists the rest as minor', () => {
    const traits = Array.from({ length: 10 }, (_, i) => `t${i}`);
    const dna = computeDna([list([item('a', traits), item('b', traits.slice(0, 5)), item('c', ['t0'])])], NOW);
    expect(dna.traits).toHaveLength(8);
    expect(dna.minor).toHaveLength(2);
  });

  it('places the weighted mean year on the classic to modern axis', () => {
    const classic = computeDna([list([item('a', ['x'], 1960), item('b', ['x'], 1960), item('c', ['x'], 1960)])], NOW);
    const modern = computeDna([list([item('a', ['x'], 2024), item('b', ['x'], 2024), item('c', ['x'], 2024)])], NOW);
    expect(classic.era?.meanYear).toBe(1960);
    expect(classic.era!.position).toBeLessThan(0.2);
    expect(modern.era!.position).toBeGreaterThan(0.9);
    expect(computeDna([list([item('a', ['x'], null), item('b', ['x'], null), item('c', ['x'], null)])], NOW).era).toBeNull();
  });

  it('is empty, not an error, with no usable lists', () => {
    const dna = computeDna([], NOW);
    expect(dna).toMatchObject({ traits: [], minor: [], era: null, topItems: [], listCount: 0, itemCount: 0 });
  });

  it('names the highest-weighted items as evidence', () => {
    const dna = computeDna([list([item('a', ['x']), item('b', ['x']), item('c', ['x'])])], NOW);
    expect(dna.topItems.map((t) => t.title)).toEqual(['A', 'B', 'C']);
  });
});

describe('matchScore and fingerprint', () => {
  const profile = [
    { name: 'epic', weight: 1 },
    { name: 'quiet', weight: 0.5 },
  ];

  it('scores overlap with the strongest traits highest, and zero for none', () => {
    expect(matchScore(profile, ['epic'])).toBeGreaterThan(matchScore(profile, ['quiet']));
    expect(matchScore(profile, ['loud'])).toBe(0);
    expect(matchScore(profile, [])).toBe(0);
    expect(matchScore([], ['epic'])).toBe(0);
  });

  it('never exceeds 1', () => {
    expect(matchScore(profile, ['epic', 'quiet'])).toBeLessThanOrEqual(1);
  });

  it('changes only when the taste does', () => {
    const a = computeDna([{ id: 'l', size: 10, updatedAt: NOW, ranked: [item('a', ['epic']), item('b', ['epic']), item('c', ['quiet'])] }], NOW);
    const later = computeDna([{ id: 'l', size: 10, updatedAt: NOW, ranked: [item('a', ['epic']), item('b', ['epic']), item('c', ['quiet'])] }], NOW + DAY);
    expect(fingerprint(a)).toBe(fingerprint(later));
  });
});

describe('radarPoints', () => {
  it('starts at the top, scales by weight and keeps a minimum spoke', () => {
    const [top, right] = radarPoints([1, 0.5, 0, 1], 100);
    expect(top).toEqual({ x: 0, y: -100 });
    expect(right.x).toBeCloseTo(50, 0);
    expect(radarPoints([0], 100)[0].y).toBeCloseTo(-8, 0);
  });
});
