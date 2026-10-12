"use client";

import { AnimatePresence } from "framer-motion";

import { gridLogger } from "@/lib/logger";
import { useBacklogStore } from "@/stores/backlog-store";
import { useGridStore } from "@/stores/grid-store";
import { useItemPopupStore } from "@/stores/item-popup-store";

import { ItemDetailPopup } from "./ItemDetailPopup";

/**
 * Quick-assign a backlog item into the next open grid slot.
 *
 * ONE implementation for both detail surfaces (this provider and
 * ItemInspectorProvider). It routes through the grid-store's atomic
 * `assignToNextOpenSlot` — lock, fresh slot read, verify placement, then mark
 * the backlog item used — the same door the mobile swipe path uses.
 *
 * Before 2026-09-05 this file carried a second, hand-rolled copy: it scanned a
 * component-level snapshot of `gridItems`, built a grid item whose `id` was the
 * SLOT address (`grid-<n>`) rather than the item's identity, and called
 * `assignItemToGrid` directly — never marking the item used, never locking,
 * and re-rendering every open popup on every grid change to do it.
 *
 * Returns the 0-based position the item landed in, or null when the item is
 * unknown, already being assigned, or no slot is open.
 */
export function quickAssignFromBacklog(itemId: string): number | null {
  const backlogItem = useBacklogStore.getState().getItemById(itemId);
  if (!backlogItem) {
    gridLogger.warn('Quick assign: item not found in backlog', { id: itemId });
    return null;
  }
  const position = useGridStore.getState().assignToNextOpenSlot(backlogItem);
  if (position === null) {
    gridLogger.debug('Quick assign: no open slot or already placed', { id: itemId });
  }
  return position;
}

/**
 * ItemDetailPopupProvider
 *
 * Renders all active item detail popups. Should be placed in the root layout
 * or in the match page layout to enable popup functionality throughout the app.
 *
 * Features:
 * - Renders multiple popups for side-by-side comparison
 * - Quick-assign through `quickAssignFromBacklog` (the grid-store's atomic slot door)
 * - Uses AnimatePresence for smooth enter/exit animations
 */
export function ItemDetailPopupProvider() {
  const popups = useItemPopupStore((state) => state.popups);

  if (popups.length === 0) return null;

  return (
    <AnimatePresence mode="sync">
      {popups.map((popup) => (
        <ItemDetailPopup
          key={popup.id}
          popup={popup}
          onQuickAssign={quickAssignFromBacklog}
        />
      ))}
    </AnimatePresence>
  );
}

export default ItemDetailPopupProvider;
