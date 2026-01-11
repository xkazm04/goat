"use client";

import { useRef, useEffect, useCallback } from "react";

interface GestureState {
  isDragging: boolean;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  pinchDistance: number;
}

interface UseGestureControlsOptions {
  onPan: (deltaX: number, deltaY: number) => void;
  onZoom: (delta: number) => void;
  onTap?: () => void;
  enabled?: boolean;
}

/**
 * Hook for handling gesture controls (mouse, touch, scroll)
 */
export function useGestureControls({
  onPan,
  onZoom,
  onTap,
  enabled = true,
}: UseGestureControlsOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gestureState = useRef<GestureState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    pinchDistance: 0,
  });

  // Calculate pinch distance between two touch points
  const getPinchDistance = useCallback((touches: TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Mouse event handlers
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (!enabled) return;
      gestureState.current = {
        ...gestureState.current,
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
      };
    },
    [enabled]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!enabled || !gestureState.current.isDragging) return;

      const deltaX = e.clientX - gestureState.current.lastX;
      const deltaY = e.clientY - gestureState.current.lastY;

      gestureState.current.lastX = e.clientX;
      gestureState.current.lastY = e.clientY;

      onPan(deltaX, deltaY);
    },
    [enabled, onPan]
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!enabled) return;

      const state = gestureState.current;
      const totalDeltaX = Math.abs(e.clientX - state.startX);
      const totalDeltaY = Math.abs(e.clientY - state.startY);

      // If barely moved, consider it a tap
      if (totalDeltaX < 5 && totalDeltaY < 5 && onTap) {
        onTap();
      }

      gestureState.current.isDragging = false;
    },
    [enabled, onTap]
  );

  // Wheel event handler for zoom
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!enabled) return;
      e.preventDefault();

      const delta = -e.deltaY * 0.001;
      onZoom(delta);
    },
    [enabled, onZoom]
  );

  // Touch event handlers
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;

      if (e.touches.length === 1) {
        gestureState.current = {
          ...gestureState.current,
          isDragging: true,
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          lastX: e.touches[0].clientX,
          lastY: e.touches[0].clientY,
        };
      } else if (e.touches.length === 2) {
        gestureState.current.pinchDistance = getPinchDistance(e.touches);
      }
    },
    [enabled, getPinchDistance]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;
      e.preventDefault();

      if (e.touches.length === 1 && gestureState.current.isDragging) {
        const deltaX = e.touches[0].clientX - gestureState.current.lastX;
        const deltaY = e.touches[0].clientY - gestureState.current.lastY;

        gestureState.current.lastX = e.touches[0].clientX;
        gestureState.current.lastY = e.touches[0].clientY;

        onPan(deltaX, deltaY);
      } else if (e.touches.length === 2) {
        const newDistance = getPinchDistance(e.touches);
        const delta = (newDistance - gestureState.current.pinchDistance) * 0.002;
        gestureState.current.pinchDistance = newDistance;
        onZoom(delta);
      }
    },
    [enabled, onPan, onZoom, getPinchDistance]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;

      const state = gestureState.current;

      // Check for tap gesture
      if (e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        const totalDeltaX = Math.abs(touch.clientX - state.startX);
        const totalDeltaY = Math.abs(touch.clientY - state.startY);

        if (totalDeltaX < 10 && totalDeltaY < 10 && onTap) {
          onTap();
        }
      }

      gestureState.current.isDragging = false;
      gestureState.current.pinchDistance = 0;
    },
    [enabled, onTap]
  );

  // Attach event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    container.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("touchstart", handleTouchStart, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [
    enabled,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  ]);

  return { containerRef };
}
