import { GridItemType, BacklogItemType, BacklogGroupType } from '@/types/match';

import { NormalizedBacklogData, NormalizedOps } from './normalized-session';

/** Helper to create an empty PlacedItem grid slot */
function emptySlot(position: number): GridItemType {
  return {
    id: `grid-${position}`,
    position,
    item: null,
    context: { source: 'grid', matched: false },
  };
}

/** Helper to create a filled PlacedItem grid slot from a BacklogItemType */
function filledSlot(position: number, backlogItem: BacklogItemType): GridItemType {
  return {
    id: `grid-${position}`,
    position,
    item: {
      id: backlogItem.id,
      title: backlogItem.title,
      description: backlogItem.description,
      image_url: backlogItem.image_url,
      tags: backlogItem.tags || [],
      category: backlogItem.category,
      subcategory: backlogItem.subcategory,
      item_year: backlogItem.item_year,
      item_year_to: backlogItem.item_year_to,
    },
    context: { source: 'backlog', matched: true },
  };
}

export class GridOperations {
  // ─────────────────────────────────────────────────────────────
  // Normalized variants — O(1) backlog updates via NormalizedOps
  // ─────────────────────────────────────────────────────────────

  /**
   * Assign backlog item to a grid position using normalized data — O(1) backlog update.
   */
  static assignItemNormalized(
    gridItems: GridItemType[],
    normalizedData: NormalizedBacklogData,
    item: BacklogItemType,
    position: number
  ): { gridItems: GridItemType[]; normalizedData: NormalizedBacklogData } | null {
    if (position < 0 || position >= gridItems.length || gridItems[position].context.matched) {
      return null;
    }

    const updatedGridItems = [...gridItems];
    updatedGridItems[position] = filledSlot(position, item);

    // O(1) item update via NormalizedOps
    const updatedNormalized = NormalizedOps.markItemMatched(normalizedData, item.id, `grid-${position}`);

    return { gridItems: updatedGridItems, normalizedData: updatedNormalized };
  }

  /**
   * Remove item from grid position using normalized data — O(1) backlog update.
   */
  static removeItemNormalized(
    gridItems: GridItemType[],
    normalizedData: NormalizedBacklogData,
    position: number
  ): { gridItems: GridItemType[]; normalizedData: NormalizedBacklogData } | null {
    if (position < 0 || position >= gridItems.length || !gridItems[position].context.matched) {
      return null;
    }

    const matchedItemId = gridItems[position].item?.id;

    const updatedGridItems = [...gridItems];
    updatedGridItems[position] = emptySlot(position);

    // O(1) item update via NormalizedOps
    let updatedNormalized = normalizedData;
    if (matchedItemId) {
      updatedNormalized = NormalizedOps.markItemUnmatched(normalizedData, matchedItemId);
    }

    return { gridItems: updatedGridItems, normalizedData: updatedNormalized };
  }

  /**
   * Move/swap grid items using normalized data — O(1) backlog update per affected item.
   */
  static moveItemNormalized(
    gridItems: GridItemType[],
    normalizedData: NormalizedBacklogData,
    fromIndex: number,
    toIndex: number
  ): { gridItems: GridItemType[]; normalizedData: NormalizedBacklogData } | null {
    if (
      fromIndex < 0 || fromIndex >= gridItems.length ||
      toIndex < 0 || toIndex >= gridItems.length ||
      fromIndex === toIndex ||
      !gridItems[fromIndex].context.matched
    ) {
      return null;
    }

    const updatedGridItems = [...gridItems];
    const movingItem = updatedGridItems[fromIndex];
    const targetItem = updatedGridItems[toIndex];
    let updatedNormalized = normalizedData;

    if (targetItem.context.matched) {
      // Swap
      [updatedGridItems[fromIndex], updatedGridItems[toIndex]] = [targetItem, movingItem];
      updatedGridItems[fromIndex] = { ...updatedGridItems[fromIndex], id: `grid-${fromIndex}`, position: fromIndex };
      updatedGridItems[toIndex] = { ...updatedGridItems[toIndex], id: `grid-${toIndex}`, position: toIndex };

      // O(1) updates for both swapped backlog items
      if (movingItem.item?.id) {
        updatedNormalized = NormalizedOps.updateItemFields(updatedNormalized, movingItem.item.id, { matched: true });
      }
      if (targetItem.item?.id) {
        updatedNormalized = NormalizedOps.updateItemFields(updatedNormalized, targetItem.item.id, { matched: true });
      }
    } else {
      // Move to empty slot
      updatedGridItems[toIndex] = { ...movingItem, id: `grid-${toIndex}`, position: toIndex };
      updatedGridItems[fromIndex] = emptySlot(fromIndex);

      // O(1) update — backlog item stays matched, no field change needed
    }

    return { gridItems: updatedGridItems, normalizedData: updatedNormalized };
  }

  /**
   * Clear entire grid using normalized data — O(n) for all items (no groups iteration).
   */
  static clearGridNormalized(
    gridItems: GridItemType[],
    normalizedData: NormalizedBacklogData
  ): { gridItems: GridItemType[]; normalizedData: NormalizedBacklogData } {
    const clearedGridItems = gridItems.map((_, index) => emptySlot(index));

    const updatedNormalized = NormalizedOps.clearAllMatched(normalizedData);

    return { gridItems: clearedGridItems, normalizedData: updatedNormalized };
  }

