"use client";

import { useState, useCallback, useRef } from "react";

interface UsePanelResizeOptions {
  defaultHeight?: number;
  minHeight?: number;
  maxHeightVh?: number;
}

interface UsePanelResizeResult {
  panelHeight: number;
  isResizing: boolean;
  isDndActive: boolean;
  handleResizeStart: (e: React.MouseEvent | React.TouchEvent) => void;
  setDndActive: (active: boolean) => void;
}

const DEFAULT_HEIGHT = 400;
const MIN_HEIGHT = 200;
const MAX_HEIGHT_VH = 80;

/**
 * Hook for handling panel resize via drag.
 * Uses ref for height to avoid stale closures in document-level event handlers.
 * Tracks DnD state to disable resize during drag operations.
 */
export function usePanelResize(options: UsePanelResizeOptions = {}): UsePanelResizeResult {
  const {
    defaultHeight = DEFAULT_HEIGHT,
    minHeight = MIN_HEIGHT,
    maxHeightVh = MAX_HEIGHT_VH,
  } = options;

  const [panelHeight, setPanelHeight] = useState(defaultHeight);
  const [isResizing, setIsResizing] = useState(false);
  const [isDndActive, setDndActive] = useState(false);

  // Use ref to avoid stale closure when capturing height in event handlers
  const panelHeightRef = useRef(panelHeight);
  panelHeightRef.current = panelHeight;

  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Don't allow resize during active DnD operations
    if (isDndActive) return;

    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const startHeight = panelHeightRef.current;
    const maxHeight = window.innerHeight * (maxHeightVh / 100);

    // Use pointer capture if available for reliable tracking
    const target = e.currentTarget as HTMLElement;
    if ('setPointerCapture' in target && 'pointerId' in e.nativeEvent) {
      try {
        target.setPointerCapture((e.nativeEvent as PointerEvent).pointerId);
      } catch { /* pointer capture not critical */ }
    }

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      moveEvent.preventDefault();
      const currentY = 'touches' in moveEvent
        ? (moveEvent as TouchEvent).touches[0].clientY
        : (moveEvent as MouseEvent).clientY;
      const delta = startY - currentY;
      const newHeight = Math.min(maxHeight, Math.max(minHeight, startHeight + delta));
      setPanelHeight(newHeight);
    };

    const handleEnd = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
  }, [isDndActive, minHeight, maxHeightVh]);

  return { panelHeight, isResizing, isDndActive, handleResizeStart, setDndActive };
}
