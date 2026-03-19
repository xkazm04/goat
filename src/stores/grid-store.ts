/**
 * Grid Store - Single Source of Truth for Drag & Drop
 *
 * OWNERSHIP CONTRACT:
 *   Owns: grid positions (GridItemType[]), drag-and-drop state, per-list grid cache,
 *         mobile tap-to-place selection
 *   Persists: localStorage (via Zustand persist middleware)
 *   Sync: grid-store → session-store (batched via syncGridToSession).
 *         NO other store may mutate grid positions directly.
 *
 * This store is the authoritative handler for all drag-and-drop operations in the application.
 * It uses TransferProtocol utilities for consistent ID parsing and handles:
 * - Backlog to grid assignment
 * - Grid to grid move/swap
 * - Position validation
 * - Session synchronization
 *
 * Session-store handles session persistence, backlog-store handles backlog groups.
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
  assertCanonicalGridId,
  createGridOnlyRouter,
  type DragOperationRouter,
  type OperationStoreContext,
} from '@/lib/dnd';
import {
  createGridItem,
  createEmptyGridSlot,
  createEmptyGrid,
} from '@/lib/grid';
import { GRID_LIMITS, TUTORIAL_GRID } from '@/lib/grid/constants';
import {
  getValidationAuthority,
  logValidationFailure,
  ValidationErrorCode,
} from '@/lib/validation';
import { createLazyStoreAccessor } from '@/lib/stores/lazy-store-accessor';
import { gridLogger } from '@/lib/logger';
import { extractTitle } from '@/lib/items/item-utils';
import { logActivity } from '@/lib/activity/activity-logger';

/**
 * Resize a grid to the target size, rescuing matched items that would be
 * truncated by relocating them to empty slots within the new bounds.
 * Any items that cannot be relocated are returned to the backlog.
 *
 * Returns the resized grid.
 */
function resizeGridWithRescue(
  grid: GridItemType[],
  targetSize: number,
  returnToBacklog: (itemId: string) => void,
): GridItemType[] {
  if (grid.length <= targetSize) {
    // Growing: just add empty slots
    const resized = [...grid];
    for (let i = resized.length; i < targetSize; i++) {
      resized.push(createEmptyGridSlot(i));
    }
    return resized;
  }

  // Shrinking: rescue matched items from positions being removed
  const displacedItems = grid
    .slice(targetSize)
    .filter(item => item.matched);

  const resized = grid.slice(0, targetSize);

  if (displacedItems.length > 0) {
    // Find empty slots within the new bounds to relocate displaced items
    for (const displaced of displacedItems) {
      const emptyIdx = resized.findIndex(slot => !slot.matched);
      if (emptyIdx !== -1) {
        // Relocate to the empty slot
        resized[emptyIdx] = {
          ...displaced,
          position: emptyIdx,
          id: createGridReceiverId(emptyIdx),
        };
        gridLogger.debug(
          `Grid resize: relocated "${displaced.title}" from position ${displaced.position} to ${emptyIdx}`
        );
      } else {
        // No room left — return to backlog
        const itemId = displaced.backlogItemId || displaced.id;
        returnToBacklog(itemId);
        gridLogger.warn(
          `Grid resize: returned "${displaced.title}" (pos ${displaced.position}) to backlog — no empty slots`
        );
      }
    }

    gridLogger.debug(
      `Grid resize: ${displacedItems.length} displaced item(s) handled during ${grid.length}→${targetSize} resize`
    );
  }

  return resized;
}

// Re-export for backwards compatibility
export type { ValidationErrorCode as TransferValidationErrorCode } from '@/lib/validation';

/**
 * Batched grid-to-session sync.
 *
 * During rapid drag sequences (assign, move, swap, clear) multiple grid
 * mutations can fire in a single frame.  Each one used to synchronously call
 * sessionStore.updateSessionGridItems, which spreads the entire listSessions
 * object, creates a new session copy, and triggers saveSessionToOffline.
 *
 * This batching layer coalesces those writes: only the *last* gridItems
 * snapshot within a microtask tick is flushed to the session store, so
 * rapid-fire operations produce at most one session update per frame.
 */
