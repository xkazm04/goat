"use client";

/**
 * useGridPinchZoom
 * Pinch-to-zoom and two-finger swipe navigation for the match grid.
 * - Pinch in/out to scale the grid (useful for large 30-50 item lists)
 * - Two-finger vertical swipe to scroll between grid sections
 * - Integrates with magnetic snap for precise positioning at zoom boundaries
 */

import { useRef, useCallback, useState } from "react";

import { triggerHaptic } from "../sub_MatchGrid/lib/hapticFeedback";

export interface GridZoomState {
  /** Current zoom scale (1.0 = default) */
  scale: number;
  /** Transform origin for zoom (viewport center of pinch) */
  originX: number;
  originY: number;
  /** Whether a pinch gesture is active */
  isPinching: boolean;
  /** Whether two-finger scrolling */
  isTwoFingerScrolling: boolean;
  /** Scroll offset for two-finger nav */
  scrollOffset: number;
}

interface PinchTrack {
  startDistance: number;
  startScale: number;
  centerX: number;
  centerY: number;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.0;
const SNAP_SCALES = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
const SNAP_TOLERANCE = 0.08; // Snap to preset if within this range
const TWO_FINGER_SCROLL_THRESHOLD = 15; // px before scrolling kicks in

interface TouchLike {
  clientX: number;
  clientY: number;
}

function getDistance(t1: TouchLike, t2: TouchLike): number {
  const dx = t2.clientX - t1.clientX;
  const dy = t2.clientY - t1.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getCenter(t1: TouchLike, t2: TouchLike): { x: number; y: number } {
  return {
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  };
}

/** Snap to nearest preset scale if close enough */
function snapScale(scale: number): number {
  for (const snap of SNAP_SCALES) {
    if (Math.abs(scale - snap) < SNAP_TOLERANCE) return snap;
  }
  return scale;
}

export function useGridPinchZoom(gridSize: number) {
  const pinchRef = useRef<PinchTrack | null>(null);
  const twoFingerStartY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [zoomState, setZoomState] = useState<GridZoomState>({
    scale: 1.0,
    originX: 50,
    originY: 50,
    isPinching: false,
    isTwoFingerScrolling: false,
    scrollOffset: 0,
  });

  // Only enable for large grids
  const enabled = gridSize > 20;

  /** Reset zoom to 1.0 */
  const resetZoom = useCallback(() => {
    setZoomState((prev) => ({
      ...prev,
      scale: 1.0,
      originX: 50,
      originY: 50,
    }));
    triggerHaptic("buttonPress");
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;

      if (e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const distance = getDistance(t1, t2);
        const center = getCenter(t1, t2);

        // Calculate origin as percentage of container
        const rect = containerRef.current?.getBoundingClientRect();
        const originX = rect
          ? ((center.x - rect.left) / rect.width) * 100
          : 50;
        const originY = rect
          ? ((center.y - rect.top) / rect.height) * 100
          : 50;

        pinchRef.current = {
          startDistance: distance,
          startScale: zoomState.scale,
          centerX: originX,
          centerY: originY,
        };

        twoFingerStartY.current = center.y;

        setZoomState((prev) => ({
          ...prev,
          isPinching: true,
          originX,
          originY,
        }));
      }
    },
    [enabled, zoomState.scale]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || e.touches.length !== 2) return;

      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDistance = getDistance(t1, t2);
      const center = getCenter(t1, t2);

      const pinch = pinchRef.current;
      if (!pinch) return;

      // Pinch zoom — track the raw clamped scale 1:1 with the fingers. Snapping
      // is applied only on release (handleTouchEnd); calling snapScale on every
      // move force-pinned the scale to a preset within the 0.08 tolerance band,
      // making the pinch feel sticky/notched (a dead zone around each preset).
      const scaleRatio = currentDistance / pinch.startDistance;
      let newScale = pinch.startScale * scaleRatio;
      newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

      // Two-finger scroll (vertical movement of the pinch center)
      const startY = twoFingerStartY.current;
      let scrollDelta = 0;
      if (startY !== null) {
        const dy = center.y - startY;
        if (Math.abs(dy) > TWO_FINGER_SCROLL_THRESHOLD) {
          scrollDelta = dy;
        }
      }

      setZoomState((prev) => ({
        ...prev,
        scale: newScale,
        originX: pinch.centerX,
        originY: pinch.centerY,
        isTwoFingerScrolling: scrollDelta !== 0,
        scrollOffset: prev.scrollOffset + scrollDelta * 0.3,
      }));

      // Update start Y for continuous scrolling
      if (scrollDelta !== 0) {
        twoFingerStartY.current = center.y;
      }
    },
    [enabled]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;

      if (e.touches.length < 2) {
        // Pinch ended — snap to nearest scale preset
        const snapped = snapScale(zoomState.scale);
        if (snapped !== zoomState.scale) {
          triggerHaptic("buttonPress");
        }

        pinchRef.current = null;
        twoFingerStartY.current = null;

        setZoomState((prev) => ({
          ...prev,
          scale: snapped,
          isPinching: false,
          isTwoFingerScrolling: false,
        }));
      }
    },
    [enabled, zoomState.scale]
  );

  /** CSS transform style to apply to the grid container */
  const gridStyle: React.CSSProperties = enabled
    ? {
        transform: `scale(${zoomState.scale})`,
        transformOrigin: `${zoomState.originX}% ${zoomState.originY}%`,
        transition: zoomState.isPinching ? "none" : "transform 0.2s ease-out",
      }
    : {};

  return {
    zoomState,
    enabled,
    containerRef,
    gridStyle,
    resetZoom,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
