import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BacklogItemType } from '@/app/types/match';
import { useGridStore } from './grid-store';

export interface ComparisonState {
  // Comparison data
  items: BacklogItemType[];
  selectedForComparison: string[];
  comparisonMode: 'grid' | 'list' | 'side-by-side';
  isComparisonOpen: boolean;
  
  // Actions - Modal Management
  openComparison: () => void;
  closeComparison: () => void;
  toggleComparison: () => void;
  
  // Actions - Item Management
  addToComparison: (item: BacklogItemType) => void;
  removeFromComparison: (itemId: string) => void;
  clearComparison: () => void;
  
  // Actions - Selection Management
  toggleComparisonSelection: (itemId: string) => void;
  selectAllForComparison: () => void;
  clearComparisonSelection: () => void;
  
  // Actions - Bulk Operations
  bulkAssignToGrid: () => void;
  
  // Actions - View Management
  setComparisonMode: (mode: 'grid' | 'list' | 'side-by-side') => void;
  
  // Utilities
  isInComparison: (itemId: string) => boolean;
  getSelectedItems: () => BacklogItemType[];
  getComparisonStats: () => {
    total: number;
    selected: number;
    hasItems: boolean;
    hasSelection: boolean;
  };
}

export const useComparisonStore = create<ComparisonState>()(
  persist(
    (set, get) => ({
      // Initial state
      items: [],
      selectedForComparison: [],
      comparisonMode: 'grid',
      isComparisonOpen: false,
      
      // Modal Management
      openComparison: () => set({ isComparisonOpen: true }),
      closeComparison: () => set({ 
        isComparisonOpen: false,
        selectedForComparison: [] // Clear selection when closing
      }),
      toggleComparison: () => set((state) => ({ isComparisonOpen: !state.isComparisonOpen })),
      
      // Item Management
      addToComparison: (item) => set((state) => {
        const isAlreadyInComparison = state.items.some(compareItem => compareItem.id === item.id);
        if (isAlreadyInComparison) return state;
        
        return {
          items: [...state.items, item]
        };
      }),
      
      removeFromComparison: (itemId) => set((state) => ({
        items: state.items.filter(item => item.id !== itemId),
        selectedForComparison: state.selectedForComparison.filter(id => id !== itemId)
      })),
      
      clearComparison: () => set({
        items: [],
        selectedForComparison: [],
        isComparisonOpen: false
      }),
      
      // Selection Management
      toggleComparisonSelection: (itemId) => set((state) => {
        const isSelected = state.selectedForComparison.includes(itemId);
        
        if (isSelected) {
          return {
            selectedForComparison: state.selectedForComparison.filter(id => id !== itemId)
          };
        } else {
          return {
            selectedForComparison: [...state.selectedForComparison, itemId]
          };
        }
      }),
      
      selectAllForComparison: () => set((state) => ({
        selectedForComparison: state.items.map(item => item.id)
      })),
      
      clearComparisonSelection: () => set({ selectedForComparison: [] }),
      
      // Bulk Operations
      bulkAssignToGrid: () => {
        const state = get();
        const gridStore = useGridStore.getState();
        
        state.selectedForComparison.forEach(itemId => {
          const item = state.items.find(i => i.id === itemId);
          if (item) {
            const nextPosition = gridStore.getNextAvailableGridPosition();
            if (nextPosition !== null) {
              gridStore.assignItemToGrid(item, nextPosition);
              get().removeFromComparison(item.id);
            }
          }
        });
      },
      
      // View Management
      setComparisonMode: (mode) => set({ comparisonMode: mode }),
      
      // Utilities
      isInComparison: (itemId) => {
        const state = get();
        return state.items.some(item => item.id === itemId);
      },
      
      getSelectedItems: () => {
        const state = get();
        return state.items.filter(item => state.selectedForComparison.includes(item.id));
      },
      
      getComparisonStats: () => {
        const state = get();
        return {
          total: state.items.length,
          selected: state.selectedForComparison.length,
          hasItems: state.items.length > 0,
          hasSelection: state.selectedForComparison.length > 0
        };
      }
    }),
    {
      name: 'comparison-store',
      partialize: (state) => ({
        items: state.items,
        selectedForComparison: state.selectedForComparison,
        comparisonMode: state.comparisonMode
      })
    }
  )
);

// Selector hooks for better performance
export const useComparisonItems = () => useComparisonStore((state) => state.items);
export const useComparisonModal = () => useComparisonStore((state) => ({
  isOpen: state.isComparisonOpen,
  open: state.openComparison,
  close: state.closeComparison,
  toggle: state.toggleComparison
}));
export const useComparisonSelection = () => useComparisonStore((state) => ({
  selected: state.selectedForComparison,
  toggle: state.toggleComparisonSelection,
  selectAll: state.selectAllForComparison,
  clear: state.clearComparisonSelection
}));
export const useComparisonStats = () => useComparisonStore((state) => state.getComparisonStats());