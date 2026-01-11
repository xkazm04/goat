"use client";

interface FocusRingOverlayProps {
  itemId: string;
  isFocused: boolean;
  isDragging: boolean;
}

/**
 * Shared focus ring overlay component for draggable/sortable items
 *
 * Shows a visible focus ring around items when focused via keyboard
 * navigation. Hidden during drag operations to avoid visual clutter.
 */
export function FocusRingOverlay({
  itemId,
  isFocused,
  isDragging,
}: FocusRingOverlayProps) {
  if (!isFocused || isDragging) return null;

  return (
    <div
      className="absolute inset-0 rounded-lg ring-2 ring-cyan-500 ring-offset-2 ring-offset-gray-900 pointer-events-none z-20"
      aria-hidden="true"
      data-testid={`focus-ring-${itemId}`}
    />
  );
}