let pendingSyncGridItems: GridItemType[] | null = null;
let syncScheduled = false;

/**
 * Queued grid items waiting for session store hydration.
 * When flushGridToSession fires before the session store has rehydrated from
 * storage (cold start / slow connection), we hold onto the latest snapshot
 * here and replay it as soon as hydration completes.  Only the most recent
 * snapshot matters — earlier ones are superseded — so this is a single value,
 * not an array of pending writes.
 */
let hydrationQueuedGridItems: GridItemType[] | null = null;
let hydrationUnsubscribe: (() => void) | null = null;
let hydrationTimeoutId: ReturnType<typeof setTimeout> | null = null;

/** How long to wait for session-store hydration before force-flushing (ms) */
const HYDRATION_TIMEOUT_MS = 10_000;

function teardownHydrationWatcher(): void {
  if (hydrationUnsubscribe) {
    hydrationUnsubscribe();
    hydrationUnsubscribe = null;
  }
  if (hydrationTimeoutId !== null) {
    clearTimeout(hydrationTimeoutId);
    hydrationTimeoutId = null;
  }
}

function drainHydrationQueue(reason: 'hydrated' | 'timeout'): void {
  const gridItems = hydrationQueuedGridItems;
  hydrationQueuedGridItems = null;

  // Tear down both the subscription and the timeout
  teardownHydrationWatcher();

  if (!gridItems) return;

  if (reason === 'timeout') {
    gridLogger.warn(
      'Session store hydration timed out after ' + HYDRATION_TIMEOUT_MS +
      'ms — force-flushing queued grid sync. Grid sync may be degraded ' +
      '(storage access may be denied or quota exceeded).'
    );
  } else {
    gridLogger.info('Session store hydrated — flushing queued grid sync');
  }
  useSessionStore.getState().updateSessionGridItems(gridItems);
}

function flushGridToSession(): void {
  syncScheduled = false;
  const gridItems = pendingSyncGridItems;
  pendingSyncGridItems = null;

  if (!gridItems) return;

  const sessionState = useSessionStore.getState();
  if (!sessionState._hydrated) {
    gridLogger.warn('Session store not yet hydrated — queuing grid sync for replay after hydration');
    // Keep only the latest snapshot (newer drag supersedes older)
    hydrationQueuedGridItems = gridItems;

    // Subscribe once to drain the queue when hydration completes,
    // with a timeout fallback for environments where hydration never fires
    // (IndexedDB denied, storage quota exceeded, private browsing restrictions).
    if (!hydrationUnsubscribe) {
      hydrationUnsubscribe = useSessionStore.subscribe((state) => {
        if (state._hydrated) {
          drainHydrationQueue('hydrated');
        }
      });
      hydrationTimeoutId = setTimeout(() => {
        hydrationTimeoutId = null;
        if (hydrationQueuedGridItems) {
          drainHydrationQueue('timeout');
        }
      }, HYDRATION_TIMEOUT_MS);
    }
    return;
  }
  sessionState.updateSessionGridItems(gridItems);
}

function syncGridToSession(gridItems: GridItemType[]): void {
  // Always capture the latest snapshot
  pendingSyncGridItems = gridItems;

  // Schedule flush once per microtask tick
  if (!syncScheduled) {
    syncScheduled = true;
    Promise.resolve().then(flushGridToSession);
  }
}

/**
 * Flush any pending microtask-debounced grid-to-session sync immediately.
 * Called on beforeunload to prevent data loss when the user closes the tab
 * before the microtask fires.
 */
export function flushPendingGridSync(): void {
  if (pendingSyncGridItems) {
    flushGridToSession();
  }
}

/**
 * Get current list context for activity logging.
 * Non-blocking, returns what's available from grid-store state.
 */
