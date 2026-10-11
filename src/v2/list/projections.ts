import type { ItemId, ListDoc } from './types';

/** The tier a 1-based rank falls in. Ranks past the last tier take the last one. */
export function tierOf(doc: ListDoc, rank: number): string {
  for (const t of doc.tiers) if (rank <= t.until) return t.name;
  return doc.tiers[doc.tiers.length - 1]?.name ?? '';
}

interface Slot {
  rank: number;
  id: ItemId | null;
}

function slots(doc: ListDoc): Slot[] {
  return Array.from({ length: doc.size }, (_, i) => ({ rank: i + 1, id: doc.order[i] ?? null }));
}

/** Spread: one editorial column. Entries past #10 are compact rows. */
export interface SpreadRow extends Slot {
  tier: string;
  /** First row of its tier, so the column can print a tier divider. */
  tierStart: boolean;
  compact: boolean;
}

export function projectSpread(doc: ListDoc): SpreadRow[] {
  return slots(doc).map((s, i, all) => {
    const tier = tierOf(doc, s.rank);
    return { ...s, tier, tierStart: i === 0 || tierOf(doc, all[i - 1].rank) !== tier, compact: s.rank > 10 };
  });
}

/** Mosaic: a poster wall where tile size decays with rank. */
export type TileScale = 'hero' | 'large' | 'medium' | 'small' | 'tiny';

export function scaleOf(rank: number): TileScale {
  if (rank === 1) return 'hero';
  if (rank <= 3) return 'large';
  if (rank <= 10) return 'medium';
  if (rank <= 25) return 'small';
  return 'tiny';
}

export interface MosaicBand {
  tier: string;
  from: number;
  to: number;
  tiles: (Slot & { scale: TileScale })[];
  /** Open ranks after the last ranked item, shown as one condensed row, not a wall of blanks. */
  open: number;
}

export function projectMosaic(doc: ListDoc): MosaicBand[] {
  const bands: MosaicBand[] = [];
  const lastFilled = doc.order.length;
  for (const s of slots(doc)) {
    const tier = tierOf(doc, s.rank);
    let band = bands[bands.length - 1];
    if (!band || band.tier !== tier) {
      band = { tier, from: s.rank, to: s.rank, tiles: [], open: 0 };
      bands.push(band);
    }
    band.to = s.rank;
    // The first open rank stays a real slot (a drop target); the rest condense.
    if (s.id === null && s.rank > lastFilled + 1) band.open++;
    else band.tiles.push({ ...s, scale: scaleOf(s.rank) });
  }
  return bands;
}
