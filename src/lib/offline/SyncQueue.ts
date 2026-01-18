/**
 * SyncQueue - Ordered operation queue with retry logic
 *
 * Manages a queue of sync operations with automatic retry, exponential backoff,
 * and proper ordering to ensure data consistency during background sync.
 */

import {
  SyncOperation,
  OperationType,
  OperationStatus,
  SyncQueueState,
  OfflineConfig,
  DEFAULT_OFFLINE_CONFIG,
  ConflictData,
  ConflictRecord,
  ConflictType,
} from './types';
import { OfflineStorage, getOfflineStorage } from './OfflineStorage';

// Generate unique operation IDs
function generateOperationId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Calculate exponential backoff delay
function calculateBackoffDelay(
  retryCount: number,
  baseDelay: number,
  maxDelay: number
): number {
  const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
  // Add jitter to prevent thundering herd
  return delay + Math.random() * delay * 0.1;
}

export type SyncExecutor = (
  operation: SyncOperation
) => Promise<{ success: boolean; serverVersion?: number; error?: string; serverData?: unknown }>;

export type ConflictHandler = (
  operation: SyncOperation,
  serverData: unknown
) => Promise<ConflictRecord | null>;

export interface SyncQueueEvents {
  onSyncStart?: () => void;
  onSyncComplete?: (successful: number, failed: number) => void;
  onSyncError?: (error: Error) => void;
  onOperationSuccess?: (operation: SyncOperation) => void;
  onOperationFailed?: (operation: SyncOperation, error: string) => void;
  onConflictDetected?: (conflict: ConflictRecord) => void;
  onQueueChange?: (state: SyncQueueState) => void;
}

export class SyncQueue {
  private config: OfflineConfig;
  private storage: OfflineStorage;
  private executor: SyncExecutor | null = null;
  private conflictHandler: ConflictHandler | null = null;
  private events: SyncQueueEvents = {};
  private isProcessing = false;
  private processingPromise: Promise<void> | null = null;
  private retryTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(config: Partial<OfflineConfig> = {}) {
    this.config = { ...DEFAULT_OFFLINE_CONFIG, ...config };
    this.storage = getOfflineStorage(this.config);
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  setExecutor(executor: SyncExecutor): void {
    this.executor = executor;
  }

  setConflictHandler(handler: ConflictHandler): void {
    this.conflictHandler = handler;
  }

  setEvents(events: SyncQueueEvents): void {
    this.events = { ...this.events, ...events };
  }

  // ============================================================================
  // Queue Operations
  // ============================================================================

  async enqueue(
    type: OperationType,
    entityId: string,
    entityType: SyncOperation['entityType'],
    payload: unknown,
    priority: number = 1
  ): Promise<SyncOperation> {
    const operation: SyncOperation = {
      id: generateOperationId(),
      type,
      entityId,
      entityType,
      payload,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
      maxRetries: this.config.maxRetries,
      priority,
    };

    await this.storage.addToSyncQueue(operation);
    await this.notifyQueueChange();

    return operation;
  }

  async enqueueSessionUpdate(
    sessionId: string,
    sessionData: unknown
  ): Promise<SyncOperation> {
    // Check for existing pending update for the same session
    const pendingOps = await this.storage.getPendingOperations();
    const existingOp = pendingOps.find(
      (op) =>
        op.entityId === sessionId &&
        op.type === 'UPDATE_SESSION' &&
        op.status === 'pending'
    );

    if (existingOp) {
      // Coalesce updates - replace payload with latest data
      const updatedOp: SyncOperation = {
        ...existingOp,
        payload: sessionData,
        timestamp: Date.now(),
      };
      await this.storage.updateOperation(updatedOp);
      await this.notifyQueueChange();
      return updatedOp;
    }

    return this.enqueue('UPDATE_SESSION', sessionId, 'session', sessionData, 2);
  }

  async enqueueGridUpdate(
    sessionId: string,
    gridData: unknown
  ): Promise<SyncOperation> {
    // Grid updates have higher priority as they're more frequent
    return this.enqueue('UPDATE_GRID', sessionId, 'grid', gridData, 3);
  }

  async dequeue(operationId: string): Promise<void> {
    await this.storage.removeOperation(operationId);
    await this.notifyQueueChange();
  }

  async getState(): Promise<SyncQueueState> {
    const queue = await this.storage.getSyncQueue();
    const pendingOps = queue.filter((op) => op.status === 'pending');
    const failedOps = queue.filter((op) => op.status === 'failed');

    return {
      operations: queue,
      isProcessing: this.isProcessing,
      lastProcessedAt: await this.storage.getMetadata<number>('lastSyncTime'),
      failedCount: failedOps.length,
      pendingCount: pendingOps.length,
    };
  }

  // ============================================================================
  // Processing
  // ============================================================================

  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return this.processingPromise ?? Promise.resolve();
    }