function getListContext(): { listId?: string; listTitle?: string } {
  try {
    const gridState = useGridStore.getState();
    const listId = gridState.currentListId || undefined;
    // Try to get list title from list-store (lazy to avoid circular dep)
    let listTitle: string | undefined;
    try {
      const listStore = require('@/stores/use-list-store').useListStore;
      const currentList = listStore.getState().currentList;
      listTitle = currentList?.title;
    } catch { /* ignore */ }
    return { listId, listTitle };
  } catch {
    return {};
  }
}

/** Maximum number of lists to keep in the grid cache (LRU eviction) */
const MAX_CACHE_SIZE = 15;

/** Grid cache entry type */
interface GridCacheEntry {
  gridItems: GridItemType[];
  maxGridSize: number;
}

/**
 * Evict oldest entries from listGridCache to keep it within MAX_CACHE_SIZE.
 * Returns new cache and order arrays (pure function, no mutation).
 */
function evictOldestCacheEntries(
  cache: Record<string, GridCacheEntry>,
  order: string[],
  maxSize: number
): { cache: Record<string, GridCacheEntry>; order: string[] } {
  const newOrder = [...order];
  const newCache = { ...cache };
  while (newOrder.length > maxSize) {
    const oldest = newOrder.shift()!;
    delete newCache[oldest];
    gridLogger.debug(`LRU evicted grid cache for list: ${oldest}`);
  }
  return { cache: newCache, order: newOrder };
}

/**
 * Touch a list ID in the LRU order (move to end = most recently used).
 * Returns a new order array.
 */
function touchLRUOrder(order: string[], listId: string): string[] {
  const newOrder = order.filter(id => id !== listId);
  newOrder.push(listId);
  return newOrder;
}

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
 * Singleton DragOperationRouter for grid operations.
 * Lazily initialized on first use.
 */
let gridRouter: DragOperationRouter | null = null;

/**
 * Get the grid-specific DragOperationRouter.
 * Creates a router with only grid operations (assign, move, swap).
 */
export function getGridDragRouter(): DragOperationRouter {
  if (!gridRouter) {
    gridRouter = createGridOnlyRouter({ debug: false });
    gridLogger.debug('Created grid-only DragOperationRouter');
  }
  return gridRouter;
}

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

/**
 * Copy-on-write grid update: creates a new array reference with only the
 * specified positions replaced, avoiding a full 50-element spread on every
 * drag operation. Also incrementally patches statistics instead of
 * re-scanning the entire array.
 */
function cowGridUpdate(
  gridItems: GridItemType[],
  stats: GridStatistics,
  updates: Array<{ index: number; item: GridItemType }>,
): { gridItems: GridItemType[]; gridStatistics: GridStatistics } {
  // Slice is ~2x faster than spread for typed arrays in V8 and produces
  // the same shallow copy. For the common single-position case the diff
  // is small, but during rapid 20+ drag sessions it adds up.
  const next = gridItems.slice();
  let matchedDelta = 0;

  for (const { index, item } of updates) {
    const prev = gridItems[index];
    // Track matched-count delta so we can patch stats without a full scan.
    if (prev.matched && !item.matched) matchedDelta--;
    else if (!prev.matched && item.matched) matchedDelta++;
    next[index] = item;
  }

  const matchedCount = stats.matchedCount + matchedDelta;
  const total = stats.total;
  const emptyCount = total - matchedCount;

  return {
    gridItems: next,
    gridStatistics: {
      matchedCount,
      emptyCount,
      total,
      percentage: total > 0 ? Math.round((matchedCount / total) * 100) : 0,
      isComplete: matchedCount === total && total > 0,
    },
  };
}

export interface GridStatistics {
  matchedCount: number;
  emptyCount: number;
  total: number;
  percentage: number;
  isComplete: boolean;
}

/** Mobile selected item for tap-to-place interaction */
export interface MobileSelectedItem {
  id: string;
  title: string;
  image_url?: string;
}

