"use client";

import { useState, useEffect, useRef, useCallback, ReactNode } from "react";

interface VirtualizedGridProps {
  items: any[];
  renderItem: (item: any, index: number) => ReactNode;
  itemHeight: number; // Approximate height of each item
  columns: number; // Number of columns in grid
  gap: number; // Gap between items in px
  className?: string;
  overscan?: number; // Number of extra rows to render above/below viewport
}

/**
 * Lightweight virtualized grid component
 * Only renders visible items for better performance with large collections
 */
export function VirtualizedGrid({
  items,
  renderItem,
  itemHeight,
  columns,
  gap,
  className = "",
  overscan = 2
}: VirtualizedGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });

  // Use refs to hold latest values to avoid stale closures in scroll handler
  // This prevents race conditions when items change rapidly (filtering/search)
  const latestValuesRef = useRef({
    itemsLength: items.length,
    columns,
    overscan,
    rowHeight: itemHeight + gap,
    totalRows: Math.ceil(items.length / columns)
  });

  // RAF batching refs - prevents redundant RAF calls during rapid scroll events
  const rafPendingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);

  // Calculate total rows needed
  const totalRows = Math.ceil(items.length / columns);
  const rowHeight = itemHeight + gap;
  const totalHeight = totalRows * rowHeight;

  // Update refs when values change
  useEffect(() => {
    latestValuesRef.current = {
      itemsLength: items.length,
      columns,
      overscan,
      rowHeight,
      totalRows
    };
  }, [items.length, columns, overscan, rowHeight, totalRows]);

  // Core calculation function - updates visible range based on scroll position
  const calculateVisibleRange = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { itemsLength, columns: cols, overscan: os, rowHeight: rh, totalRows: tr } = latestValuesRef.current;

    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;

    // Calculate visible row range
    const startRow = Math.max(0, Math.floor(scrollTop / rh) - os);
    const endRow = Math.min(
      tr,
      Math.ceil((scrollTop + containerHeight) / rh) + os
    );

    // Convert rows to item indices with bounds checking
    const startIndex = Math.min(startRow * cols, itemsLength);
    const endIndex = Math.min(endRow * cols, itemsLength);

    setVisibleRange(prev => {
      // Only update if values actually changed to prevent unnecessary re-renders
      if (prev.start === startIndex && prev.end === endIndex) {
        return prev;
      }
      return { start: startIndex, end: endIndex };
    });

    // Clear pending flag after calculation completes
    rafPendingRef.current = false;
  }, []);

  // RAF-batched scroll handler - ensures only one state update per animation frame
  const handleScroll = useCallback(() => {
    // Skip if RAF already pending - batches multiple scroll events into one update
    if (rafPendingRef.current) return;

    rafPendingRef.current = true;
    rafIdRef.current = requestAnimationFrame(calculateVisibleRange);
  }, [calculateVisibleRange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initial calculation (direct call, not RAF-batched)
    calculateVisibleRange();

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      // Cancel any pending RAF on cleanup
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [handleScroll, calculateVisibleRange]);

  // Recalculate visible range when items change (direct call, not RAF-batched)
  useEffect(() => {
    calculateVisibleRange();
  }, [items.length, calculateVisibleRange]);

  // Get visible items
  const visibleItems = items.slice(visibleRange.start, visibleRange.end);

  // Calculate offset for visible items
  const startRow = Math.floor(visibleRange.start / columns);
  const offsetTop = startRow * rowHeight;

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto ${className}`}
      style={{ position: 'relative' }}
      data-testid="virtualized-grid-container"
    >
      {/* Spacer to maintain scroll height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items container */}
        <div
          style={{
            position: 'absolute',
            top: offsetTop,
            left: 0,
            right: 0,
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap: `${gap}px`
          }}
          data-testid="virtualized-grid-items"
        >
          {visibleItems.map((item, index) => (
            <div
              key={item.id || `item-${visibleRange.start + index}`}
              data-testid={`virtualized-grid-item-${visibleRange.start + index}`}
            >
              {renderItem(item, visibleRange.start + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
