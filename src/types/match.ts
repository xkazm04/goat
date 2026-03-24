// Match System Types

import type { BaseItem, PlacedItem } from './placed-item';

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

// Re-export PlacedItem types for convenience
export type { BaseItem, PlacedItem } from './placed-item';

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

export interface MatchSession {
  id: string;
  listId: string;
  listSize: number;
  gridItems: GridItemType[];
  backlogGroups: BacklogGroupType[];
  selectedBacklogItem: string | null;
  selectedGridItem: string | null;
  createdAt: string;
  updatedAt: string;
  progress: {
    matched: number;
    total: number;
    percentage: number;
  };
}

export interface DragItem {
  id: string;
  type: 'backlog-item' | 'grid-item';
  data: BacklogItemType | GridItemType;
  groupId?: string;
}

export interface DropResult {
  success: boolean;
  fromPosition?: number;
  toPosition?: number;
  item?: BacklogItemType | GridItemType;
  action: 'assign' | 'move' | 'remove' | 'swap';
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

export interface MatchAnalytics {
  sessionId: string;
  listId: string;
  totalMatches: number;
  averageMatchTime: number;
  completionPercentage: number;
  mostUsedCategories: string[];
  sessionDuration: number;
  createdAt: string;
}
