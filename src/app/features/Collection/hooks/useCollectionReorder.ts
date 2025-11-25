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

interface UseCollectionReorderOptions {
  items: CollectionItem[];
  onOrderChange?: (items: CollectionItem[]) => void;
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
 */
export function useCollectionReorder({
  items,
  onOrderChange,
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
        setOrderedItems((items) => {
          const oldIndex = items.findIndex((item) => item.id === active.id);
          const newIndex = items.findIndex((item) => item.id === over.id);

          if (oldIndex === -1 || newIndex === -1) {
            return items;
          }

          const newOrder = arrayMove(items, oldIndex, newIndex);

          // Call onOrderChange callback if provided
          if (onOrderChange) {
            onOrderChange(newOrder);
          }

          return newOrder;
        });
      }

      setActiveId(null);
      setOverId(null);
    },
    [onOrderChange]
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
  };
}
