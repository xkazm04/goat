/**
 * Grid Store - Single Source of Truth for Drag & Drop
 *
 * This store is the authoritative handler for all drag-and-drop operations in the application.
 * It uses TransferProtocol utilities for consistent ID parsing and handles:
 * - Backlog to grid assignment
 * - Grid to grid move/swap
 * - Position validation
 * - Session synchronization
 *
 * Session-store handles session persistence, backlog-store handles backlog groups.
 * This store owns all grid state and drag/drop logic.
 * Components should use useMatchGridState().handleDragEnd which delegates here.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GridItemType } from '@/types/match';
import { BacklogItem } from '@/types/backlog-groups';
import { DragEndEvent } from '@dnd-kit/core';
import { useSessionStore } from './session-store';
import {
  TransferableItem,
  TransferResult,
  isGridReceiverId,
  extractGridPosition,
  createGridReceiverId,
} from '@/lib/dnd';
import {
  createGridItem,
  createEmptyGridSlot,
  createEmptyGrid,
} from '@/lib/grid';
import {
  getValidationAuthority,
  logValidationFailure,
  ValidationErrorCode,
} from '@/lib/validation';
import { createLazyStoreAccessor } from '@/lib/stores/lazy-store-accessor';
import { gridLogger } from '@/lib/logger';

// Re-export for backwards compatibility
export type { ValidationErrorCode as TransferValidationErrorCode } from '@/lib/validation';

/**
 * Lazy accessor for backlog-store to avoid circular dependency issues.
 * Uses retry logic in case user drags immediately before module initializes.
 */
const backlogStoreAccessor = createLazyStoreAccessor(
  () => require('@/stores/backlog-store').useBacklogStore,
  { storeName: 'backlog-store', maxRetries: 5, retryDelay: 20 }
);

/**
 * Lazy accessor for validation-notification-store.
 * Uses the dedicated notification store instead of going through match-store.
 */
const notificationStoreAccessor = createLazyStoreAccessor(
  () => require('./validation-notification-store').useValidationNotificationStore,
  { storeName: 'validation-notification-store', maxRetries: 5, retryDelay: 20 }
);

/**
 * Lock set for items currently being assigned to prevent race conditions.
 * When a user double-clicks drag rapidly, the second drag validates while
 * the first markItemAsUsed() is still pending. This lock prevents that
 * by making validation-assignment-marking atomic.
 */
const itemsBeingAssigned = new Set<string>();

/**
 * Atomically attempt to acquire a lock for an item.
 * Returns true if lock acquired, false if item is already locked.
 */
function acquireItemLock(itemId: string): boolean {
  if (itemsBeingAssigned.has(itemId)) {
    return false;
  }
  itemsBeingAssigned.add(itemId);
  return true;
}

/**
 * Release the lock for an item after assignment completes.
 */
function releaseItemLock(itemId: string): void {
  itemsBeingAssigned.delete(itemId);
}

/**
 * Compute grid statistics from gridItems array.
 * This function is called once whenever gridItems changes,
 * avoiding redundant O(n) filter operations during renders.
 */
function computeGridStatistics(gridItems: GridItemType[]): GridStatistics {
  const total = gridItems.length;
  const matchedCount = gridItems.reduce((count, item) => count + (item.matched ? 1 : 0), 0);
  const emptyCount = total - matchedCount;
  const percentage = total > 0 ? Math.round((matchedCount / total) * 100) : 0;

  return {
    matchedCount,
    emptyCount,
    total,
    percentage,
    isComplete: matchedCount === total && total > 0,
  };
}

export interface GridStatistics {
  matchedCount: number;
  emptyCount: number;
  total: number;
  percentage: number;
  isComplete: boolean;
}

export interface GridStoreState {
  // Core state
  gridItems: GridItemType[];
  maxGridSize: number;
  selectedGridItem: string | null;
  activeItem: string | null;
  isTutorialMode: boolean;

  // Per-list grid persistence
  currentListId: string | null;
  listGridCache: Record<string, { gridItems: GridItemType[]; maxGridSize: number }>;

  // Computed statistics (updated automatically when gridItems changes)
  gridStatistics: GridStatistics;

