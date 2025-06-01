"use client";

import { BacklogGroupType, BacklogItemType, GridItemType } from "@/app/types/match";
import { create } from "zustand";
import { mockBacklogGroups, mockGridItems } from "@/app/data/match-data";
import { DragEndEvent } from "@dnd-kit/core";

interface MatchState {
  // Data
  gridItems: GridItemType[];
  backlogGroups: BacklogGroupType[];
  
  // UI State
  activeItem: string | null;
  selectedBacklogItem: string | null;
  selectedGridItem: string | null;
  
  // Actions
  setActiveItem: (id: string | null) => void;
  setSelectedBacklogItem: (id: string | null) => void;
  setSelectedGridItem: (id: string | null) => void;
  toggleBacklogGroup: (id: string) => void;
  
  // Match Logic
  handleDragEnd: (event: DragEndEvent) => void;
  sortGridItems: (newOrder: string[]) => void;
  matchItems: (backlogItemId: string, gridItemId: string) => void;
  unassignGridItem: (gridItemId: string) => void;
}

export const useMatchStore = create<MatchState>((set, get) => ({
  // Initial Data
  gridItems: mockGridItems,
  backlogGroups: mockBacklogGroups,
  
  // UI State
  activeItem: null,
  selectedBacklogItem: null,
  selectedGridItem: null,
  
  // Actions
  setActiveItem: (id) => set({ activeItem: id }),
  
  setSelectedBacklogItem: (id) => {
    set((state) => ({
      selectedBacklogItem: id,
      // Clear grid selection when changing backlog selection
      selectedGridItem: id ? state.selectedGridItem : null
    }));
  },
  
  setSelectedGridItem: (id) => {
    const state = get();
    const gridItem = state.gridItems.find(item => item.id === id);
    
    // If clicking on a matched grid item, unassign it
    if (gridItem?.matched) {
      state.unassignGridItem(id);
      return;
    }
    
    // If we have both a backlog item and grid item selected, match them
    if (state.selectedBacklogItem && id) {
      state.matchItems(state.selectedBacklogItem, id);
      // Clear selections after matching
      set({ 
        selectedBacklogItem: null, 
        selectedGridItem: null 
      });
    } else {
      set({ selectedGridItem: id });
    }
  },
  
  toggleBacklogGroup: (id) => {
    set((state) => ({
      backlogGroups: state.backlogGroups.map((group) => 
        group.id === id 
          ? { ...group, isOpen: !group.isOpen } 
          : group
      )
    }));
  },
  
  // Unassign a grid item and restore backlog item
  unassignGridItem: (gridItemId) => {
    const state = get();
    const gridItem = state.gridItems.find(item => item.id === gridItemId);
    
    if (!gridItem || !gridItem.matched) return;
    
    // Update grid item to be unmatched
    const updatedGridItems = state.gridItems.map(item => {
      if (item.id === gridItemId) {
        return {
          ...item,
          matched: false,
          matchedWith: undefined
        };
      }
      return item;
    });
    
    // Find and update the corresponding backlog item
    const updatedBacklogGroups = state.backlogGroups.map(group => ({
      ...group,
      items: group.items.map(item => {
        if (item.matched && item.matchedWith === gridItem.title) {
          return {
            ...item,
            matched: false,
            matchedWith: undefined
          };
        }
        return item;
      })
    }));
    
    set({
      gridItems: updatedGridItems,
      backlogGroups: updatedBacklogGroups
    });
  },
  
  // Match Logic
  handleDragEnd: (event) => {
    const { active, over } = event;
    
    if (!over) return;
    
    // Dragging within the grid (sorting)
    if (active.id.toString().startsWith('grid-') && over.id.toString().startsWith('grid-')) {
      // Get current grid items
      const items = get().gridItems;
      // Find the indices of the items
      const oldIndex = items.findIndex(item => item.id === active.id.toString());
      const newIndex = items.findIndex(item => item.id === over.id.toString());
      
      // Reorder the items
      const newItems = [...items];
      const [removed] = newItems.splice(oldIndex, 1);
      newItems.splice(newIndex, 0, removed);
      
      // Update the store
      set({ gridItems: newItems });
    }
    
    // Dragging from backlog to grid
    if (active.id.toString().startsWith('backlog-') && over.id === 'grid-droppable') {
      const backlogItemId = active.id.toString();
      
      // Find the backlog item
      let backlogItem: BacklogItemType | null = null;
      let groupId: string | null = null;
      
      // Find the backlog item and its group
      get().backlogGroups.forEach(group => {
        const foundItem = group.items.find(item => item.id === backlogItemId);
        if (foundItem && !foundItem.matched) {
          backlogItem = foundItem;
          groupId = group.id;
        }
      });
      
      if (backlogItem && groupId) {
        // Create a new grid item
        const newGridItem: GridItemType = {
          id: `grid-${Date.now()}`,
          title: backlogItem.title,
          tags: backlogItem.tags || [],
          matched: true,
          matchedWith: backlogItem.title
        };
        
        // Update the backlog item to be matched
        const updatedBacklogGroups = get().backlogGroups.map(group => {
          if (group.id === groupId) {
            return {
              ...group,
              items: group.items.map(item => {
                if (item.id === backlogItemId) {
                  return {
                    ...item,
                    matched: true,
                    matchedWith: newGridItem.title
                  };
                }
                return item;
              })
            };
          }
          return group;
        });
        
        // Add the new grid item and update the backlog
        set({
          gridItems: [...get().gridItems, newGridItem],
          backlogGroups: updatedBacklogGroups
        });
      }
    }
    
    // Clear active item
    set({ activeItem: null });
  },
  
  sortGridItems: (newOrder) => {
    const currentItems = get().gridItems;
    const newItems = newOrder.map(id => 
      currentItems.find(item => item.id === id)
    ).filter((item): item is GridItemType => item !== undefined);
    
    set({ gridItems: newItems });
  },
  
  matchItems: (backlogItemId, gridItemId) => {
    // Find the backlog item
    let backlogItem: BacklogItemType | null = null;
    let groupId: string | null = null;
    
    // Find the grid item
    const gridItem = get().gridItems.find(item => item.id === gridItemId);
    
    if (!gridItem) return;
    
    // Find the backlog item and its group
    get().backlogGroups.forEach(group => {
      const foundItem = group.items.find(item => item.id === backlogItemId);
      if (foundItem && !foundItem.matched) {
        backlogItem = foundItem;
        groupId = group.id;
      }
    });
    
    if (backlogItem && groupId) {
      // Update the grid item
      const updatedGridItems = get().gridItems.map(item => {
        if (item.id === gridItemId) {
          return {
            ...item,
            title: backlogItem!.title,
            matched: true,
            matchedWith: backlogItem!.title
          };
        }
        return item;
      });
      
      // Update the backlog item
      const updatedBacklogGroups = get().backlogGroups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            items: group.items.map(item => {
              if (item.id === backlogItemId) {
                return {
                  ...item,
                  matched: true,
                  matchedWith: gridItem.title
                };
              }
              return item;
            })
          };
        }
        return group;
      });
      
      // Update the store
      set({
        gridItems: updatedGridItems,
        backlogGroups: updatedBacklogGroups
      });
    }
  }
}));