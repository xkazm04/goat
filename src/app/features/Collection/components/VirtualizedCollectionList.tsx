"use client";

import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { CollectionItem as CollectionItemType } from '../types';
import { CollectionItem } from './CollectionItem';
import { LAZY_LOAD_CONFIG } from '../constants/lazyLoadConfig';

interface VirtualizedCollectionListProps {
  /**
   * Items to display
   */
  items: CollectionItemType[];

  /**
   * View mode (grid or list)
   */
  viewMode?: 'grid' | 'list';

  /**
   * Number of columns in grid mode
   */
  gridCols?: number;

  /**
   * Gap between items in pixels
   */
  gap?: number;

  /**
   * Container height in pixels
   */
  containerHeight?: number;

  /**
   * Test ID
   */
  testId?: string;
}

/**
 * Virtualized Collection List Component
 *
 * Renders only visible items using virtual scrolling for optimal performance
 * with large collections. Calculates visible range based on scroll position
 * and renders items with proper positioning.
 *
 * @example
 * ```tsx
 * <VirtualizedCollectionList
 *   items={allItems}
 *   viewMode="grid"
 *   gridCols={12}
 *   containerHeight={600}
 * />
 * ```
 */
export function VirtualizedCollectionList({
  items,
  viewMode = 'grid',
  gridCols = 12,
  gap = 8,
  containerHeight = 600,
  testId = 'virtualized-collection-list'
}: VirtualizedCollectionListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Item dimensions
  const itemHeight = LAZY_LOAD_CONFIG.VIRTUAL_LIST.ITEM_HEIGHT;
  const overscanCount = LAZY_LOAD_CONFIG.VIRTUAL_LIST.OVERSCAN_COUNT;

  // Calculate row count and total height
  const { rowCount, totalHeight, itemsPerRow } = useMemo(() => {
    const itemsPerRow = viewMode === 'grid' ? gridCols : 1;
    const rowCount = Math.ceil(items.length / itemsPerRow);
    const totalHeight = rowCount * (itemHeight + gap);
    return { rowCount, totalHeight, itemsPerRow };
  }, [items.length, viewMode, gridCols, itemHeight, gap]);

  // Calculate visible range
  const { startRow, endRow, visibleItems } = useMemo(() => {
    const startRow = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)) - overscanCount);
    const visibleRows = Math.ceil(containerHeight / (itemHeight + gap));
    const endRow = Math.min(rowCount, startRow + visibleRows + overscanCount * 2);

    const startIndex = startRow * itemsPerRow;
    const endIndex = Math.min(endRow * itemsPerRow, items.length);
    const visibleItems = items.slice(startIndex, endIndex);

    return { startRow, endRow, visibleItems };
  }, [scrollTop, itemHeight, gap, overscanCount, containerHeight, rowCount, itemsPerRow, items]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);
  }, []);

  // Debounced scroll handler
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let rafId: number;
    let lastScrollTop = 0;

    const onScroll = () => {
      if (container.scrollTop !== lastScrollTop) {
        lastScrollTop = container.scrollTop;
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          setScrollTop(lastScrollTop);
        });
      }
    };

    container.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Calculate offset for positioning
  const offsetY = startRow * (itemHeight + gap);

  return (
    <div
      ref={scrollContainerRef}
      className="overflow-y-auto"
      style={{ height: containerHeight }}
      data-testid={testId}
    >
      {/* Spacer to maintain total height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items container */}
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          <div
            className={
              viewMode === 'grid'
                ? 'grid gap-2'
                : 'space-y-2'
            }
            style={
              viewMode === 'grid'
                ? {
                    gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
                    gap: `${gap}px`
                  }
                : undefined
            }
          >
            {visibleItems.map((item, index) => {
              // Find groupId from item metadata
              const groupId = (item.metadata?.group as string) || '';
              const globalIndex = startRow * itemsPerRow + index;

              return (
                <div
                  key={`${groupId}-${item.id}`}
                  style={{
                    minHeight: itemHeight
                  }}
                >
                  <CollectionItem
                    item={item}
                    groupId={groupId}
                    viewMode={viewMode}
                    index={globalIndex}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Debug info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-gray-900/90 text-white text-xs p-2 rounded border border-gray-700">
          <div>Total items: {items.length}</div>
          <div>Visible rows: {endRow - startRow}</div>
          <div>Rendered items: {visibleItems.length}</div>
          <div>Scroll position: {Math.round(scrollTop)}px</div>
        </div>
      )}
    </div>
  );
}
