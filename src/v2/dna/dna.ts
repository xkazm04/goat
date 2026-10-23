/**
 * Taste DNA: pure math over a person's ranked lists (docs/v2/TECHNICAL_PACKAGE.md §5).
 * No I/O and no clock reads; callers pass `now`.
 */

interface DnaItem {
  id: string;
  title: string;
  year: number | null;
  traits: string[];
}

/** One list as the math sees it. `ranked[0]` is #1. */
export interface DnaList {
  id: string;
  size: number;
  /** When the list was last worked on, as epoch milliseconds. */
  updatedAt: number;
  ranked: DnaItem[];
}

export interface TraitWeight {
  name: string;
  /** 0 to 1, relative to the strongest trait. */
  weight: number;
}

export interface Dna {
  /** The strongest traits, strongest first. */
  traits: TraitWeight[];
  /** Traits outside the top set, still part of the profile. */
  minor: string[];
  /** The weighted mean year of ranked items, and where it sits from classic (0) to modern (1). */
  era: { meanYear: number; position: number } | null;
  /** Your highest-weighted items, with their weight, as evidence for the persona. */
  topItems: { title: string; year: number | null; weight: number }[];
  listCount: number;
  itemCount: number;
}

const TOP_TRAITS = 8;
const TOP_ITEMS = 5;
/** A list loses half its pull every year, but never more than this much of it. */
const HALF_LIFE_DAYS = 365;
const RECENCY_FLOOR = 0.3;
/** Years that map to the ends of the classic-modern axis. */
const ERA_FROM = 1950;
const ERA_TO = 2025;
/** A list needs this many ranked items to say anything about taste. */
const MIN_RANKED = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/** `(size + 1 - rank) / size` for a 1-based rank: #1 is 1, the last place is 1/size. */
export function rankWeight(rank: number, size: number): number {
  return (size + 1 - rank) / size;
}

export function recencyFactor(updatedAt: number, now: number): number {
  const ageDays = Math.max(0, (now - updatedAt) / DAY_MS);
  return Math.max(RECENCY_FLOOR, Math.pow(0.5, ageDays / HALF_LIFE_DAYS));
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function computeDna(lists: DnaList[], now: number): Dna {
  const used = lists.filter((l) => l.ranked.length >= MIN_RANKED);
  const traitSum = new Map<string, number>();
  const itemWeight = new Map<string, { title: string; year: number | null; weight: number }>();
  let yearSum = 0;
  let yearWeight = 0;
  let itemCount = 0;

  for (const list of used) {
    const decay = recencyFactor(list.updatedAt, now);
    list.ranked.forEach((item, index) => {
      const w = rankWeight(index + 1, Math.max(list.size, list.ranked.length)) * decay;
      itemCount += 1;
      for (const trait of new Set(item.traits)) traitSum.set(trait, (traitSum.get(trait) ?? 0) + w);
      if (item.year !== null) {
        yearSum += item.year * w;
        yearWeight += w;
      }
      const seen = itemWeight.get(item.id);
      itemWeight.set(item.id, { title: item.title, year: item.year, weight: (seen?.weight ?? 0) + w });
    });
  }

  const sorted = [...traitSum].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const max = sorted[0]?.[1] ?? 0;
  const round = (n: number) => Math.round(n * 1000) / 1000;
  const traits = sorted.slice(0, TOP_TRAITS).map(([name, sum]) => ({ name, weight: round(max === 0 ? 0 : sum / max) }));
  const meanYear = yearWeight === 0 ? null : yearSum / yearWeight;

  return {
    traits,
    minor: sorted.slice(TOP_TRAITS).map(([name]) => name),
    era:
      meanYear === null
        ? null
        : { meanYear: Math.round(meanYear), position: round(clamp01((meanYear - ERA_FROM) / (ERA_TO - ERA_FROM))) },
    topItems: [...itemWeight.values()]
      .sort((a, b) => b.weight - a.weight || a.title.localeCompare(b.title))
      .slice(0, TOP_ITEMS)
      .map((i) => ({ ...i, weight: round(i.weight) })),
    listCount: used.length,
    itemCount,
  };
}

/**
 * How well an item's traits match a profile: cosine similarity between the
 * profile's trait weights and the item's traits as a 0/1 vector. 0 to 1.
 * This is the match % we show, so it is ours rather than the model's.
 */
export function matchScore(profile: TraitWeight[], itemTraits: string[]): number {
  const have = new Set(itemTraits);
  if (have.size === 0 || profile.length === 0) return 0;
  let dot = 0;
  let norm = 0;
  for (const t of profile) {
    norm += t.weight * t.weight;
    if (have.has(t.name)) dot += t.weight;
  }
  if (norm === 0) return 0;
  return Math.round((dot / (Math.sqrt(norm) * Math.sqrt(have.size))) * 1000) / 1000;
}

/** A short stable key for "has the taste changed", so a cached persona or recommendation list can be reused. */
export function fingerprint(dna: Dna): string {
  const traits = dna.traits.map((t) => `${t.name}:${Math.round(t.weight * 10)}`).join(',');
  const era = dna.era ? Math.round(dna.era.position * 10) : 'x';
  return `${traits}|${era}|${dna.listCount}`;
}

/** Polygon points for the radar: one spoke per trait, length by weight, starting at the top. */
export function radarPoints(weights: number[], radius: number): { x: number; y: number }[] {
  const n = Math.max(weights.length, 3);
  return weights.map((w, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const r = radius * Math.max(0.08, Math.min(1, w));
    return { x: Math.round(Math.cos(angle) * r * 10) / 10, y: Math.round(Math.sin(angle) * r * 10) / 10 };
  });
}
