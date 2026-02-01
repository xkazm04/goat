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
  isComparisonOpen: boolean;
  items: BacklogItemType[];
  selectedForComparison: string[];
  comparisonMode: 'grid' | 'list' | 'side-by-side';

  // New comparison mode state
  isComparisonPanelOpen: boolean;
  comparisonHistory: ComparisonHistoryEntry[];
  activeComparisonId: string | null;

  // Actions
  openComparison: () => void;
  closeComparison: () => void;
  addToComparison: (item: BacklogItemType) => void;
  removeFromComparison: (itemId: string) => void;
  toggleComparisonSelection: (itemId: string) => void;
  clearComparison: () => void;
  setComparisonMode: (mode: 'grid' | 'list' | 'side-by-side') => void;

  // New actions for comparison panel
  openComparisonPanel: () => void;
  closeComparisonPanel: () => void;
  toggleItemSelection: (item: BacklogItemType) => void;
  selectMultipleItems: (items: BacklogItemType[]) => void;
  clearSelection: () => void;
  swapComparisonItem: (oldItemId: string, newItem: BacklogItemType) => void;
  recordComparison: (winnerId?: string) => void;
  loadHistoryComparison: (historyId: string) => void;
  clearHistory: () => void;
  reorderComparisonItems: (fromIndex: number, toIndex: number) => void;

  // Utilities
  isInComparison: (itemId: string) => boolean;
  isSelected: (itemId: string) => boolean;
  canAddMore: () => boolean;
  canCompare: () => boolean;
  getSelectedItems: () => BacklogItemType[];
}

export const useComparisonStore = create<ComparisonStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      isComparisonOpen: false,
      items: [],
      selectedForComparison: [],
      comparisonMode: 'grid',
      isComparisonPanelOpen: false,
      comparisonHistory: [],
      activeComparisonId: null,

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
            // Remove from selected items if it was selected
            selectedForComparison: state.selectedForComparison.filter(id => id !== itemId),
            // Close comparison if no items left
            isComparisonOpen: newItems.length > 0 ? state.isComparisonOpen : false
          };
        });
      },

      toggleComparisonSelection: (itemId) => {
        set(state => ({
          selectedForComparison: state.selectedForComparison.includes(itemId)
            ? state.selectedForComparison.filter(id => id !== itemId)
            : [...state.selectedForComparison, itemId]
        }));
      },

      clearComparison: () => {
        set({
          items: [],
          selectedForComparison: [],
          isComparisonOpen: false,
          isComparisonPanelOpen: false,
          activeComparisonId: null
        });
      },

      setComparisonMode: (mode) => {
        set({ comparisonMode: mode });
      },

      // New actions for comparison panel
      openComparisonPanel: () => {
        const state = get();
        if (state.selectedForComparison.length >= MIN_COMPARISON_ITEMS) {
          set({ isComparisonPanelOpen: true });
        }
      },

      closeComparisonPanel: () => {
        set({ isComparisonPanelOpen: false });
      },

      toggleItemSelection: (item) => {
        set(state => {
          const isCurrentlySelected = state.selectedForComparison.includes(item.id);

          if (isCurrentlySelected) {
            // Remove from selection
            return {
              selectedForComparison: state.selectedForComparison.filter(id => id !== item.id),
              items: state.items.filter(i => i.id !== item.id)
            };
          } else {
            // Add to selection if under limit
            if (state.selectedForComparison.length >= MAX_COMPARISON_ITEMS) {
              return state; // At limit, don't add
            }

            // Add item if not already in items array
            const newItems = state.items.some(i => i.id === item.id)
              ? state.items
              : [...state.items, item];

            return {
              selectedForComparison: [...state.selectedForComparison, item.id],
              items: newItems
            };
          }
        });
      },

      selectMultipleItems: (items) => {
        set(state => {
          // Take only up to MAX items
          const itemsToAdd = items.slice(0, MAX_COMPARISON_ITEMS);
          const newIds = itemsToAdd.map(i => i.id);

          // Merge with existing items, avoiding duplicates
          const existingItemsById = new Map(state.items.map(i => [i.id, i]));
          itemsToAdd.forEach(item => existingItemsById.set(item.id, item));

          return {
            selectedForComparison: newIds,
            items: Array.from(existingItemsById.values())
          };
        });
      },

      clearSelection: () => {
        set({
          selectedForComparison: [],
          isComparisonPanelOpen: false,
          activeComparisonId: null
        });
      },

      swapComparisonItem: (oldItemId, newItem) => {
        set(state => {
          // Replace old item with new item in selection
          const newSelectedIds = state.selectedForComparison.map(id =>
            id === oldItemId ? newItem.id : id
          );

          // Update items array
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

          // Add to history, keeping only last MAX entries
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

          // Find matching items that still exist
          const matchingItems = state.items.filter(item =>
            historyEntry.itemIds.includes(item.id)
          );

          return {
            selectedForComparison: matchingItems.map(i => i.id),
            activeComparisonId: historyId,
            isComparisonPanelOpen: matchingItems.length >= MIN_COMPARISON_ITEMS
          };
        });
      },

      clearHistory: () => {
        set({ comparisonHistory: [], activeComparisonId: null });
      },

      reorderComparisonItems: (fromIndex, toIndex) => {
        set(state => {
          const newSelected = [...state.selectedForComparison];
          const [removed] = newSelected.splice(fromIndex, 1);
          newSelected.splice(toIndex, 0, removed);
          return { selectedForComparison: newSelected };
        });
      },

      // Utilities
      isInComparison: (itemId) => {
        return get().items.some(item => item.id === itemId);
      },

      isSelected: (itemId) => {
        return get().selectedForComparison.includes(itemId);
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

// New selector hooks for comparison panel
export const useComparisonPanelState = () => useComparisonStore(state => ({
  isOpen: state.isComparisonPanelOpen,
  selectedIds: state.selectedForComparison,
  selectedItems: state.getSelectedItems(),
  canAddMore: state.canAddMore(),
  canCompare: state.canCompare(),
  history: state.comparisonHistory,
  activeComparisonId: state.activeComparisonId
}));

export const useComparisonPanelActions = () => useComparisonStore(state => ({
  openPanel: state.openComparisonPanel,
  closePanel: state.closeComparisonPanel,
  toggleSelection: state.toggleItemSelection,
  selectMultiple: state.selectMultipleItems,
  clearSelection: state.clearSelection,
  swapItem: state.swapComparisonItem,
  recordComparison: state.recordComparison,
  loadHistory: state.loadHistoryComparison,
  clearHistory: state.clearHistory,
  reorder: state.reorderComparisonItems,
  isSelected: state.isSelected
}));