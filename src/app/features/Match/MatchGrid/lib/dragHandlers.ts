import { DragEndEvent, DragStartEvent, DragMoveEvent } from '@dnd-kit/core';
import { BacklogItem } from '@/types/backlog-groups';

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
 */
export const createDragMoveHandler = () => {
  return (event: DragMoveEvent) => {
    // This ensures smooth dragging outside containers
    // Can be extended with additional logic for visual feedback
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
