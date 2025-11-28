import { useCallback, useEffect, useRef, useState } from "react";
import { useGridStore } from "@/stores/grid-store";
import { useCompositionModalStore } from "@/stores/composition-modal-store";
import { GridItemType } from "@/types/match";
import { DragEndEvent, DragMoveEvent, DragStartEvent } from "@dnd-kit/core";

interface DragState {
  isDragging: boolean;
  activeItemId: string | null;
  velocity: { x: number; y: number };
  previewPosition: number | null;
  trailPositions: Array<{ x: number; y: number; timestamp: number }>;
}

interface UseDragSyncOptions {
  onDragStart?: (itemId: string) => void;
  onDragEnd?: (itemId: string, position: number | null) => void;
  onPositionChange?: (position: number | null) => void;
  maxTrailLength?: number;
}

/**
 * useDragSync - Synchronizes drag state across components
 *
 * This hook:
 * - Tracks drag velocity for inertia calculations
 * - Maintains trail positions for visual effects
 * - Syncs with global stores on drag completion
 * - Provides callbacks for real-time updates
 */
export function useDragSync(options: UseDragSyncOptions = {}) {
  const { onDragStart, onDragEnd, onPositionChange, maxTrailLength = 20 } = options;

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    activeItemId: null,
    velocity: { x: 0, y: 0 },
    previewPosition: null,
    trailPositions: [],
  });

  // Track last position for velocity calculation
  const lastPositionRef = useRef<{ x: number; y: number; time: number }>({
    x: 0,
    y: 0,
    time: Date.now(),
  });

  // Grid store actions
  const gridStore = useGridStore();
  const compositionStore = useCompositionModalStore();

  /**
   * Handle drag start
   */
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const itemId = String(event.active.id);

      setDragState({
        isDragging: true,
        activeItemId: itemId,
        velocity: { x: 0, y: 0 },
        previewPosition: null,
        trailPositions: [],
      });

      lastPositionRef.current = {
        x: 0,
        y: 0,
        time: Date.now(),
      };

      onDragStart?.(itemId);
    },
    [onDragStart]
  );

  /**
   * Handle drag move - track velocity and update trail
   */
  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      if (!event.delta) return;

      const now = Date.now();
      const deltaTime = (now - lastPositionRef.current.time) / 1000;

      // Calculate velocity
      const velocity = {
        x: deltaTime > 0 ? event.delta.x / deltaTime : 0,
        y: deltaTime > 0 ? event.delta.y / deltaTime : 0,
      };

      // Get current position from the event
      const currentX = lastPositionRef.current.x + event.delta.x;
      const currentY = lastPositionRef.current.y + event.delta.y;

      // Update trail positions
      setDragState((prev) => {
        const newTrail = [
          ...prev.trailPositions,
          { x: currentX, y: currentY, timestamp: now },
        ];

        // Limit trail length
        const trimmedTrail =
          newTrail.length > maxTrailLength ? newTrail.slice(-maxTrailLength) : newTrail;

        return {
          ...prev,
          velocity,
          trailPositions: trimmedTrail,
        };
      });

      lastPositionRef.current = {
        x: currentX,
        y: currentY,
        time: now,
      };
    },
    [maxTrailLength]
  );

  /**
   * Handle drag end - sync with stores
   */
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      const itemId = String(active.id);
      const position = over?.data?.current?.position ?? null;

      setDragState({
        isDragging: false,
        activeItemId: null,
        velocity: { x: 0, y: 0 },
        previewPosition: null,
        trailPositions: [],
      });

      // Notify callback
      onDragEnd?.(itemId, position);

      // Grid store handles the actual placement
      // This is just for sync notification
    },
    [onDragEnd]
  );

  /**
   * Update preview position
   */
  const setPreviewPosition = useCallback(
    (position: number | null) => {
      setDragState((prev) => ({
        ...prev,
        previewPosition: position,
      }));
      onPositionChange?.(position);
    },
    [onPositionChange]
  );

  /**
   * Get current drag velocity
   */
  const getVelocity = useCallback(() => {
    return dragState.velocity;
  }, [dragState.velocity]);

  /**
   * Check if an item is currently being dragged
   */
  const isItemDragging = useCallback(
    (itemId: string) => {
      return dragState.isDragging && dragState.activeItemId === itemId;
    },
    [dragState.isDragging, dragState.activeItemId]
  );

  return {
    // State
    isDragging: dragState.isDragging,
    activeItemId: dragState.activeItemId,
    velocity: dragState.velocity,
    previewPosition: dragState.previewPosition,
    trailPositions: dragState.trailPositions,

    // Handlers
    handleDragStart,
    handleDragMove,
    handleDragEnd,

    // Utilities
    setPreviewPosition,
    getVelocity,
    isItemDragging,
  };
}

/**
 * useGridSync - Syncs grid state with composition modal
 *
 * Ensures grid updates are reflected in the composition modal
 * for real-time preview.
 */
export function useGridSync() {
  const gridItems = useGridStore((state) => state.gridItems);
  const compositionStore = useCompositionModalStore();

  // Sync matched count to composition store
  useEffect(() => {
    const matchedCount = gridItems.filter((item) => item.matched).length;
    const totalSlots = gridItems.length;

    // Could update composition store with progress if needed
    // compositionStore.updateFormData({ progress: matchedCount / totalSlots });
  }, [gridItems]);

  return {
    matchedCount: gridItems.filter((item) => item.matched).length,
    totalSlots: gridItems.length,
    isEmpty: gridItems.every((item) => !item.matched),
    isFull: gridItems.every((item) => item.matched),
  };
}