  // ─────────────────────────────────────────────────────────────
  // Legacy variants — O(groups*items) backlog updates via array spreads
  // Kept for backward compatibility with code using BacklogGroupType[]
  // ─────────────────────────────────────────────────────────────

  static assignItemToGrid(
    gridItems: GridItemType[],
    backlogGroups: BacklogGroupType[],
    item: BacklogItemType,
    position: number
  ): { gridItems: GridItemType[]; backlogGroups: BacklogGroupType[] } | null {
    if (position < 0 || position >= gridItems.length || gridItems[position].context.matched) {
      return null;
    }

    const updatedGridItems = [...gridItems];
    updatedGridItems[position] = filledSlot(position, item);

    const updatedBacklogGroups = backlogGroups.map(group => ({
      ...group,
      items: group.items.map(groupItem =>
        groupItem.id === item.id
          ? { ...groupItem, matched: true, matchedWith: `grid-${position}` }
          : groupItem
      )
    }));

    return { gridItems: updatedGridItems, backlogGroups: updatedBacklogGroups };
  }

  static removeItemFromGrid(
    gridItems: GridItemType[],
    backlogGroups: BacklogGroupType[],
    position: number
  ): { gridItems: GridItemType[]; backlogGroups: BacklogGroupType[] } | null {
    if (position < 0 || position >= gridItems.length || !gridItems[position].context.matched) {
      return null;
    }

    const matchedItemId = gridItems[position].item?.id;

    const updatedGridItems = [...gridItems];
    updatedGridItems[position] = emptySlot(position);

    const updatedBacklogGroups = backlogGroups.map(group => ({
      ...group,
      items: group.items.map(item =>
        item.id === matchedItemId
          ? { ...item, matched: false, matchedWith: undefined }
          : item
      )
    }));

    return { gridItems: updatedGridItems, backlogGroups: updatedBacklogGroups };
  }

  static moveGridItem(
    gridItems: GridItemType[],
    backlogGroups: BacklogGroupType[],
    fromIndex: number,
    toIndex: number
  ): { gridItems: GridItemType[]; backlogGroups: BacklogGroupType[] } | null {
    if (
      fromIndex < 0 || fromIndex >= gridItems.length ||
      toIndex < 0 || toIndex >= gridItems.length ||
      fromIndex === toIndex ||
      !gridItems[fromIndex].context.matched
    ) {
      return null;
    }

    const updatedGridItems = [...gridItems];
    const movingItem = updatedGridItems[fromIndex];
    const targetItem = updatedGridItems[toIndex];

    if (targetItem.context.matched) {
      [updatedGridItems[fromIndex], updatedGridItems[toIndex]] = [targetItem, movingItem];
      updatedGridItems[fromIndex] = { ...updatedGridItems[fromIndex], id: `grid-${fromIndex}`, position: fromIndex };
      updatedGridItems[toIndex] = { ...updatedGridItems[toIndex], id: `grid-${toIndex}`, position: toIndex };
    } else {
      updatedGridItems[toIndex] = { ...movingItem, id: `grid-${toIndex}`, position: toIndex };
      updatedGridItems[fromIndex] = emptySlot(fromIndex);
    }

    const updatedBacklogGroups = backlogGroups.map(group => ({
      ...group,
      items: group.items.map(item => {
        if (item.id === movingItem.item?.id) {
          return { ...item, matchedWith: `grid-${toIndex}` };
        }
        if (targetItem.context.matched && item.id === targetItem.item?.id) {
          return { ...item, matchedWith: `grid-${fromIndex}` };
        }
        return item;
      })
    }));

    return { gridItems: updatedGridItems, backlogGroups: updatedBacklogGroups };
  }

  static clearGrid(
    gridItems: GridItemType[],
    backlogGroups: BacklogGroupType[]
  ): { gridItems: GridItemType[]; backlogGroups: BacklogGroupType[] } {
    const clearedGridItems = gridItems.map((_, index) => emptySlot(index));

    const clearedBacklogGroups = backlogGroups.map(group => ({
      ...group,
      items: group.items.map(item => ({
        ...item,
        matched: false,
        matchedWith: undefined,
      }))
    }));

    return { gridItems: clearedGridItems, backlogGroups: clearedBacklogGroups };
  }

  // ─────────────────────────────────────────────────────────────
  // Query helpers (unchanged — work with either data format)
  // ─────────────────────────────────────────────────────────────

  static getAvailableBacklogItems(backlogGroups: BacklogGroupType[]): BacklogItemType[] {
    return backlogGroups.flatMap(group =>
      group.items.filter(item => !item.matched)
    );
  }

  static getMatchedItems(gridItems: GridItemType[]): GridItemType[] {
    return gridItems.filter(item => item.context.matched);
  }

  static getNextAvailablePosition(gridItems: GridItemType[]): number | null {
    const availableIndex = gridItems.findIndex(item => !item.context.matched);
    return availableIndex !== -1 ? availableIndex : null;
  }

  static canAddAtPosition(gridItems: GridItemType[], position: number): boolean {
    return position >= 0 && position < gridItems.length && !gridItems[position].context.matched;
  }
}
