// Match System Types

import type { PlacedItem } from './placed-item';

/**
 * GridItemType is now a type alias for PlacedItem.
 *
 * Previously a flat interface with item properties at the top level.
 * Now uses the unified PlacedItem envelope: { position, item: BaseItem | null, context }.
 *
 * Migration guide:
 *   Old: gridItem.title        → gridItem.item?.title ?? ''
 *   Old: gridItem.matched      → gridItem.context.matched
 *   Old: gridItem.backlogItemId → gridItem.item?.id
 *   Old: gridItem.image_url    → gridItem.item?.image_url
 *   Old: gridItem.tags         → gridItem.item?.tags
 */
export type GridItemType = PlacedItem;

// Corrected 2026-09-05: MatchSession, DragItem, DropResult and MatchAnalytics
// were declared here with zero importers (knip + grep), and BaseItem /
// PlacedItem were re-exported for a convenience nobody used — the live
// import path for both is '@/types/placed-item'. Removed; what stays is what
// the 42 importing modules actually reach for.

export interface BacklogItemType {
  id: string;
  title: string;
  name?: string;
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
  used?: boolean;
}

export interface BacklogGroupType {
  id: string;
  name: string;
  title?: string; // Legacy support
  description?: string;
  category: string;
  subcategory?: string;
  image_url?: string;
  item_count: number;
  created_at: string;
  updated_at?: string;
  items: BacklogItemType[];

  // UI state properties
  isOpen?: boolean;
  isExpanded?: boolean;
}

export interface ComparisonItem {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  tags?: string[];
  category: string;
  subcategory?: string;
  item_year?: number;
  selected?: boolean;
}
