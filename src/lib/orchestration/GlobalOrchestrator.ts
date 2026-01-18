/**
 * Global Orchestrator
 *
 * Central coordination layer for multi-store state management.
 * Provides atomic transactions, middleware support, and undo/redo.
 *
 * Features:
 * - Command-based state mutations
 * - Atomic multi-store transactions
 * - Middleware pipeline (logging, validation, persistence)
 * - Undo/redo support for undoable commands
 * - Debug tools for transaction history
 */

import {
  OrchestratorCommand,
  OrchestratorConfig,
  DEFAULT_ORCHESTRATOR_CONFIG,
  Transaction,
  TransactionStatus,
  ExecutionResult,
  StateSnapshot,
  UndoState,
  UndoEntry,
  Middleware,
  MiddlewareConfig,
  GridCommand,
  SessionCommand,
  ComparisonCommand,
  MatchUICommand,
} from './types';
import { getCommandDescription } from './commands';

// =============================================================================
// Store References (lazy initialization)
// =============================================================================

let storeRefs: {
  grid: any;
  session: any;
  comparison: any;
  match: any;
  backlog: any;
  notification: any;
} | null = null;

/**
 * Initialize store references lazily to avoid circular dependencies.
 */
function getStores() {
  if (!storeRefs) {
    // Lazy import to avoid circular dependencies
    const { useGridStore } = require('@/stores/grid-store');
    const { useSessionStore } = require('@/stores/session-store');
    const { useComparisonStore } = require('@/stores/comparison-store');
    const { useMatchStore } = require('@/stores/match-store');
    const { useBacklogStore } = require('@/stores/backlog-store');
    const { useValidationNotificationStore } = require('@/stores/validation-notification-store');

    storeRefs = {
      grid: useGridStore,
      session: useSessionStore,
      comparison: useComparisonStore,
      match: useMatchStore,
      backlog: useBacklogStore,
      notification: useValidationNotificationStore,
    };
  }
  return storeRefs;
}

// =============================================================================
// Global Orchestrator Class
// =============================================================================

class GlobalOrchestratorImpl {
  private config: OrchestratorConfig;
  private middleware: MiddlewareConfig[] = [];
  private transactionHistory: Transaction[] = [];
  private undoState: UndoState = {
    undoStack: [],
    redoStack: [],
    maxStackSize: 50,
  };
  private currentTransaction: Transaction | null = null;
  private isExecuting = false;
  private subscribers: Set<(event: OrchestratorEvent) => void> = new Set();

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = { ...DEFAULT_ORCHESTRATOR_CONFIG, ...config };
    this.undoState.maxStackSize = this.config.maxUndoStackSize;

    // Register default middleware
    if (this.config.debug) {
      this.use(createLoggingMiddleware());
    }
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  /**
   * Update orchestrator configuration.
   */
  configure(config: Partial<OrchestratorConfig>): void {
    this.config = { ...this.config, ...config };
    this.undoState.maxStackSize = this.config.maxUndoStackSize;
  }

