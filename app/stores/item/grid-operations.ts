import { GridItemType, BacklogItemType, BacklogGroupType } from '@/app/types/match';

export class GridOperations {
  static assignItemToGrid(
    gridItems: GridItemType[],
    backlogGroups: BacklogGroupType[],
    item: BacklogItemType,
    position: number
  ): { gridItems: GridItemType[]; backlogGroups: BacklogGroupType[] } | null {
    
    // Validate position
    if (position < 0 || position >= gridItems.length) {
      console.warn(`Invalid grid position: ${position}`);
      return null;
    }
    
    // Check if position is already occupied
    if (gridItems[position].matched) {
      console.warn(`Grid position ${position} is already occupied`);
      return null;
    }
    
    // Check if item is already matched
    if (item.matched) {
      console.warn(`Item ${item.id} is already matched`);
      return null;
    }

    // Update backlog groups - mark item as matched
    const updatedBacklogGroups = backlogGroups.map(group => ({
      ...group,
      items: group.items.map(backlogItem =>
        backlogItem.id === item.id 
          ? { ...backlogItem, matched: true, matchedWith: `grid-${position}` }
          : backlogItem
      )
    }));

    // Update grid items
    const updatedGridItems = [...gridItems];
    updatedGridItems[position] = {
      id: `grid-${position}`,
      title: item.title,
      tags: item.tags || [],
      matched: true,
      matchedWith: item.id
    };

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
    
    if (position < 0 || position >= gridItems.length) {
      console.warn(`Invalid grid position: ${position}`);
      return null;
    }
    
    const gridItem = gridItems[position];
    if (!gridItem?.matched || !gridItem.matchedWith) {
      console.warn(`No matched item at position ${position}`);
      return null;
    }

    // Update backlog groups - unmark item
    const updatedBacklogGroups = backlogGroups.map(group => ({
      ...group,
      items: group.items.map(backlogItem =>
        backlogItem.id === gridItem.matchedWith
          ? { ...backlogItem, matched: false, matchedWith: undefined }
          : backlogItem
      )
    }));

    // Clear grid item
    const updatedGridItems = [...gridItems];
    updatedGridItems[position] = {
      id: `grid-${position}`,
      title: '',
      tags: [],
      matched: false,
      matchedWith: undefined
    };

    return {
      gridItems: updatedGridItems,
      backlogGroups: updatedBacklogGroups
    };
  }

  static moveGridItem(
    gridItems: GridItemType[],
    backlogGroups: BacklogGroupType[],
    fromIndex: number,
    toIndex: number
  ): { gridItems: GridItemType[]; backlogGroups: BacklogGroupType[] } | null {
    
    if (fromIndex < 0 || fromIndex >= gridItems.length ||
        toIndex < 0 || toIndex >= gridItems.length) {
      return null;
    }

    const updatedGridItems = [...gridItems];
    const movedItem = updatedGridItems[fromIndex];
    
    if (!movedItem.matched) return null;

    // Clear the source position
    updatedGridItems[fromIndex] = {
      id: `grid-${fromIndex}`,
      title: '',
      tags: [],
      matched: false,
      matchedWith: undefined
    };

    // Set the target position
    updatedGridItems[toIndex] = {
      ...movedItem,
      id: `grid-${toIndex}`
    };

    // Update backlog item reference
    const updatedBacklogGroups = backlogGroups.map(group => ({
      ...group,
      items: group.items.map(item =>
        item.id === movedItem.matchedWith
          ? { ...item, matchedWith: `grid-${toIndex}` }
          : item
      )
    }));

    return {
      gridItems: updatedGridItems,
      backlogGroups: updatedBacklogGroups
    };
  }

  static clearGrid(
    gridItems: GridItemType[],
    backlogGroups: BacklogGroupType[]
  ): { gridItems: GridItemType[]; backlogGroups: BacklogGroupType[] } {
    
    // Unmark all matched items in backlog
    const updatedBacklogGroups = backlogGroups.map(group => ({
      ...group,
      items: group.items.map(item => ({
        ...item,
        matched: false,
        matchedWith: undefined
      }))
    }));

    // Reset grid
    const clearedGridItems = gridItems.map((_, index) => ({
      id: `grid-${index}`,
      title: '',
      tags: [],
      matched: false,
      matchedWith: undefined
    }));

    return {
      gridItems: clearedGridItems,
      backlogGroups: updatedBacklogGroups
    };
  }

  static canAddAtPosition(gridItems: GridItemType[], position: number): boolean {
    return position >= 0 && 
           position < gridItems.length && 
           !gridItems[position].matched;
  }

  static getNextAvailablePosition(gridItems: GridItemType[]): number | null {
    const availableIndex = gridItems.findIndex(item => !item.matched);
    return availableIndex !== -1 ? availableIndex : null;
  }

  static getMatchedItems(gridItems: GridItemType[]): GridItemType[] {
    return gridItems.filter(item => item.matched);
  }

  static getAvailableBacklogItems(backlogGroups: BacklogGroupType[]): BacklogItemType[] {
    return backlogGroups.flatMap(group => 
      group.items.filter(item => !item.matched)
    );
  }
}