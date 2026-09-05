"use client";

import { useCallback } from "react";

import { gridLogger } from "@/lib/logger";
import { useBacklogStore } from "@/stores/backlog-store";
import { useGridStore } from "@/stores/grid-store";
import { useItemPopupStore } from "@/stores/item-popup-store";
import { useSessionStore } from "@/stores/session-store";

import { ItemInspector, RelatedItem } from "./ItemInspector";

/**
 * ItemInspectorProvider
 *
 * A provider component that renders the ItemInspector modal.
 * Should be placed in a layout file to be available globally.
 *
 * The inspector can be opened from anywhere using useItemPopupStore:
 * ```tsx
 * const openInspector = useItemPopupStore((state) => state.openInspector);
 * openInspector(itemId);
 * ```
 */
export function ItemInspectorProvider() {
  const itemId = useItemPopupStore((state) => state.inspectorItemId);
  const isOpen = useItemPopupStore((state) => state.inspectorIsOpen);
  const closeInspector = useItemPopupStore((state) => state.closeInspector);
  const openInspector = useItemPopupStore((state) => state.openInspector);
  const assignItemToGrid = useGridStore((state) => state.assignItemToGrid);
  const getNextAvailableGridPosition = useGridStore((state) => state.getNextAvailableGridPosition);

  // Handle quick assign from inspector
  const handleQuickAssign = useCallback((id: string) => {
    const nextPosition = getNextAvailableGridPosition();
    if (nextPosition === null) {
      gridLogger.debug('Quick assign failed: no available grid position');
      return;
    }

    // Find the item in backlog
    const backlogItem = useSessionStore.getState().getAvailableBacklogItems()
      .find(item => item.id === id);

    if (!backlogItem) {
      gridLogger.debug('Quick assign failed: item not found in backlog', { id });
      return;
    }

    assignItemToGrid(backlogItem, nextPosition);
    useBacklogStore.getState().markItemAsUsed(id, true);
    gridLogger.debug('Quick assign item', { id, position: nextPosition });
  }, [getNextAvailableGridPosition, assignItemToGrid]);

  // Handle clicking a related item - opens that item in inspector
  const handleRelatedItemClick = useCallback((item: RelatedItem) => {
    openInspector(item.id);
  }, [openInspector]);

  return (
    <ItemInspector
      itemId={itemId}
      isOpen={isOpen}
      onClose={closeInspector}
      onQuickAssign={handleQuickAssign}
      onRelatedItemClick={handleRelatedItemClick}
    />
  );
}

export default ItemInspectorProvider;