  /**
   * Register middleware.
   */
  use(middleware: MiddlewareConfig): void {
    this.middleware.push(middleware);
    this.middleware.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Remove middleware by name.
   */
  removeMiddleware(name: string): void {
    this.middleware = this.middleware.filter((m) => m.name !== name);
  }

  // ===========================================================================
  // Command Execution
  // ===========================================================================

  /**
   * Execute a single command.
   */
  async execute(command: OrchestratorCommand): Promise<ExecutionResult> {
    return this.executeWithMiddleware(command);
  }

  /**
   * Execute multiple commands as an atomic transaction.
   */
  async transaction(
    commands: OrchestratorCommand[],
    description?: string
  ): Promise<ExecutionResult> {
    if (commands.length === 0) {
      return { success: true, executedCommands: [] };
    }

    const transaction = this.createTransaction(commands);
    this.currentTransaction = transaction;

    try {
      // Take snapshot before transaction
      const snapshot = this.takeSnapshot();
      transaction.snapshot = snapshot;
      transaction.status = 'executing';

      const results: ExecutionResult[] = [];

      for (const command of commands) {
        const result = await this.executeCommand(command);
        results.push(result);

        if (!result.success) {
          // Rollback on failure
          await this.rollback(transaction);
          transaction.status = 'rolled_back';
          transaction.error = result.error;

          this.emit({ type: 'transaction:rollback', transaction });

          return {
            success: false,
            error: result.error,
            executedCommands: results.flatMap((r) => r.executedCommands),
            transactionId: transaction.id,
          };
        }
      }

      // All commands succeeded
      transaction.status = 'committed';
      transaction.completedAt = Date.now();
      this.transactionHistory.push(transaction);

      // Add to undo stack if undoable
      if (commands.some((c) => c.meta?.undoable !== false)) {
        this.addToUndoStack(commands, snapshot, description);
      }

      this.emit({ type: 'transaction:commit', transaction });

      return {
        success: true,
        executedCommands: commands,
        transactionId: transaction.id,
      };
    } finally {
      this.currentTransaction = null;
    }
  }

  /**
   * Execute a command with middleware pipeline.
   */
  private async executeWithMiddleware(
    command: OrchestratorCommand
  ): Promise<ExecutionResult> {
    const enabledMiddleware = this.middleware.filter((m) => m.enabled);

    // Build middleware chain
    let index = 0;
    const next = async (): Promise<ExecutionResult> => {
      if (index < enabledMiddleware.length) {
        const middleware = enabledMiddleware[index++];
        return middleware.handler(command, next);
      }
      return this.executeCommand(command);
    };

    return next();
  }

  /**
   * Execute a single command directly (no middleware).
   */
  private async executeCommand(command: OrchestratorCommand): Promise<ExecutionResult> {
    if (this.isExecuting && !this.currentTransaction) {
      console.warn('Concurrent command execution detected');
    }

    this.isExecuting = true;

    try {
      const stores = getStores();

      switch (command.type) {
        // Grid commands
        case 'grid/assign':
          return this.executeGridAssign(command, stores);
        case 'grid/move':
          return this.executeGridMove(command, stores);
        case 'grid/swap':
          return this.executeGridSwap(command, stores);
        case 'grid/remove':
          return this.executeGridRemove(command, stores);
        case 'grid/removeById':
          return this.executeGridRemoveById(command, stores);
        case 'grid/clear':
          return this.executeGridClear(command, stores);

        // Session commands
        case 'session/initialize':
          return this.executeSessionInitialize(command, stores);
        case 'session/reset':
          return this.executeSessionReset(command, stores);
        case 'session/save':
          return this.executeSessionSave(command, stores);
        case 'session/switch':
          return this.executeSessionSwitch(command, stores);

        // Comparison commands
        case 'comparison/open':
          return this.executeComparisonOpen(command, stores);
        case 'comparison/close':
          return this.executeComparisonClose(command, stores);
        case 'comparison/add':
          return this.executeComparisonAdd(command, stores);
        case 'comparison/remove':
          return this.executeComparisonRemove(command, stores);
        case 'comparison/clear':
          return this.executeComparisonClear(command, stores);

        // Match UI commands
        case 'match/keyboardMode':
          return this.executeMatchKeyboardMode(command, stores);
        case 'match/quickAssign':
          return this.executeMatchQuickAssign(command, stores);
        case 'match/showResult':
          return this.executeMatchShowResult(command, stores);
        case 'match/hideResult':
          return this.executeMatchHideResult(command, stores);

        default:
          return {
            success: false,
            error: `Unknown command type: ${(command as any).type}`,
            executedCommands: [],
          };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        executedCommands: [],
      };
    } finally {
      this.isExecuting = false;
    }
  }

  // ===========================================================================
  // Grid Command Executors
  // ===========================================================================

  private executeGridAssign(
    command: Extract<GridCommand, { type: 'grid/assign' }>,
    stores: NonNullable<typeof storeRefs>
  ): ExecutionResult {
    const { item, position } = command.payload;
    const gridState = stores.grid.getState();

    // Validate
    if (position < 0 || position >= gridState.maxGridSize) {
      return {
        success: false,
        error: `Invalid position: ${position}`,
        executedCommands: [],
      };
    }

    if (gridState.gridItems[position]?.matched) {
      return {
        success: false,
        error: `Position ${position} is already occupied`,
        executedCommands: [],
      };
    }

    // Execute
    gridState.assignItemToGrid(item, position);

    // Mark item as used in backlog
    const backlogState = stores.backlog.getState();
    backlogState.markItemAsUsed(item.id, true);

    return { success: true, executedCommands: [command] };
  }

  private executeGridMove(
    command: Extract<GridCommand, { type: 'grid/move' }>,
    stores: NonNullable<typeof storeRefs>
  ): ExecutionResult {
    const { fromPosition, toPosition } = command.payload;
    const gridState = stores.grid.getState();

    // Validate
    if (
      fromPosition < 0 ||
      fromPosition >= gridState.maxGridSize ||
      toPosition < 0 ||
      toPosition >= gridState.maxGridSize
    ) {
      return {
        success: false,
        error: 'Invalid positions',
        executedCommands: [],
      };
    }

    // Execute
    gridState.moveGridItem(fromPosition, toPosition);

    return { success: true, executedCommands: [command] };
  }

  private executeGridSwap(
    command: Extract<GridCommand, { type: 'grid/swap' }>,
    stores: NonNullable<typeof storeRefs>
  ): ExecutionResult {
    const { positionA, positionB } = command.payload;
    const gridState = stores.grid.getState();

    // Validate
    if (
      positionA < 0 ||
      positionA >= gridState.maxGridSize ||
      positionB < 0 ||
      positionB >= gridState.maxGridSize
    ) {
      return {
        success: false,
        error: 'Invalid positions',
        executedCommands: [],
      };
    }

    // Execute (moveGridItem handles swap logic)
    gridState.moveGridItem(positionA, positionB);

    return { success: true, executedCommands: [command] };
  }

  private executeGridRemove(
    command: Extract<GridCommand, { type: 'grid/remove' }>,
    stores: NonNullable<typeof storeRefs>
  ): ExecutionResult {
    const { position } = command.payload;
    const gridState = stores.grid.getState();

    // Get item before removal (for backlog update)
    const item = gridState.gridItems[position];
    const itemId = item?.backlogItemId;

    // Execute
    gridState.removeItemFromGrid(position);

    // Unmark item in backlog
    if (itemId) {
      const backlogState = stores.backlog.getState();
      backlogState.markItemAsUsed(itemId, false);
    }

    return { success: true, executedCommands: [command] };
  }

  private executeGridRemoveById(
    command: Extract<GridCommand, { type: 'grid/removeById' }>,
    stores: NonNullable<typeof storeRefs>
  ): ExecutionResult {
    const { itemId } = command.payload;
    const gridState = stores.grid.getState();

    // Execute
    gridState.removeItemByItemId(itemId);

    // Unmark item in backlog
    const backlogState = stores.backlog.getState();
    backlogState.markItemAsUsed(itemId, false);

    return { success: true, executedCommands: [command] };
  }

  private executeGridClear(
    command: Extract<GridCommand, { type: 'grid/clear' }>,
    stores: NonNullable<typeof storeRefs>
  ): ExecutionResult {
    const gridState = stores.grid.getState();

    // Get all item IDs before clearing
    const itemIds = gridState.gridItems
      .filter((item: any) => item?.matched && item?.backlogItemId)
      .map((item: any) => item.backlogItemId);

    // Execute
    gridState.clearGrid();

    // Unmark all items in backlog
    const backlogState = stores.backlog.getState();
    itemIds.forEach((id: string) => backlogState.markItemAsUsed(id, false));

    return { success: true, executedCommands: [command] };
  }

  // ===========================================================================
  // Session Command Executors
  // ===========================================================================

  private executeSessionInitialize(
    command: Extract<SessionCommand, { type: 'session/initialize' }>,
    stores: NonNullable<typeof storeRefs>
  ): ExecutionResult {
    const { listId, listSize, category } = command.payload;
    const sessionState = stores.session.getState();
    const gridState = stores.grid.getState();

    // Sync with session store
    sessionState.syncWithList(listId, category);

    // Get or create session
    const activeSession = sessionState.getActiveSession();

    if (activeSession && activeSession.gridItems?.length > 0) {
      // Load existing session
      gridState.loadFromSession(activeSession.gridItems, listSize);
    } else {
      // Create new grid
      gridState.initializeGrid(listSize, listId, category);
    }

    return { success: true, executedCommands: [command] };
  }

  private executeSessionReset(
    command: Extract<SessionCommand, { type: 'session/reset' }>,
    stores: NonNullable<typeof storeRefs>
  ): ExecutionResult {
    const gridState = stores.grid.getState();
    const comparisonState = stores.comparison.getState();
    const sessionState = stores.session.getState();
    const matchState = stores.match.getState();

    // Clear all related stores
    gridState.clearGrid();
    comparisonState.clearComparison();
    sessionState.setSelectedBacklogItem(null);

    // Reset match UI state
    matchState.setShowComparisonModal(false);
    matchState.setShowResultShareModal(false);
    matchState.setKeyboardMode(false);

    return { success: true, executedCommands: [command] };
  }

  private executeSessionSave(
    command: Extract<SessionCommand, { type: 'session/save' }>,
    stores: NonNullable<typeof storeRefs>
  ): ExecutionResult {
    const sessionState = stores.session.getState();
    sessionState.saveCurrentSession();

    return { success: true, executedCommands: [command] };
  }

  private executeSessionSwitch(
    command: Extract<SessionCommand, { type: 'session/switch' }>,
    stores: NonNullable<typeof storeRefs>
  ): ExecutionResult {
    const { listId } = command.payload;
    const sessionState = stores.session.getState();
    sessionState.switchToSession(listId);

    return { success: true, executedCommands: [command] };
  }

  // ===========================================================================
  // Comparison Command Executors
  // ===========================================================================

  private executeComparisonOpen(
    _command: Extract<ComparisonCommand, { type: 'comparison/open' }>,
    stores: NonNullable<typeof storeRefs>
  ): ExecutionResult {
    const comparisonState = stores.comparison.getState();
    const matchState = stores.match.getState();

    comparisonState.openComparison();
    matchState.setShowComparisonModal(true);

    return { success: true, executedCommands: [_command] };
  }

  private executeComparisonClose(
    _command: Extract<ComparisonCommand, { type: 'comparison/close' }>,
    stores: NonNullable<typeof storeRefs>
  ): ExecutionResult {
    const comparisonState = stores.comparison.getState();
    const matchState = stores.match.getState();

    comparisonState.closeComparison();
    matchState.setShowComparisonModal(false);

    return { success: true, executedCommands: [_command] };
  }

  private executeComparisonAdd(
    command: Extract<ComparisonCommand, { type: 'comparison/add' }>,
    stores: NonNullable<typeof storeRefs>
  ): ExecutionResult {
    const { item } = command.payload;
    const comparisonState = stores.comparison.getState();
    comparisonState.addToComparison(item);

    return { success: true, executedCommands: [command] };
  }

  private executeComparisonRemove(
    command: Extract<ComparisonCommand, { type: 'comparison/remove' }>,
    stores: NonNullable<typeof storeRefs>
  ): ExecutionResult {
    const { itemId } = command.payload;
    const comparisonState = stores.comparison.getState();
    comparisonState.removeFromComparison(itemId);

    return { success: true, executedCommands: [command] };
  }

  private executeComparisonClear(
    _command: Extract<ComparisonCommand, { type: 'comparison/clear' }>,
    stores: NonNullable<typeof storeRefs>
  ): ExecutionResult {
    const comparisonState = stores.comparison.getState();
    comparisonState.clearComparison();

    return { success: true, executedCommands: [_command] };
  }

  // ===========================================================================
  // Match UI Command Executors
  // ===========================================================================

  private executeMatchKeyboardMode(
    command: Extract<MatchUICommand, { type: 'match/keyboardMode' }>,
    stores: NonNullable<typeof storeRefs>
  ): ExecutionResult {
    const { enabled } = command.payload;
    const matchState = stores.match.getState();
    matchState.setKeyboardMode(enabled);

    return { success: true, executedCommands: [command] };
  }

  private executeMatchQuickAssign(
    command: Extract<MatchUICommand, { type: 'match/quickAssign' }>,
    stores: NonNullable<typeof storeRefs>
  ): ExecutionResult {
    const { position } = command.payload;
    const matchState = stores.match.getState();
    matchState.quickAssignToPosition(position);

    return { success: true, executedCommands: [command] };
  }

  private executeMatchShowResult(
    _command: Extract<MatchUICommand, { type: 'match/showResult' }>,
    stores: NonNullable<typeof storeRefs>
  ): ExecutionResult {
    const matchState = stores.match.getState();
    matchState.setShowResultShareModal(true);

    return { success: true, executedCommands: [_command] };
  }

  private executeMatchHideResult(
    _command: Extract<MatchUICommand, { type: 'match/hideResult' }>,
    stores: NonNullable<typeof storeRefs>
  ): ExecutionResult {
    const matchState = stores.match.getState();
    matchState.setShowResultShareModal(false);

    return { success: true, executedCommands: [_command] };
  }

  // ===========================================================================
  // Transaction Support
  // ===========================================================================

  private createTransaction(commands: OrchestratorCommand[]): Transaction {
    return {
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      commands,
      status: 'pending',
      startedAt: Date.now(),
    };
  }

  private takeSnapshot(): StateSnapshot {
    const stores = getStores();
    return {
      gridItems: [...stores.grid.getState().gridItems],
      sessionData: { ...stores.session.getState().listSessions },
      comparisonItems: [...stores.comparison.getState().items],
      timestamp: Date.now(),
    };
  }

  private async rollback(transaction: Transaction): Promise<void> {
    if (!transaction.snapshot) {
      console.error('Cannot rollback: no snapshot available');
      return;
    }

    const stores = getStores();

    // Restore grid state
    if (transaction.snapshot.gridItems) {
      const gridState = stores.grid.getState();
      gridState.loadFromSession(
        transaction.snapshot.gridItems,
        transaction.snapshot.gridItems.length
      );
    }

    if (this.config.debug) {
      console.log(`🔄 Rolled back transaction: ${transaction.id}`);
    }
  }

  // ===========================================================================
  // Undo/Redo
  // ===========================================================================

  private addToUndoStack(
    commands: OrchestratorCommand[],
    snapshot: StateSnapshot,
    description?: string
  ): void {
    if (!this.config.enableUndo) return;

    // Only keep the most recent undoable commands
    const undoableCommands = commands.filter((c) => c.meta?.undoable !== false);
    if (undoableCommands.length === 0) return;

    const entry: UndoEntry = {
      command: undoableCommands[0], // For single command, or first of batch
      inverseCommand: undoableCommands[0], // Simplified: we use snapshot for undo
      snapshot,
      timestamp: Date.now(),
      description: description || getCommandDescription(undoableCommands[0]),
    };

    this.undoState.undoStack.push(entry);

    // Trim stack if needed
    if (this.undoState.undoStack.length > this.undoState.maxStackSize) {
      this.undoState.undoStack.shift();
    }

    // Clear redo stack on new action
    this.undoState.redoStack = [];

    this.emit({ type: 'undo:push', entry });
  }

  /**
   * Undo the last undoable operation.
   */
  async undo(): Promise<ExecutionResult> {
    const entry = this.undoState.undoStack.pop();
    if (!entry) {
      return {
        success: false,
        error: 'Nothing to undo',
        executedCommands: [],
      };
    }

    // Take current snapshot for redo
    const currentSnapshot = this.takeSnapshot();

    // Restore previous state
    const stores = getStores();
    if (entry.snapshot.gridItems) {
      stores.grid.getState().loadFromSession(
        entry.snapshot.gridItems,
        entry.snapshot.gridItems.length
      );
    }

    // Push to redo stack
    this.undoState.redoStack.push({
      ...entry,
      snapshot: currentSnapshot,
    });

    this.emit({ type: 'undo:undo', entry });

    return {
      success: true,
      executedCommands: [],
    };
  }

  /**
   * Redo the last undone operation.
   */
  async redo(): Promise<ExecutionResult> {
    const entry = this.undoState.redoStack.pop();
    if (!entry) {
      return {
        success: false,
        error: 'Nothing to redo',
        executedCommands: [],
      };
    }

    // Take current snapshot for undo
    const currentSnapshot = this.takeSnapshot();

    // Restore redo state
    const stores = getStores();
    if (entry.snapshot.gridItems) {
      stores.grid.getState().loadFromSession(
        entry.snapshot.gridItems,
        entry.snapshot.gridItems.length
      );
    }

    // Push back to undo stack
    this.undoState.undoStack.push({
      ...entry,
      snapshot: currentSnapshot,
    });

    this.emit({ type: 'undo:redo', entry });

    return {
      success: true,
      executedCommands: [],
    };
  }

  /**
   * Check if undo is available.
   */
  canUndo(): boolean {
    return this.undoState.undoStack.length > 0;
  }

  /**
   * Check if redo is available.
   */
  canRedo(): boolean {
    return this.undoState.redoStack.length > 0;
  }

  /**
   * Get undo stack for UI display.
   */
  getUndoStack(): UndoEntry[] {
    return [...this.undoState.undoStack];
  }

  /**
   * Get redo stack for UI display.
   */
  getRedoStack(): UndoEntry[] {
    return [...this.undoState.redoStack];
  }

  // ===========================================================================
  // Event Subscription
  // ===========================================================================

  /**
   * Subscribe to orchestrator events.
   */
  subscribe(listener: (event: OrchestratorEvent) => void): () => void {
    this.subscribers.add(listener);
    return () => this.subscribers.delete(listener);
  }

  private emit(event: OrchestratorEvent): void {
    this.subscribers.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    });
  }

  // ===========================================================================
  // Debug & Introspection
  // ===========================================================================

  /**
   * Get transaction history.
   */
  getTransactionHistory(): Transaction[] {
    return [...this.transactionHistory];
  }

  /**
   * Clear transaction history.
   */
  clearHistory(): void {
    this.transactionHistory = [];
    this.undoState = {
      undoStack: [],
      redoStack: [],
      maxStackSize: this.config.maxUndoStackSize,
    };
  }

  /**
   * Get current configuration.
   */
  getConfig(): OrchestratorConfig {
    return { ...this.config };
  }

  /**
   * Get debug info.
   */
  getDebugInfo(): {
    isExecuting: boolean;
    hasCurrentTransaction: boolean;
    transactionCount: number;
    undoStackSize: number;
    redoStackSize: number;
    middlewareCount: number;
  } {
    return {
      isExecuting: this.isExecuting,
      hasCurrentTransaction: this.currentTransaction !== null,
      transactionCount: this.transactionHistory.length,
      undoStackSize: this.undoState.undoStack.length,
      redoStackSize: this.undoState.redoStack.length,
      middlewareCount: this.middleware.length,
    };
  }
}

