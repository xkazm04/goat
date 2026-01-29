/**
 * Grid System Constants
 * Centralized configuration for the match grid system
 */

/**
 * Grid size limits
 */
export const GRID_LIMITS = {
  /** Default maximum grid size */
  MAX_SIZE: 50,
  /** Minimum allowed grid size */
  MIN_SIZE: 5,
  /** Default grid size for new lists */
  DEFAULT_SIZE: 10,
  /** Maximum allowed grid size (hard limit) */
  ABSOLUTE_MAX: 100,
} as const;

/** Convenience export for max grid size */
export const MAX_GRID_SIZE = GRID_LIMITS.MAX_SIZE;

/**
 * Grid cache configuration
 */
export const GRID_CACHE = {
  /** Maximum number of list grids to cache */
  MAX_CACHED_LISTS: 10,
} as const;

/**
 * Tutorial grid configuration
 */
export const TUTORIAL_GRID = {
  /** Size of tutorial demo grid */
  SIZE: 10,
} as const;