    if (!this.executor) {
      console.warn('[SyncQueue] No executor configured');
      return;
    }

    this.isProcessing = true;
    this.events.onSyncStart?.();

    this.processingPromise = this.doProcessQueue();

    try {
      await this.processingPromise;
    } finally {
      this.isProcessing = false;
      this.processingPromise = null;
    }
  }

  private async doProcessQueue(): Promise<void> {
    let successCount = 0;
    let failCount = 0;

    try {
      while (true) {
        const pendingOps = await this.storage.getPendingOperations();

        if (pendingOps.length === 0) {
          break;
        }

        const operation = pendingOps[0];

        // Mark as in progress
        const inProgressOp: SyncOperation = {
          ...operation,
          status: 'in_progress',
        };
        await this.storage.updateOperation(inProgressOp);

        try {
          const result = await this.executor!(operation);

          if (result.success) {
            // Mark as completed
            const completedOp: SyncOperation = {
              ...operation,
              status: 'completed',
            };
            await this.storage.updateOperation(completedOp);
            this.events.onOperationSuccess?.(completedOp);
            successCount++;

            // Update session sync status if applicable
            if (
              operation.entityType === 'session' &&
              result.serverVersion !== undefined
            ) {
              await this.storage.markSessionSynced(
                operation.entityId,
                result.serverVersion
              );
            }
          } else {
            // Check for conflict
            if (result.serverData && this.conflictHandler) {
              const conflict = await this.conflictHandler(
                operation,
                result.serverData
              );

              if (conflict) {
                await this.storage.addConflict(conflict);
                this.events.onConflictDetected?.(conflict);

                // Mark operation as conflict
                const conflictOp: SyncOperation = {
                  ...operation,
                  status: 'conflict',
                  conflictData: {
                    localVersion: operation.payload,
                    serverVersion: result.serverData,
                    baseVersion: null,
                    localTimestamp: operation.timestamp,
                    serverTimestamp: Date.now(),
                  },
                };
                await this.storage.updateOperation(conflictOp);
                failCount++;
                continue;
              }
            }

            // Handle regular failure with retry
            await this.handleOperationFailure(operation, result.error ?? 'Unknown error');
            failCount++;
          }
        } catch (error) {
          await this.handleOperationFailure(
            operation,
            error instanceof Error ? error.message : 'Unknown error'
          );
          failCount++;
        }

        await this.notifyQueueChange();
      }

      await this.storage.setMetadata('lastSyncTime', Date.now());
      this.events.onSyncComplete?.(successCount, failCount);
    } catch (error) {
      this.events.onSyncError?.(error as Error);
      throw error;
    }
  }

  private async handleOperationFailure(
    operation: SyncOperation,
    errorMessage: string
  ): Promise<void> {
    const newRetryCount = operation.retryCount + 1;

    if (newRetryCount >= operation.maxRetries) {
      // Mark as permanently failed
      const failedOp: SyncOperation = {
        ...operation,
        status: 'failed',
        retryCount: newRetryCount,
        lastError: errorMessage,
      };
      await this.storage.updateOperation(failedOp);
      this.events.onOperationFailed?.(failedOp, errorMessage);
    } else {
      // Schedule retry with exponential backoff
      const updatedOp: SyncOperation = {
        ...operation,
        status: 'pending',
        retryCount: newRetryCount,
        lastError: errorMessage,
      };
      await this.storage.updateOperation(updatedOp);

      const delay = calculateBackoffDelay(
        newRetryCount,
        this.config.retryBaseDelay,
        this.config.retryMaxDelay
      );

      // Schedule retry
      const timeoutId = setTimeout(() => {
        this.retryTimeouts.delete(operation.id);
        this.processQueue();
      }, delay);

      this.retryTimeouts.set(operation.id, timeoutId);
    }
  }

  // ============================================================================
  // Conflict Resolution
  // ============================================================================

  async resolveConflict(
    operationId: string,
    resolution: 'local_wins' | 'server_wins' | 'merge',
    mergedData?: unknown
  ): Promise<void> {
    const queue = await this.storage.getSyncQueue();
    const operation = queue.find((op) => op.id === operationId);

    if (!operation || operation.status !== 'conflict') {
      throw new Error(`Operation ${operationId} not found or not in conflict state`);
    }

    const conflictData = operation.conflictData;
    if (!conflictData) {
      throw new Error(`No conflict data for operation ${operationId}`);
    }

    let resolvedPayload: unknown;

    switch (resolution) {
      case 'local_wins':
        resolvedPayload = conflictData.localVersion;
        break;
      case 'server_wins':
        resolvedPayload = conflictData.serverVersion;
        break;
      case 'merge':
        if (!mergedData) {
          throw new Error('Merged data required for merge resolution');
        }
        resolvedPayload = mergedData;
        break;
    }

    // Create new operation with resolved data
    const resolvedOp: SyncOperation = {
      ...operation,
      payload: resolvedPayload,
      status: 'pending',
      retryCount: 0,
      conflictData: undefined,
    };

    await this.storage.updateOperation(resolvedOp);

    // Find and resolve associated conflict record
    const conflicts = await this.storage.getUnresolvedConflicts();
    const conflict = conflicts.find((c) => c.operationId === operationId);

    if (conflict) {
      await this.storage.resolveConflict(conflict.id, resolution, resolvedPayload);
    }

    await this.notifyQueueChange();

    // Trigger sync
    this.processQueue();
  }

  // ============================================================================
  // Queue Management
  // ============================================================================

  async retryFailed(): Promise<void> {
    const queue = await this.storage.getSyncQueue();
    const failedOps = queue.filter((op) => op.status === 'failed');

    for (const op of failedOps) {
      const retriedOp: SyncOperation = {
        ...op,
        status: 'pending',
        retryCount: 0,
        lastError: undefined,
      };
      await this.storage.updateOperation(retriedOp);
    }

    await this.notifyQueueChange();
    this.processQueue();
  }

  async clearCompleted(): Promise<void> {
    const queue = await this.storage.getSyncQueue();
    const completedOps = queue.filter((op) => op.status === 'completed');

    for (const op of completedOps) {
      await this.storage.removeOperation(op.id);
    }

    await this.notifyQueueChange();
  }

  async clearAll(): Promise<void> {
    // Cancel pending retries
    Array.from(this.retryTimeouts.entries()).forEach(([id, timeoutId]) => {
      clearTimeout(timeoutId);
    });
    this.retryTimeouts.clear();

    const queue = await this.storage.getSyncQueue();

    for (const op of queue) {
      await this.storage.removeOperation(op.id);
    }

    await this.notifyQueueChange();
  }

  stop(): void {
    // Cancel all pending retries
    Array.from(this.retryTimeouts.entries()).forEach(([id, timeoutId]) => {
      clearTimeout(timeoutId);
    });
    this.retryTimeouts.clear();
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private async notifyQueueChange(): Promise<void> {
    const state = await this.getState();
    this.events.onQueueChange?.(state);
  }

  async getPendingCount(): Promise<number> {
    const state = await this.getState();
    return state.pendingCount;
  }

  async hasPendingOperations(): Promise<boolean> {
    return (await this.getPendingCount()) > 0;
  }
}

// Singleton instance
let syncQueueInstance: SyncQueue | null = null;

export function getSyncQueue(config?: Partial<OfflineConfig>): SyncQueue {
  if (!syncQueueInstance) {
    syncQueueInstance = new SyncQueue(config);
  }
  return syncQueueInstance;
}

export function resetSyncQueue(): void {
  if (syncQueueInstance) {
    syncQueueInstance.stop();
    syncQueueInstance = null;
  }
}