// =============================================================================
// Orchestrator Events
// =============================================================================

export type OrchestratorEvent =
  | { type: 'transaction:commit'; transaction: Transaction }
  | { type: 'transaction:rollback'; transaction: Transaction }
  | { type: 'undo:push'; entry: UndoEntry }
  | { type: 'undo:undo'; entry: UndoEntry }
  | { type: 'undo:redo'; entry: UndoEntry };

// =============================================================================
// Middleware Factories
// =============================================================================

/**
 * Create logging middleware for debugging.
 */
export function createLoggingMiddleware(): MiddlewareConfig {
  return {
    name: 'logging',
    priority: 0,
    enabled: true,
    handler: async (command, next) => {
      const start = performance.now();
      console.log(`🎯 Command: ${command.type}`, command.payload);

      const result = await next();

      const duration = performance.now() - start;
      if (result.success) {
        console.log(`✅ Success: ${command.type} (${duration.toFixed(2)}ms)`);
      } else {
        console.log(`❌ Failed: ${command.type} - ${result.error}`);
      }

      return result;
    },
  };
}

/**
 * Create validation middleware.
 */
export function createValidationMiddleware(): MiddlewareConfig {
  return {
    name: 'validation',
    priority: 10,
    enabled: true,
    handler: async (command, next) => {
      // Pre-execution validation could go here
      // For now, validation is done in command executors
      return next();
    },
  };
}