export interface GridStoreState {
  // Core state
  gridItems: GridItemType[];
  maxGridSize: number;
  selectedGridItem: string | null;
  activeItem: string | null;
  isTutorialMode: boolean;

  // Mobile tap-to-place state
  mobileSelectedItem: MobileSelectedItem | null;

  // Per-list grid persistence
  currentListId: string | null;
  listGridCache: Record<string, GridCacheEntry>;
  listGridCacheOrder: string[]; // LRU order: oldest first, newest last

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

  // Actions - Mobile tap-to-place
  setMobileSelectedItem: (item: MobileSelectedItem | null) => void;
  handleMobileTapSlot: (position: number) => void;

  // Actions - Drag & Drop
  handleDragEnd: (event: DragEndEvent) => void;
  /** Get store context for use with DragOperationRouter */
  getStoreContext: () => OperationStoreContext | null;

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
      maxGridSize: GRID_LIMITS.MAX_SIZE,
      selectedGridItem: null,
      activeItem: null,
      isTutorialMode: false,
      mobileSelectedItem: null,
      currentListId: null,
      listGridCache: {},
      listGridCacheOrder: [],
      gridStatistics: emptyGridStatistics,

      // Initialize a new grid
      initializeGrid: (size, listId, category) => {
        const state = get();
        const emptyGridItems = createEmptyGrid(size);

        gridLogger.debug(`Initializing grid with ${size} positions for list ${listId || 'unknown'}`);

        // If we have a different current list, save its grid to cache first
        let updatedCache = { ...state.listGridCache };
        let updatedOrder = [...state.listGridCacheOrder];

        if (state.currentListId && state.currentListId !== listId && state.gridItems.length > 0) {
          updatedCache[state.currentListId] = {
            gridItems: state.gridItems,
            maxGridSize: state.maxGridSize,
          };
          updatedOrder = touchLRUOrder(updatedOrder, state.currentListId);
        }

        // Touch the new list in LRU order if it has an ID
        if (listId) {
          updatedOrder = touchLRUOrder(updatedOrder, listId);
        }

        // Evict oldest entries if over limit
        const evicted = evictOldestCacheEntries(updatedCache, updatedOrder, MAX_CACHE_SIZE);

        set({
          gridItems: emptyGridItems,
          maxGridSize: size,
          selectedGridItem: null,
          gridStatistics: computeGridStatistics(emptyGridItems),
          currentListId: listId || null,
          listGridCache: evicted.cache,
          listGridCacheOrder: evicted.order,
        });

        // Save grid to session if listId provided
        if (listId) {
          syncGridToSession(emptyGridItems);
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
            // Resize grid, rescuing any matched items that would be truncated
            const backlogState = backlogStoreAccessor.getState();
            const resizedGrid = resizeGridWithRescue(
              state.gridItems,
              size,
              (itemId) => backlogState?.markItemAsUsed(itemId, false),
            );
            set({
              gridItems: resizedGrid,
              maxGridSize: size,
              gridStatistics: computeGridStatistics(resizedGrid),
            });
            syncGridToSession(resizedGrid);
          }
          return;
        }

        // Save current grid to cache (if we have a current list)
        let updatedCache = { ...state.listGridCache };
        let updatedOrder = [...state.listGridCacheOrder];

        if (state.currentListId && state.gridItems.length > 0) {
          updatedCache[state.currentListId] = {
            gridItems: state.gridItems,
            maxGridSize: state.maxGridSize,
          };
          updatedOrder = touchLRUOrder(updatedOrder, state.currentListId);
          gridLogger.debug(`Saved grid for list ${state.currentListId} to cache`);
        }

        // Touch the new list in LRU order
        updatedOrder = touchLRUOrder(updatedOrder, listId);

        // Evict oldest entries if over limit
        const evicted = evictOldestCacheEntries(updatedCache, updatedOrder, MAX_CACHE_SIZE);
        updatedCache = evicted.cache;
        updatedOrder = evicted.order;

