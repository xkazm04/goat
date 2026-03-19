import { ItemCategory, CollectionItem } from "@/app/features/Collection/types";

export interface FlattenedItem {
  item: CollectionItem;
  groupId: string;
  groupName: string;
  globalIndex: number;
}

export interface ContinuousRow {
  items: FlattenedItem[];
  startIndex: number;
  boundaryIndices: number[];
}

export interface VirtualizedCollectionGridProps {
  displayGroups: ItemCategory[];
  searchQuery?: string;
  sortByConsensus?: boolean;
  getQuickSelectNumber?: (itemId: string) => number | null;
  isItemSelected?: (itemId: string) => boolean;
  columnCount?: number;
  containerHeight?: number;
  rowHeight?: number;
  itemWidth?: number;
  onItemClick?: (item: CollectionItem) => void;
  selectedItemId?: string;
  /** Category string for selecting category-aware empty state illustrations */
  category?: string;
}

export function generateSortCacheKey(groups: ItemCategory[], consensusTimestamp: number | null): string {
  const itemIds = groups.flatMap(g => g.items?.map(i => i.id) || []).join(',');
  return `${itemIds}:${consensusTimestamp || 0}`;
}

export function flattenGroups(groups: ItemCategory[]): FlattenedItem[] {
  const items: FlattenedItem[] = [];
  let globalIndex = 0;
  groups.forEach(group => {
    (group.items || []).forEach(item => {
      items.push({ item, groupId: group.id, groupName: group.name || group.id, globalIndex: globalIndex++ });
    });
  });
  return items;
}

export function chunkIntoRows(items: FlattenedItem[], columnCount: number): ContinuousRow[] {
  const rows: ContinuousRow[] = [];
  for (let i = 0; i < items.length; i += columnCount) {
    const rowItems = items.slice(i, i + columnCount);
    const boundaries: number[] = [];
    for (let j = 1; j < rowItems.length; j++) {
      if (rowItems[j].groupId !== rowItems[j - 1].groupId) boundaries.push(j);
    }
    rows.push({ items: rowItems, startIndex: i, boundaryIndices: boundaries });
  }
  return rows;
}
