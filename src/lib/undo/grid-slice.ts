/**
 * THE undoable slice, and the one door that captures and restores it.
 *
 * Registry: undo-history/undo-scope, gesture-coalescing, undo-model-selection.
 *
 * WHY THIS EXISTS
 * ---------------
 * Undo in this app was inverse-command only: every step was a `DragOperation`
 * carrying its own `rollback`. That is the right model for the drag path and it
 * stays. But it left FOUR grid mutations bypassing the stack entirely, because
 * none of them is a drag and none has an inverse anybody wrote:
 *
 *   - the per-slot X button (SimpleMatchGrid `handleRemove`)
 *   - keyboard placement (`useQuickSelect` assign)
 *   - mobile tap-to-place / swipe-to-rank (grid-store)
 *   - the view-mode `clearGrid()` + bulk re-assign — the most destructive
 *     action in the app, which emptied 50 slots with no way back
 *
 * And tier operations were CONDITIONALLY undoable: `undo()` returns false when
 * the top command has no `rollback`, so Ctrl+Z could fail AFTER the press, which
 * is worse than a disabled control.
 *
 * SCOPE — THE DIVIDING LINE
 * -------------------------
 * Undo reverts what the user SAID ABOUT THE DOCUMENT; it does not revert HOW
 * THE USER IS LOOKING AT IT. Every field below carries an explicit in/out
 * decision, and this comment is the reviewable record of those decisions.
 *
 * IN SCOPE (document state — what would differ if the ranking were saved and
 * reopened):
 *   - the arrangement: which item identity sits in which grid position
 *   - the backlog `used` flags implied by that arrangement
 *
 * OUT OF SCOPE (view state — reverting these makes the surface feel haunted):
 *   - `viewMode` (podium / goat / rushmore / tierlist / bracket) — this is the
 *     camera, not the document. NOTE that the view-mode SWITCH also performs a
 *     document mutation (clear + re-assign from tiers); the mutation is
 *     undoable, the mode is not. Undo returns your arrangement without throwing
 *     you back into the previous view.
 *   - `mobileSelectedItem`, `hoveredPosition`, `isDragging`, drop-zone
 *     highlights — transient interaction state
 *   - scroll, filters, collection search, expanded panels
 *
 * OUT OF SCOPE by different reasoning:
 *   - derived statistics (completion %, tier counts). Recomputed after restore,
 *     never captured: a captured cache is a stale cache with provenance
 *     laundered.
 *   - anything with an external effect. Nothing in this slice sends, publishes
 *     or charges; the arrangement is client-owned (grid-store persists it to
 *     localStorage). If that ever stops being true, a step that performed an
 *     external effect needs a real compensating action or must not be undoable
 *     at all.
 *
 * MODEL
 * -----
 * A slice SNAPSHOT rather than an inverse command, for these four operations
 * only. Justified rather than assumed: `clearGrid()` + bulk re-assign has no
 * cheap inverse — inverting it means reconstructing 50 placements and their
 * used-flags — while its snapshot is 50 small records. The drag path keeps
 * inverse commands, which remain the right choice there. Two models in one
 * stack is fine as long as both produce the same step shape, which is what
 * `createSliceCommand` exists to guarantee.
 */

import { liveStoreContext } from './live-context';

import type {
  DragContext,
  DragOperation,
  DragOperationResult,
  OperationStoreContext,
} from '@/lib/dnd/operations/types';

/** One captured position. `null` means the slot was empty. */
interface SliceSlot {
  readonly position: number;
  /** The item's DURABLE identity — never its dnd id, which is a function of the slot. */
  readonly itemId: string | null;
}

export interface GridSlice {
  readonly slots: readonly SliceSlot[];
  /** Item identities that were marked used in the backlog at capture time. */
  readonly usedItemIds: readonly string[];
}

/**
 * THE capture function. Every step captures through here; there is no second
 * capture path. The decay mode this prevents is well known: a new feature adds a
 * field near the editing state, nobody classifies it, and it half-joins the
 * scope — captured by a broad snapshot but mutated outside the door.
 */
export function captureGridSlice(stores: OperationStoreContext): GridSlice {
  const slots: SliceSlot[] = [];
  const used: string[] = [];
  const items = stores.grid.gridItems;
  for (let position = 0; position < items.length; position += 1) {
    const id = items[position]?.item?.id ?? null;
    slots.push({ position, itemId: id });
    if (id && stores.backlog.isItemUsed(id)) used.push(id);
  }
  return { slots, usedItemIds: used };
}

/**
 * THE restore door. Every restore writes through here.
 *
 * Restore must LAND: it writes through the same store actions the rest of the
 * app writes through, which are the ones the render layer is subscribed to. A
 * restore that mutates a store the view is not watching reverts the data and not
 * the screen.
 *
 * Order matters. Clearing every changed slot BEFORE placing anything avoids a
 * transient state where one item appears in two positions, which the grid's own
 * assign guard would then reject — leaving a half-applied restore, and a
 * half-applied restore is a state that is in neither the before nor the after.
 */
