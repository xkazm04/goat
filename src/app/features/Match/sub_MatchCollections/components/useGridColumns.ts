"use client";

import { useState, useLayoutEffect, useMemo, useRef, useCallback } from "react";

interface UseGridColumnsOptions {
  /** Minimum column count */
  minColumns?: number;
  /** Maximum column count */
  maxColumns?: number;
  /** Item minimum width in pixels */
  minItemWidth?: number;
  /** Gap between items in pixels */
  gap?: number;
  /** Aspect ratio width:height (e.g., 3/4 means width/height = 0.75) */
  aspectRatio?: number;
  /** Pause ResizeObserver (e.g., during drag when container won't resize) */
  paused?: boolean;
}

interface GridDimensions {
  /** Number of columns that fit */
  columnCount: number;
  /** Actual calculated item width in pixels */
  itemWidth: number;
  /** Calculated item height based on aspect ratio */
  itemHeight: number;
  /** Row height including gap for virtualization */
  rowHeight: number;
}

/**
 * Hook to calculate responsive grid dimensions based on container width.
 * Returns column count and calculated item dimensions for proper aspect ratio.
 * Uses ResizeObserver for efficient updates.
 */
export function useGridColumns(
  containerRef: React.RefObject<HTMLElement | null>,
  options: UseGridColumnsOptions = {}
): number {
  const dims = useGridDimensions(containerRef, options);
  return dims.columnCount;
}

/**
 * Extended hook that returns full grid dimensions including item sizes.
 * Use this when you need to calculate row heights for virtualization.
 *
 * Handles late-binding refs (e.g., when container is inside a portal)
 * by re-checking on every layout until the ref is available.
 */
export function useGridDimensions(
  containerRef: React.RefObject<HTMLElement | null>,
  options: UseGridColumnsOptions = {}
): GridDimensions {
  const {
    minColumns = 6,
    maxColumns = 12,
    minItemWidth = 64,
    gap = 8,
    aspectRatio = 3 / 4,
    paused = false,
  } = options;

  const [containerWidth, setContainerWidth] = useState(0);
  const observerRef = useRef<ResizeObserver | null>(null);
  const observedElementRef = useRef<HTMLElement | null>(null);

  // Memoize the update function
  const updateWidth = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      const width = container.offsetWidth;
      setContainerWidth(prev => prev !== width ? width : prev);
    }
  }, [containerRef]);

  // Use useLayoutEffect to catch the ref as soon as DOM is ready
  // Runs on every render until observer is set up
  useLayoutEffect(() => {
    const container = containerRef.current;

    // If no container yet, try again on next render
    if (!container) {
      return;
    }

    // Disconnect observer while paused (e.g., during drag - container won't resize)
    if (paused) {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
        observedElementRef.current = null;
      }
      return;
    }

    // If we're already observing this element, nothing to do
    if (observedElementRef.current === container && observerRef.current) {
      return;
    }

    // Clean up previous observer if element changed
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Initial measurement
    updateWidth();

    // Set up ResizeObserver
    observerRef.current = new ResizeObserver(() => {
      updateWidth();
    });
    observerRef.current.observe(container);
    observedElementRef.current = container;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
        observedElementRef.current = null;
      }
    };
  }); // No dependencies - runs every render until setup succeeds

  // Calculate all dimensions from container width
  const dimensions = useMemo((): GridDimensions => {
    if (containerWidth === 0) {
      // Return defaults until we have a container measurement
      return {
        columnCount: minColumns,
        itemWidth: minItemWidth,
        itemHeight: Math.round(minItemWidth / aspectRatio),
        rowHeight: Math.round(minItemWidth / aspectRatio) + gap,
      };
    }

    // Calculate how many items can fit: (width + gap) / (itemWidth + gap)
    const possibleColumns = Math.floor((containerWidth + gap) / (minItemWidth + gap));
    const columnCount = Math.max(minColumns, Math.min(maxColumns, possibleColumns));

    // Calculate actual item width: (containerWidth - (columns-1)*gap) / columns
    const totalGapWidth = (columnCount - 1) * gap;
    const itemWidth = Math.floor((containerWidth - totalGapWidth) / columnCount);

    // Calculate item height maintaining aspect ratio (width:height = aspectRatio)
    // height = width / aspectRatio
    const itemHeight = Math.round(itemWidth / aspectRatio);

    // Row height for virtualization (item height + gap)
    const rowHeight = itemHeight + gap;

    return {
      columnCount,
      itemWidth,
      itemHeight,
      rowHeight,
    };
  }, [containerWidth, minColumns, maxColumns, minItemWidth, gap, aspectRatio]);

  return dimensions;
}
