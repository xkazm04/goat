import { GridItemType, BacklogItemType, BacklogGroupType } from '@/types/match';

export class GridOperations {
  static assignItemToGrid(
    gridItems: GridItemType[],
    backlogGroups: BacklogGroupType[],
    item: BacklogItemType,
    position: number
  ): { gridItems: GridItemType[]; backlogGroups: BacklogGroupType[] } | null {
    if (position < 0 || position >= gridItems.length || gridItems[position].matched) {
      return null;
    }

    // Create optimized grid update
    const updatedGridItems = [...gridItems];
    updatedGridItems[position] = {
      id: `grid-${position}`,
      title: item.title,
      description: item.description,
      tags: item.tags || [],
      position: position,
      matched: true,
      matchedWith: item.id,
    };

    // Create optimized backlog update
    const updatedBacklogGroups = backlogGroups.map(group => ({
      ...group,
      items: group.items.map(groupItem =>
        groupItem.id === item.id
          ? { ...groupItem, matched: true, matchedWith: `grid-${position}` }
          : groupItem
      )
    }));

    return {
      gridItems: updatedGridItems,
      backlogGroups: updatedBacklogGroups
    };
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
      position: position,
      matched: false,
      matchedWith: undefined
    };

    const updatedBacklogGroups = backlogGroups.map(group => ({
      ...group,
      items: group.items.map(item =>
        item.id === matchedItemId
          ? { ...item, matched: false, matchedWith: undefined }
          : item
      )
    }));

    return {
      gridItems: updatedGridItems,
      backlogGroups: updatedBacklogGroups
    };
  }

  // Enhanced move operation with optimized swapping
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

    // Handle swapping vs moving to empty slot
    if (targetItem.matched) {
      // Swap the items
      [updatedGridItems[fromIndex], updatedGridItems[toIndex]] = [targetItem, movingItem];

      // Update IDs and positions to match new positions
      updatedGridItems[fromIndex].id = `grid-${fromIndex}`;
      updatedGridItems[fromIndex].position = fromIndex;
      updatedGridItems[toIndex].id = `grid-${toIndex}`;
      updatedGridItems[toIndex].position = toIndex;
    } else {
      // Move to empty slot
      updatedGridItems[toIndex] = {
        ...movingItem,
        id: `grid-${toIndex}`,
        position: toIndex
      };
      updatedGridItems[fromIndex] = {
        id: `grid-${fromIndex}`,
        title: '',
        tags: [],
        position: fromIndex,
        matched: false,
        matchedWith: undefined
      };
    }

    // Update backlog item references efficiently
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
      matchedWith: undefined
    }));

    const clearedBacklogGroups = backlogGroups.map(group => ({
      ...group,
      items: group.items.map(item => ({
        ...item,
        matched: false,
        matchedWith: undefined
      }))
    }));

    return {
      gridItems: clearedGridItems,
      backlogGroups: clearedBacklogGroups
    };
  }

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