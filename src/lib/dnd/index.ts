/**
 * Drag and Drop Library
 *
 * Provides unified transfer protocol for all drag-and-drop operations
 * in the application.
 */

export {
  // Core class
  TransferProtocol,

  // Interfaces
  type TransferableItem,
  type TransferSource,
  type DropReceiver,
  type TransferResult,
  type TransferContext,
  type TransferHoverPreview,

  // Types
  type TransferSourceType,
  type DropReceiverType,
  type TransferAction,

  // Factory functions
  createBacklogSource,
  createGridSource,
  createCollectionSource,
  createGridPositionReceiver,
  createCollectionListReceiver,

  // Utility functions
  extractGridPosition,
  createGridReceiverId,
  isGridReceiverId,
  toTransferableItem,

  // Global instance
  getGlobalTransferProtocol,
  resetGlobalTransferProtocol,
} from './transfer-protocol';

export { useTransferProtocol, TransferProtocolProvider, useTransferContext } from './use-transfer-protocol';

// Lazy-loaded DnD components for code splitting
export {
  LazyDndContext,
  LazyDragOverlay,
  LazySortableContext,
  DndLoadingSkeleton,
  preloadDndKit,
  isDndKitLoaded,
  getDndCore,
  getDndSortable,
  getDndModifiers,
  getDndUtilities,
} from './LazyDndProvider';

// Type Guards and Assertion Helpers
export {
  // Data type interfaces
  type BacklogDragData,
  type GridDragData,
  type CollectionDragData,
  type DragData,
  type GridSlotDropData,
  type CollectionDropData,
  type DropReceiverData,

  // Type guards for drag data
  isBacklogDragData,
  isGridDragData,
  isCollectionDragData,
  isDragData,

  // Type guards for drop receiver data
  isGridSlotDropData,
  isCollectionDropData,
  isDropReceiverData,

  // Type guards for items
  isGridItem,
  isBacklogItem,
  isTransferableItem,

  // Event data extractors
  extractDragData,
  extractDropData,
  extractBacklogData,
  extractGridData,

  // Assertion helpers
  DndTypeAssertionError,
  assertBacklogDragData,
  assertGridDragData,
  assertGridSlot,
  assertGridItem,
  assertBacklogItem,
  assertTransferableItem,

  // Safe type conversions
  backlogToTransferable,
  gridToTransferable,

  // Data payload creators
  createBacklogDragData,
  createGridDragData,
  createGridSlotDropData,
  createCollectionDragData,

  // Additional item type guards
  isCollectionItem,
  collectionToTransferable,

  // Debug helpers
  describeDragData,
  describeDropData,
  logDragEvent,
} from './type-guards';
