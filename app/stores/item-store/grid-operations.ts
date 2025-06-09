import { GridItemType, BacklogItemType, BacklogGroupType } from '@/app/types/match';

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

    const updatedGridItems = [...gridItems];
    updatedGridItems[position] = {
      id: `grid-${position}`,
      title: item.title,
      description: item.description,
      tags: item.tags || [],
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
      updatedGridItems[toIndex].id = `grid-${toIndex}`;
    } else {
      updatedGridItems[toIndex] = {
        ...movingItem,
        id: `grid-${toIndex}`
      };
      updatedGridItems[fromIndex] = {
        id: `grid-${fromIndex}`,
        title: '',
        tags: [],
        matched: false,
        matchedWith: undefined
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
    const updatedGridItems = gridItems.map((_, index) => ({
      id: `grid-${index}`,
      title: '',
      tags: [],
      matched: false,
      matchedWith: undefined
    }));

    const updatedBacklogGroups = backlogGroups.map(group => ({
      ...group,
      items: group.items.map(item => ({
        ...item,
        matched: false,
        matchedWith: undefined
      }))
    }));

    return { gridItems: updatedGridItems, backlogGroups: updatedBacklogGroups };
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