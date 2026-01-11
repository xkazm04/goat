"use client";

import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShimmerSkeleton } from './shimmer-skeleton';

// Default values
const DEFAULT_SKELETON_COUNT = 6;

// Animation timing
const STAGGER_DELAY = 0.05;
const SLIDE_OFFSET = 10;
const EXIT_SCALE = 0.95;

// Layout configuration
const GRID_GAP = 'gap-4';
const LIST_SPACING = 'space-y-3';
const GRID_COLS = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

/**
 * Props for the ListGrid component
 * Simplified API with sensible defaults - unused optional props removed
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
  /** Callback when retry is clicked in error state */
  onRetry?: () => void;
  /** Layout mode: 'grid' for uniform grid, 'list' for vertical list (default: 'grid') */
  layout?: 'grid' | 'list';
  /** Number of skeleton loaders to show (default: 6) */
  skeletonCount?: number;
  /** Test ID for the container */
  testId?: string;
}

/**
 * Generic responsive list/grid component with built-in loading, empty, and error states.
 * Supports both grid and list layouts with sensible defaults.
 *
 * @example
 * ```tsx
 * <ListGrid
 *   items={lists}
 *   renderItem={(list) => <ListCard list={list} />}
 *   isLoading={isLoading}
 *   error={error}
 *   emptyState={<EmptyState />}
 *   onRetry={refetch}
 * />
 * ```
 */
export function ListGrid<T extends { id?: string | number }>({
  items,
  renderItem,
  isLoading = false,
  error = null,
  emptyState,
  onRetry,
  layout = 'grid',
  skeletonCount = DEFAULT_SKELETON_COUNT,
  testId = 'list-grid',
}: ListGridProps<T>) {
  // Generate layout classes based on mode
  const layoutClasses = layout === 'grid'
    ? `${GRID_COLS} ${GRID_GAP}`
    : LIST_SPACING;

  // Loading State
  if (isLoading) {
    return (
      <div
        className={layoutClasses}
        data-testid={`${testId}-loading`}
        aria-busy="true"
        aria-live="polite"
      >
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <ShimmerSkeleton
            key={`skeleton-${i}`}
            size={layout === 'grid' ? 'xl' : 'md'}
            accentColor="cyan"
            testId={`${testId}-skeleton-${i}`}
          />
        ))}
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
      </motion.div>
    );
  }

  // Empty State
  if (!items || items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: SLIDE_OFFSET }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16 bg-gray-800/40 border border-gray-700/50 rounded-lg"
        data-testid={`${testId}-empty`}
        role="status"
        aria-live="polite"
      >
        {emptyState || (
          <p className="text-gray-400 text-sm">No items to display</p>
        )}
      </motion.div>
    );
  }

  // Items Grid/List
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={layoutClasses}
      data-testid={testId}
      role="list"
      aria-label="List of items"
    >
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => {
          const key = item.id ?? `item-${index}`;

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: SLIDE_OFFSET }}
              animate={{
                opacity: 1,
                y: 0,
                transition: { delay: index * STAGGER_DELAY },
              }}
              exit={{ opacity: 0, scale: EXIT_SCALE }}
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

