import { GridItemType, BacklogItemType, BacklogGroupType } from '@/types/match';
import { NormalizedBacklogData, NormalizedOps } from './normalized-session';

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
    if (position < 0 || position >= gridItems.length || gridItems[position].matched) {
      return null;
    }

    const updatedGridItems = [...gridItems];
    updatedGridItems[position] = {
      id: `grid-${position}`,
      title: item.title,
      description: item.description,
      tags: item.tags || [],
      position,
      matched: true,
      matchedWith: item.id,
    };

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
    if (position < 0 || position >= gridItems.length || !gridItems[position].matched) {
      return null;
    }

    const matchedItemId = gridItems[position].matchedWith;

    const updatedGridItems = [...gridItems];
    updatedGridItems[position] = {
      id: `grid-${position}`,
      title: '',
      tags: [],
      position,
      matched: false,
      matchedWith: undefined,
    };

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
      !gridItems[fromIndex].matched
    ) {
      return null;
    }

    const updatedGridItems = [...gridItems];
    const movingItem = updatedGridItems[fromIndex];
    const targetItem = updatedGridItems[toIndex];
    let updatedNormalized = normalizedData;

    if (targetItem.matched) {
      // Swap
      [updatedGridItems[fromIndex], updatedGridItems[toIndex]] = [targetItem, movingItem];
      updatedGridItems[fromIndex].id = `grid-${fromIndex}`;
      updatedGridItems[fromIndex].position = fromIndex;
      updatedGridItems[toIndex].id = `grid-${toIndex}`;
      updatedGridItems[toIndex].position = toIndex;

      // O(1) updates for both swapped backlog items
      if (movingItem.matchedWith) {
        updatedNormalized = NormalizedOps.updateItemFields(updatedNormalized, movingItem.matchedWith, { matched: true });
      }
      if (targetItem.matchedWith) {
        updatedNormalized = NormalizedOps.updateItemFields(updatedNormalized, targetItem.matchedWith, { matched: true });
      }
    } else {
      // Move to empty slot
      updatedGridItems[toIndex] = { ...movingItem, id: `grid-${toIndex}`, position: toIndex };
      updatedGridItems[fromIndex] = {
        id: `grid-${fromIndex}`,
        title: '',
        tags: [],
        position: fromIndex,
        matched: false,
        matchedWith: undefined,
      };

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
    const clearedGridItems = gridItems.map((_, index) => ({
      id: `grid-${index}`,
      title: '',
      tags: [],
      position: index,
      matched: false,
      matchedWith: undefined,
    }));

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
    if (position < 0 || position >= gridItems.length || gridItems[position].matched) {
      return null;
    }

    const updatedGridItems = [...gridItems];
    updatedGridItems[position] = {
      id: `grid-${position}`,
      title: item.title,
      description: item.description,
      tags: item.tags || [],
      position,
      matched: true,
      matchedWith: item.id,
    };

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
    if (position < 0 || position >= gridItems.length || !gridItems[position].matched) {
      return null;
    }

    const matchedItemId = gridItems[position].matchedWith;

    const updatedGridItems = [...gridItems];
    updatedGridItems[position] = {
      id: `grid-${position}`,
      title: '',
      tags: [],
      position,
      matched: false,
      matchedWith: undefined,
    };

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
      !gridItems[fromIndex].matched
    ) {
      return null;
    }

    const updatedGridItems = [...gridItems];
    const movingItem = updatedGridItems[fromIndex];
    const targetItem = updatedGridItems[toIndex];

    if (targetItem.matched) {
      [updatedGridItems[fromIndex], updatedGridItems[toIndex]] = [targetItem, movingItem];
      updatedGridItems[fromIndex].id = `grid-${fromIndex}`;
      updatedGridItems[fromIndex].position = fromIndex;
      updatedGridItems[toIndex].id = `grid-${toIndex}`;
      updatedGridItems[toIndex].position = toIndex;
    } else {
      updatedGridItems[toIndex] = { ...movingItem, id: `grid-${toIndex}`, position: toIndex };
      updatedGridItems[fromIndex] = {
        id: `grid-${fromIndex}`,
        title: '',
        tags: [],
        position: fromIndex,
        matched: false,
        matchedWith: undefined,
      };
    }

    const updatedBacklogGroups = backlogGroups.map(group => ({
      ...group,
      items: group.items.map(item => {
        if (item.id === movingItem.matchedWith) {
          return { ...item, matchedWith: `grid-${toIndex}` };
        }
        if (targetItem.matched && item.id === targetItem.matchedWith) {
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
    const clearedGridItems = gridItems.map((_, index) => ({
      id: `grid-${index}`,
      title: '',
      tags: [],
      position: index,
      matched: false,
      matchedWith: undefined,
    }));

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
    return gridItems.filter(item => item.matched);
  }

  static getNextAvailablePosition(gridItems: GridItemType[]): number | null {
    const availableIndex = gridItems.findIndex(item => !item.matched);
    return availableIndex !== -1 ? availableIndex : null;
  }

  static canAddAtPosition(gridItems: GridItemType[], position: number): boolean {
    return position >= 0 && position < gridItems.length && !gridItems[position].matched;
  }
}