  // Actions - Grid setup
  initializeGrid: (size: number, listId?: string, category?: string) => void;
  switchList: (listId: string, size: number) => void;
  syncWithSession: () => void;
  loadFromSession: (items: GridItemType[], size: number) => void;
  setTutorialMode: (enabled: boolean) => void;
  loadTutorialData: (items: GridItemType[]) => void;

  // Actions - Item placement
  assignItemToGrid: (item: BacklogItem | GridItemType, position: number) => void;
  removeItemFromGrid: (position: number) => void;
  removeItemByItemId: (itemId: string) => void;
  moveGridItem: (fromPosition: number, toPosition: number) => void;
  clearGrid: () => void;

  // Actions - Selection
  setSelectedGridItem: (id: string | null) => void;
  setActiveItem: (id: string | null) => void;

  // Actions - Drag & Drop
  handleDragEnd: (event: DragEndEvent) => void;

  // Actions - Validation
  emitValidationError: (errorCode: ValidationErrorCode) => void;

  // TransferProtocol Integration
  /** Convert a TransferableItem to GridItemType and assign to position */
  receiveTransferableItem: (item: TransferableItem, position: number) => TransferResult;
  /** Check if a position can receive an item (TransferProtocol compatible) */
  canReceiveAtPosition: (position: number) => boolean;
  /** Get item at position as TransferableItem (for use as source) */
  getTransferableItemAtPosition: (position: number) => TransferableItem | null;
  /** Swap items at two positions (TransferProtocol compatible) */
  swapPositions: (positionA: number, positionB: number) => TransferResult;

  // Utilities
  getMatchedItems: () => GridItemType[];
  getNextAvailableGridPosition: () => number | null;
  canAddAtPosition: (position: number) => boolean;
}

// Initial empty grid statistics
const emptyGridStatistics: GridStatistics = {
  matchedCount: 0,
  emptyCount: 0,
  total: 0,
  percentage: 0,
  isComplete: false,
};

