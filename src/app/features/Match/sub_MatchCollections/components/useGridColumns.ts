"use client";

import { useState, useEffect } from "react";

interface UseGridColumnsOptions {
  /** Minimum column count */
  minColumns?: number;
  /** Maximum column count */
  maxColumns?: number;
  /** Item minimum width in pixels */
  minItemWidth?: number;
  /** Gap between items in pixels */
  gap?: number;
}

/**
 * Hook to calculate responsive column count based on container width.
 * Uses ResizeObserver for efficient updates.
 */
export function useGridColumns(
  containerRef: React.RefObject<HTMLElement | null>,
  options: UseGridColumnsOptions = {}
): number {
  const {
    minColumns = 6,
    maxColumns = 12,
    minItemWidth = 64,
    gap = 8,
  } = options;

  const [columnCount, setColumnCount] = useState(minColumns);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const calculateColumns = () => {
      const width = container.offsetWidth;
      // Calculate how many items can fit: (width + gap) / (itemWidth + gap)
      const possibleColumns = Math.floor((width + gap) / (minItemWidth + gap));
      const clampedColumns = Math.max(minColumns, Math.min(maxColumns, possibleColumns));
      setColumnCount(clampedColumns);
    };

    // Initial calculation
    calculateColumns();

    // Set up ResizeObserver for responsive updates
    const resizeObserver = new ResizeObserver(() => {
      calculateColumns();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef, minColumns, maxColumns, minItemWidth, gap]);

  return columnCount;
}
