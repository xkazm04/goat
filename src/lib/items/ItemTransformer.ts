/**
 * ItemTransformer - Unified Item Transformation Layer
 *
 * This file re-exports all transformation functions from focused modules
 * and provides the `ItemTransformer` namespace object for backward compatibility.
 *
 * @module ItemTransformer
 */

// Core utilities & type guards
export {
  normalizeImageUrl,
  extractTitle,
  isBacklogItemLike,
  isGridItemLike,
  isTransferableItemLike,
  isNormalizedItemLike,
} from './core-utils';

// To TransferableItem
export {
  backlogToTransferable,
  gridToTransferable,
  normalizedToTransferable,
  toTransferable,
  batchBacklogToTransferable,
  batchGridToTransferable,
} from './to-transferable';

// To GridItemType
export {
  type CreateGridItemOptions,
  backlogToGrid,
  transferableToGrid,
  toGridItem,
  createEmptyGridSlot,
  createEmptyGrid,
  updateGridItemPosition,
} from './to-grid';

// To BacklogItem & NormalizedItem
export {
  gridToBacklog,
  transferableToBacklog,
  backlogToNormalized,
  normalizedToBacklog,
  normalizedToBacklogItemType,
  batchNormalizedToBacklog,
} from './to-backlog';

// To RankedItem
export {
  createRankedItem,
  createEmptyRankedItem,
  createEmptyRanking,
  backlogToRanked,
  gridToRanked,
} from './to-ranked';

// Validation
export { type ItemValidation, validateForGrid, validateGridItem } from './validation';

// Display helpers
export { normalizeForDisplay, getDisplayTitle, getDisplayImageUrl } from './display-helpers';

// ============================================================================
// Namespace Export for Backward Compatibility
// ============================================================================

import { normalizeImageUrl, extractTitle, isBacklogItemLike, isGridItemLike, isTransferableItemLike, isNormalizedItemLike } from './core-utils';
import { backlogToTransferable, gridToTransferable, normalizedToTransferable, toTransferable, batchBacklogToTransferable, batchGridToTransferable } from './to-transferable';
import { backlogToGrid, transferableToGrid, toGridItem, createEmptyGridSlot, createEmptyGrid, updateGridItemPosition } from './to-grid';
import { gridToBacklog, transferableToBacklog, backlogToNormalized, normalizedToBacklog, normalizedToBacklogItemType, batchNormalizedToBacklog } from './to-backlog';
import { createRankedItem, createEmptyRankedItem, createEmptyRanking, backlogToRanked, gridToRanked } from './to-ranked';
import { validateForGrid, validateGridItem } from './validation';
import { normalizeForDisplay, getDisplayTitle, getDisplayImageUrl } from './display-helpers';

export const ItemTransformer = {
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
};

export default ItemTransformer;
