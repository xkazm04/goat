/**
 * State Orchestration Types
 *
 * Type definitions for the centralized state orchestration layer.
 * Provides explicit dependency management and atomic multi-store transactions.
 */

import { GridItemType } from '@/types/match';
import { BacklogItem } from '@/types/backlog-groups';

// =============================================================================
// Command Types
// =============================================================================

/**
 * Base command interface for all orchestrated operations.
 * Commands are immutable descriptions of state changes.
 */
export interface Command<T extends string = string, P = unknown> {
  /** Unique command type identifier */
  type: T;
  /** Command payload */
  payload: P;
  /** Timestamp when command was created */
  timestamp: number;
  /** Optional metadata for debugging/tracking */
  meta?: CommandMeta;
}

export interface CommandMeta {
  /** Source of the command (e.g., 'keyboard', 'drag', 'api') */
  source?: string;
  /** Correlation ID for tracking related commands */
  correlationId?: string;
  /** Whether command should be added to undo stack */
  undoable?: boolean;
}

// =============================================================================
// Grid Commands
// =============================================================================

export interface AssignItemPayload {
  item: BacklogItem;
  position: number;
}

export interface MoveItemPayload {
  fromPosition: number;
  toPosition: number;
}

export interface SwapItemsPayload {
  positionA: number;
  positionB: number;
}

export interface RemoveItemPayload {
  position: number;
}

export interface RemoveItemByIdPayload {
  itemId: string;
}

export type AssignItemCommand = Command<'grid/assign', AssignItemPayload>;
export type MoveItemCommand = Command<'grid/move', MoveItemPayload>;
export type SwapItemsCommand = Command<'grid/swap', SwapItemsPayload>;
export type RemoveItemCommand = Command<'grid/remove', RemoveItemPayload>;
export type RemoveItemByIdCommand = Command<'grid/removeById', RemoveItemByIdPayload>;
export type ClearGridCommand = Command<'grid/clear', void>;

export type GridCommand =
  | AssignItemCommand
  | MoveItemCommand
  | SwapItemsCommand
  | RemoveItemCommand
  | RemoveItemByIdCommand
  | ClearGridCommand;

// =============================================================================
// Session Commands
// =============================================================================

export interface InitializeSessionPayload {
  listId: string;
  listSize: number;
  category?: string;
}

export interface SwitchSessionPayload {
  listId: string;
}

export interface SaveSessionPayload {
  listId?: string;
}

export type InitializeSessionCommand = Command<'session/initialize', InitializeSessionPayload>;
export type ResetSessionCommand = Command<'session/reset', void>;
export type SaveSessionCommand = Command<'session/save', SaveSessionPayload>;
export type SwitchSessionCommand = Command<'session/switch', SwitchSessionPayload>;

export type SessionCommand =
  | InitializeSessionCommand
  | ResetSessionCommand
  | SaveSessionCommand
  | SwitchSessionCommand;

// =============================================================================
// Comparison Commands
// =============================================================================

export interface AddToComparisonPayload {
  item: BacklogItem | GridItemType;
}

export interface RemoveFromComparisonPayload {
  itemId: string;
}

export type OpenComparisonCommand = Command<'comparison/open', void>;
export type CloseComparisonCommand = Command<'comparison/close', void>;
export type AddToComparisonCommand = Command<'comparison/add', AddToComparisonPayload>;
export type RemoveFromComparisonCommand = Command<'comparison/remove', RemoveFromComparisonPayload>;
export type ClearComparisonCommand = Command<'comparison/clear', void>;

export type ComparisonCommand =
  | OpenComparisonCommand
  | CloseComparisonCommand
  | AddToComparisonCommand
  | RemoveFromComparisonCommand
  | ClearComparisonCommand;

// =============================================================================
// Match UI Commands
// =============================================================================

export interface SetKeyboardModePayload {
  enabled: boolean;
}

export interface QuickAssignPayload {
  position: number;
}

export type SetKeyboardModeCommand = Command<'match/keyboardMode', SetKeyboardModePayload>;
export type QuickAssignCommand = Command<'match/quickAssign', QuickAssignPayload>;
export type ShowResultModalCommand = Command<'match/showResult', void>;
export type HideResultModalCommand = Command<'match/hideResult', void>;

export type MatchUICommand =
  | SetKeyboardModeCommand
  | QuickAssignCommand
  | ShowResultModalCommand
  | HideResultModalCommand;

// =============================================================================
// All Commands Union
// =============================================================================

export type OrchestratorCommand =
  | GridCommand
  | SessionCommand
  | ComparisonCommand
  | MatchUICommand;

// =============================================================================
// Transaction Types
// =============================================================================

/**
 * A transaction groups multiple commands into an atomic operation.
 * Either all commands succeed, or the entire transaction is rolled back.
 */
export interface Transaction {
  /** Unique transaction ID */
  id: string;
  /** Commands in this transaction */
  commands: OrchestratorCommand[];
  /** Transaction status */
  status: TransactionStatus;
  /** Timestamp when transaction started */
  startedAt: number;
  /** Timestamp when transaction completed (if applicable) */
  completedAt?: number;
  /** Error message if transaction failed */
  error?: string;
  /** Snapshot of affected state before transaction (for rollback) */
  snapshot?: StateSnapshot;
}

export type TransactionStatus = 'pending' | 'executing' | 'committed' | 'rolled_back' | 'failed';

/**
 * Snapshot of state before a transaction for rollback purposes.
 */
export interface StateSnapshot {
  gridItems?: GridItemType[];
  sessionData?: Record<string, unknown>;
  comparisonItems?: unknown[];
  timestamp: number;
}