        // Load cached grid for new list or create empty grid
        const cached = updatedCache[listId];
        let newGridItems: GridItemType[];
        let newMaxSize: number;

        if (cached && cached.gridItems.length > 0) {
          gridLogger.debug(`Loading cached grid for list ${listId} (${cached.gridItems.length} items)`);
          newGridItems = cached.gridItems;
          newMaxSize = cached.maxGridSize;

          // Resize if size changed, rescuing matched items from truncated positions
          if (newMaxSize !== size) {
            const backlogState = backlogStoreAccessor.getState();
            newGridItems = resizeGridWithRescue(
              newGridItems,
              size,
              (itemId) => backlogState?.markItemAsUsed(itemId, false),
            );
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
          listGridCacheOrder: updatedOrder,
          selectedGridItem: null,
          gridStatistics: computeGridStatistics(newGridItems),
        });

        // Update session store with new grid
        syncGridToSession(newGridItems);
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

          // Check if position is valid
          if (position < 0 || position >= state.gridItems.length) {
            gridLogger.warn(`Invalid position ${position}`);
            return state;
          }

          // Check if position is already filled
          if (state.gridItems[position].matched) {
            gridLogger.warn(`Position ${position} already has an item`);
            return state;
          }

          // Use factory to create grid item - handles both BacklogItem and GridItemType
          const gridItem = createGridItem(item, position);

          // Copy-on-write: only clone the affected position
          const update = cowGridUpdate(state.gridItems, state.gridStatistics, [
            { index: position, item: gridItem },
          ]);

          // Update session store if needed
          syncGridToSession(update.gridItems);

          // Log activity (non-blocking)
          const ctx = getListContext();
          logActivity({
            itemId: gridItem.backlogItemId || gridItem.id,
            action: 'assign',
            listId: ctx.listId,
            listTitle: ctx.listTitle,
            positionAfter: position,
          });

