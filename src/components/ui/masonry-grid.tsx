"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Responsive breakpoint thresholds (in pixels)
const BREAKPOINT_XL = 1280;
const BREAKPOINT_LG = 1024;
const BREAKPOINT_MD = 768;

// Default column counts
const DEFAULT_COLUMNS = 2;
const DEFAULT_COLUMNS_MD = 3;
const DEFAULT_COLUMNS_LG = 4;

// Default gap size (in pixels)
const DEFAULT_GAP = 16;

/**
 * MasonryGrid Props Interface
 */
export interface MasonryGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of columns (can be a single number or responsive breakpoints) */
  columns?: number | { sm?: number; md?: number; lg?: number; xl?: number };

  /** Gap between items in pixels */
  gap?: number;

  /** Children to render in masonry layout */
  children: React.ReactNode;

  /** Enable smooth resize transitions */
  enableTransitions?: boolean;

  /** Custom class for individual item wrappers */
  itemClassName?: string;

  /** Test ID for testing */
  testId?: string;
}

/**
 * MasonryGrid Component
 *
 * A responsive masonry grid layout that arranges items in a fluid,
 * column-based layout that adapts to screen width. Uses CSS Grid
 * with auto-placement for optimal performance.
 *
 * Features:
 * - Responsive column counts with breakpoints
 * - Configurable gap spacing
 * - Smooth resize transitions
 * - Preserves item height variations
 * - Zero JavaScript layout calculations
 *
 * @example
 * ```tsx
 * <MasonryGrid columns={{ sm: 2, md: 3, lg: 4 }} gap={16}>
 *   {items.map(item => <ItemCard key={item.id} {...item} />)}
 * </MasonryGrid>
 * ```
 */
export const MasonryGrid = React.forwardRef<HTMLDivElement, MasonryGridProps>(
  (
    {
      columns = DEFAULT_COLUMNS,
      gap = DEFAULT_GAP,
      enableTransitions = true,
      itemClassName,
      testId,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const childArray = React.Children.toArray(children);

    // Generate column-based responsive classes
    const getColumnClasses = () => {
      if (typeof columns === 'number') {
        return `grid-cols-${columns}`;
      }

      const { sm = DEFAULT_COLUMNS, md = DEFAULT_COLUMNS_MD, lg = DEFAULT_COLUMNS_LG, xl = DEFAULT_COLUMNS_LG } = columns;
      return cn(
        `grid-cols-${sm}`,
        `sm:grid-cols-${md}`,
        `md:grid-cols-${lg}`,
        `lg:grid-cols-${xl}`
      );
    };

    return (
      <div
        ref={ref}
        data-testid={testId || "masonry-grid"}
        className={cn(
          "grid w-full",
          getColumnClasses(),
          enableTransitions && "transition-all duration-300 ease-in-out",
          className
        )}
        style={{
          gap: `${gap}px`,
          gridAutoRows: 'auto',
        }}
        {...props}
      >
        {childArray.map((child, index) => (
          <div
            key={index}
            className={cn(
              "w-full",
              enableTransitions && "transition-all duration-300 ease-in-out",
              itemClassName
            )}
            data-testid={`masonry-item-${index}`}
          >
            {child}
          </div>
        ))}
      </div>
    );
  }
);

MasonryGrid.displayName = "MasonryGrid";

/**
 * Helper hook to get responsive column count
 * Can be used to programmatically determine current column count
 */
export function useMasonryColumns(
  columns: number | { sm?: number; md?: number; lg?: number; xl?: number }
): number {
  const [currentColumns, setCurrentColumns] = React.useState(() => {
    if (typeof columns === 'number') return columns;
    return columns.sm || DEFAULT_COLUMNS;
  });

  React.useEffect(() => {
    if (typeof columns === 'number') {
      setCurrentColumns(columns);
      return;
    }

    const { sm = DEFAULT_COLUMNS, md = DEFAULT_COLUMNS_MD, lg = DEFAULT_COLUMNS_LG, xl = DEFAULT_COLUMNS_LG } = columns;

    const updateColumns = () => {
      const width = window.innerWidth;

      if (width >= BREAKPOINT_XL) {
        setCurrentColumns(xl);
      } else if (width >= BREAKPOINT_LG) {
        setCurrentColumns(lg);
      } else if (width >= BREAKPOINT_MD) {
        setCurrentColumns(md);
      } else {
        setCurrentColumns(sm);
      }
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, [columns]);

  return currentColumns;
}
