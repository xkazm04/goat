"use client";

import { useState, useEffect, useRef, ReactNode } from "react";

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

  // Calculate total rows needed
  const totalRows = Math.ceil(items.length / columns);
  const rowHeight = itemHeight + gap;
  const totalHeight = totalRows * rowHeight;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;

      // Calculate visible row range
      const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
      const endRow = Math.min(
        totalRows,
        Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan
      );

      // Convert rows to item indices
      const startIndex = startRow * columns;
      const endIndex = Math.min(items.length, endRow * columns);

      setVisibleRange({ start: startIndex, end: endIndex });
    };

    // Initial calculation
    handleScroll();

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [items.length, rowHeight, columns, totalRows, overscan]);

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
        >
          {visibleItems.map((item, index) => (
            <div key={item.id || `item-${visibleRange.start + index}`}>
              {renderItem(item, visibleRange.start + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
