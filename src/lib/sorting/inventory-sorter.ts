/**
 * InventorySorter - Unified Sorting Abstraction
 *
 * Consolidates three parallel sorting systems into one:
 * - InventorySortBy (ranked-inventory.ts)
 * - ConsensusViewMode (consensus.ts)
 * - InventorySortConfig (grid state)
 *
 * Benefits:
 * - Single source of truth for sorting logic
 * - Composable sort criteria (e.g., consensus THEN alphabetical)
 * - Consistent behavior across all inventory views
 * - Type-safe sort key computation
 */

import type { ItemConsensusWithClusters } from '@/types/consensus';

/**
 * Unified sort criteria - the single source of truth for sort options
 */
export type SortCriteria =
  | 'default'           // Original order (no sorting)
  | 'consensus'         // Sort by community median rank (most popular first)
  | 'average'           // Sort by community average rank
  | 'volatility'        // Sort by how contested the item is
  | 'confidence'        // Sort by ranking confidence (most agreed upon)
  | 'alphabetical'      // A-Z sorting
  | 'recent';           // Most recently added

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Sort configuration
 */
export interface SortConfig {
  /** Primary sort criteria */
  criteria: SortCriteria;
  /** Sort direction */
  direction: SortDirection;
  /** Optional secondary sort criteria for tie-breaking */
  secondaryCriteria?: SortCriteria;
  /** Secondary direction (defaults to 'asc') */
  secondaryDirection?: SortDirection;
}

/**
 * Minimum data required for sorting an item
 */
export interface SortableItem {
  id: string;
  title: string;
  consensus?: ItemConsensusWithClusters | null;
  createdAt?: string | Date | null;
}

/**
 * Computed sort key for stable sorting
 */
export interface SortKey {
  /** Primary sort value (numeric for comparison) */
  primary: number;
  /** Secondary sort value for tie-breaking */
  secondary: number;
  /** Original string value for alphabetical comparison */
  stringValue?: string;
  /** Item ID for final stable sort */
  id: string;
}

/**
 * Default sort configurations for common use cases
 */
export const SORT_PRESETS: Record<string, SortConfig> = {
  popular: {
    criteria: 'consensus',
    direction: 'asc',
    secondaryCriteria: 'alphabetical',
    secondaryDirection: 'asc',
  },
  contested: {
    criteria: 'volatility',
    direction: 'desc',
    secondaryCriteria: 'consensus',
    secondaryDirection: 'asc',
  },
  confident: {
    criteria: 'confidence',
    direction: 'desc',
    secondaryCriteria: 'consensus',
    secondaryDirection: 'asc',
  },
  alphabetical: {
    criteria: 'alphabetical',
    direction: 'asc',
  },
  recent: {
    criteria: 'recent',
    direction: 'desc',
    secondaryCriteria: 'alphabetical',
    secondaryDirection: 'asc',
  },
};

/**
 * No-data sentinel value for numeric sorts
 * Items without data are pushed to the end (high value for asc, low for desc)
 */
const NO_DATA_VALUE = 999999;

/**
 * Compute a single sort value for the given criteria
 *
 * @param item - The item to compute the sort value for
 * @param criteria - The sort criteria to use
 * @returns A numeric value for comparison
 */
export function computeSortValue(item: SortableItem, criteria: SortCriteria): number {
  const consensus = item.consensus;

  switch (criteria) {
    case 'consensus':
      // Lower median rank = higher priority (better score)
      return consensus?.medianRank ?? NO_DATA_VALUE;

    case 'average':
      return consensus?.averageRank ?? NO_DATA_VALUE;

    case 'volatility':
      // Higher volatility = more contested = higher value
      // Return negative for asc direction to work correctly
      return consensus?.volatility ?? 0;

    case 'confidence':
      // Higher confidence = more reliable ranking
      // Return as-is since higher is better
      return consensus?.confidence ?? 0;

    case 'alphabetical':
      // Use first char code for quick comparison (full comparison done separately)
      return item.title.toLowerCase().charCodeAt(0);

    case 'recent':
      // Convert date to timestamp, newer = higher value
      if (item.createdAt) {
        const date = typeof item.createdAt === 'string'
          ? new Date(item.createdAt)
          : item.createdAt;
        return date.getTime();
      }
      return 0;

    case 'default':
    default:
      return 0;
  }
}

/**
 * Compute a complete sort key for an item
 *
 * @param item - The item to compute the sort key for
 * @param config - The sort configuration
 * @returns A SortKey object for comparison
 */
export function computeSortKey(item: SortableItem, config: SortConfig): SortKey {
  const primary = computeSortValue(item, config.criteria);
  const secondary = config.secondaryCriteria
    ? computeSortValue(item, config.secondaryCriteria)
    : 0;

  return {
    primary,
    secondary,
    stringValue: item.title.toLowerCase(),
    id: item.id,
  };
}

