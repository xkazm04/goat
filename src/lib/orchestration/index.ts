/**
 * State Orchestration Layer
 *
 * Centralized coordination for multi-store state management.
 * Provides atomic transactions, middleware support, and undo/redo.
 *
 * @example
 * // Using the React hook
 * import { useOrchestrator } from '@/lib/orchestration';
 *
 * function MyComponent() {
 *   const { assign, move, undo, redo, canUndo, canRedo } = useOrchestrator();
 *
 *   const handleDrop = async (item, position) => {
 *     const success = await assign(item, position);
 *     if (!success) {
 *       // Handle error
 *     }
 *   };
 *
 *   return (
 *     <button onClick={undo} disabled={!canUndo}>
 *       Undo
 *     </button>
 *   );
 * }
 *
 * @example
 * // Using the orchestrator directly
 * import { getOrchestrator, assignItem } from '@/lib/orchestration';
 *
 * const orchestrator = getOrchestrator();
 *
 * // Execute a single command
 * const result = await orchestrator.execute(assignItem(item, position));
 *
 * // Execute multiple commands as a transaction
 * const result = await orchestrator.transaction([
 *   assignItem(item1, 0),
 *   assignItem(item2, 1),
 *   assignItem(item3, 2),
 * ], 'Assign 3 items');
 */

// Core orchestrator
export {
  getOrchestrator,
  resetOrchestrator,
  GlobalOrchestrator,
  createLoggingMiddleware,
  createValidationMiddleware,
  createPersistenceMiddleware,
  type OrchestratorEvent,
} from './GlobalOrchestrator';

// Commands
export {
  // Grid commands
  assignItem,
  moveItem,
  swapItems,
  removeItem,
  removeItemById,
  clearGrid,
  // Session commands
  initializeSession,
  resetSession,
  saveSession,
  switchSession,
  // Comparison commands
  openComparison,
  closeComparison,
  addToComparison,
  removeFromComparison,
  clearComparison,
  // Match UI commands
  setKeyboardMode,
  quickAssign,
  showResultModal,
  hideResultModal,
  // Utilities
  getCommandDescription,
  getInverseCommand,
} from './commands';

// Types
export type {
  // Command types
  Command,
  CommandMeta,
  OrchestratorCommand,
  GridCommand,
  SessionCommand,
  ComparisonCommand,
  MatchUICommand,
  // Payload types
  AssignItemPayload,
  MoveItemPayload,
  SwapItemsPayload,
  RemoveItemPayload,
  // Transaction types
  Transaction,
  TransactionStatus,
  StateSnapshot,
  ExecutionResult,
  // Undo types
  UndoState,
  UndoEntry,
  // Middleware types
  Middleware,
  MiddlewareConfig,
  // Config types
  OrchestratorConfig,
} from './types';

// React hooks
export {
  useOrchestrator,
  useUndoRedo,
  useOrchestratorDebug,
  useUndoRedoKeyboardShortcuts,
  type UseOrchestratorReturn,
} from './useOrchestrator';

// Drag handlers
export {
  handleDragEndOrchestrated,
  handleDragStartOrchestrated,
  handleDragCancelOrchestrated,
  getDragState,
  batchAssign,
  batchSwap,
  type OrchestratedDragResult,
  type DragHandlerOptions,
} from './dragHandlers';
