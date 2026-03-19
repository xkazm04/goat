/**
 * Items Module Index
 *
 * Two-file structure:
 *   item-utils.ts      — extractTitle, normalizeImageUrl, display helpers
 *   item-transforms.ts — typed pipeline: DB -> Backlog -> Transferable -> Grid -> Ranked
 */

// Utilities & display helpers
export {
  normalizeImageUrl,
  extractTitle,
  safeString,
  safeNumber,
  safeStringArray,
  normalizeForDisplay,
  getDisplayTitle,
  getDisplayImageUrl,
} from './item-utils';

// Type guards
export {
  isBacklogItemLike,
  isGridItemLike,
  isTransferableItemLike,
  isNormalizedItemLike,
} from './item-transforms';

// Transformations (pipeline: DB -> Backlog -> Transferable -> Grid -> Ranked)
export {
  // Backlog <-> Normalized
  backlogToNormalized,
  normalizedToBacklog,
  normalizedToBacklogItemType,

  // -> Transferable
  backlogToTransferable,
  normalizedToTransferable,
  gridToTransferable,
  toTransferable,

  // -> Grid
  type CreateGridItemOptions,
  backlogToGrid,
  transferableToGrid,
  toGridItem,
  createEmptyGridSlot,
  createEmptyGrid,
  updateGridItemPosition,

  // Grid -> Backlog (reverse)
  gridToBacklog,
  transferableToBacklog,

  // -> Ranked
  createRankedItem,
  createEmptyRankedItem,
  createEmptyRanking,
  backlogToRanked,
  gridToRanked,

  // Batch operations
  batchBacklogToTransferable,
  batchGridToTransferable,
  batchNormalizedToBacklog,

  // Validation
  type ItemValidation,
  validateForGrid,
  validateGridItem,
} from './item-transforms';