export function restoreGridSlice(stores: OperationStoreContext, slice: GridSlice): void {
  // MATERIALIZED, not aliased. `stores.grid.gridItems` is a live view — reading
  // it again after the passes below would answer with the arrangement this
  // function just wrote, and the "return stranded items to the backlog" pass
  // would then find nothing to return. Caught by its own test.
  const previousIds: (string | null)[] = stores.grid.gridItems.map(
    (item) => item?.item?.id ?? null,
  );
  const current = stores.grid.gridItems;

  // Pass 1: empty every slot whose occupant differs from the target.
  for (const slot of slice.slots) {
    const nowId = current[slot.position]?.item?.id ?? null;
    if (nowId !== null && nowId !== slot.itemId) {
      stores.grid.removeItemFromGrid(slot.position);
    }
  }

  // Pass 2: place the target occupants.
  for (const slot of slice.slots) {
    if (!slot.itemId) continue;
    const nowId = stores.grid.gridItems[slot.position]?.item?.id ?? null;
    if (nowId === slot.itemId) continue;
    const item = stores.backlog.getItemById(slot.itemId);
    // An item that has left the backlog cannot be restored, and inventing a
    // placeholder would put the document in a state the user never created.
    // Skipping is the honest behaviour; the rest of the slice still lands.
    if (item) stores.grid.assignItemToGrid(item, slot.position);
  }

  // Pass 3: reconcile the used flags to the captured set. Derived from the
  // arrangement, not captured independently, so the two cannot disagree.
  const shouldBeUsed = new Set(slice.usedItemIds);
  for (const slot of slice.slots) {
    if (slot.itemId && !shouldBeUsed.has(slot.itemId)) shouldBeUsed.add(slot.itemId);
  }
  const seen = new Set<string>();
  for (const slot of slice.slots) {
    if (slot.itemId) seen.add(slot.itemId);
  }
  shouldBeUsed.forEach((id) => {
    if (!stores.backlog.isItemUsed(id)) stores.backlog.markItemAsUsed(id, true);
  });
  // Anything the previous arrangement held that this one does not goes back to
  // the backlog, or the item is stranded: gone from the grid and unavailable.
  for (const id of previousIds) {
    if (id && !seen.has(id) && stores.backlog.isItemUsed(id)) {
      stores.backlog.markItemAsUsed(id, false);
    }
  }
}

/** The context a slice command carries. Deliberately minimal. */
const SLICE_CONTEXT = Object.freeze({
  source: { type: 'grid' },
  target: { type: 'grid' },
}) as unknown as DragContext;

const OK: DragOperationResult = Object.freeze({ success: true }) as DragOperationResult;

/**
 * Build an undoable step from a before/after pair of slice captures.
 *
 * The resulting object is a `DragOperation`, so it goes onto the SAME stack as
 * the drag path's inverse commands and every consumer switches over one shape.
 *
 * `rollback` is ALWAYS present. That is the fix for "Ctrl+Z can fail after the
 * press": a step that reaches the stack is undoable by construction, and a
 * caller that cannot produce a rollback must not push a step at all.
 */
export function createSliceCommand(
  description: string,
  before: GridSlice,
  after: GridSlice,
): DragOperation & { readonly description: string } {
  return {
    type: 'noop',
    description,
    validate: () => ({ isValid: true }),
    // Both halves IGNORE the context handed to them and read the stores live.
    // The undo store passes whatever `getStores()` returned at the Ctrl+Z site,
    // which in SimpleMatchGrid is a memoized snapshot of gridItems — correct for
    // the drag router that reads it once per gesture, and wrong for a restore
    // that must observe its own intermediate passes. A restore built on a stale
    // array reverts the data it can see and leaves the rest, which is the "the
    // data reverted but the screen did not" half of the scope defect.
    execute: () => {
      const live = liveStoreContext();
      if (live) restoreGridSlice(live, after);
      return OK;
    },
    rollback: () => {
      const live = liveStoreContext();
      if (live) restoreGridSlice(live, before);
    },
  };
}

export { SLICE_CONTEXT, OK as SLICE_RESULT };

/** True when two captures describe the same arrangement. */
export function slicesEqual(a: GridSlice, b: GridSlice): boolean {
  if (a.slots.length !== b.slots.length) return false;
  for (let i = 0; i < a.slots.length; i += 1) {
    if (a.slots[i].itemId !== b.slots[i].itemId) return false;
  }
  const au = [...a.usedItemIds].sort();
  const bu = [...b.usedItemIds].sort();
  if (au.length !== bu.length) return false;
  return au.every((id, i) => id === bu[i]);
}
