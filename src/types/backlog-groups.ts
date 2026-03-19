// Backlog Groups and Items Types
//
// NAME vs TITLE CONTRACT:
//   `name`  — canonical identifier, always set by the API / database.
//   `title` — display label; defaults to `name` when not provided separately.
//
// When resolving a display string, always use `extractTitle()` from
// `@/lib/items/core-utils` which applies the canonical fallback: name > title.
// Do NOT write inline fallback chains (e.g. `item.title || item.name`).
//
// Intermediate/display-only types (GridItemType, TransferableItem,
// CollectionItem) carry a single `title` field that is the *resolved*
// display value produced by `extractTitle()`.

export interface BacklogItem {
  id: string;
  /** Canonical identifier — the source-of-truth label from the API. */
  name: string;
  /** Display label — usually identical to `name`; kept for legacy compat. */
  title: string;
  description?: string;
  category: string;
  subcategory?: string;
  item_year?: number;
  item_year_to?: number;
  image_url?: string;
  created_at: string;
  updated_at?: string;
  tags?: string[];

  // Media URLs (for Music category)
  youtube_url?: string;
  youtube_id?: string;

  // UI state properties
  matched?: boolean;
  matchedWith?: string;
  /**
   * Whether this item is currently placed in the match grid.
   *
   * Set by `backlogStore.markItemAsUsed()` (in `stores/backlog/actions-utils.ts`)
   * during grid sync. Never returned by the API — this is purely client-side UI state.
   * Defaults to `false` when undefined.
   */
  used?: boolean;
}

export interface BacklogGroup {
  id: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  image_url?: string;
  item_count: number;
  created_at: string;
  updated_at?: string;
  items: BacklogItem[];
  
  // UI state properties
  isOpen?: boolean;
  isExpanded?: boolean;
}

export interface BacklogGroupCreate {
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  image_url?: string;
}

export interface BacklogItemCreate {
  /** Canonical identifier — required. */
  name: string;
  /** Display label — optional; defaults to `name` at read-time via extractTitle(). */
  title?: string;
  description?: string;
  category: string;
  subcategory?: string;
  item_year?: number;
  item_year_to?: number;
  image_url?: string;
  tags?: string[];
}

export interface BacklogGroupUpdate {
  name?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  image_url?: string;
}

export interface BacklogItemUpdate {
  name?: string;
  title?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  item_year?: number;
  item_year_to?: number;
  image_url?: string;
  tags?: string[];
}

export interface BacklogSearchParams {
  category?: string;
  subcategory?: string;
  search?: string;
  limit?: number;
  offset?: number;
}