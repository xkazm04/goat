/**
 * Sorting Library - Unified sorting for the GOAT application
 *
 * All sorting throughout the app should delegate to this module.
 */

export {
  // Types
  type SortCriteria,
  type SortDirection,
  type SortConfig,
  type SortableItem,
  type SortKey,

  // Presets
  SORT_PRESETS,

  // Core functions
  computeSortValue,
  computeSortKey,
  compareSortKeys,
  sortItems,
  sortItemIds,
  createSortComparator,

  // Legacy compatibility
  fromLegacySortBy,
  toLegacySortBy,
} from './inventory-sorter';