export const useGridStore = create<GridStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      gridItems: [],
      maxGridSize: 50,
      selectedGridItem: null,
      activeItem: null,
      isTutorialMode: false,
      currentListId: null,
      listGridCache: {},
      gridStatistics: emptyGridStatistics,

      // Initialize a new grid
      initializeGrid: (size, listId, category) => {
        const state = get();
        const emptyGridItems = createEmptyGrid(size);

        gridLogger.debug(`Initializing grid with ${size} positions for list ${listId || 'unknown'}`);

        // If we have a different current list, save its grid to cache first
        const updatedCache = { ...state.listGridCache };
        if (state.currentListId && state.currentListId !== listId && state.gridItems.length > 0) {
          updatedCache[state.currentListId] = {
            gridItems: state.gridItems,
            maxGridSize: state.maxGridSize,
          };
        }

        set({
          gridItems: emptyGridItems,
          maxGridSize: size,
          selectedGridItem: null,
          gridStatistics: computeGridStatistics(emptyGridItems),
          currentListId: listId || null,
          listGridCache: updatedCache,
        });

        // Save grid to session if listId provided
        if (listId) {
          const sessionStore = useSessionStore.getState();
          sessionStore.updateSessionGridItems(emptyGridItems);
          gridLogger.debug(`Grid initialized and saved to session ${listId}`);
        }
      },

      // Switch to a different list - saves current grid to cache and loads/creates grid for new list
      switchList: (listId, size) => {
        const state = get();

        gridLogger.debug(`Switching from list ${state.currentListId} to ${listId} (size: ${size})`);

        // If same list, just ensure size is correct
        if (state.currentListId === listId) {
          if (state.maxGridSize !== size) {
            // Resize grid if needed
            const resizedGrid = [...state.gridItems];
            if (resizedGrid.length < size) {
              for (let i = resizedGrid.length; i < size; i++) {
                resizedGrid.push(createEmptyGridSlot(i));
              }
            } else if (resizedGrid.length > size) {
              resizedGrid.length = size;
            }
            set({
              gridItems: resizedGrid,
              maxGridSize: size,
              gridStatistics: computeGridStatistics(resizedGrid),
            });
          }
          return;
        }

        // Save current grid to cache (if we have a current list)
        const updatedCache = { ...state.listGridCache };
        if (state.currentListId && state.gridItems.length > 0) {
          updatedCache[state.currentListId] = {
            gridItems: state.gridItems,
            maxGridSize: state.maxGridSize,
          };
          gridLogger.debug(`Saved grid for list ${state.currentListId} to cache`);
        }

        // Load cached grid for new list or create empty grid
        const cached = updatedCache[listId];
        let newGridItems: GridItemType[];
        let newMaxSize: number;

        if (cached && cached.gridItems.length > 0) {
          gridLogger.debug(`Loading cached grid for list ${listId} (${cached.gridItems.length} items)`);
          newGridItems = cached.gridItems;
          newMaxSize = cached.maxGridSize;

          // Resize if size changed
          if (newMaxSize !== size) {
            if (newGridItems.length < size) {
              for (let i = newGridItems.length; i < size; i++) {
                newGridItems.push(createEmptyGridSlot(i));
              }
            } else if (newGridItems.length > size) {
              newGridItems = newGridItems.slice(0, size);
            }
            newMaxSize = size;
          }
        } else {
          gridLogger.debug(`Creating new empty grid for list ${listId}`);
          newGridItems = createEmptyGrid(size);
          newMaxSize = size;
        }

        set({
          gridItems: newGridItems,
          maxGridSize: newMaxSize,
          currentListId: listId,
          listGridCache: updatedCache,
          selectedGridItem: null,
          gridStatistics: computeGridStatistics(newGridItems),
        });

        // Update session store with new grid
        const sessionStore = useSessionStore.getState();
        sessionStore.updateSessionGridItems(newGridItems);
      },

      // Sync with session store
      syncWithSession: () => {
        const sessionStore = useSessionStore.getState();
        const activeSession = sessionStore.getActiveSession();

        if (activeSession && activeSession.gridItems) {
          set({
            gridItems: activeSession.gridItems,
            maxGridSize: activeSession.gridItems.length,
            selectedGridItem: null,
            gridStatistics: computeGridStatistics(activeSession.gridItems),
          });
          gridLogger.debug(`Synced with session (${activeSession.gridItems.length} items)`);
        } else {
          gridLogger.warn(`No session data found for sync`);
        }
      },

      // Load grid from session
      loadFromSession: (items, size) => {
        // Ensure items array has the right size
        const gridItems = [...items];
        if (gridItems.length < size) {
          // Add empty slots if needed using factory
          const currentLength = gridItems.length;
          for (let i = currentLength; i < size; i++) {
            gridItems.push(createEmptyGridSlot(i));
          }
        } else if (gridItems.length > size) {
          // Trim if too large
          gridItems.length = size;
        }

        gridLogger.debug(`Loaded ${gridItems.length} items from session`);

        set({
          gridItems,
          maxGridSize: size,
          selectedGridItem: null,
          gridStatistics: computeGridStatistics(gridItems),
        });
      },

      // Place a backlog item in the grid
      assignItemToGrid: (item, position) => {
        set(state => {
          gridLogger.debug(`Assigning item to position ${position}`);

          // Create a copy of the grid items
          const newGridItems = [...state.gridItems];

          // Check if position is valid
          if (position < 0 || position >= newGridItems.length) {
            gridLogger.warn(`Invalid position ${position}`);
            return state;
          }

          // Check if position is already filled
          if (newGridItems[position].matched) {
            gridLogger.warn(`Position ${position} already has an item`);
            return state;
          }

          // Use factory to create grid item - handles both BacklogItem and GridItemType
          const gridItem = createGridItem(item, position);

          // Update the grid item at the specified position
          newGridItems[position] = gridItem;

          // Update session store if needed
          const sessionStore = useSessionStore.getState();
          sessionStore.updateSessionGridItems(newGridItems);

          return {
            gridItems: newGridItems,
            gridStatistics: computeGridStatistics(newGridItems),
          };
        });
      },
      // Remove an item from a grid position
      removeItemFromGrid: (position) => {
        set(state => {
          gridLogger.debug(`Removing item from position ${position}`);

          // Create a copy of the grid items
          const newGridItems = [...state.gridItems];

          // Check if position is valid
          if (position < 0 || position >= newGridItems.length) {
            gridLogger.warn(`Invalid position ${position}`);
            return state;
          }

          // Reset the grid item at the specified position using factory
          newGridItems[position] = createEmptyGridSlot(position);

          // Update session store
          const sessionStore = useSessionStore.getState();
          sessionStore.updateSessionGridItems(newGridItems);

          return {
            gridItems: newGridItems,
            gridStatistics: computeGridStatistics(newGridItems),
            // Clear selection if the removed item was selected
            selectedGridItem: state.selectedGridItem === `grid-${position}` ? null : state.selectedGridItem
          };
        });
      },

      // Remove an item by the backlog item ID
      removeItemByItemId: (itemId) => {
        set(state => {
          gridLogger.debug(`Removing item by backlog ID ${itemId}`);

          const newGridItems = [...state.gridItems];
          let updated = false;

          // Find all grid items with this backlogItemId
          for (let i = 0; i < newGridItems.length; i++) {
            if (newGridItems[i].backlogItemId === itemId) {
              gridLogger.debug(`Found item in position ${i}`);

              // Reset the grid item at the specified position using factory
              newGridItems[i] = createEmptyGridSlot(i);
              updated = true;
            }
          }

          if (!updated) {
            gridLogger.warn(`Item with ID ${itemId} not found in grid`);

            // Debug log to see what's in the grid
            gridLogger.debug('Current grid items:',
              state.gridItems
                .filter(item => item.matched)
                .map(item => ({
                  position: item.position,
                  backlogItemId: item.backlogItemId,
                  title: item.title
                }))
            );

            return state;
          }

          // Update session store
          const sessionStore = useSessionStore.getState();
          sessionStore.updateSessionGridItems(newGridItems);

          return {
            gridItems: newGridItems,
            gridStatistics: computeGridStatistics(newGridItems),
            // Clear selection if needed
            selectedGridItem: state.selectedGridItem && state.gridItems.find(
              item => item.id === state.selectedGridItem && item.backlogItemId === itemId
            ) ? null : state.selectedGridItem
          };
        });
      },

      // Move a grid item from one position to another
      moveGridItem: (fromPosition, toPosition) => {
        set(state => {
          gridLogger.debug(`Moving item from position ${fromPosition} to ${toPosition}`);

          // Create a copy of the grid items
          const newGridItems = [...state.gridItems];

          // Check if positions are valid
          if (
            fromPosition < 0 || fromPosition >= newGridItems.length ||
            toPosition < 0 || toPosition >= newGridItems.length
          ) {
            gridLogger.warn(`Invalid positions - from: ${fromPosition}, to: ${toPosition}`);
            return state;
          }

          // Check if source position has an item
          if (!newGridItems[fromPosition].matched) {
            gridLogger.warn(`No item at position ${fromPosition}`);
            return state;
          }

          // Get the item to move
          const itemToMove = { ...newGridItems[fromPosition] };

          // If target position already has an item, swap them
          if (newGridItems[toPosition].matched) {
            gridLogger.debug(`Swapping items at positions ${fromPosition} and ${toPosition}`);

            const targetItem = { ...newGridItems[toPosition] };

            // Update positions and IDs
            itemToMove.position = toPosition;
            itemToMove.id = createGridReceiverId(toPosition);
            targetItem.position = fromPosition;
            targetItem.id = createGridReceiverId(fromPosition);

            // Perform the swap
            newGridItems[fromPosition] = targetItem;
            newGridItems[toPosition] = itemToMove;
          } else {
            // Move the item to the empty target position
            itemToMove.position = toPosition;
            itemToMove.id = createGridReceiverId(toPosition);

            // Set the source position to empty using factory
            newGridItems[fromPosition] = createEmptyGridSlot(fromPosition);

            // Set the target position to the moved item
            newGridItems[toPosition] = itemToMove;
          }

          // Update session store
          const sessionStore = useSessionStore.getState();
          sessionStore.updateSessionGridItems(newGridItems);

          return {
            gridItems: newGridItems,
            gridStatistics: computeGridStatistics(newGridItems),
          };
        });
      },

      // Clear all items from the grid
      clearGrid: () => {
        set(state => {
          gridLogger.debug(`Clearing entire grid`);

          const emptyGridItems = createEmptyGrid(state.gridItems.length);

          // Update session store
          const sessionStore = useSessionStore.getState();
          sessionStore.updateSessionGridItems(emptyGridItems);

          return {
            gridItems: emptyGridItems,
            gridStatistics: computeGridStatistics(emptyGridItems),
            selectedGridItem: null
          };
        });
      },

      // Set the selected grid item
      setSelectedGridItem: (id) => set({ selectedGridItem: id }),

      // Set the active drag item
      setActiveItem: (id) => set({ activeItem: id }),

      // Handle drag end events (uses TransferProtocol utilities for ID parsing)
      handleDragEnd: (event) => {
        const { active, over } = event;

        if (!active || !over) {
          return;
        }

        const activeId = String(active.id);
        const overId = String(over.id);

        gridLogger.debug(`Drag end ${activeId} -> ${overId}`);

        // Use TransferProtocol utilities for consistent ID parsing
        const isActiveFromGrid = isGridReceiverId(activeId);
        const isTargetGrid = isGridReceiverId(overId);

        // Grid item to grid position (move/swap)
        if (isActiveFromGrid && isTargetGrid) {
          const fromPosition = extractGridPosition(activeId);
          const toPosition = extractGridPosition(overId);

          if (fromPosition !== null && toPosition !== null && fromPosition !== toPosition) {
            get().moveGridItem(fromPosition, toPosition);
          }
          return;
        }

        // Backlog/external item to grid position (assign)
        if (!isActiveFromGrid && isTargetGrid) {
          const toPosition = extractGridPosition(overId);

          if (toPosition === null) {
            gridLogger.warn(`Invalid grid position from ${overId}`);
            // Emit validation error to match-store
            get().emitValidationError('TARGET_POSITION_INVALID');
            return;
          }

          // Use lazy accessor to safely get backlog store state
          // This handles race conditions if user drags before module initializes
          const backlogState = backlogStoreAccessor.getState();

          if (!backlogState) {
            gridLogger.error('Backlog store not initialized - cannot complete drag operation');
            get().emitValidationError('SOURCE_NOT_FOUND');
            return;
          }

          // RACE CONDITION FIX: Acquire lock BEFORE validation to prevent
          // double-click drag placing same item in two grid positions.
          // If user double-clicks rapidly, second drag will fail to acquire lock.
          if (!acquireItemLock(activeId)) {
            gridLogger.warn(`Item ${activeId} is already being assigned (concurrent drag blocked)`);
            get().emitValidationError('SOURCE_ALREADY_USED');
            return;
          }

          const state = get();

          // Use ValidationAuthority for comprehensive validation
          const authority = getValidationAuthority();
          const validationResult = authority.canTransfer(
            {
              itemId: activeId,
              from: 'backlog',
              to: 'grid',
              toPosition,
            },
            {
              gridItems: state.gridItems,
              maxGridSize: state.maxGridSize,
            },
            {
              getItemById: backlogState.getItemById,
              isItemUsed: backlogState.isItemUsed,
              isItemLocked: (id) => itemsBeingAssigned.has(id) && id !== activeId,
            }
          );

          // Handle validation failure
          if (!validationResult.isValid) {
            // Release lock on validation failure
            releaseItemLock(activeId);

            logValidationFailure(validationResult, {
              activeId,
              overId,
              operation: 'backlog-to-grid',
            });

            // Emit error to match-store for UI notification
            if (validationResult.errorCode) {
              get().emitValidationError(validationResult.errorCode);
            }
            return;
          }

          // Validation passed - proceed with assignment
          const item = validationResult.item;

          if (item) {
            gridLogger.debug(`Validated backlog item:`, {
              id: item.id,
              title: item.title || item.name,
              hasImageUrl: !!item.image_url
            });

            // Use factory to create grid item with consistent image_url handling
            const gridItem = createGridItem(item, toPosition);

            // ATOMIC OPERATION: Assign item to grid and mark as used together
            // This prevents race condition where item appears in multiple positions
            get().assignItemToGrid(gridItem, toPosition);
            backlogState.markItemAsUsed(item.id, true);

            // Release lock only after both operations complete
            releaseItemLock(activeId);

            gridLogger.info(`Successfully assigned item to position ${toPosition}`);
          } else {
            // Edge case: validation passed but no item (shouldn't happen)
            releaseItemLock(activeId);
          }
        }
      },

      // Emit validation error to validation-notification-store
      emitValidationError: (errorCode: ValidationErrorCode) => {
        // Use lazy accessor to safely get notification store state
        // This handles race conditions if user drags before module initializes
        const notificationState = notificationStoreAccessor.getState();

        if (notificationState && typeof notificationState.emitValidationError === 'function') {
          notificationState.emitValidationError(errorCode);
        } else {
          gridLogger.error('Notification store not initialized - cannot emit validation error');
        }
      },

      // TransferProtocol Integration Methods

      // Receive a TransferableItem and convert to GridItemType
      receiveTransferableItem: (item, position): TransferResult => {
        const state = get();

        // Validate position
        if (position < 0 || position >= state.gridItems.length) {
          return {
            success: false,
            action: 'reject',
            error: `Invalid position: ${position}`,
          };
        }

        // Check if position is occupied
        const isOccupied = state.gridItems[position].matched;

        if (isOccupied) {
          return {
            success: false,
            action: 'reject',
            error: `Position ${position} is already occupied`,
          };
        }

        // Use factory to convert TransferableItem to GridItemType
        const gridItem = createGridItem(item, position);

        // Assign to grid
        get().assignItemToGrid(gridItem, position);

        return {
          success: true,
          action: 'assign',
          item: gridItem as unknown as TransferableItem,
          metadata: { toPosition: position },
        };
      },

      // Check if position can receive (TransferProtocol compatible)
      // Delegates to ValidationAuthority for consistent validation
      canReceiveAtPosition: (position) => {
        const { gridItems, maxGridSize } = get();
        const authority = getValidationAuthority();
        return authority.canReceiveAtPosition(position, { gridItems, maxGridSize });
      },

      // Get item at position as TransferableItem
      getTransferableItemAtPosition: (position) => {
        const { gridItems } = get();

        if (position < 0 || position >= gridItems.length) {
          return null;
        }

        const gridItem = gridItems[position];

        if (!gridItem.matched) {
          return null;
        }

        // Convert GridItemType to TransferableItem
        return {
          id: gridItem.backlogItemId || gridItem.id,
          title: gridItem.title,
          description: gridItem.description,
          image_url: gridItem.image_url,
          tags: gridItem.tags,
        };
      },

      // Swap items at two positions
      swapPositions: (positionA, positionB): TransferResult => {
        const state = get();

        // Validate positions
        if (
          positionA < 0 || positionA >= state.gridItems.length ||
          positionB < 0 || positionB >= state.gridItems.length
        ) {
          return {
            success: false,
            action: 'reject',
            error: 'Invalid positions',
          };
        }

        // At least one must be occupied
        const aOccupied = state.gridItems[positionA].matched;
        const bOccupied = state.gridItems[positionB].matched;

        if (!aOccupied && !bOccupied) {
          return {
            success: false,
            action: 'reject',
            error: 'Both positions are empty',
          };
        }

        // Use moveGridItem which already handles swap logic
        get().moveGridItem(positionA, positionB);

        return {
          success: true,
          action: aOccupied && bOccupied ? 'swap' : 'move',
          metadata: {
            fromPosition: positionA,
            toPosition: positionB,
            wasSwap: aOccupied && bOccupied,
          },
        };
      },

      // Get all matched grid items
      getMatchedItems: () => {
        return get().gridItems.filter(item => item.matched);
      },

      // Find the next available grid position
      getNextAvailableGridPosition: () => {
        const { gridItems } = get();
        const emptyPosition = gridItems.findIndex(item => !item.matched);
        return emptyPosition !== -1 ? emptyPosition : null;
      },

      // Check if an item can be added at a specific position
      // Delegates to ValidationAuthority for consistent validation
      canAddAtPosition: (position) => {
        const { gridItems, maxGridSize } = get();
        const authority = getValidationAuthority();
        return authority.canReceiveAtPosition(position, { gridItems, maxGridSize });
      },

      // Tutorial mode management
      setTutorialMode: (enabled) => {
        gridLogger.debug(`Tutorial mode ${enabled ? 'enabled' : 'disabled'}`);
        set({ isTutorialMode: enabled });
      },

      // Load tutorial demo data into grid
      loadTutorialData: (items) => {
        gridLogger.debug(`Loading ${items.length} tutorial items`);

        // Create a full grid with tutorial items at the start
        const tutorialGrid: GridItemType[] = Array.from({ length: 10 }, (_, i) => {
          const tutorialItem = items.find(item => item.position === i);
          if (tutorialItem) {
            return tutorialItem;
          }
          return createEmptyGridSlot(i);
        });

        set({
          gridItems: tutorialGrid,
          maxGridSize: 10,
          isTutorialMode: true,
          gridStatistics: computeGridStatistics(tutorialGrid),
        });
      }
    }),
    {
      name: 'grid-store',
      partialize: (state) => ({
        gridItems: state.gridItems,
        maxGridSize: state.maxGridSize,
        gridStatistics: state.gridStatistics,
        currentListId: state.currentListId,
        listGridCache: state.listGridCache,
      }),
      // Re-compute statistics on hydration and restore correct list's grid from cache
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Re-compute statistics
          if (state.gridItems) {
            state.gridStatistics = computeGridStatistics(state.gridItems);
          }

          // Ensure listGridCache exists
          if (!state.listGridCache) {
            state.listGridCache = {};
          }

          // If we have a currentListId, ensure the current grid is from that list's cache
          if (state.currentListId && state.listGridCache[state.currentListId]) {
            const cached = state.listGridCache[state.currentListId];
            state.gridItems = cached.gridItems;
            state.maxGridSize = cached.maxGridSize;
            state.gridStatistics = computeGridStatistics(cached.gridItems);
          }
        }
      },
    }
  )
);