// =============================================================================
// Result Types
// =============================================================================

/**
 * Result of executing a command or transaction.
 */
export interface ExecutionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  /** Commands that were executed */
  executedCommands: OrchestratorCommand[];
  /** Transaction ID if part of a transaction */
  transactionId?: string;
}

// =============================================================================
// Middleware Types
// =============================================================================

/**
 * Middleware function signature.
 * Middleware can intercept commands before/after execution.
 */
export type Middleware = (
  command: OrchestratorCommand,
  next: () => Promise<ExecutionResult>
) => Promise<ExecutionResult>;

/**
 * Middleware configuration.
 */
export interface MiddlewareConfig {
  name: string;
  /** Priority (lower = earlier execution) */
  priority: number;
  /** The middleware function */
  handler: Middleware;
  /** Whether middleware is enabled */
  enabled: boolean;
}

// =============================================================================
// Undo/Redo Types
// =============================================================================

/**
 * Entry in the undo stack.
 */
export interface UndoEntry {
  /** The command that was executed */
  command: OrchestratorCommand;
  /** Inverse command to undo the operation */
  inverseCommand: OrchestratorCommand;
  /** State snapshot before command execution */
  snapshot: StateSnapshot;
  /** Timestamp of execution */
  timestamp: number;
  /** Description for UI display */
  description: string;
}

/**
 * Undo/Redo stack state.
 */
export interface UndoState {
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  maxStackSize: number;
}

// =============================================================================
// Store Access Types
// =============================================================================

/**
 * Type-safe store accessor interface.
 * Provides controlled access to store state and actions.
 */
export interface StoreAccessor<State, Actions> {
  getState: () => State;
  setState: (partial: Partial<State>) => void;
  subscribe: (listener: (state: State) => void) => () => void;
  actions: Actions;
}

/**
 * Registry of all stores accessible by the orchestrator.
 */
export interface StoreRegistry {
  grid: StoreAccessor<GridStoreSnapshot, GridStoreActions>;
  session: StoreAccessor<SessionStoreSnapshot, SessionStoreActions>;
  comparison: StoreAccessor<ComparisonStoreSnapshot, ComparisonStoreActions>;
  match: StoreAccessor<MatchStoreSnapshot, MatchStoreActions>;
  backlog: StoreAccessor<BacklogStoreSnapshot, BacklogStoreActions>;
  notification: StoreAccessor<NotificationStoreSnapshot, NotificationStoreActions>;
}

// Store snapshot types (subset of full state needed for orchestration)
export interface GridStoreSnapshot {
  gridItems: GridItemType[];
  maxGridSize: number;
}

export interface SessionStoreSnapshot {
  activeSessionId: string | null;
  listSessions: Record<string, unknown>;
}

export interface ComparisonStoreSnapshot {
  isComparisonOpen: boolean;
  items: unknown[];
}

export interface MatchStoreSnapshot {
  keyboardMode: boolean;
  selectedItemIndex: number;
  showComparisonModal: boolean;
  showResultShareModal: boolean;
}

export interface BacklogStoreSnapshot {
  groups: unknown[];
}

export interface NotificationStoreSnapshot {
  notifications: unknown[];
}

// Store action types
export interface GridStoreActions {
  assignItemToGrid: (item: BacklogItem | GridItemType, position: number) => void;
  removeItemFromGrid: (position: number) => void;
  removeItemByItemId: (itemId: string) => void;
  moveGridItem: (fromPosition: number, toPosition: number) => void;
  clearGrid: () => void;
  initializeGrid: (size: number, listId?: string, category?: string) => void;
  loadFromSession: (items: GridItemType[], size: number) => void;
}

export interface SessionStoreActions {
  updateSessionGridItems: (gridItems: GridItemType[]) => void;
  setSelectedBacklogItem: (id: string | null) => void;
  syncWithList: (listId: string, category?: string) => void;
  saveCurrentSession: () => void;
  createSession: (listId: string, size: number) => void;
  switchToSession: (listId: string) => void;
}

export interface ComparisonStoreActions {
  openComparison: () => void;
  closeComparison: () => void;
  addToComparison: (item: unknown) => void;
  removeFromComparison: (itemId: string) => void;
  clearComparison: () => void;
}

export interface MatchStoreActions {
  setKeyboardMode: (enabled: boolean) => void;
  setShowComparisonModal: (show: boolean) => void;
  setShowResultShareModal: (show: boolean) => void;
  quickAssignToPosition: (position: number) => void;
  selectNextAvailableItem: () => void;
}

export interface BacklogStoreActions {
  markItemAsUsed: (itemId: string, used: boolean) => void;
  getItemById: (itemId: string) => BacklogItem | undefined;
  isItemUsed: (itemId: string) => boolean;
}

export interface NotificationStoreActions {
  emitValidationError: (errorCode: string) => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

// =============================================================================
// Orchestrator Configuration
// =============================================================================

export interface OrchestratorConfig {
  /** Enable debug logging */
  debug: boolean;
  /** Enable undo/redo functionality */
  enableUndo: boolean;
  /** Maximum undo stack size */
  maxUndoStackSize: number;
  /** Enable transaction batching */
  enableBatching: boolean;
  /** Batch window in milliseconds */
  batchWindowMs: number;
  /** Middleware stack */
  middleware: MiddlewareConfig[];
}

export const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  debug: process.env.NODE_ENV === 'development',
  enableUndo: true,
  maxUndoStackSize: 50,
  enableBatching: false,
  batchWindowMs: 16, // ~1 frame at 60fps
  middleware: [],
};
