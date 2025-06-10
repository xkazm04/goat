import { create } from 'zustand';
import { DragEndEvent } from '@dnd-kit/core';
import { GridItemType, BacklogItemType } from '@/app/types/match';
import { GridOperations } from './item-store/grid-operations';
import { useSessionStore } from './session-store';

interface GridStoreState {
  // Grid state
  gridItems: GridItemType[];
  maxGridSize: number;
  selectedGridItem: string | null;
  activeItem: string | null;
  
  // Actions - Grid Management
  initializeGrid: (size: number, listId: string, category?: string) => void;
  assignItemToGrid: (item: BacklogItemType, position: number) => void;
  removeItemFromGrid: (position: number) => void;
  moveGridItem: (fromIndex: number, toIndex: number) => void;
  clearGrid: () => void;
  
  // Actions - Selection
  setSelectedGridItem: (id: string | null) => void;
  setActiveItem: (id: string | null) => void;
  
  // Actions - Drag & Drop
  handleDragEnd: (event: DragEndEvent) => void;
  
  // Utilities
  getMatchedItems: () => GridItemType[];
  getNextAvailableGridPosition: () => number | null;
  canAddAtPosition: (position: number) => boolean;
  
  // Sync with session store
  syncWithSession: () => void;
  loadFromSession: (sessionGridItems: GridItemType[], size: number) => void;
}

