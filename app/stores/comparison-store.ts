import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BacklogItemType } from '@/app/types/match';

interface ComparisonStoreState {
  // Core state
  isComparisonOpen: boolean;
  items: BacklogItemType[];
  selectedForComparison: string | null;
  comparisonMode: 'basic' | 'detailed' | 'table';
  
  // Actions
  openComparison: () => void;
  closeComparison: () => void;
  addToComparison: (item: BacklogItemType) => void;
  removeFromComparison: (itemId: string) => void;
  toggleComparisonSelection: (itemId: string) => void;
  clearComparison: () => void;
  setComparisonMode: (mode: 'basic' | 'detailed' | 'table') => void;
  
  // Utilities
  isInComparison: (itemId: string) => boolean;
}

export const useComparisonStore = create<ComparisonStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      isComparisonOpen: false,
      items: [],
      selectedForComparison: null,
      comparisonMode: 'basic',
      
      // Actions
      openComparison: () => set({ isComparisonOpen: true }),
      
      closeComparison: () => set({ isComparisonOpen: false }),
      
      addToComparison: (item) => {
        set(state => {
          // Check if item already exists
          if (state.items.some(i => i.id === item.id)) {
            return state;
          }
          
          return {
            items: [...state.items, item],
            // Open comparison automatically when adding the first item
            isComparisonOpen: state.items.length === 0 ? true : state.isComparisonOpen
          };
        });
      },
      
      removeFromComparison: (itemId) => {
        set(state => {
          const newItems = state.items.filter(item => item.id !== itemId);
          
          return {
            items: newItems,
            // Clear selected item if it was removed
            selectedForComparison: state.selectedForComparison === itemId 
              ? null 
              : state.selectedForComparison,
            // Close comparison if no items left
            isComparisonOpen: newItems.length > 0 ? state.isComparisonOpen : false
          };
        });
      },
      
      toggleComparisonSelection: (itemId) => {
        set(state => ({
          selectedForComparison: state.selectedForComparison === itemId ? null : itemId
        }));
      },
      
      clearComparison: () => {
        set({
          items: [],
          selectedForComparison: null,
          isComparisonOpen: false
        });
      },
      
      setComparisonMode: (mode) => {
        set({ comparisonMode: mode });
      },
      
      // Utilities
      isInComparison: (itemId) => {
        return get().items.some(item => item.id === itemId);
      }
    }),
    {
      name: 'comparison-store',
      partialize: (state) => ({
        items: state.items,
        comparisonMode: state.comparisonMode
      })
    }
  )
);

// Selector hooks
export const useComparisonItems = () => useComparisonStore(state => state.items);
export const useComparisonState = () => useComparisonStore(state => ({
  isOpen: state.isComparisonOpen,
  mode: state.comparisonMode,
  selectedItem: state.selectedForComparison
}));
export const useComparisonActions = () => useComparisonStore(state => ({
  open: state.openComparison,
  close: state.closeComparison,
  add: state.addToComparison,
  remove: state.removeFromComparison,
  clear: state.clearComparison,
  toggleSelection: state.toggleComparisonSelection,
  setMode: state.setComparisonMode
}));