          return update;
        });
      },
      // Remove an item from a grid position
      removeItemFromGrid: (position) => {
        set(state => {
          gridLogger.debug(`Removing item from position ${position}`);

          // Check if position is valid
          if (position < 0 || position >= state.gridItems.length) {
            gridLogger.warn(`Invalid position ${position}`);
            return state;
          }

          // Log activity before clearing (need the item info)
          const removedItem = state.gridItems[position];
          if (removedItem.matched) {
            const ctx = getListContext();
            logActivity({
              itemId: removedItem.backlogItemId || removedItem.id,
              action: 'remove',
              listId: ctx.listId,
              listTitle: ctx.listTitle,
              positionBefore: position,
            });
          }

          // Copy-on-write: only clone the affected position
          const update = cowGridUpdate(state.gridItems, state.gridStatistics, [
            { index: position, item: createEmptyGridSlot(position) },
          ]);

          // Update session store
          syncGridToSession(update.gridItems);

          return {
            ...update,
            // Clear selection if the removed item was selected
            selectedGridItem: state.selectedGridItem === `grid-${position}` ? null : state.selectedGridItem
          };
        });
      },

      // Remove an item by the backlog item ID
      removeItemByItemId: (itemId) => {
        set(state => {
          gridLogger.debug(`Removing item by backlog ID ${itemId}`);

          // Collect positions to clear
          const updates: Array<{ index: number; item: GridItemType }> = [];
          for (let i = 0; i < state.gridItems.length; i++) {
            if (state.gridItems[i].backlogItemId === itemId) {
              gridLogger.debug(`Found item in position ${i}`);
              updates.push({ index: i, item: createEmptyGridSlot(i) });
            }
          }

          if (updates.length === 0) {
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

          // Copy-on-write: only clone the affected positions
          const update = cowGridUpdate(state.gridItems, state.gridStatistics, updates);

          // Update session store
          syncGridToSession(update.gridItems);

          return {
            ...update,
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

          // Check if positions are valid
          if (
            fromPosition < 0 || fromPosition >= state.gridItems.length ||
            toPosition < 0 || toPosition >= state.gridItems.length
          ) {
            gridLogger.warn(`Invalid positions - from: ${fromPosition}, to: ${toPosition}`);
            return state;
          }

          // Check if source position has an item
          if (!state.gridItems[fromPosition].matched) {
            gridLogger.warn(`No item at position ${fromPosition}`);
            return state;
          }

          // Get the item to move
          const itemToMove = { ...state.gridItems[fromPosition] };

          let updates: Array<{ index: number; item: GridItemType }>;

          // If target position already has an item, swap them
          if (state.gridItems[toPosition].matched) {
            gridLogger.debug(`Swapping items at positions ${fromPosition} and ${toPosition}`);

            const targetItem = { ...state.gridItems[toPosition] };

            // Update positions and IDs
            itemToMove.position = toPosition;
            itemToMove.id = createGridReceiverId(toPosition);
            targetItem.position = fromPosition;
            targetItem.id = createGridReceiverId(fromPosition);

            updates = [
              { index: fromPosition, item: targetItem },
              { index: toPosition, item: itemToMove },
            ];
          } else {
            // Move the item to the empty target position
            itemToMove.position = toPosition;
            itemToMove.id = createGridReceiverId(toPosition);

            updates = [
              { index: fromPosition, item: createEmptyGridSlot(fromPosition) },
              { index: toPosition, item: itemToMove },
            ];
          }

          // Copy-on-write: only clone the two affected positions
          const update = cowGridUpdate(state.gridItems, state.gridStatistics, updates);

          // Update session store
          syncGridToSession(update.gridItems);

          // Log activity for move/swap (non-blocking)
          const ctx = getListContext();
          const isSwap = state.gridItems[toPosition].matched;
          logActivity({
            itemId: itemToMove.backlogItemId || itemToMove.id,
            action: isSwap ? 'swap' : 'move',
            listId: ctx.listId,
            listTitle: ctx.listTitle,
            positionBefore: fromPosition,
            positionAfter: toPosition,
            metadata: isSwap ? { swappedWith: state.gridItems[toPosition].backlogItemId } : undefined,
          });
          if (isSwap) {
            const targetItem = state.gridItems[toPosition];
            logActivity({
              itemId: targetItem.backlogItemId || targetItem.id,
              action: 'swap',
              listId: ctx.listId,
              listTitle: ctx.listTitle,
              positionBefore: toPosition,
              positionAfter: fromPosition,
              metadata: { swappedWith: itemToMove.backlogItemId },
            });
          }

          return update;
        });
      },

      // Clear all items from the grid
      clearGrid: () => {
        set(state => {
          gridLogger.debug(`Clearing entire grid`);

          const emptyGridItems = createEmptyGrid(state.gridItems.length);

          // Update session store
          syncGridToSession(emptyGridItems);

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
      setActiveItem: (id) => {
        // Clear mobile selection on drag start to prevent state conflicts
        const state = get();
        if (id !== null && state.mobileSelectedItem !== null) {
          set({ activeItem: id, mobileSelectedItem: null });
        } else {
          set({ activeItem: id });
        }
      },

      // Mobile tap-to-place: set the currently selected backlog item
      setMobileSelectedItem: (item) => set({ mobileSelectedItem: item }),

      // Mobile tap-to-place: place the selected backlog item at a grid position
      handleMobileTapSlot: (position) => {
        const state = get();
        const selected = state.mobileSelectedItem;

        if (!selected) return;

        // Check bounds
        if (position < 0 || position >= state.gridItems.length) {
          gridLogger.warn(`Tap-to-place: invalid position ${position}`);
          return;
        }

        // Use the backlog store to get the full item and validate
        const backlogState = backlogStoreAccessor.getState();
        if (!backlogState) {
          gridLogger.error('Tap-to-place: backlog store not initialized');
          return;
        }

        const item = backlogState.getItemById(selected.id);
        if (!item) {
          gridLogger.warn(`Tap-to-place: item ${selected.id} not found in backlog`);
          set({ mobileSelectedItem: null });
          return;
        }

        // Check if already used
        if (backlogState.isItemUsed(selected.id)) {
          gridLogger.warn(`Tap-to-place: item ${selected.id} already used`);
          set({ mobileSelectedItem: null });
          return;
        }

        // If slot is occupied, displace existing item back to backlog
        const existingItem = state.gridItems[position];
        if (existingItem && existingItem.matched && existingItem.backlogItemId) {
          const displacedItemId = existingItem.backlogItemId;
          get().removeItemFromGrid(position);
          backlogState.markItemAsUsed(displacedItemId, false);
          gridLogger.debug(`Tap-to-place: displaced item ${displacedItemId} from position ${position}`);
        }

        // Place the item
        const gridItem = createGridItem(item, position);
        get().assignItemToGrid(gridItem, position);
        backlogState.markItemAsUsed(item.id, true);

        // Clear selection after placement
        set({ mobileSelectedItem: null });
        gridLogger.info(`Tap-to-place: placed item at position ${position}`);
      },

      // Handle drag end events (uses TransferProtocol utilities for ID parsing)
      handleDragEnd: (event) => {
        const { active, over } = event;

        if (!active || !over) {
          return;
        }

        const activeId = String(active.id);
        const overId = String(over.id);

        gridLogger.debug(`Drag end ${activeId} -> ${overId}`);

        // Assert canonical grid ID format in development
        assertCanonicalGridId(activeId, 'grid-store.handleDragEnd(active)');
        assertCanonicalGridId(overId, 'grid-store.handleDragEnd(over)');

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

          try {
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
                title: extractTitle(item),
                hasImageUrl: !!item.image_url
              });

              // Use factory to create grid item with consistent image_url handling
              const gridItem = createGridItem(item, toPosition);

              // ATOMIC OPERATION: Assign item to grid and mark as used together
              // This prevents race condition where item appears in multiple positions
              get().assignItemToGrid(gridItem, toPosition);
              backlogState.markItemAsUsed(item.id, true);

              gridLogger.info(`Successfully assigned item to position ${toPosition}`);
            }
          } finally {
            // Guarantee lock release regardless of success or error
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

      // Get store context for DragOperationRouter
      getStoreContext: (): OperationStoreContext | null => {
        const state = get();
        const backlogState = backlogStoreAccessor.getState();

        if (!backlogState) {
          gridLogger.error('Backlog store not initialized');
          return null;
        }

        return {
          grid: {
            gridItems: state.gridItems,
            maxGridSize: state.maxGridSize,
            assignItemToGrid: state.assignItemToGrid,
            removeItemFromGrid: state.removeItemFromGrid,
            moveGridItem: state.moveGridItem,
            emitValidationError: state.emitValidationError,
          },
          backlog: {
            getItemById: backlogState.getItemById,
            isItemUsed: backlogState.isItemUsed,
            markItemAsUsed: backlogState.markItemAsUsed,
          },
          // Tier context can be added when needed
        };
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
        const tutorialGrid: GridItemType[] = Array.from({ length: TUTORIAL_GRID.SIZE }, (_, i) => {
          const tutorialItem = items.find(item => item.position === i);
          if (tutorialItem) {
            return tutorialItem;
          }
          return createEmptyGridSlot(i);
        });

        set({
          gridItems: tutorialGrid,
          maxGridSize: TUTORIAL_GRID.SIZE,
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
        listGridCacheOrder: state.listGridCacheOrder,
      }),
      // Re-compute statistics on hydration and restore correct list's grid from cache
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Re-compute statistics
          if (state.gridItems) {
            state.gridStatistics = computeGridStatistics(state.gridItems);
          }

          // Ensure listGridCache and order exist
          if (!state.listGridCache) {
            state.listGridCache = {};
          }
          if (!state.listGridCacheOrder) {
            // Reconstruct order from cache keys if missing (migration)
            state.listGridCacheOrder = Object.keys(state.listGridCache);
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