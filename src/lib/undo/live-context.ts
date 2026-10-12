/**
 * A LIVE store context for capture and restore.
 *
 * Registry: undo-history/undo-scope ("restore must land").
 *
 * WHY THIS IS NOT THE MEMOIZED CONTEXT
 * ------------------------------------
 * `SimpleMatchGrid` builds an `OperationStoreContext` with `useMemo`, and its
 * `gridItems` is the array as of the last render. That is correct for the drag
 * router, which reads it once per gesture — and WRONG for capture/restore, which
 * read the arrangement immediately before and immediately after a synchronous
 * mutation. Handed the memoized context, `captureGridSlice` would take both
 * captures from the same pre-mutation array, `slicesEqual` would report "nothing
 * changed", and no step would ever be pushed. The undo would look implemented
 * and record nothing, which is the failure mode this whole wave exists to stop.
 *
 * So capture and restore read the stores directly, every time. The lazy
 * accessors mirror grid-store's own circular-import-safe pattern rather than
 * inventing a second one.
 */

import { createLazyStoreAccessor } from '@/lib/stores/lazy-store-accessor';

import type { OperationStoreContext } from '@/lib/dnd/operations/types';

const gridStoreAccessor = createLazyStoreAccessor(
  () => require('@/stores/grid-store').useGridStore,
  { storeName: 'grid-store', maxRetries: 5, retryDelay: 20 },
);

const backlogStoreAccessor = createLazyStoreAccessor(
  () => require('@/stores/backlog-store').useBacklogStore,
  { storeName: 'backlog-store', maxRetries: 5, retryDelay: 20 },
);

/**
 * Build a context that reads the stores AT CALL TIME.
 *
 * Returns null when either store is not yet initialised — capture and restore
 * then decline rather than recording a step built from a half-loaded tree. A
 * missing store is a could-not-do, not a no-change.
 */
export function liveStoreContext(): OperationStoreContext | null {
  const grid = gridStoreAccessor.getState() as
    | {
        gridItems: OperationStoreContext['grid']['gridItems'];
        maxGridSize: number;
        assignItemToGrid: OperationStoreContext['grid']['assignItemToGrid'];
        removeItemFromGrid: OperationStoreContext['grid']['removeItemFromGrid'];
        moveGridItem: OperationStoreContext['grid']['moveGridItem'];
        emitValidationError: OperationStoreContext['grid']['emitValidationError'];
      }
    | null;
  const backlog = backlogStoreAccessor.getState() as
    | {
        getItemById: OperationStoreContext['backlog']['getItemById'];
        isItemUsed: OperationStoreContext['backlog']['isItemUsed'];
        markItemAsUsed: OperationStoreContext['backlog']['markItemAsUsed'];
      }
    | null;

  if (!grid || !backlog) return null;

  return {
    // A GETTER, not a copied array: `stores.grid.gridItems` must answer with the
    // arrangement as it is when it is asked, not as it was when this context was
    // built. Restore reads it between its own passes.
    grid: {
      get gridItems() {
        return (gridStoreAccessor.getState() as { gridItems: OperationStoreContext['grid']['gridItems'] })
          .gridItems;
      },
      maxGridSize: grid.maxGridSize,
      assignItemToGrid: (item, position) =>
        (gridStoreAccessor.getState() as typeof grid).assignItemToGrid(item, position),
      removeItemFromGrid: (position) =>
        (gridStoreAccessor.getState() as typeof grid).removeItemFromGrid(position),
      moveGridItem: (from, to) => (gridStoreAccessor.getState() as typeof grid).moveGridItem(from, to),
      emitValidationError: (code) =>
        (gridStoreAccessor.getState() as typeof grid).emitValidationError(code),
    } as OperationStoreContext['grid'],
    backlog: {
      getItemById: (id) => (backlogStoreAccessor.getState() as typeof backlog).getItemById(id),
      isItemUsed: (id) => (backlogStoreAccessor.getState() as typeof backlog).isItemUsed(id),
      markItemAsUsed: (id, used) =>
        (backlogStoreAccessor.getState() as typeof backlog).markItemAsUsed(id, used),
    },
  };
}
