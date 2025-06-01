import { create } from 'zustand';
import { GridItemType, BacklogItemType, BacklogGroupType } from '@/app/types/match';
import { DragEndEvent } from '@dnd-kit/core';

interface MatchStore {
  gridItems: GridItemType[];
  backlogGroups: BacklogGroupType[];
  selectedBacklogItem: string | null;
  selectedGridItem: string | null;
  activeItem: string | null;
  maxItems: number;
  compareList: BacklogItemType[];
  
  setSelectedBacklogItem: (id: string | null) => void;
  setSelectedGridItem: (id: string | null) => void;
  setActiveItem: (id: string) => void;
  toggleBacklogGroup: (groupId: string) => void;
  assignItemToGrid: (item: BacklogItemType, position: number) => void;
  removeItemFromGrid: (position: number) => void;
  moveGridItem: (fromIndex: number, toIndex: number) => void;
  addItemToGroup: (groupId: string, title: string) => Promise<void>;
  removeItemFromGroup: (itemId: string) => void;
  toggleCompareItem: (item: BacklogItemType) => void;
  clearCompareList: () => void;
  handleDragEnd: (event: DragEndEvent) => void;
}

export const useMatchStore = create<MatchStore>((set, get) => ({
  gridItems: Array.from({ length: 50 }, (_, index) => ({
    id: `grid-${index}`,
    title: '',
    tags: [],
    matched: false,
  })),
  
  backlogGroups: [
    // Sample data - replace with your actual data
    {
      id: 'group-1',
      title: 'Video Games',
      isOpen: true,
      items: [
        { id: 'item-1', title: 'Super Mario Bros', matched: false, tags: ['nintendo'] },
        { id: 'item-2', title: 'The Legend of Zelda', matched: false, tags: ['nintendo'] },
        { id: 'item-3', title: 'Grand Theft Auto V', matched: false, tags: ['rockstar'] },
      ]
    },
    {
      id: 'group-2', 
      title: 'Sports Legends',
      isOpen: false,
      items: [
        { id: 'item-4', title: 'Michael Jordan', matched: false, tags: ['basketball'] },
        { id: 'item-5', title: 'LeBron James', matched: false, tags: ['basketball'] },
        { id: 'item-6', title: 'Tom Brady', matched: false, tags: ['football'] },
      ]
    }
  ],
  
  selectedBacklogItem: null,
  selectedGridItem: null,
  activeItem: null,
  maxItems: 50,
  compareList: [],

  setSelectedBacklogItem: (id) => set({ selectedBacklogItem: id }),
  setSelectedGridItem: (id) => set({ selectedGridItem: id }),
  setActiveItem: (id) => set({ activeItem: id }),
  
  toggleBacklogGroup: (groupId) => set((state) => ({
    backlogGroups: state.backlogGroups.map(group =>
      group.id === groupId ? { ...group, isOpen: !group.isOpen } : group
    )
  })),

  assignItemToGrid: (item, position) => set((state) => {
    // Mark the backlog item as matched
    const updatedBacklogGroups = state.backlogGroups.map(group => ({
      ...group,
      items: group.items.map(backlogItem =>
        backlogItem.id === item.id 
          ? { ...backlogItem, matched: true, matchedWith: `grid-${position}` }
          : backlogItem
      )
    }));

    // Update the grid item
    const updatedGridItems = [...state.gridItems];
    updatedGridItems[position] = {
      ...updatedGridItems[position],
      title: item.title,
      tags: item.tags || [],
      matched: true,
      matchedWith: item.id
    };

    return {
      backlogGroups: updatedBacklogGroups,
      gridItems: updatedGridItems,
      selectedBacklogItem: null // Clear selection after assignment
    };
  }),

  removeItemFromGrid: (position) => set((state) => {
    const gridItem = state.gridItems[position];
    if (!gridItem?.matched || !gridItem.matchedWith) return state;

    // Unmark the backlog item
    const updatedBacklogGroups = state.backlogGroups.map(group => ({
      ...group,
      items: group.items.map(backlogItem =>
        backlogItem.id === gridItem.matchedWith
          ? { ...backlogItem, matched: false, matchedWith: undefined }
          : backlogItem
      )
    }));

    // Clear the grid item
    const updatedGridItems = [...state.gridItems];
    updatedGridItems[position] = {
      id: `grid-${position}`,
      title: '',
      tags: [],
      matched: false,
      matchedWith: undefined
    };

    return {
      backlogGroups: updatedBacklogGroups,
      gridItems: updatedGridItems
    };
  }),

  moveGridItem: (fromIndex, toIndex) => set((state) => {
    const updatedGridItems = [...state.gridItems];
    const [movedItem] = updatedGridItems.splice(fromIndex, 1);
    updatedGridItems.splice(toIndex, 0, movedItem);
    
    // Update IDs to match new positions
    updatedGridItems.forEach((item, index) => {
      item.id = `grid-${index}`;
    });

    return { gridItems: updatedGridItems };
  }),

  addItemToGroup: async (groupId, title) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    set((state) => ({
      backlogGroups: state.backlogGroups.map(group =>
        group.id === groupId 
          ? {
              ...group,
              items: [
                ...group.items,
                {
                  id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  title,
                  matched: false,
                  tags: []
                }
              ]
            }
          : group
      )
    }));
  },

  removeItemFromGroup: (itemId) => set((state) => ({
    backlogGroups: state.backlogGroups.map(group => ({
      ...group,
      items: group.items.filter(item => item.id !== itemId)
    })),
    // Also remove from compare list if it exists there
    compareList: state.compareList.filter(item => item.id !== itemId),
    // Clear selection if this item was selected
    selectedBacklogItem: state.selectedBacklogItem === itemId ? null : state.selectedBacklogItem
  })),

  toggleCompareItem: (item) => set((state) => {
    const isInList = state.compareList.some(compareItem => compareItem.id === item.id);
    
    if (isInList) {
      // Remove from compare list
      return {
        compareList: state.compareList.filter(compareItem => compareItem.id !== item.id)
      };
    } else {
      // Add to compare list
      return {
        compareList: [...state.compareList, item]
      };
    }
  }),

  clearCompareList: () => set({ compareList: [] }),

  handleDragEnd: (event) => {
    const { active, over } = event;
    
    if (!over) return;

    const state = get();
    
    // Handle dragging from backlog to grid
    if (active.id.toString().startsWith('item-') && over.id.toString().startsWith('grid-')) {
      const draggedItem = state.backlogGroups
        .flatMap(group => group.items)
        .find(item => item.id === active.id);
      
      if (!draggedItem || draggedItem.matched) return;
      
      const targetPosition = parseInt(over.id.toString().replace('grid-', ''));
      const targetGridItem = state.gridItems[targetPosition];
      
      // Only assign if target position is empty
      if (!targetGridItem?.matched) {
        state.assignItemToGrid(draggedItem, targetPosition);
      }
    }
    
    // Handle reordering within grid
    if (active.id.toString().startsWith('grid-') && over.id.toString().startsWith('grid-')) {
      const fromIndex = parseInt(active.id.toString().replace('grid-', ''));
      const toIndex = parseInt(over.id.toString().replace('grid-', ''));
      
      if (fromIndex !== toIndex) {
        state.moveGridItem(fromIndex, toIndex);
      }
    }
  }
}));