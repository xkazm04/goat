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

  // Computed statistics (updated automatically when gridItems changes)
  gridStatistics: GridStatistics;

  // Actions - Grid setup
  initializeGrid: (size: number, listId?: string, category?: string) => void;
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
      gridStatistics: emptyGridStatistics,

      // Initialize a new grid
      initializeGrid: (size, listId, category) => {
        const emptyGridItems = createEmptyGrid(size);

        console.log(`🔄 GridStore: Initializing grid with ${size} positions`);

        set({
          gridItems: emptyGridItems,
          maxGridSize: size,
          selectedGridItem: null,
          gridStatistics: computeGridStatistics(emptyGridItems),
        });

        // Save grid to session if listId provided
        if (listId) {
          const sessionStore = useSessionStore.getState();
          sessionStore.updateSessionGridItems(emptyGridItems);
          console.log(`🔄 GridStore: Grid initialized and saved to session ${listId}`);
        }
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
          console.log(`🔄 GridStore: Synced with session (${activeSession.gridItems.length} items)`);
        } else {
          console.log(`⚠️ GridStore: No session data found for sync`);
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

        console.log(`🔄 GridStore: Loaded ${gridItems.length} items from session`);

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
          console.log(`🔄 GridStore: Assigning item to position ${position}`);

          // Create a copy of the grid items
          const newGridItems = [...state.gridItems];

          // Check if position is valid
          if (position < 0 || position >= newGridItems.length) {
            console.warn(`⚠️ GridStore: Invalid position ${position}`);
            return state;
          }

          // Check if position is already filled
          if (newGridItems[position].matched) {
            console.warn(`⚠️ GridStore: Position ${position} already has an item`);
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
          console.log(`🔄 GridStore: Removing item from position ${position}`);

          // Create a copy of the grid items
          const newGridItems = [...state.gridItems];

          // Check if position is valid
          if (position < 0 || position >= newGridItems.length) {
            console.warn(`⚠️ GridStore: Invalid position ${position}`);
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
          console.log(`🔄 GridStore: Removing item by backlog ID ${itemId}`);

          const newGridItems = [...state.gridItems];
          let updated = false;

          // Find all grid items with this backlogItemId
          for (let i = 0; i < newGridItems.length; i++) {
            if (newGridItems[i].backlogItemId === itemId) {
              console.log(`✅ GridStore: Found item in position ${i}`);

              // Reset the grid item at the specified position using factory
              newGridItems[i] = createEmptyGridSlot(i);
              updated = true;
            }
          }

          if (!updated) {
            console.warn(`⚠️ GridStore: Item with ID ${itemId} not found in grid`);

            // Debug log to see what's in the grid
            console.log('Current grid items:',
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
          console.log(`🔄 GridStore: Moving item from position ${fromPosition} to ${toPosition}`);

          // Create a copy of the grid items
          const newGridItems = [...state.gridItems];

          // Check if positions are valid
          if (
            fromPosition < 0 || fromPosition >= newGridItems.length ||
            toPosition < 0 || toPosition >= newGridItems.length
          ) {
            console.warn(`⚠️ GridStore: Invalid positions - from: ${fromPosition}, to: ${toPosition}`);
            return state;
          }

          // Check if source position has an item
          if (!newGridItems[fromPosition].matched) {
            console.warn(`⚠️ GridStore: No item at position ${fromPosition}`);
            return state;
          }

          // Get the item to move
          const itemToMove = { ...newGridItems[fromPosition] };

          // If target position already has an item, swap them
          if (newGridItems[toPosition].matched) {
            console.log(`🔄 GridStore: Swapping items at positions ${fromPosition} and ${toPosition}`);

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
          console.log(`🔄 GridStore: Clearing entire grid`);

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

        console.log(`🔄 GridStore: Drag end ${activeId} -> ${overId}`);

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
            console.warn(`⚠️ GridStore: Invalid grid position from ${overId}`);
            // Emit validation error to match-store
            get().emitValidationError('TARGET_POSITION_INVALID');
            return;
          }

          // Use lazy accessor to safely get backlog store state
          // This handles race conditions if user drags before module initializes
          const backlogState = backlogStoreAccessor.getState();

          if (!backlogState) {
            console.error('❌ GridStore: Backlog store not initialized - cannot complete drag operation');
            get().emitValidationError('SOURCE_NOT_FOUND');
            return;
          }

          // RACE CONDITION FIX: Acquire lock BEFORE validation to prevent
          // double-click drag placing same item in two grid positions.
          // If user double-clicks rapidly, second drag will fail to acquire lock.
          if (!acquireItemLock(activeId)) {
            console.warn(`⚠️ GridStore: Item ${activeId} is already being assigned (concurrent drag blocked)`);
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
            console.log(`🔄 GridStore: Validated backlog item:`, {
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

            console.log(`✅ GridStore: Successfully assigned item to position ${toPosition}`);
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
          console.error('❌ GridStore: Notification store not initialized - cannot emit validation error');
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
        console.log(`🎓 GridStore: Tutorial mode ${enabled ? 'enabled' : 'disabled'}`);
        set({ isTutorialMode: enabled });
      },

      // Load tutorial demo data into grid
      loadTutorialData: (items) => {
        console.log(`🎓 GridStore: Loading ${items.length} tutorial items`);

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
      }),
      // Re-compute statistics on hydration to ensure consistency
      onRehydrateStorage: () => (state) => {
        if (state && state.gridItems) {
          state.gridStatistics = computeGridStatistics(state.gridItems);
        }
      },
    }
  )
);