/**
 * Position-scoped selectors for fine-grained reactivity
 * These selectors only trigger re-renders when the specific position changes
 */

/**
 * Create a selector for a specific grid position
 * Only re-renders when the item at that position changes
 */
export function createPositionSelector(position: number) {
  return (state: GridStoreState) => state.gridItems[position] ?? null;
}

/**
 * Hook to get item at a specific position with minimal re-renders
 */
export function useGridItemAtPosition(position: number): GridItemType | null {
  return useGridStore((state) => state.gridItems[position] ?? null);
}

/**
 * Hook to check if a position is occupied
 */
export function useIsPositionOccupied(position: number): boolean {
  return useGridStore((state) => state.gridItems[position]?.matched ?? false);
}

/**
 * Hook to get the backlog item ID at a position
 */
export function useBacklogItemIdAtPosition(position: number): string | undefined {
  return useGridStore((state) => state.gridItems[position]?.backlogItemId);
}

/**
 * Hook to get the image URL at a position
 */
export function useImageUrlAtPosition(position: number): string | undefined | null {
  return useGridStore((state) => state.gridItems[position]?.image_url);
}

/**
 * Hook to get the title/name at a position
 */
export function useTitleAtPosition(position: number): string | undefined {
  return useGridStore((state) => {
    const item = state.gridItems[position];
    return item?.title;
  });
}

