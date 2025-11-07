"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

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
      columns = 2,
      gap = 16,
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

      const { sm = 2, md = 3, lg = 4, xl = 4 } = columns;
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
    return columns.sm || 2;
  });

  React.useEffect(() => {
    if (typeof columns === 'number') {
      setCurrentColumns(columns);
      return;
    }

    const updateColumns = () => {
      const width = window.innerWidth;
      const { sm = 2, md = 3, lg = 4, xl = 4 } = columns;

      if (width >= 1280) {
        setCurrentColumns(xl);
      } else if (width >= 1024) {
        setCurrentColumns(lg);
      } else if (width >= 768) {
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