/**
 * Compare two sort keys
 *
 * @param a - First sort key
 * @param b - Second sort key
 * @param config - Sort configuration for direction
 * @returns Comparison result (-1, 0, or 1)
 */
export function compareSortKeys(a: SortKey, b: SortKey, config: SortConfig): number {
  // Special handling for alphabetical primary sort
  if (config.criteria === 'alphabetical') {
    const comparison = (a.stringValue ?? '').localeCompare(b.stringValue ?? '');
    if (comparison !== 0) {
      return config.direction === 'asc' ? comparison : -comparison;
    }
    // Fall through to ID comparison for stability
    return a.id.localeCompare(b.id);
  }

  // Primary comparison
  const primaryDiff = a.primary - b.primary;
  if (primaryDiff !== 0) {
    return config.direction === 'asc' ? primaryDiff : -primaryDiff;
  }

  // Secondary comparison for tie-breaking
  if (config.secondaryCriteria) {
    // Special handling for alphabetical secondary sort
    if (config.secondaryCriteria === 'alphabetical') {
      const comparison = (a.stringValue ?? '').localeCompare(b.stringValue ?? '');
      if (comparison !== 0) {
        const dir = config.secondaryDirection ?? 'asc';
        return dir === 'asc' ? comparison : -comparison;
      }
    } else {
      const secondaryDiff = a.secondary - b.secondary;
      if (secondaryDiff !== 0) {
        const dir = config.secondaryDirection ?? 'asc';
        return dir === 'asc' ? secondaryDiff : -secondaryDiff;
      }
    }
  }

  // Final tie-breaker: ID for stable sort
  return a.id.localeCompare(b.id);
}

/**
 * Sort an array of items using the unified sorter
 *
 * @param items - Items to sort (must extend SortableItem)
 * @param config - Sort configuration
 * @returns New sorted array (does not mutate original)
 */
export function sortItems<T extends SortableItem>(
  items: T[],
  config: SortConfig
): T[] {
  // Default/none means no sorting
  if (config.criteria === 'default') {
    return [...items];
  }

  // Compute sort keys once for efficiency
  const itemsWithKeys = items.map(item => ({
    item,
    key: computeSortKey(item, config),
  }));

  // Sort by computed keys
  itemsWithKeys.sort((a, b) => compareSortKeys(a.key, b.key, config));

  // Extract sorted items
  return itemsWithKeys.map(({ item }) => item);
}

/**
 * Create a sort comparator function for direct use with Array.sort()
 *
 * @param config - Sort configuration
 * @param getConsensus - Optional function to get consensus data for an item
 * @returns Comparator function
 */
export function createSortComparator<T extends { id: string; title: string }>(
  config: SortConfig,
  getConsensus?: (itemId: string) => ItemConsensusWithClusters | null | undefined
): (a: T, b: T) => number {
  return (a: T, b: T) => {
    const itemA: SortableItem = {
      id: a.id,
      title: a.title,
      consensus: getConsensus?.(a.id) ?? null,
    };
    const itemB: SortableItem = {
      id: b.id,
      title: b.title,
      consensus: getConsensus?.(b.id) ?? null,
    };

    const keyA = computeSortKey(itemA, config);
    const keyB = computeSortKey(itemB, config);

    return compareSortKeys(keyA, keyB, config);
  };
}

/**
 * Sort item IDs using consensus data from a store
 *
 * @param itemIds - Array of item IDs to sort
 * @param config - Sort configuration
 * @param getConsensus - Function to get consensus data for an item ID
 * @param getTitleForId - Function to get title for an item ID
 * @returns Sorted array of item IDs
 */
export function sortItemIds(
  itemIds: string[],
  config: SortConfig,
  getConsensus: (itemId: string) => ItemConsensusWithClusters | null | undefined,
  getTitleForId?: (itemId: string) => string
): string[] {
  if (config.criteria === 'default') {
    return [...itemIds];
  }

  const items: SortableItem[] = itemIds.map(id => ({
    id,
    title: getTitleForId?.(id) ?? id,
    consensus: getConsensus(id) ?? null,
  }));

  return sortItems(items, config).map(item => item.id);
}

/**
 * Legacy compatibility: Convert old InventorySortBy to new SortConfig
 */
export function fromLegacySortBy(
  sortBy: string,
  sortOrder: 'asc' | 'desc' = 'asc'
): SortConfig {
  return {
    criteria: sortBy as SortCriteria,
    direction: sortOrder,
    // Add alphabetical as secondary for stable sorting
    secondaryCriteria: sortBy !== 'alphabetical' ? 'alphabetical' : undefined,
    secondaryDirection: 'asc',
  };
}

/**
 * Legacy compatibility: Convert SortConfig to old InventorySortBy format
 */
export function toLegacySortBy(config: SortConfig): {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
} {
  return {
    sortBy: config.criteria,
    sortOrder: config.direction,
  };
}
