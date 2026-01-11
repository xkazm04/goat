import { DragEndEvent, DragStartEvent, DragMoveEvent } from '@dnd-kit/core';
import { BacklogItem } from '@/types/backlog-groups';
import {
  TransferableItem,
  TransferSource,
  toTransferableItem,
  isGridReceiverId,
  extractGridPosition,
} from '@/lib/dnd';

/**
 * Create drag start handler
 * Handles the initialization of drag operations
 */
export const createDragStartHandler = (
  setActiveItem: (id: string | null) => void
) => {
  return (event: DragStartEvent) => {
    setActiveItem(event.active.id.toString());
  };
};

/**
 * Create drag move handler
 * Handles drag move events for better feedback during dragging
 * Now includes distance tracking and callbacks for visual feedback
 */
export const createDragMoveHandler = (
  onDistanceChange?: (distance: number, delta: { x: number; y: number }) => void
) => {
  let startPosition: { x: number; y: number } | null = null;

  return (event: DragMoveEvent) => {
    // This ensures smooth dragging outside containers
    // Track distance from start position for visual feedback
    if (!startPosition && event.delta) {
      startPosition = { x: 0, y: 0 };
    }

    if (event.delta && onDistanceChange) {
      const currentDelta = {
        x: event.delta.x,
        y: event.delta.y
      };

      // Calculate total distance traveled
      const distance = Math.sqrt(
        Math.pow(currentDelta.x, 2) + Math.pow(currentDelta.y, 2)
      );

      onDistanceChange(distance, currentDelta);
    }
  };
};

/**
 * Create drag end handler wrapper
 * Handles the completion of drag operations and cleanup
 */
export const createDragEndHandler = (
  handleDragEnd: (event: DragEndEvent) => void,
  setActiveItem: (id: string | null) => void
) => {
  return (event: DragEndEvent) => {
    handleDragEnd(event);
    setActiveItem(null);
  };
};

/**
 * Classify drag operation type based on source and target IDs
 * Uses TransferProtocol utilities for consistent ID parsing
 */
export type DragOperationType = 'grid-to-grid' | 'backlog-to-grid' | 'collection-reorder' | 'unknown';

export function classifyDragOperation(activeId: string, overId: string): DragOperationType {
  const isActiveGrid = isGridReceiverId(activeId);
  const isOverGrid = isGridReceiverId(overId);

  if (isActiveGrid && isOverGrid) {
    return 'grid-to-grid';
  }

  if (!isActiveGrid && isOverGrid) {
    return 'backlog-to-grid';
  }

  // Future: Add collection-reorder classification
  return 'unknown';
}

/**
 * Extract transfer metadata from a drag end event
 */
export function extractTransferMetadata(event: DragEndEvent): {
  activeId: string;
  overId: string | null;
  operationType: DragOperationType;
  fromPosition: number | null;
  toPosition: number | null;
} {
  const activeId = String(event.active.id);
  const overId = event.over ? String(event.over.id) : null;
  const operationType = overId ? classifyDragOperation(activeId, overId) : 'unknown';
  const fromPosition = extractGridPosition(activeId);
  const toPosition = overId ? extractGridPosition(overId) : null;

  return {
    activeId,
    overId,
    operationType,
    fromPosition,
    toPosition,
  };
}

/**
 * Find active backlog item from groups
 * Safely searches for the currently dragged item across all backlog groups
 */
export const findActiveBacklogItem = (
  activeItem: string | null,
  backlogGroups: any[]
) => {
  if (!activeItem) return null;

  // First verify we have valid groups
  if (!backlogGroups || !Array.isArray(backlogGroups) || backlogGroups.length === 0) {
    return null;
  }

  // More robust flattening approach
  let allItems: any[] = [];

  // First try to collect items from all groups
  for (const group of backlogGroups) {
    if (Array.isArray(group.items)) {
      allItems.push(...group.items);
    }
  }

  // Filter out invalid items
  allItems = allItems.filter(item => item && item.id);

  // Find the active item
  const foundItem = allItems.find(item => item.id === activeItem);

  // Debug log for drag overlay
  if (foundItem) {
    console.log(`🔄 Found active item for drag overlay:`, {
      id: foundItem.id,
      title: foundItem.title || foundItem.name,
      hasImageUrl: !!foundItem.image_url,
      imageUrl: foundItem.image_url || 'NONE'
    });

    // Force image_url property if missing but found in item properties
    if (!foundItem.image_url && 'image_url' in foundItem) {
      console.log(`⚠️ image_url property exists but is null/undefined - item properties:`,
        Object.keys(foundItem));
    }
  } else if (activeItem) {
    console.warn(`⚠️ Active item ${activeItem} not found in any group`);
  }

  return foundItem;
};

/**
 * Find the backlog group ID for an active item
 * Used to provide context for BacklogItem component rendering
 */
export const findActiveItemGroupId = (
  activeItem: string | null,
  activeBacklogItem: any,
  backlogGroups: any[]
): string => {
  if (!activeItem || !activeBacklogItem) return '';

  for (const group of backlogGroups || []) {
    if (Array.isArray(group.items) && group.items.some((item: BacklogItem) => item && item.id === activeItem)) {
      return group.id || '';
    }
  }
  return '';
};
