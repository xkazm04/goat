"use client";

import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Responsive breakpoint configuration for grid layouts
 */
export interface GridBreakpoints {
  /** Columns for mobile (default: 1) */
  sm?: number;
  /** Columns for tablet (default: 2) */
  md?: number;
  /** Columns for desktop (default: 3) */
  lg?: number;
  /** Columns for large desktop (default: same as lg) */
  xl?: number;
}

/**
 * Props for the ListGrid component
 */
export interface ListGridProps<T> {
  /** Array of items to render in the grid */
  items: T[];
  /** Render function for each item */
  renderItem: (item: T, index: number) => ReactNode;
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: Error | null;
  /** Empty state component */
  emptyState?: ReactNode;
  /** Error state component */
  errorState?: ReactNode;
  /** Number of skeleton loaders to show (default: 6) */
  skeletonCount?: number;
  /** Responsive grid breakpoints */
  breakpoints?: GridBreakpoints;
  /** Additional className for the grid container */
  className?: string;
  /** Gap size between grid items (default: 4) */
  gap?: number;
  /** Layout mode: 'grid' for uniform grid, 'list' for vertical list */
  layout?: 'grid' | 'list';
  /** Enable staggered animation on item mount (default: true) */
  staggerAnimation?: boolean;
  /** Callback when retry is clicked in error state */
  onRetry?: () => void;
  /** Custom skeleton component */
  skeleton?: ReactNode;
  /** Accessibility role for the list (default: 'list') */
  role?: string;
  /** Test ID for the container */
  testId?: string;
}

/**
 * Generic responsive list/grid component with built-in loading, empty, and error states.
 * Supports both grid and list layouts with customizable breakpoints.
 *
 * @example
 * ```tsx
 * <ListGrid
 *   items={lists}
 *   renderItem={(list) => <ListCard list={list} />}
 *   isLoading={isLoading}
 *   error={error}
 *   emptyState={<EmptyState />}
 *   breakpoints={{ sm: 1, md: 2, lg: 3 }}
 * />
 * ```
 */
export function ListGrid<T extends { id?: string | number }>({
  items,
  renderItem,
  isLoading = false,
  error = null,
  emptyState,
  errorState,
  skeletonCount = 6,
  breakpoints = {},
  className = '',
  gap = 4,
  layout = 'grid',
  staggerAnimation = true,
  onRetry,
  skeleton,
  role = 'list',
  testId = 'list-grid',
}: ListGridProps<T>) {
  // Default breakpoints
  const { sm = 1, md = 2, lg = 3, xl = lg } = breakpoints;

  // Generate grid column classes based on breakpoints
  const gridClasses = layout === 'grid'
    ? `grid grid-cols-${sm} md:grid-cols-${md} lg:grid-cols-${lg} xl:grid-cols-${xl}`
    : 'space-y-3';

  // Gap classes
  const gapClass = layout === 'grid' ? `gap-${gap}` : '';

  // Loading State
  if (isLoading) {
    return (
      <div
        className={`${gridClasses} ${gapClass} ${className}`}
        data-testid={`${testId}-loading`}
        aria-busy="true"
        aria-live="polite"
      >
        {skeleton ? (
          // Custom skeleton
          Array.from({ length: skeletonCount }).map((_, i) => (
            <div key={`skeleton-${i}`}>{skeleton}</div>
          ))
        ) : (
          // Default skeleton
          Array.from({ length: skeletonCount }).map((_, i) => (
            <motion.div
              key={`skeleton-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`${
                layout === 'grid' ? 'h-28' : 'h-16'
              } bg-gray-800/40 border border-gray-700/50 rounded-lg animate-pulse`}
              data-testid={`${testId}-skeleton-${i}`}
            />
          ))
        )}
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-12 bg-gray-800/40 border border-gray-700/50 rounded-lg"
        data-testid={`${testId}-error`}
        role="alert"
        aria-live="assertive"
      >
        {errorState || (
          <>
            <p className="text-red-400 mb-4 text-sm">
              {error.message || 'Failed to load content'}
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                data-testid={`${testId}-retry-btn`}
              >
                Try Again
              </button>
            )}
          </>
        )}
      </motion.div>
    );
  }

  // Empty State
  if (!items || items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16 bg-gray-800/40 border border-gray-700/50 rounded-lg"
        data-testid={`${testId}-empty`}
        role="status"
        aria-live="polite"
      >
        {emptyState || (
          <>
            <p className="text-gray-400 text-sm">No items to display</p>
          </>
        )}
      </motion.div>
    );
  }

  // Items Grid/List
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`${gridClasses} ${gapClass} ${className}`}
      data-testid={testId}
      role={role}
      aria-label="List of items"
    >
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => {
          const key = item.id ?? `item-${index}`;

          return (
            <motion.div
              key={key}
              initial={staggerAnimation ? { opacity: 0, y: 10 } : false}
              animate={
                staggerAnimation
                  ? {
                      opacity: 1,
                      y: 0,
                      transition: { delay: index * 0.05 },
                    }
                  : {}
              }
              exit={{ opacity: 0, scale: 0.95 }}
              layout
              className="focus-within:ring-2 focus-within:ring-cyan-500/50 rounded-lg transition-shadow"
              data-testid={`${testId}-item-${key}`}
              role="listitem"
            >
              {renderItem(item, index)}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Default loading skeleton for ListGrid
 */
export const DefaultGridSkeleton = ({ layout = 'grid' }: { layout?: 'grid' | 'list' }) => (
  <div
    className={`${
      layout === 'grid' ? 'h-28' : 'h-16'
    } bg-gray-800/40 border border-gray-700/50 rounded-lg animate-pulse`}
  />
);

/**
 * Default empty state for ListGrid
 */
export const DefaultEmptyState = ({
  icon: Icon,
  title = 'No Items',
  description = 'No items to display',
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title?: string;
  description?: string;
  action?: ReactNode;
}) => (
  <>
    {Icon && <Icon className="w-12 h-12 mx-auto mb-4 text-gray-600" />}
    <h3 className="text-lg font-semibold text-gray-400 mb-2">{title}</h3>
    <p className="text-sm text-gray-500 mb-6">{description}</p>
    {action}
  </>
);

/**
 * Default error state for ListGrid
 */
export const DefaultErrorState = ({
  title = 'Failed to load',
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) => (
  <>
    <p className="text-red-400 mb-4 text-sm">{title}</p>
    {description && <p className="text-gray-500 text-xs mb-4">{description}</p>}
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
      >
        Try Again
      </button>
    )}
  </>
);
