"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

import { hasContent, isSettledEmpty, type AsyncState } from '@/lib/async-state';

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
 * Props for the ListGrid component.
 *
 * The region's state arrives as ONE discriminated value, not as three
 * independent booleans. See `src/lib/async-state` for why, and
 * `asyncStateFromQuery` for how to build one from a TanStack query.
 */
export interface ListGridProps<T> {
  /**
   * The region's async state. Replaces the former `items` / `isLoading` /
   * `error` triple, which could represent ten states the domain does not have —
   * and shipped four of them (see the render order below).
   */
  state: AsyncState<T[]>;
  /** Render function for each item */
  renderItem: (item: T, index: number) => ReactNode;
  /** Empty state component. Rendered ONLY after a completed response. */
  emptyState?: ReactNode;
  /** Callback when retry is clicked in the failed state, or in the stale notice */
  onRetry?: () => void;
  /**
   * Ambient notice rendered ABOVE held content when a refresh has failed.
   * Optional: when omitted a default line is used. It is never allowed to
   * replace the content — that is the forbidden SETTLED-DATA -> FAILED edge.
   */
  staleNotice?: ReactNode;
  /** Layout mode: 'grid' for uniform grid, 'list' for vertical list (default: 'grid') */
  layout?: 'grid' | 'list';
  /** Number of skeleton loaders to show (default: 6) */
  skeletonCount?: number;
  /** Test ID for the container */
  testId?: string;
}

/**
 * Generic responsive list/grid with the async state model applied.
 *
 * Registry: async-ui-states/state-model, empty-state-design, failure-states;
 * client-state/status-fsms.
 *
 * RENDER ORDER, and what each ordering decision prevents. Until 2026-08-24 this
 * component branched on `isLoading` -> `error` -> `!items.length` -> data, which
 * is the right SEQUENCE over the wrong INPUTS: with held content invisible to
 * the first two branches, it shipped three of the four named forbidden edges.
 *
 *   1. CONTENT DOMINATES. Held data outranks an outstanding request and even a
 *      failure. `SETTLED-DATA -> LOADING` (a refresh blanking the surface) and
 *      `SETTLED-DATA -> FAILED` (held data discarded because an update failed)
 *      are both unreachable now, because a state carrying data cannot reach the
 *      later branches at all.
 *   2. FAILED, when nothing is held. Failure is never dressed as empty.
 *   3. EMPTY, only via the sticky settled bit. `-> SETTLED-EMPTY while
 *      unsettled` — the empty flash — is unreachable because `isSettledEmpty`
 *      is false for every unsettled state by construction.
 *   4. LOADING. Unstarted and in-flight render identically, on purpose.
 *
 * @example
 * ```tsx
 * const q = useUserLists(userId);
 * <ListGrid
 *   state={asyncStateFromQuery(q)}
 *   renderItem={(list) => <ListCard list={list} />}
 *   emptyState={<EmptyState />}
 *   onRetry={q.refetch}
 * />
 * ```
 */
export function ListGrid<T extends { id?: string | number }>({
  state,
  renderItem,
  emptyState,
  onRetry,
  staleNotice,
  layout = 'grid',
  skeletonCount = DEFAULT_SKELETON_COUNT,
  testId = 'list-grid',
}: ListGridProps<T>) {
  const layoutClasses = layout === 'grid'
    ? `${GRID_COLS} ${GRID_GAP}`
    : LIST_SPACING;

  const empty = isSettledEmpty(state, (items) => items.length === 0);

  // ---------------------------------------------------------------------
  // 1. Content dominates — including content whose last refresh failed.
  // ---------------------------------------------------------------------
  if (hasContent(state) && !empty) {
    const items = state.data;
    const isStale = state.status === 'stale';
    return (
      <div data-testid={`${testId}-region`} aria-busy={state.isRefreshing || undefined}>
        {isStale && (
          // AMBIENT. The failure is surfaced beside the content, never by
          // demoting the region — the user keeps what they already had.
          <div
            className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
            data-testid={`${testId}-stale`}
            role="status"
            aria-live="polite"
          >
            <span>{staleNotice ?? 'Showing the last loaded results — refresh failed.'}</span>
            {onRetry && (
              <button
                onClick={onRetry}
                className="shrink-0 rounded-md bg-amber-500/20 px-2 py-1 text-amber-100 transition-colors hover:bg-amber-500/30 focus-ring"
                data-testid={`${testId}-stale-retry-btn`}
              >
                Retry
              </button>
            )}
          </div>
        )}
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
                  className="focus-within:ring-2 focus-within:ring-brand/50 rounded-lg transition-shadow"
                  data-testid={`${testId}-item-${key}`}
                  role="listitem"
                >
                  {renderItem(item, index)}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // 2. Failed — reachable only when nothing is held.
  // ---------------------------------------------------------------------
  if (state.status === 'failed' || (state.status === 'stale' && empty)) {
    const error = state.error;
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
          {(error as Error)?.message || 'Failed to load content'}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-xs transition-colors focus-ring"
            data-testid={`${testId}-retry-btn`}
          >
            Try Again
          </button>
        )}
      </motion.div>
    );
  }

  // ---------------------------------------------------------------------
  // 3. Empty — reachable ONLY through a completed response.
  // ---------------------------------------------------------------------
  if (empty) {
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

  // ---------------------------------------------------------------------
  // 4. Loading. `idle` renders identically on purpose.
  // ---------------------------------------------------------------------
  return (
    <div
      className={layoutClasses}
      data-testid={`${testId}-loading`}
      aria-busy="true"
      // HIDDEN from the accessibility tree, not announced. The placeholder used
      // to carry aria-live="polite", so a screen reader was told about the
      // shimmer rather than about the content. A placeholder is a visual stand-in
      // for something that is not there yet; there is nothing to read out.
      aria-hidden="true"
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