/**
 * Hook to get grid statistics
 */
export function useGridStatistics() {
  return useGridStore((state) => state.gridStatistics);
}

/**
 * Hook to get filled count
 */
export function useFilledCount(): number {
  return useGridStore((state) => state.gridStatistics.matchedCount);
}

/**
 * Hook to check if grid is complete
 */
export function useIsGridComplete(): boolean {
  return useGridStore((state) => {
    const { matchedCount } = state.gridStatistics;
    return matchedCount >= state.maxGridSize && state.maxGridSize > 0;
  });
}

/**
 * Hook to get an array of filled positions
 */
export function useFilledPositions(): number[] {
  return useGridStore((state) =>
    state.gridItems
      .map((item, index) => (item.matched ? index : -1))
      .filter((index) => index !== -1)
  );
}

/**
 * Hook to get an array of empty positions
 */
export function useEmptyPositions(): number[] {
  return useGridStore((state) =>
    state.gridItems
      .map((item, index) => (!item.matched ? index : -1))
      .filter((index) => index !== -1)
  );
}

/**
 * Batch selector for multiple positions
 * More efficient than multiple individual selectors when you need several positions
 */
export function useGridItemsAtPositions(positions: number[]): (GridItemType | null)[] {
  return useGridStore((state) =>
    positions.map((pos) => state.gridItems[pos] ?? null)
  );
}

/**
 * Selector for grid actions only (no state, no re-renders on state change)
 */
export function useGridActions() {
  return useGridStore((state) => ({
    assignItemToGrid: state.assignItemToGrid,
    removeItemFromGrid: state.removeItemFromGrid,
    moveGridItem: state.moveGridItem,
    clearGrid: state.clearGrid,
    loadTutorialData: state.loadTutorialData,
  }));
}