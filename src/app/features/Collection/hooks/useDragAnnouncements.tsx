"use client";

import React, { useCallback, useRef } from 'react';
import type { DragStartEvent, DragEndEvent, DragOverEvent, DragCancelEvent } from '@dnd-kit/core';
import type { CollectionItem } from '../types';

interface UseDragAnnouncementsOptions {
  items: CollectionItem[];
}

interface Announcements {
  onDragStart: (event: DragStartEvent) => string;
  onDragOver: (event: DragOverEvent) => string | undefined;
  onDragEnd: (event: DragEndEvent) => string;
  onDragCancel: (event: DragCancelEvent) => string;
}

/**
 * Hook for generating screen reader announcements during drag-and-drop operations
 *
 * Provides accessible feedback for keyboard users navigating the collection.
 * Announcements are spoken by screen readers to describe the drag state.
 *
 * @returns Announcements object for dnd-kit's accessibility prop
 */
export function useDragAnnouncements({
  items,
}: UseDragAnnouncementsOptions): {
  announcements: Announcements;
  liveRegionRef: React.RefObject<HTMLDivElement | null>;
} {
  const liveRegionRef = useRef<HTMLDivElement>(null);

  // Announce to screen reader via aria-live region
  const announce = useCallback((message: string) => {
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = message;
    }
  }, []);

  const getItemTitle = useCallback((id: string | number): string => {
    const item = items.find((i) => i.id === id);
    return item?.title || `Item ${id}`;
  }, [items]);

  const getPosition = useCallback((id: string | number): number => {
    const index = items.findIndex((i) => i.id === id);
    return index + 1; // Convert to 1-based position
  }, [items]);

  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      const title = getItemTitle(active.id);
      const position = getPosition(active.id);
      const message = `Picked up ${title} from position ${position} of ${items.length}. Use arrow keys to move, space or enter to drop, escape to cancel.`;
      announce(message);
      return message;
    },

    onDragOver: ({ active, over }) => {
      if (over) {
        const activeTitle = getItemTitle(active.id);
        const overTitle = getItemTitle(over.id);
        const newPosition = getPosition(over.id);
        const message = `${activeTitle} is over ${overTitle} at position ${newPosition}.`;
        announce(message);
        return message;
      }
      return undefined;
    },

    onDragEnd: ({ active, over }) => {
      const title = getItemTitle(active.id);

      if (over && active.id !== over.id) {
        const newPosition = getPosition(over.id);
        const message = `Dropped ${title} at position ${newPosition} of ${items.length}.`;
        announce(message);
        return message;
      }

      const originalPosition = getPosition(active.id);
      const message = `${title} was dropped back to its original position ${originalPosition}.`;
      announce(message);
      return message;
    },

    onDragCancel: ({ active }) => {
      const title = getItemTitle(active.id);
      const position = getPosition(active.id);
      const message = `Drag cancelled. ${title} returned to position ${position}.`;
      announce(message);
      return message;
    },
  };

  return {
    announcements,
    liveRegionRef,
  };
}

/**
 * Screen reader live region component for drag announcements
 * Should be rendered once in the DnD context
 */
export function DragAnnouncementRegion({
  liveRegionRef,
}: {
  liveRegionRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={liveRegionRef}
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      className="sr-only"
      data-testid="drag-announcement-region"
    />
  );
}
