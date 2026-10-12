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

/**
 * Canvas: height is greatness. The board is split into tier bands, top to
 * bottom; an item's height comes from its rank, its sideways position is free.
 * All coordinates are fractions of the board (0..1).
 */
export interface CanvasBand {
  index: number;
  tier: string;
  from: number;
  to: number;
  top: number;
  height: number;
}

export interface CanvasPin {
  id: ItemId;
  rank: number;
  x: number;
  y: number;
}

export function canvasBands(doc: ListDoc): CanvasBand[] {
  const spans: { index: number; tier: string; from: number; to: number }[] = [];
  let from = 1;
  doc.tiers.forEach((t, index) => {
    const to = Math.min(t.until, doc.size);
    if (from <= to) spans.push({ index, tier: t.name, from, to });
    from = t.until + 1;
  });
  // A small tier still gets room: band height grows with the square root of its span.
  const weights = spans.map((s) => Math.sqrt(s.to - s.from + 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let top = 0;
  return spans.map((s, i) => {
    const height = weights[i] / total;
    const band = { ...s, top, height };
    top += height;
    return band;
  });
}

/** Spread items that were never placed by hand across the board without stacking them. */
export function defaultX(rank: number): number {
  return 0.1 + ((rank * 0.6180339887) % 1) * 0.8;
}

export function projectCanvas(doc: ListDoc): { bands: CanvasBand[]; pins: CanvasPin[] } {
  const bands = canvasBands(doc);
  const pins = doc.order.map((id, i) => {
    const rank = i + 1;
    const band = bands.find((b) => rank >= b.from && rank <= b.to) ?? bands[bands.length - 1];
    const span = band.to - band.from + 1;
    return { id, rank, x: doc.canvasX[id] ?? defaultX(rank), y: band.top + band.height * ((rank - band.from + 0.5) / span) };
  });
  return { bands, pins };
}

/** The rank index (0-based) a drop at height `y` asks for, against a given band layout. */
export function rankIndexAt(bands: CanvasBand[], y: number): number {
  const clamped = Math.min(Math.max(y, 0), 0.999999);
  const band = bands.find((b) => clamped >= b.top && clamped < b.top + b.height) ?? bands[bands.length - 1];
  const span = band.to - band.from + 1;
  const offset = Math.floor(((clamped - band.top) / band.height) * span);
  return band.from - 1 + Math.min(Math.max(offset, 0), span - 1);
}