export const useGridStore = create<GridStoreState>()((set, get) => ({
  // Initial state
  gridItems: [],
  maxGridSize: 50,
  selectedGridItem: null,
  activeItem: null,

  // Grid Management
  initializeGrid: (size: number, listId: string, category: string = 'general') => {
    console.log(`Initializing grid for list ${listId} with size ${size}`);
    
    // Sync with session store
    const sessionStore = useSessionStore.getState();
    
    if (sessionStore.activeSessionId !== listId) {
      sessionStore.switchToSession(listId);
    }
    
    const gridItems = Array.from({ length: size }, (_, index) => ({
      id: `grid-${index}`,
      title: '',
      tags: [],
      matched: false,
    }));
    
    set({ 
      gridItems, 
      maxGridSize: size,
      selectedGridItem: null,
      activeItem: null
    });
    
    // Update session store
    sessionStore.updateSessionGridItems(gridItems);
  },

  assignItemToGrid: (item: BacklogItemType, position: number) => {
    const state = get();
    const sessionState = useSessionStore.getState();
    
    const result = GridOperations.assignItemToGrid(
      state.gridItems,
      sessionState.backlogGroups,
      item,
      position
    );
    
    if (result) {
      set({
        gridItems: result.gridItems,
        selectedGridItem: null
      });
      
      // Update session store
      sessionState.setBacklogGroups(result.backlogGroups);
      sessionState.updateSessionGridItems(result.gridItems);
      sessionState.toggleCompareItem(item); // Remove from compare list if exists
    }
  },

  removeItemFromGrid: (position: number) => {
    const state = get();
    const sessionState = useSessionStore.getState();
    
    const result = GridOperations.removeItemFromGrid(
      state.gridItems,
      sessionState.backlogGroups,
      position
    );
    
    if (result) {
      set({
        gridItems: result.gridItems
      });
      
      // Update session store
      sessionState.setBacklogGroups(result.backlogGroups);
      sessionState.updateSessionGridItems(result.gridItems);
    }
  },

  moveGridItem: (fromIndex: number, toIndex: number) => {
    const state = get();
    const sessionState = useSessionStore.getState();
    
    const result = GridOperations.moveGridItem(
      state.gridItems,
      sessionState.backlogGroups,
      fromIndex,
      toIndex
    );
    
    if (result) {
      set({
        gridItems: result.gridItems
      });
      
      // Update session store
      sessionState.setBacklogGroups(result.backlogGroups);
      sessionState.updateSessionGridItems(result.gridItems);
    }
  },

  clearGrid: () => {
    const state = get();
    const sessionState = useSessionStore.getState();
    
    const result = GridOperations.clearGrid(
      state.gridItems,
      sessionState.backlogGroups
    );
    
    set({
      gridItems: result.gridItems,
      selectedGridItem: null
    });
    
    // Update session store
    sessionState.setBacklogGroups(result.backlogGroups);
    sessionState.updateSessionGridItems(result.gridItems);
    sessionState.clearCompareList();
  },

  // Selection Management
  setSelectedGridItem: (id) => set({ selectedGridItem: id }),
  setActiveItem: (id) => set({ activeItem: id }),

  // ENHANCED Drag & Drop Handler
  handleDragEnd: (event) => {
    const { active, over } = event;
    
    if (!over) {
      console.log('No drop target');
      return;
    }

    const state = get();
    const sessionState = useSessionStore.getState();
    const activeId = active.id.toString();
    const overId = over.id.toString();
    
    console.log('Drag end:', { activeId, overId });
    
    // Handle backlog item to grid assignment
    if (overId.startsWith('grid-')) {
      const position = parseInt(overId.replace('grid-', ''));
      
      // Find the backlog item being dragged
      const backlogItem = sessionState.backlogGroups
        .flatMap(group => group.items)
        .find(item => item.id === activeId);
      
      if (backlogItem && state.canAddAtPosition(position)) {
        console.log('Assigning backlog item to grid:', { item: backlogItem.title, position });
        get().assignItemToGrid(backlogItem, position);
        return;
      }
    }
    
    // Handle grid-to-grid movement (swapping)
    if (activeId.startsWith('grid-') && overId.startsWith('grid-')) {
      const fromIndex = parseInt(activeId.replace('grid-', ''));
      const toIndex = parseInt(overId.replace('grid-', ''));
      
      const fromItem = state.gridItems[fromIndex];
      const toItem = state.gridItems[toIndex];
      
      console.log('Grid to grid movement:', { fromIndex, toIndex, fromMatched: fromItem?.matched, toMatched: toItem?.matched });
      
      if (fromIndex !== toIndex && fromItem?.matched) {
        // If target position has an item, swap them
        if (toItem?.matched) {
          console.log('Swapping grid items');
          // Implement swapping logic
          const newGridItems = [...state.gridItems];
          newGridItems[fromIndex] = { ...toItem };
          newGridItems[toIndex] = { ...fromItem };
          
          set({ gridItems: newGridItems });
          sessionState.updateSessionGridItems(newGridItems);
        } else {
          // Move to empty position
          console.log('Moving to empty position');
          get().moveGridItem(fromIndex, toIndex);
        }
      }
    }
  },

  // Utilities
  getMatchedItems: () => {
    const state = get();
    return GridOperations.getMatchedItems(state.gridItems);
  },

  getNextAvailableGridPosition: () => {
    const state = get();
    return GridOperations.getNextAvailablePosition(state.gridItems);
  },

  canAddAtPosition: (position) => {
    const state = get();
    return GridOperations.canAddAtPosition(state.gridItems, position);
  },

  // Sync methods
  syncWithSession: () => {
    const state = get();
    const sessionState = useSessionStore.getState();
    sessionState.updateSessionGridItems(state.gridItems);
  },

  loadFromSession: (sessionGridItems, size) => {
    set({
      gridItems: sessionGridItems,
      maxGridSize: size,
      selectedGridItem: null,
      activeItem: null
    });
  }
}));

// Selector hooks
export const useGridItems = () => useGridStore((state) => state.gridItems);
export const useGridSelection = () => useGridStore((state) => ({
  selectedGridItem: state.selectedGridItem,
  activeItem: state.activeItem
}));
export const useGridUtilities = () => useGridStore((state) => ({
  getMatchedItems: state.getMatchedItems,
  getNextAvailableGridPosition: state.getNextAvailableGridPosition,
  canAddAtPosition: state.canAddAtPosition
}));