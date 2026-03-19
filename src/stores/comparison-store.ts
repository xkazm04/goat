import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { BacklogItemType } from '@/types/match';

// Comparison history entry
export interface ComparisonHistoryEntry {
  id: string;
  itemIds: string[];
  itemTitles: string[];
  timestamp: number;
  winnerId?: string; // Item that was ranked from this comparison
}

// Min/max items allowed in comparison
export const MIN_COMPARISON_ITEMS = 2;
export const MAX_COMPARISON_ITEMS = 4;
export const MAX_HISTORY_ENTRIES = 10;

interface ComparisonStoreState {
  // Core state
  isOpen: boolean;
  items: BacklogItemType[];
  selectedForComparison: string[];
  comparisonMode: 'grid' | 'list' | 'side-by-side';
  comparisonHistory: ComparisonHistoryEntry[];
  activeComparisonId: string | null;

  // Actions - Open/Close
  open: () => void;
  close: () => void;

  // Actions - Item Management
  toggleItem: (item: BacklogItemType) => void;
  removeItem: (itemId: string) => void;
  selectMultipleItems: (items: BacklogItemType[]) => void;
  swapItem: (oldItemId: string, newItem: BacklogItemType) => void;
  reorderItems: (fromIndex: number, toIndex: number) => void;
  clearAll: () => void;
  clearSelection: () => void;
  setComparisonMode: (mode: 'grid' | 'list' | 'side-by-side') => void;

  // Actions - History
  recordComparison: (winnerId?: string) => void;
  loadHistoryComparison: (historyId: string) => void;
  clearHistory: () => void;

  // Utilities
  isInComparison: (itemId: string) => boolean;
  canAddMore: () => boolean;
  canCompare: () => boolean;
  getSelectedItems: () => BacklogItemType[];
}

