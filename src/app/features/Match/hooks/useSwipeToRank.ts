"use client";

/**
 * useSwipeToRank
 * Hook for swipe-to-rank gesture on mobile backlog items.
 * Swipe left = assign to next open grid slot
 * Swipe right = dismiss/skip item
 * Long-press + flick = assign to specific position via momentum physics
 */

import { useRef, useCallback, useState } from "react";

import { CollectionItem } from "@/app/features/Collection/types";
import { useBacklogStore } from "@/stores/backlog-store";
import { useGridStore } from "@/stores/grid-store";

import {
  triggerHaptic,
  getDropPositionPattern,
} from "../sub_MatchGrid/lib/hapticFeedback";

/** Swipe state for visual feedback */
export interface SwipeState {
  /** Current horizontal offset during swipe */
  offsetX: number;
  /** Swipe direction (null if not swiping) */
  direction: "left" | "right" | null;
  /** 0..1 progress toward action threshold */
  progress: number;
  /** Whether the threshold has been crossed */
  committed: boolean;
  /** Active item id being swiped */
  activeItemId: string | null;
}

const SWIPE_THRESHOLD = 80; // px to trigger action
const VELOCITY_THRESHOLD = 0.4; // px/ms for fast swipe
const VERTICAL_LOCK = 1.5; // ratio: vertical/horizontal before locking to scroll

interface TouchTrack {
  startX: number;
  startY: number;
  startTime: number;
  currentX: number;
  currentY: number;
  locked: "horizontal" | "vertical" | null;
  itemId: string;
}

export function useSwipeToRank() {
  const touchRef = useRef<TouchTrack | null>(null);
  const [swipeState, setSwipeState] = useState<SwipeState>({
    offsetX: 0,
    direction: null,
    progress: 0,
    committed: false,
    activeItemId: null,
  });

  /** Find the next empty grid position */
  const getNextEmptySlot = useCallback((): number | null => {
    const { gridItems, maxGridSize } = useGridStore.getState();
    for (let i = 0; i < maxGridSize; i++) {
      if (!gridItems[i]?.context.matched) return i;
    }
    return null;
  }, []);

  /** Resolve a CollectionItem to its BacklogItem via the backlog store */
  const resolveBacklogItem = useCallback((itemId: string) => {
    const backlogState = useBacklogStore.getState();
    return backlogState.getItemById(itemId);
  }, []);

  /** Assign an item to the next open grid slot */
  const assignToNextSlot = useCallback(
    (item: CollectionItem) => {
      const position = getNextEmptySlot();
      if (position === null) return false;

      const backlogItem = resolveBacklogItem(item.id);
      if (!backlogItem) return false;

      const { assignItemToGrid } = useGridStore.getState();
      const { markItemAsUsed } = useBacklogStore.getState();

      assignItemToGrid(backlogItem, position);
      markItemAsUsed(item.id, true);
      triggerHaptic(getDropPositionPattern(position));
      return true;
    },
    [getNextEmptySlot, resolveBacklogItem]
  );

  /** Assign an item to a specific grid position (for flick-to-position) */
  const assignToPosition = useCallback(
    (item: CollectionItem, position: number) => {
      const { gridItems, maxGridSize, assignItemToGrid } =
        useGridStore.getState();
      if (position < 0 || position >= maxGridSize) return false;
      if (gridItems[position]?.context.matched) return false;

      const backlogItem = resolveBacklogItem(item.id);
      if (!backlogItem) return false;

      const { markItemAsUsed } = useBacklogStore.getState();
      assignItemToGrid(backlogItem, position);
      markItemAsUsed(item.id, true);
      triggerHaptic(getDropPositionPattern(position));
      return true;
    },
    [resolveBacklogItem]
  );

  /** Handle touch start on a backlog item */
  const handleTouchStart = useCallback(
    (e: React.TouchEvent, itemId: string) => {
      const touch = e.touches[0];
      touchRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        currentX: touch.clientX,
        currentY: touch.clientY,
        locked: null,
        itemId,
      };
    },
    []
  );

  /** Handle touch move — determine direction lock and update swipe state */
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const track = touchRef.current;
    if (!track) return;

    const touch = e.touches[0];
    track.currentX = touch.clientX;
    track.currentY = touch.clientY;

    const dx = touch.clientX - track.startX;
    const dy = touch.clientY - track.startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Direction lock after 10px movement
    if (!track.locked && (absDx > 10 || absDy > 10)) {
      if (absDy > absDx * VERTICAL_LOCK) {
        track.locked = "vertical";
      } else {
        track.locked = "horizontal";
      }
    }

    // If locked to vertical scrolling, reset and bail
    if (track.locked === "vertical") {
      setSwipeState({
        offsetX: 0,
        direction: null,
        progress: 0,
        committed: false,
        activeItemId: null,
      });
      return;
    }

    // Horizontal swipe — prevent scroll and update state
    if (track.locked === "horizontal") {
      e.preventDefault();
      const progress = Math.min(absDx / SWIPE_THRESHOLD, 1);
      const direction = dx < 0 ? "left" : "right";
      setSwipeState({
        offsetX: dx,
        direction,
        progress,
        committed: progress >= 1,
        activeItemId: track.itemId,
      });
    }
  }, []);

  /** Handle touch end — execute action if threshold crossed */
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent, item: CollectionItem) => {
      const track = touchRef.current;
      if (!track) return;

      const dx = track.currentX - track.startX;
      const dt = Math.max(Date.now() - track.startTime, 1);
      const velocity = Math.abs(dx) / dt;
      const absDx = Math.abs(dx);
      const direction = dx < 0 ? "left" : "right";

      // Check if action should fire (distance OR velocity)
      const shouldFire =
        track.locked === "horizontal" &&
        (absDx >= SWIPE_THRESHOLD || velocity >= VELOCITY_THRESHOLD);

      if (shouldFire) {
        if (direction === "left") {
          // Swipe left = assign to next slot
          const success = assignToNextSlot(item);
          if (!success) {
            triggerHaptic("error");
          }
        } else {
          // Swipe right = dismiss (skip) — just provide haptic feedback
          triggerHaptic("buttonPress");
        }
      }

      // Reset state
      touchRef.current = null;
      setSwipeState({
        offsetX: 0,
        direction: null,
        progress: 0,
        committed: false,
        activeItemId: null,
      });
    },
    [assignToNextSlot]
  );

  /** Handle touch cancel */
  const handleTouchCancel = useCallback(() => {
    touchRef.current = null;
    setSwipeState({
      offsetX: 0,
      direction: null,
      progress: 0,
      committed: false,
      activeItemId: null,
    });
  }, []);

  return {
    swipeState,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },
    assignToNextSlot,
    assignToPosition,
    getNextEmptySlot,
  };
}
