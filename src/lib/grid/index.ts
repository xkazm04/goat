/**
 * Grid Library
 *
 * Provides utilities for grid item management including
 * factory functions and validation.
 */

// Constants
export * from './constants';

export {
  // Core factory functions
  createGridItem,
  createEmptyGridSlot,
  createEmptyGrid,

  // Validation
  validateGridItem,
  assertValidGridItem,
  safeCreateGridItem,

  // Utilities
  updateGridItemPosition,
  canSwapGridItems,
  gridItemToBacklogFormat,
  logGridItem,
  normalizeItemForDisplay,

  // Types
  type GridItemSource,
  type CreateGridItemOptions,
  type GridItemValidation,
} from './item-factory';

