"use client";

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragCancelEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CollectionItem } from '../types';
import { useDragAnnouncements, DragAnnouncementRegion } from './useDragAnnouncements';
import {
  TransferableItem,
  TransferResult,
  TransferAction,
} from '@/lib/dnd';

interface UseCollectionReorderOptions {
  items: CollectionItem[];
  onOrderChange?: (items: CollectionItem[]) => void;
  /** Optional callback for TransferProtocol-compatible transfer results */
  onTransferResult?: (result: TransferResult) => void;
}

interface UseCollectionReorderReturn {
  orderedItems: CollectionItem[];
  activeId: string | null;
  overId: string | null;
  sensors: ReturnType<typeof useSensors>;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragOver: (event: DragOverEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  handleDragCancel: (event: DragCancelEvent) => void;
  resetOrder: () => void;
  /** Accessibility config for DndContext */
  accessibilityConfig: {
    announcements: {
      onDragStart: (event: DragStartEvent) => string;
      onDragOver: (event: DragOverEvent) => string | undefined;
      onDragEnd: (event: DragEndEvent) => string;
      onDragCancel: (event: DragCancelEvent) => string;
    };
    screenReaderInstructions: {
      draggable: string;
    };
  };
  /** Ref for the live region element */
  liveRegionRef: React.RefObject<HTMLDivElement | null>;
  /** Component for screen reader announcements */
  AnnouncementRegion: typeof DragAnnouncementRegion;
  /** TransferProtocol: Get an item by ID as TransferableItem */
  getTransferableItem: (id: string) => TransferableItem | null;
  /** TransferProtocol: Perform a reorder operation programmatically */
  reorderItems: (oldIndex: number, newIndex: number) => TransferResult;
}


/**
 * Convert CollectionItem to TransferableItem
 */
function toTransferableItem(item: CollectionItem): TransferableItem {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    image_url: item.image_url,
    tags: item.tags,
    category: item.category,
    subcategory: item.subcategory,
    metadata: item.metadata,
  };
}

/**
 * Hook for managing drag-and-drop reordering within CollectionPanel
 *
 * Features:
 * - Local state management for item order
 * - Optional callback for persistence
 * - Enhanced keyboard sensor with arrow key support
 * - Screen reader announcements for accessibility
 * - Focus management during drag operations
 * - Animated reordering
 * - TransferProtocol integration for unified DnD operations
 */
export function useCollectionReorder({
  items,
  onOrderChange,
  onTransferResult,
}: UseCollectionReorderOptions): UseCollectionReorderReturn {
  const [orderedItems, setOrderedItems] = useState<CollectionItem[]>(items);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Update ordered items when external items change
  useEffect(() => {
    setOrderedItems(items);
  }, [items]);

  // Screen reader announcements
  const { announcements, liveRegionRef } = useDragAnnouncements({
    items: orderedItems,
  });

  // Configure sensors for drag operations with enhanced keyboard support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement to start drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      // Keyboard activation: Space or Enter to pick up/drop
      keyboardCodes: {
        start: ['Space', 'Enter'],
        cancel: ['Escape'],
        end: ['Space', 'Enter'],
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    setOverId(over ? (over.id as string) : null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        setOrderedItems((currentItems) => {
          const oldIndex = currentItems.findIndex((item) => item.id === active.id);
          const newIndex = currentItems.findIndex((item) => item.id === over.id);

          if (oldIndex === -1 || newIndex === -1) {
            // Emit transfer result for failed operation
            if (onTransferResult) {
              onTransferResult({
                success: false,
                action: 'reject',
                error: 'Invalid indices for reorder operation',
              });
            }
            return currentItems;
          }

          const newOrder = arrayMove(currentItems, oldIndex, newIndex);

          // Call onOrderChange callback if provided
          if (onOrderChange) {
            onOrderChange(newOrder);
          }

          // Emit TransferProtocol-compatible result
          if (onTransferResult) {
            const movedItem = currentItems[oldIndex];
            onTransferResult({
              success: true,
              action: 'reorder',
              item: toTransferableItem(movedItem),
              metadata: { oldIndex, newIndex },
            });
          }

          return newOrder;
        });
      }

      setActiveId(null);
      setOverId(null);
    },
    [onOrderChange, onTransferResult]
  );

  const handleDragCancel = useCallback((event: DragCancelEvent) => {
    setActiveId(null);
    setOverId(null);
  }, []);

  const resetOrder = useCallback(() => {
    setOrderedItems(items);
    if (onOrderChange) {
      onOrderChange(items);
    }
  }, [items, onOrderChange]);

  // TransferProtocol: Get an item by ID as TransferableItem
  const getTransferableItem = useCallback(
    (id: string): TransferableItem | null => {
      const item = orderedItems.find((item) => item.id === id);
      return item ? toTransferableItem(item) : null;
    },
    [orderedItems]
  );

  // TransferProtocol: Perform a reorder operation programmatically
  const reorderItems = useCallback(
    (oldIndex: number, newIndex: number): TransferResult => {
      if (
        oldIndex < 0 ||
        oldIndex >= orderedItems.length ||
        newIndex < 0 ||
        newIndex >= orderedItems.length
      ) {
        return {
          success: false,
          action: 'reject',
          error: 'Invalid indices',
        };
      }

      if (oldIndex === newIndex) {
        return {
          success: false,
          action: 'reject',
          error: 'Same position',
        };
      }

      const movedItem = orderedItems[oldIndex];
      const newOrder = arrayMove(orderedItems, oldIndex, newIndex);

      setOrderedItems(newOrder);

      if (onOrderChange) {
        onOrderChange(newOrder);
      }

      const result: TransferResult = {
        success: true,
        action: 'reorder',
        item: toTransferableItem(movedItem),
        metadata: { oldIndex, newIndex },
      };

      if (onTransferResult) {
        onTransferResult(result);
      }

      return result;
    },
    [orderedItems, onOrderChange, onTransferResult]
  );

  // Accessibility configuration for DndContext
  const accessibilityConfig = useMemo(
    () => ({
      announcements,
      screenReaderInstructions: {
        draggable:
          'To pick up a draggable item, press Space or Enter. While dragging, use the arrow keys to move the item. Press Space or Enter again to drop the item in its new position, or press Escape to cancel.',
      },
    }),
    [announcements]
  );

  return {
    orderedItems,
    activeId,
    overId,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    resetOrder,
    accessibilityConfig,
    liveRegionRef,
    AnnouncementRegion: DragAnnouncementRegion,
    // TransferProtocol integration
    getTransferableItem,
    reorderItems,
  };
}
