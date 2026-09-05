/**
 * Drag and Drop Library
 *
 * Provides unified transfer protocol for all drag-and-drop operations
 * in the application.
 */

// Transfer Protocol - Core types and ID utilities
export {
  type TransferableItem,
  type TransferResult,
  type TransferContext,

  GRID_ID_PREFIX,
  extractGridPosition,
  createGridReceiverId,
  isGridReceiverId,
  assertCanonicalGridId,
} from './transfer-protocol';

// Type Guards - Data types and creators
export {
  type BacklogDragData,
  type GridDragData,
  type CollectionDragData,
  type GridSlotDropData,
  type CollectionDropData,

  isBacklogDragData,
  isGridDragData,
  isGridSlotDropData,
  isCollectionDragData,

  backlogToTransferable,

  createBacklogDragData,
  createGridDragData,
  createGridSlotDropData,
  createCollectionDragData,

  extractDragData,
  extractDropData,
} from './type-guards';

// Unified Protocol - Tier drag/drop support
export {
  type UnifiedDragData,
  type UnifiedDropData,
  type TransferRoute,

  isUnifiedDragData,
  isUnifiedDropData,

  createUnifiedTierDragData,
  createUnifiedTierRowDropData,

  determineTransferRoute,
} from './unified-protocol';

// DragOperation Router System
export {
  type DragOperationType,
  type DragOperationResult,
  type DragContext,
  type OperationStoreContext,
  type DragOperation,
  type RouterConfig,

  DragOperationRouter,

  createStandardRouter,
  createGridOnlyRouter,
} from './operations';

// Keyboard drag path — the second control that invokes the same operation the
// pointer gesture does (registry drag-drop/keyboard-alternatives).
export {
  type ArrowDirection,
  type DropCandidate,
  type Point,
  type RectLike,

  centerOf,
  coordinatesForTarget,
  directionFromKey,
  pickDirectionalTarget,
} from './keyboard-coordinates';

export {
  createStepwiseKeyboardCoordinateGetter,
  pointerWithinOrClosestCenter,
} from './keyboard-sensor';

// Activation thresholds — one authority for the click-vs-drag decision.
export {
  DRAG_ACTIVATION_DISTANCE_PX,
  TOUCH_ACTIVATION_DELAY_MS,
  TOUCH_ACTIVATION_TOLERANCE_PX,
} from './activation';
