import { create } from 'zustand';
import { useItemStore } from './item-store';
import { useListStore } from './use-list-store';

interface MatchStoreState {
  // Match-specific UI state
  isLoading: boolean;
  showComparisonModal: boolean;
  
  // Keyboard shortcuts state
  keyboardMode: boolean;
  
  // Actions
  setIsLoading: (loading: boolean) => void;
  setShowComparisonModal: (show: boolean) => void;
  setKeyboardMode: (enabled: boolean) => void;
  
  // Quick assign actions (1-9, 0 for positions 1-10)
  quickAssignToPosition: (position: number) => void;
  
  // Initialize match session
  initializeMatchSession: () => void;
}

export const useMatchStore = create<MatchStoreState>((set, get) => ({
  // UI State
  isLoading: false,
  showComparisonModal: false,
  keyboardMode: false,
  
  // Actions
  setIsLoading: (loading) => set({ isLoading: loading }),
  setShowComparisonModal: (show) => set({ showComparisonModal: show }),
  setKeyboardMode: (enabled) => set({ keyboardMode: enabled }),
  
  // Quick assign using keyboard shortcuts
  quickAssignToPosition: (position) => {
    const itemStore = useItemStore.getState();
    const selectedItem = itemStore.selectedBacklogItem;
    
    if (!selectedItem) return;
    
    // Find the selected backlog item
    const backlogItem = itemStore.backlogGroups
      .flatMap(group => group.items)
      .find(item => item.id === selectedItem);
    
    if (backlogItem && !backlogItem.matched && itemStore.canAddAtPosition(position - 1)) {
      itemStore.assignItemToGrid(backlogItem, position - 1);
    }
  },
  
  // Initialize match session with list data
  initializeMatchSession: () => {
    const listStore = useListStore.getState();
    const itemStore = useItemStore.getState();
    const currentList = listStore.currentList;
    
    if (currentList) {
      // Initialize the item store with current list data
      itemStore.syncWithList(currentList.id);
      
      // Initialize grid if needed
      if (itemStore.gridItems.length === 0) {
        itemStore.initializeGrid(currentList.size, currentList.id);
      }
      
      set({ isLoading: false });
    }
  }
}));