/**
 * Create persistence middleware that batches saves.
 */
export function createPersistenceMiddleware(
  debounceMs = 300
): MiddlewareConfig {
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;

  return {
    name: 'persistence',
    priority: 100,
    enabled: true,
    handler: async (command, next) => {
      const result = await next();

      // Debounce save operations
      if (result.success && command.type.startsWith('grid/')) {
        if (saveTimeout) {
          clearTimeout(saveTimeout);
        }
        saveTimeout = setTimeout(() => {
          const stores = getStores();
          stores.session.getState().saveCurrentSession();
        }, debounceMs);
      }

      return result;
    },
  };
}

// =============================================================================
// Singleton Instance
// =============================================================================

let orchestratorInstance: GlobalOrchestratorImpl | null = null;

/**
 * Get the global orchestrator instance.
 */
export function getOrchestrator(): GlobalOrchestratorImpl {
  if (!orchestratorInstance) {
    orchestratorInstance = new GlobalOrchestratorImpl();
  }
  return orchestratorInstance;
}

/**
 * Reset the orchestrator (for testing).
 */
export function resetOrchestrator(): void {
  orchestratorInstance?.clearHistory();
  orchestratorInstance = null;
  storeRefs = null;
}

// Export the class for type purposes
export { GlobalOrchestratorImpl as GlobalOrchestrator };
