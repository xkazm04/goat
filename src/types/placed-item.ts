/**
 * Unified Placed Item Types
 *
 * Single source of truth for items occupying positions in rankings.
 * Replaces the fragmented GridItemType / RankedItem / TransferableItem pattern.
 *
 * - BaseItem: Core item data (what TransferableItem was)
 * - PlacedItem: An item placed at a position in any ranking context
 */

// ============================================================================
// BaseItem — Core item data without positional context
// ============================================================================

/**
 * Core item data that can be displayed, dragged, or serialized.
 * This is the "payload" inside a PlacedItem — the actual content.
 *
 * Replaces `TransferableItem` from the DnD transfer protocol.
 */
export interface BaseItem {
  /** Unique identifier (original backlog/collection item ID) */
  id: string;

  /** Human-readable title */
  title: string;

  /** Optional description */
  description?: string;

  /** Optional image URL */
  image_url?: string | null;

  /** Optional tags for categorization */
  tags?: string[];

  /** Item category */
  category?: string;

  /** Item subcategory */
  subcategory?: string;

  /** Year (e.g., release year) */
  item_year?: number;

  /** Year range end */
  item_year_to?: number;

  /** Custom metadata (extensible) */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// PlacedItem — An item occupying a ranked position
// ============================================================================

/** Where the item was placed from */
export type PlacedItemSource = 'backlog' | 'grid' | 'tier' | 'bracket';

/**
 * Context about how/why an item occupies a position.
 */
export interface PlacedItemContext {
  /** Where the item originated from */
  source: PlacedItemSource;

  /** Whether this slot has an item placed in it */
  matched: boolean;

  /** Extensible metadata (assignedAt, assignedBy, notes, etc.) */
  metadata?: Record<string, unknown>;
}

/**
 * A single item occupying a position in a ranking.
 *
 * This is the unified envelope that replaces:
 * - GridItemType (types/match.ts)
 * - RankedItem (types/ranking.ts)
 *
 * The DnD system serializes `item: BaseItem` directly (replaces TransferableItem).
 */
export interface PlacedItem {
  /**
   * The SLOT ADDRESS (e.g. "grid-0", "rank-0") — NOT an item identity.
   *
   * This field is a function of `position` and is rewritten whenever the slot's
   * occupant changes, so it identifies WHERE, never WHAT. The item's durable
   * identity is `item.id`, minted by the system of record and unchanged by any
   * move.
   *
   * The two live side by side on the same object, which makes
   * `placed.item?.id || placed.id` look like a harmless fallback. It is not: it
   * yields an "item id" that is a function of position, and a consumer that
   * keys on it re-keys the item every time it moves. A slot with no item has no
   * item identity, and that is the honest answer. Documented here 2026-08-25
   * after exactly that fallback was found in the drag plans' result metadata
   * (registry drag-drop/payload-and-identity).
   */
  id: string;

  /** 0-based position in the ranking */
  position: number;

  /** The item data, or null if this is an empty slot */
  item: BaseItem | null;

  /** Context about this placement */
  context: PlacedItemContext;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an empty PlacedItem slot at a position
 */
export function createEmptyPlacedItem(
  position: number,
  idPrefix = 'grid'
): PlacedItem {
  return {
    id: `${idPrefix}-${position}`,
    position,
    item: null,
    context: {
      source: 'grid',
      matched: false,
    },
  };
}

/**
 * Create a PlacedItem with an item assigned
 */
export function createPlacedItem(
  position: number,
  item: BaseItem,
  source: PlacedItemSource = 'grid',
  metadata?: Record<string, unknown>,
  idPrefix = 'grid'
): PlacedItem {
  return {
    id: `${idPrefix}-${position}`,
    position,
    item,
    context: {
      source,
      matched: true,
      metadata,
    },
  };
}

/**
 * Create an empty ranking of PlacedItems
 */
export function createEmptyPlacedItemArray(
  size: number,
  idPrefix = 'grid'
): PlacedItem[] {
  return Array.from({ length: size }, (_, i) =>
    createEmptyPlacedItem(i, idPrefix)
  );
}

// ============================================================================
// Accessors — Convenience helpers for common access patterns
// ============================================================================

/**
 * Get the item ID from a PlacedItem (null if empty slot)
 */
export function getPlacedItemId(placed: PlacedItem): string | null {
  return placed.item?.id ?? null;
}

/**
 * Check if a PlacedItem has an item assigned
 */
export function isPlacedItemFilled(placed: PlacedItem): boolean {
  return placed.context.matched && placed.item !== null;
}
