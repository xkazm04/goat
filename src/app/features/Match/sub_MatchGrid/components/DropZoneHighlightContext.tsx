/**
 * DropZoneHighlightContext
 *
 * Thin wrapper around the Zustand drop-zone-highlight-store.
 * The Provider handles store cleanup on unmount. All state lives in the store,
 * so consumers use granular selectors and only re-render when their specific
 * slice changes — eliminating the previous 50+ re-render cascade.
 *
 * Migration note: The old context API (useDropZoneHighlight / useOptionalDropZoneHighlight)
 * is preserved as a compatibility shim that delegates to the store. New code should
 * import directly from '@/stores/drop-zone-highlight-store'.
 */
"use client";

import { useEffect, type ReactNode } from "react";

import { useDropZoneHighlightStore } from "@/stores/drop-zone-highlight-store";

// Re-export types from the store
export type { ActiveItemData, DragError } from "@/stores/drop-zone-highlight-store";

/**
 * Provider that resets store state on unmount (e.g., when navigating away from match).
 */
export function DropZoneHighlightProvider({ children }: { children: ReactNode }) {
  const reset = useDropZoneHighlightStore((s) => s.reset);

  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  return <>{children}</>;
}

/**
 * Legacy hook — returns a compatibility shim matching the old context shape.
 * Subscribes to ALL store state (same perf as before). Prefer direct store
 * selectors in new code.
 */
export function useDropZoneHighlight() {
  const store = useDropZoneHighlightStore();
  return {
    dragState: {
      isDragging: store.isDragging,
      activeItemId: store.activeItemId,
      activeItemData: store.activeItemData,
      hoveredPosition: store.hoveredPosition,
      dropZonePositions: store.dropZonePositions,
      magneticState: store.magneticState,
      dragError: store.dragError,
    },
    cursorPositionRef: store.cursorPositionRef,
    setIsDragging: store.setIsDragging,
    setHoveredPosition: store.setHoveredPosition,
    registerDropZone: store.registerDropZone,
    unregisterDropZone: store.unregisterDropZone,
    updateCursorPosition: store.updateCursorPosition,
    updateMagneticState: store.updateMagneticState,
    getClosestDropZones: store.getClosestDropZones,
    emitDragError: store.emitDragError,
  };
}

/**
 * Legacy hook — returns compatibility shim or null.
 * @deprecated Use useDropZoneHighlightStore directly with selectors.
 */
export function useOptionalDropZoneHighlight() {
  const store = useDropZoneHighlightStore();
  return {
    dragState: {
      isDragging: store.isDragging,
      activeItemId: store.activeItemId,
      activeItemData: store.activeItemData,
      hoveredPosition: store.hoveredPosition,
      dropZonePositions: store.dropZonePositions,
      magneticState: store.magneticState,
      dragError: store.dragError,
    },
    cursorPositionRef: store.cursorPositionRef,
    setIsDragging: store.setIsDragging,
    setHoveredPosition: store.setHoveredPosition,
    registerDropZone: store.registerDropZone,
    unregisterDropZone: store.unregisterDropZone,
    updateCursorPosition: store.updateCursorPosition,
    updateMagneticState: store.updateMagneticState,
    getClosestDropZones: store.getClosestDropZones,
    emitDragError: store.emitDragError,
  };
}
