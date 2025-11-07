"use client";

import { useState, useCallback, useEffect } from 'react';
import {
  DragEndEvent,
  DragStartEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CollectionItem } from '../types';

interface UseCollectionReorderOptions {
  items: CollectionItem[];
  onOrderChange?: (items: CollectionItem[]) => void;
}

interface UseCollectionReorderReturn {
  orderedItems: CollectionItem[];
  activeId: string | null;
  sensors: ReturnType<typeof useSensors>;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  handleDragCancel: () => void;
  resetOrder: () => void;
}

/**
 * Hook for managing drag-and-drop reordering within CollectionPanel
 *
 * Features:
 * - Local state management for item order
 * - Optional callback for persistence
 * - Keyboard and pointer sensor support
 * - Animated reordering
 */
export function useCollectionReorder({
  items,
  onOrderChange,
}: UseCollectionReorderOptions): UseCollectionReorderReturn {
  const [orderedItems, setOrderedItems] = useState<CollectionItem[]>(items);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Update ordered items when external items change
  // This allows the parent to update items without breaking the local order
  useEffect(() => {
    setOrderedItems(items);
  }, [items]);

  // Configure sensors for drag operations
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement to start drag (prevents accidental drags)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
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
    },
    [onOrderChange]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const resetOrder = useCallback(() => {
    setOrderedItems(items);
    if (onOrderChange) {
      onOrderChange(items);
    }
  }, [items, onOrderChange]);

  return {
    orderedItems,
    activeId,
    sensors,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    resetOrder,
  };
}