export const useComparisonStore = create<ComparisonStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      isOpen: false,
      items: [],
      selectedForComparison: [],
      comparisonMode: 'grid',
      comparisonHistory: [],
      activeComparisonId: null,

      // Open/Close
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),

      // Item Management
      toggleItem: (item) => {
        set(state => {
          const isCurrentlySelected = state.selectedForComparison.includes(item.id);

          if (isCurrentlySelected) {
            // Remove from selection and items
            const newItems = state.items.filter(i => i.id !== item.id);
            return {
              selectedForComparison: state.selectedForComparison.filter(id => id !== item.id),
              items: newItems,
              isOpen: newItems.length > 0 ? state.isOpen : false
            };
          } else {
            // Add to selection if under limit
            if (state.selectedForComparison.length >= MAX_COMPARISON_ITEMS) {
              return state;
            }

            const newItems = state.items.some(i => i.id === item.id)
              ? state.items
              : [...state.items, item];

            return {
              selectedForComparison: [...state.selectedForComparison, item.id],
              items: newItems,
              isOpen: true
            };
          }
        });
      },

      removeItem: (itemId) => {
        set(state => {
          const newItems = state.items.filter(item => item.id !== itemId);
          return {
            items: newItems,
            selectedForComparison: state.selectedForComparison.filter(id => id !== itemId),
            isOpen: newItems.length > 0 ? state.isOpen : false
          };
        });
      },

      selectMultipleItems: (items) => {
        set(state => {
          const itemsToAdd = items.slice(0, MAX_COMPARISON_ITEMS);
          const newIds = itemsToAdd.map(i => i.id);

          const existingItemsById = new Map(state.items.map(i => [i.id, i]));
          itemsToAdd.forEach(item => existingItemsById.set(item.id, item));

          return {
            selectedForComparison: newIds,
            items: Array.from(existingItemsById.values())
          };
        });
      },

      swapItem: (oldItemId, newItem) => {
        set(state => {
          const newSelectedIds = state.selectedForComparison.map(id =>
            id === oldItemId ? newItem.id : id
          );

          const newItems = state.items.filter(i => i.id !== oldItemId);
          if (!newItems.some(i => i.id === newItem.id)) {
            newItems.push(newItem);
          }

          return {
            selectedForComparison: newSelectedIds,
            items: newItems
          };
        });
      },

      reorderItems: (fromIndex, toIndex) => {
        set(state => {
          const newSelected = [...state.selectedForComparison];
          const [removed] = newSelected.splice(fromIndex, 1);
          newSelected.splice(toIndex, 0, removed);
          return { selectedForComparison: newSelected };
        });
      },

      clearAll: () => {
        set({
          items: [],
          selectedForComparison: [],
          isOpen: false,
          activeComparisonId: null
        });
      },

      clearSelection: () => {
        set({
          selectedForComparison: [],
          isOpen: false,
          activeComparisonId: null
        });
      },

      setComparisonMode: (mode) => {
        set({ comparisonMode: mode });
      },

      // History
      recordComparison: (winnerId) => {
        set(state => {
          const selectedItems = state.items.filter(i =>
            state.selectedForComparison.includes(i.id)
          );

          if (selectedItems.length < MIN_COMPARISON_ITEMS) {
            return state;
          }

          const historyEntry: ComparisonHistoryEntry = {
            id: `comparison-${Date.now()}`,
            itemIds: selectedItems.map(i => i.id),
            itemTitles: selectedItems.map(i => i.title),
            timestamp: Date.now(),
            winnerId
          };

          const newHistory = [historyEntry, ...state.comparisonHistory]
            .slice(0, MAX_HISTORY_ENTRIES);

          return {
            comparisonHistory: newHistory,
            activeComparisonId: historyEntry.id
          };
        });
      },

      loadHistoryComparison: (historyId) => {
        set(state => {
          const historyEntry = state.comparisonHistory.find(h => h.id === historyId);
          if (!historyEntry) return state;

          const matchingItems = state.items.filter(item =>
            historyEntry.itemIds.includes(item.id)
          );

          return {
            selectedForComparison: matchingItems.map(i => i.id),
            activeComparisonId: historyId,
            isOpen: matchingItems.length >= MIN_COMPARISON_ITEMS
          };
        });
      },

      clearHistory: () => {
        set({ comparisonHistory: [], activeComparisonId: null });
      },

      // Utilities
      isInComparison: (itemId) => {
        return get().items.some(item => item.id === itemId);
      },

      canAddMore: () => {
        return get().selectedForComparison.length < MAX_COMPARISON_ITEMS;
      },

      canCompare: () => {
        return get().selectedForComparison.length >= MIN_COMPARISON_ITEMS;
      },

      getSelectedItems: () => {
        const state = get();
        return state.selectedForComparison
          .map(id => state.items.find(item => item.id === id))
          .filter((item): item is BacklogItemType => item !== undefined);
      }
    }),
    {
      name: 'comparison-store',
      partialize: (state) => ({
        items: state.items,
        comparisonMode: state.comparisonMode,
        comparisonHistory: state.comparisonHistory
      })
    }
  )
);

// Selector hooks
export const useComparisonPanelState = () => useComparisonStore(state => ({
  isOpen: state.isOpen,
  selectedIds: state.selectedForComparison,
  selectedItems: state.getSelectedItems(),
  canAddMore: state.canAddMore(),
  canCompare: state.canCompare(),
  history: state.comparisonHistory,
  activeComparisonId: state.activeComparisonId
}));

export const useComparisonPanelActions = () => useComparisonStore(state => ({
  openPanel: state.open,
  closePanel: state.close,
  toggleSelection: state.toggleItem,
  selectMultiple: state.selectMultipleItems,
  clearSelection: state.clearSelection,
  swapItem: state.swapItem,
  recordComparison: state.recordComparison,
  loadHistory: state.loadHistoryComparison,
  clearHistory: state.clearHistory,
  reorder: state.reorderItems,
  isSelected: (itemId: string) => state.selectedForComparison.includes(itemId)
}));
