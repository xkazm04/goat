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

// Unified Protocol for all ranking modes
export {
  // Types
  type UnifiedSourceType,
  type UnifiedDragData,
  type UnifiedDropType,
  type UnifiedDropData,
  type TransferRoute,

  // Type guards
  isUnifiedDragData,
  isUnifiedDropData,
  isTierDragData,
  isTierRowDropData,
  isTierItemDropData,
  isUnrankedPoolDropData,

  // Factory functions - Drag data
  createUnifiedCollectionDragData,
  createUnifiedGridDragData,
  createUnifiedTierDragData,
  createUnifiedUnrankedDragData,

  // Factory functions - Drop data
  createUnifiedGridSlotDropData,
  createUnifiedTierRowDropData,
  createUnifiedTierItemDropData,
  createUnifiedUnrankedPoolDropData,

  // ID utilities
  DROP_ID_PATTERNS,
  parseDropTargetId,
  isGridSlotId,
  isTierRowId,
  isTierItemId,

  // Debug helpers
  describeUnifiedDragData,
  describeUnifiedDropData,

  // Route determination
  determineTransferRoute,
} from './unified-protocol';

// DragOperation Router System
export {
  // Types
  type DragOperationType,
  type DragSource,
  type DragTarget,
  type DragContext,
  type DragOperationResult,
  type GridStoreContext,
  type BacklogStoreContext,
  type TierStoreContext,
  type OperationStoreContext,
  type DragOperation,
  type RouterConfig,
  type OperationResultHandler,
  type ValidationErrorHandler,
  type DragNotification,
  type NotificationCallback,
  type ValidationErrorEmitter,
  type DragResultHandlerConfig,

  // Router
  DragOperationRouter,
  getDragOperationRouter,
  resetDragOperationRouter,

  // Operations
  AssignOperation,
  MoveOperation,
  SwapOperation,
  TierAssignOperation,
  TierMoveOperation,
  TierTransferOperation,
  UnrankOperation,
  RankFromPoolOperation,
  TierToGridOperation,
  GridToTierOperation,

  // Result Handler
  DragResultHandler,
  getDragResultHandler,
  resetDragResultHandler,
  createConsoleNotificationCallback,
  connectToNotificationStore,

  // Factory functions
  createStandardRouter,
  createGridOnlyRouter,
  createDragSystem,
} from './operations';
