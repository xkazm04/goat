import type { ArtDirection } from '@/v2/covers/art';

export type ItemId = string;

/** One rankable thing, as the editor needs it. */
export interface ListItem {
  id: ItemId;
  title: string;
  year: number | null;
  creator: string | null;
  /** Real artwork when enrichment found one; the generative cover is the fallback. */
  imageUrl: string | null;
  art: ArtDirection;
  traits: string[];
}

export const LIST_SIZES = [10, 25, 50] as const;
export type ListSize = (typeof LIST_SIZES)[number];

/** A tier covers ranks up to and including `until` (1-based). */
export interface Tier {
  name: string;
  until: number;
}

/**
 * The one list document every mode projects (docs/v2/TECHNICAL_PACKAGE.md
 * §2.1). `order[0]` is #1. Every item is in exactly one of `order` or `pool`.
 */
export interface ListDoc {
  id: string;
  title: string;
  topic: string;
  size: ListSize;
  order: ItemId[];
  pool: ItemId[];
  tiers: Tier[];
  notes: Record<ItemId, string>;
  /** Canvas only: where an item sits sideways, 0 (left) to 1 (right). Height comes from rank. */
  canvasX: Record<ItemId, number>;
  stagePreset: StagePreset;
}

export const STAGE_PRESETS = ['podium', 'rushmore', 'throne'] as const;
export type StagePreset = (typeof STAGE_PRESETS)[number];

export const DEFAULT_TIERS: Tier[] = [
  { name: 'GOAT', until: 3 },
  { name: 'Essential', until: 10 },
  { name: 'Great', until: 25 },
  { name: 'Fine', until: 50 },
];

/** Every edit is one of these. Modes never change a ListDoc any other way. */
export type Command =
  /**
   * Put an item at rank index `at` (0-based), from the pool or from elsewhere
   * in the order. Canvas also passes `x`, so a drop is one undo step.
   */
  | { type: 'place'; id: ItemId; at: number; x?: number }
  /** Re-order the top of the ranking: `ids` must be a permutation of the current top `ids.length`. */
  | { type: 'reorder'; ids: ItemId[] }
  /** Send a ranked item back to the front of the pool. */
  | { type: 'unrank'; id: ItemId }
  | { type: 'setNote'; id: ItemId; text: string }
  | { type: 'setTitle'; title: string }
  | { type: 'resize'; size: ListSize }
  /** Move the cut after tier `index` so that tier ends at rank `until`. The last tier's end is fixed. */
  | { type: 'setTierCut'; index: number; until: number }
  | { type: 'renameTier'; index: number; name: string }
  | { type: 'setX'; id: ItemId; x: number }
  | { type: 'setPreset'; preset: StagePreset }
  /** New items (a gap spotter's suggestions) join the front of the pool. Ids already in the list are ignored. */
  | { type: 'addToPool'; ids: ItemId[] };
