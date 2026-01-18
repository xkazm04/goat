/**
 * Grid Slice
 * Position-scoped state management for fine-grained reactivity
 * Each position can be subscribed to independently to minimize re-renders
 */

import { StateCreator } from 'zustand';
import { GridItemType } from '@/types/match';

/**
 * Position change listener
 */
export type PositionChangeListener = (
  position: number,
  item: GridItemType | null,
  previousItem: GridItemType | null
) => void;

/**
 * Grid slice state
 */
export interface GridSliceState {
  /** Grid items by position */
  items: Map<number, GridItemType>;
  /** Maximum grid size */
  maxSize: number;
  /** Active drag position (item being dragged from) */
  activeDragPosition: number | null;
  /** Preview position (where item would drop) */
  previewPosition: number | null;
  /** Positions currently animating */
  animatingPositions: Set<number>;
  /** Position change listeners */
  positionListeners: Map<number, Set<PositionChangeListener>>;
}

/**
 * Grid slice actions
 */
export interface GridSliceActions {
  /** Set item at position */
  setItemAtPosition: (position: number, item: GridItemType | null) => void;
  /** Move item between positions */
  moveItem: (from: number, to: number) => void;
  /** Swap items between positions */
  swapItems: (posA: number, posB: number) => void;
  /** Clear position */
  clearPosition: (position: number) => void;
  /** Set active drag position */
  setActiveDragPosition: (position: number | null) => void;
  /** Set preview position */
  setPreviewPosition: (position: number | null) => void;
  /** Add animating position */
  addAnimatingPosition: (position: number) => void;
  /** Remove animating position */
  removeAnimatingPosition: (position: number) => void;
  /** Subscribe to position changes */
  subscribeToPosition: (
    position: number,
    listener: PositionChangeListener
  ) => () => void;
  /** Batch update multiple positions */
  batchUpdate: (updates: Array<{ position: number; item: GridItemType | null }>) => void;
}

/**
 * Grid slice type
 */
export type GridSlice = GridSliceState & GridSliceActions;

/**
 * Initial state
 */
const initialState: GridSliceState = {
  items: new Map(),
  maxSize: 50,
  activeDragPosition: null,
  previewPosition: null,
  animatingPositions: new Set(),
  positionListeners: new Map(),
};

/**
 * Create grid slice
 */
export const createGridSlice: StateCreator<GridSlice> = (set, get) => ({
  ...initialState,

  setItemAtPosition: (position, item) => {
    const state = get();
    const previousItem = state.items.get(position) ?? null;

    // Skip if no change
    if (
      (item === null && previousItem === null) ||
      (item?.id === previousItem?.id && item?.matched === previousItem?.matched)
    ) {
      return;
    }

    const newItems = new Map(state.items);
    if (item) {
      newItems.set(position, item);
    } else {
      newItems.delete(position);
    }

    set({ items: newItems });

    // Notify position listeners
    const listeners = state.positionListeners.get(position);
    if (listeners) {
      listeners.forEach((listener) => listener(position, item, previousItem));
    }
  },

  moveItem: (from, to) => {
    const state = get();
    const item = state.items.get(from);

    if (!item) return;

    const newItems = new Map(state.items);
    newItems.delete(from);
    newItems.set(to, { ...item, position: to });

    set({ items: newItems });

    // Notify listeners for both positions
    const fromListeners = state.positionListeners.get(from);
    const toListeners = state.positionListeners.get(to);

    if (fromListeners) {
      fromListeners.forEach((listener) => listener(from, null, item));
    }
    if (toListeners) {
      const previousToItem = state.items.get(to) ?? null;
      toListeners.forEach((listener) =>
        listener(to, { ...item, position: to }, previousToItem)
      );
    }
  },

  swapItems: (posA, posB) => {
    const state = get();
    const itemA = state.items.get(posA);
    const itemB = state.items.get(posB);

    const newItems = new Map(state.items);

    if (itemA) {
      newItems.set(posB, { ...itemA, position: posB });
    } else {
      newItems.delete(posB);
    }

    if (itemB) {
      newItems.set(posA, { ...itemB, position: posA });
    } else {
      newItems.delete(posA);
    }

    set({ items: newItems });

    // Notify listeners
    const listenersA = state.positionListeners.get(posA);
    const listenersB = state.positionListeners.get(posB);

    if (listenersA) {
      listenersA.forEach((listener) =>
        listener(posA, itemB ? { ...itemB, position: posA } : null, itemA ?? null)
      );
    }
    if (listenersB) {
      listenersB.forEach((listener) =>
        listener(posB, itemA ? { ...itemA, position: posB } : null, itemB ?? null)
      );
    }
  },

  clearPosition: (position) => {
    const state = get();
    const previousItem = state.items.get(position);

    if (!previousItem) return;

    const newItems = new Map(state.items);
    newItems.delete(position);

    set({ items: newItems });

    // Notify listeners
    const listeners = state.positionListeners.get(position);
    if (listeners) {
      listeners.forEach((listener) => listener(position, null, previousItem));
    }
  },

  setActiveDragPosition: (position) => {
    set({ activeDragPosition: position });
  },

  setPreviewPosition: (position) => {
    set({ previewPosition: position });
  },

  addAnimatingPosition: (position) => {
    set((state) => ({
      animatingPositions: new Set([...Array.from(state.animatingPositions), position]),
    }));
  },

  removeAnimatingPosition: (position) => {
    set((state) => {
      const newSet = new Set(state.animatingPositions);
      newSet.delete(position);
      return { animatingPositions: newSet };
    });
  },

  subscribeToPosition: (position, listener) => {
    const state = get();
    const listeners = state.positionListeners.get(position) ?? new Set();
    listeners.add(listener);

    set({
      positionListeners: new Map(state.positionListeners).set(position, listeners),
    });

    // Return unsubscribe function
    return () => {
      const currentState = get();
      const currentListeners = currentState.positionListeners.get(position);
      if (currentListeners) {
        currentListeners.delete(listener);
        if (currentListeners.size === 0) {
          const newMap = new Map(currentState.positionListeners);
          newMap.delete(position);
          set({ positionListeners: newMap });
        }
      }
    };
  },

  batchUpdate: (updates) => {
    const state = get();
    const newItems = new Map(state.items);
    const notifications: Array<{
      position: number;
      item: GridItemType | null;
      previousItem: GridItemType | null;
    }> = [];

    for (const { position, item } of updates) {
      const previousItem = newItems.get(position) ?? null;

      if (item) {
        newItems.set(position, item);
      } else {
        newItems.delete(position);
      }

      notifications.push({ position, item, previousItem });
    }

    set({ items: newItems });

    // Notify all affected listeners
    for (const { position, item, previousItem } of notifications) {
      const listeners = state.positionListeners.get(position);
      if (listeners) {
        listeners.forEach((listener) => listener(position, item, previousItem));
      }
    }
  },
});

/**
 * Position-scoped selector creator
 * Returns a selector that only triggers when the specific position changes
 */
export function createPositionSelector(position: number) {
  return (state: GridSlice) => state.items.get(position) ?? null;
}

/**
 * Check if position is being dragged
 */
export function createIsDraggingSelector(position: number) {
  return (state: GridSlice) => state.activeDragPosition === position;
}

/**
 * Check if position is preview target
 */
export function createIsPreviewSelector(position: number) {
  return (state: GridSlice) => state.previewPosition === position;
}

/**
 * Check if position is animating
 */
export function createIsAnimatingSelector(position: number) {
  return (state: GridSlice) => state.animatingPositions.has(position);
}

export default createGridSlice;
