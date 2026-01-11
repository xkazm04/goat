"use client";

import { GripVertical } from "lucide-react";

interface DragHandleIndicatorProps {
  itemId: string;
  isDragging: boolean;
  visible: boolean;
}

/**
 * Shared drag handle indicator component for draggable/sortable items
 *
 * Shows a visual grip icon to indicate that an item can be dragged.
 * Appears on focus or during drag operations.
 */
export function DragHandleIndicator({
  itemId,
  isDragging,
  visible,
}: DragHandleIndicatorProps) {
  if (!visible) return null;

  return (
    <div
      className={`
        absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-full
        flex items-center justify-center
        w-6 h-6 rounded
        bg-cyan-500/90 text-white
        shadow-lg shadow-cyan-500/30
        transition-opacity duration-150
        ${isDragging ? 'opacity-100' : 'opacity-80'}
        z-30
      `}
      aria-hidden="true"
      data-testid={`drag-handle-indicator-${itemId}`}
    >
      <GripVertical className="w-4 h-4" />
    </div>
  );
}
