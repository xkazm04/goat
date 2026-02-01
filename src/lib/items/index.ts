/**
 * Items Module Index
 *
 * Centralized exports for item transformation utilities
 */

export {
  // Core utilities
  normalizeImageUrl,
  extractTitle,

  // Type guards
  isBacklogItemLike,
  isGridItemLike,
  isTransferableItemLike,
  isNormalizedItemLike,

  // To TransferableItem
  backlogToTransferable,
  gridToTransferable,
  normalizedToTransferable,
  toTransferable,

  // To GridItemType
  backlogToGrid,
  transferableToGrid,
  toGridItem,
  createEmptyGridSlot,
  createEmptyGrid,
  updateGridItemPosition,

  // To BacklogItem
  gridToBacklog,
  transferableToBacklog,

  // To NormalizedItem
  backlogToNormalized,
  normalizedToBacklog,
  normalizedToBacklogItemType,

  // To RankedItem
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
  validateForGrid,
  validateGridItem,

  // Display helpers
  normalizeForDisplay,
  getDisplayTitle,
  getDisplayImageUrl,

  // Namespace export
  ItemTransformer,

  // Types
  type CreateGridItemOptions,
  type ItemValidation,
} from './ItemTransformer';
