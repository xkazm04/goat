/**
 * SyncEngine - Background synchronization orchestrator
 *
 * Coordinates offline data synchronization with intelligent scheduling,
 * background sync API support, and selective sync capabilities.
 */

import { getOfflineStorage, OfflineStorage } from './OfflineStorage';
import { getSyncQueue, SyncQueue, SyncExecutor, ConflictHandler } from './SyncQueue';
import { getConflictResolver, ConflictResolver } from './ConflictResolver';
import { getNetworkMonitor, NetworkMonitor } from './NetworkMonitor';
import { getQuotaManager, QuotaManager } from './QuotaManager';
import {
  SyncState,
  SyncStatus,
  ConflictRecord,
  SyncOperation,
  NetworkState,
  OfflineConfig,
  DEFAULT_OFFLINE_CONFIG,
} from './types';

// =============================================================================
// Types
// =============================================================================

export interface SyncEngineConfig extends Partial<OfflineConfig> {
  /** Auto-sync when coming online (default: true) */
  autoSyncOnReconnect?: boolean;
  /** Sync interval in ms when online (default: 30000 - 30s) */
  syncIntervalMs?: number;
  /** Minimum interval between syncs (default: 5000 - 5s) */
  minSyncIntervalMs?: number;
  /** Enable Background Sync API (default: true) */
  useBackgroundSync?: boolean;
  /** Selective sync - entity types to sync */
  syncEntityTypes?: Array<'session' | 'grid' | 'backlog'>;
  /** API endpoint for sync operations */
  syncEndpoint?: string;
}

export interface SyncEngineEvents {
  onStateChange?: (state: SyncState) => void;
  onSyncStart?: () => void;
  onSyncComplete?: (result: SyncResult) => void;
  onSyncError?: (error: Error) => void;
  onConflict?: (conflict: ConflictRecord) => void;
  onNetworkChange?: (state: NetworkState) => void;
  onQuotaWarning?: (usage: number, quota: number) => void;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: number;
  duration: number;
}

export interface SelectiveSyncOptions {
  entityTypes?: Array<'session' | 'grid' | 'backlog'>;
  entityIds?: string[];
  priority?: 'high' | 'normal' | 'low';
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_ENGINE_CONFIG: Required<SyncEngineConfig> = {
  ...DEFAULT_OFFLINE_CONFIG,
  autoSyncOnReconnect: true,
  syncIntervalMs: 30000,
  minSyncIntervalMs: 5000,
  useBackgroundSync: true,
  syncEntityTypes: ['session', 'grid', 'backlog'],
  syncEndpoint: '/api/sync',
};

// =============================================================================
// SyncEngine Class
// =============================================================================

export class SyncEngine {
  private config: Required<SyncEngineConfig>;
  private storage: OfflineStorage;
  private queue: SyncQueue;
  private conflictResolver: ConflictResolver;
  private networkMonitor: NetworkMonitor;
  private quotaManager: QuotaManager;
  private events: SyncEngineEvents = {};

  private state: SyncState = {
    status: 'idle',
    lastSyncedAt: null,
    pendingChanges: 0,
    syncProgress: 0,
    currentOperation: null,
    error: null,
    conflicts: [],
  };

  private isInitialized = false;
  private syncIntervalId: ReturnType<typeof setInterval> | null = null;
  private lastSyncTime = 0;
  private networkUnsubscribe: (() => void) | null = null;
  private backgroundSyncRegistered = false;

  constructor(config: SyncEngineConfig = {}) {
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config };
    this.storage = getOfflineStorage(this.config);
    this.queue = getSyncQueue(this.config);
    this.conflictResolver = getConflictResolver(this.config.conflictStrategy);
    this.networkMonitor = getNetworkMonitor();
    this.quotaManager = getQuotaManager();
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Initialize storage
    await this.storage.initialize();

    // Configure sync queue
    this.queue.setExecutor(this.createSyncExecutor());
    this.queue.setConflictHandler(this.createConflictHandler());
    this.queue.setEvents({
      onSyncStart: () => this.updateState({ status: 'syncing' }),
      onSyncComplete: (successful, failed) => {
        this.handleSyncComplete(successful, failed);
      },
      onSyncError: (error) => this.handleSyncError(error),
      onOperationSuccess: (op) => this.handleOperationSuccess(op),
      onOperationFailed: (op, error) => this.handleOperationFailed(op, error),
      onConflictDetected: (conflict) => this.handleConflict(conflict),
      onQueueChange: (queueState) => {
        this.updateState({ pendingChanges: queueState.pendingCount });
      },
    });

    // Subscribe to network changes
    this.networkUnsubscribe = this.networkMonitor.subscribe((state) => {
      this.handleNetworkChange(state);
    });

    // Initialize quota manager
    await this.quotaManager.initialize();
    this.quotaManager.onQuotaWarning((usage, quota) => {
      this.events.onQuotaWarning?.(usage, quota);
    });

    // Register for Background Sync if available
    if (this.config.useBackgroundSync) {
      await this.registerBackgroundSync();
    }

    // Start periodic sync if online
    if (this.networkMonitor.isOnline()) {
      this.startPeriodicSync();
    }

    // Load initial state
    await this.loadInitialState();

    this.isInitialized = true;
    console.log('[SyncEngine] Initialized');
  }

  async destroy(): Promise<void> {
    this.stopPeriodicSync();

    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }

    this.queue.stop();
    this.isInitialized = false;
  }

  // ============================================================================
  // Sync Operations
  // ============================================================================

  /**
   * Trigger a full sync
   */
  async sync(options?: SelectiveSyncOptions): Promise<SyncResult> {
    const startTime = Date.now();

    // Check if we can sync
    if (!this.canSync()) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        conflicts: 0,
        duration: 0,
      };
    }

    // Throttle syncs
    if (Date.now() - this.lastSyncTime < this.config.minSyncIntervalMs) {
      console.log('[SyncEngine] Sync throttled');
      return {
        success: true,
        synced: 0,
        failed: 0,
        conflicts: 0,
        duration: 0,
      };
    }

    this.lastSyncTime = Date.now();
    this.events.onSyncStart?.();
    this.updateState({ status: 'syncing', error: null });

    try {
      // Check quota before syncing
      const quotaOk = await this.quotaManager.checkQuota();
      if (!quotaOk) {
        console.warn('[SyncEngine] Storage quota exceeded, pruning...');
        await this.quotaManager.prune();
      }

      // Process the queue
      await this.queue.processQueue();

      const queueState = await this.queue.getState();
      const conflicts = await this.storage.getUnresolvedConflicts();

      const result: SyncResult = {
        success: queueState.failedCount === 0,
        synced: queueState.operations.filter((op) => op.status === 'completed').length,
        failed: queueState.failedCount,
        conflicts: conflicts.length,
        duration: Date.now() - startTime,
      };

      this.events.onSyncComplete?.(result);
      this.updateState({
        status: result.conflicts > 0 ? 'conflict' : result.success ? 'synced' : 'error',
        lastSyncedAt: Date.now(),
        conflicts,
      });

      return result;
    } catch (error) {
      const syncError = error instanceof Error ? error : new Error('Sync failed');
      this.handleSyncError(syncError);

      return {
        success: false,
        synced: 0,
        failed: 1,
        conflicts: 0,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Force sync immediately, ignoring throttle
   */
  async forceSync(): Promise<SyncResult> {
    this.lastSyncTime = 0;
    return this.sync();
  }

  /**
   * Sync a specific entity
   */
  async syncEntity(entityType: 'session' | 'grid' | 'backlog', entityId: string): Promise<boolean> {
    if (!this.canSync()) return false;

    const pendingOps = await this.storage.getPendingOperations();
    const entityOps = pendingOps.filter(
      (op) => op.entityType === entityType && op.entityId === entityId
    );

    if (entityOps.length === 0) return true;

    // Process only this entity's operations
    for (const op of entityOps) {
      const executor = this.createSyncExecutor();
      const result = await executor(op);

      if (result.success) {
        await this.storage.updateOperation({ ...op, status: 'completed' });
        if (entityType === 'session' && result.serverVersion !== undefined) {
          await this.storage.markSessionSynced(entityId, result.serverVersion);
        }
      } else {
        return false;
      }
    }

    return true;
  }

  // ============================================================================
  // State Management
  // ============================================================================

  getState(): SyncState {
    return { ...this.state };
  }

  private updateState(partial: Partial<SyncState>): void {
    this.state = { ...this.state, ...partial };
    this.events.onStateChange?.(this.state);
  }

  private async loadInitialState(): Promise<void> {
    const pendingOps = await this.storage.getPendingOperations();
    const conflicts = await this.storage.getUnresolvedConflicts();
    const lastSyncTime = await this.storage.getMetadata<number>('lastSyncTime');

    let status: SyncStatus = 'idle';
    if (conflicts.length > 0) {
      status = 'conflict';
    } else if (pendingOps.length > 0) {
      status = 'pending';
    }

    this.updateState({
      status,
      lastSyncedAt: lastSyncTime,
      pendingChanges: pendingOps.length,
      conflicts,
    });
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  setEvents(events: SyncEngineEvents): void {
    this.events = { ...this.events, ...events };
  }

  private handleNetworkChange(state: NetworkState): void {
    this.events.onNetworkChange?.(state);

    if (state.status === 'online' || state.status === 'slow') {
      // Coming online - trigger sync
      if (this.config.autoSyncOnReconnect && this.state.pendingChanges > 0) {
        console.log('[SyncEngine] Network restored, triggering sync');
        this.sync();
      }
      this.startPeriodicSync();
    } else {
      // Going offline - stop periodic sync
      this.stopPeriodicSync();
      this.updateState({ status: 'pending' });
    }
  }

  private handleSyncComplete(successful: number, failed: number): void {
    console.log(`[SyncEngine] Sync complete: ${successful} succeeded, ${failed} failed`);
  }

  private handleSyncError(error: Error): void {
    console.error('[SyncEngine] Sync error:', error);
    this.updateState({ status: 'error', error: error.message });
    this.events.onSyncError?.(error);
  }

  private handleOperationSuccess(operation: SyncOperation): void {
    console.log(`[SyncEngine] Operation success: ${operation.type} ${operation.entityId}`);
  }

  private handleOperationFailed(operation: SyncOperation, error: string): void {
    console.warn(`[SyncEngine] Operation failed: ${operation.type} ${operation.entityId}`, error);
  }

  private handleConflict(conflict: ConflictRecord): void {
    console.warn('[SyncEngine] Conflict detected:', conflict.id);
    this.updateState({
      status: 'conflict',
      conflicts: [...this.state.conflicts, conflict],
    });
    this.events.onConflict?.(conflict);
  }

  // ============================================================================
  // Periodic Sync
  // ============================================================================

  private startPeriodicSync(): void {
    if (this.syncIntervalId) return;

    this.syncIntervalId = setInterval(() => {
      if (this.canSync() && this.state.pendingChanges > 0) {
        this.sync();
      }
    }, this.config.syncIntervalMs);

    console.log(`[SyncEngine] Started periodic sync every ${this.config.syncIntervalMs}ms`);
  }

  private stopPeriodicSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
      console.log('[SyncEngine] Stopped periodic sync');
    }
  }

  // ============================================================================
  // Background Sync
  // ============================================================================

  private async registerBackgroundSync(): Promise<void> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;

      if ('sync' in registration) {
        await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } })
          .sync.register('goat-background-sync');
        this.backgroundSyncRegistered = true;
        console.log('[SyncEngine] Background Sync registered');
      }
    } catch (error) {
      console.warn('[SyncEngine] Background Sync registration failed:', error);
    }
  }

  /**
   * Called from service worker when background sync triggers
   */
  async handleBackgroundSync(): Promise<void> {
    console.log('[SyncEngine] Background sync triggered');
    await this.sync();
  }

  // ============================================================================
  // Conflict Resolution
  // ============================================================================

  /**
   * Resolve a conflict with a specific strategy
   */
  async resolveConflict(
    conflictId: string,
    strategy: 'local_wins' | 'server_wins' | 'merge',
    mergedData?: unknown
  ): Promise<void> {
    const conflicts = await this.storage.getUnresolvedConflicts();
    const conflict = conflicts.find((c) => c.id === conflictId);

    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    // Use conflict resolver for merge
    if (strategy === 'merge' && !mergedData) {
      const result = this.conflictResolver.resolveAutomatically(conflict, 'merge');
      if (result.resolved) {
        mergedData = result.mergedData;
      } else {
        throw new Error('Automatic merge failed, manual resolution required');
      }
    }

    // Resolve in queue
    await this.queue.resolveConflict(conflict.operationId, strategy, mergedData);

    // Update state
    const remainingConflicts = this.state.conflicts.filter((c) => c.id !== conflictId);
    this.updateState({
      conflicts: remainingConflicts,
      status: remainingConflicts.length > 0 ? 'conflict' : 'pending',
    });

    // Trigger sync to apply resolution
    await this.sync();
  }

  /**
   * Get all unresolved conflicts
   */
  async getConflicts(): Promise<ConflictRecord[]> {
    return this.storage.getUnresolvedConflicts();
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private canSync(): boolean {
    if (!this.isInitialized) return false;
    if (this.state.status === 'syncing') return false;
    if (this.networkMonitor.isOffline()) return false;
    return true;
  }

  private createSyncExecutor(): SyncExecutor {
    return async (operation) => {
      try {
        const response = await fetch(this.config.syncEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operation: operation.type,
            entityId: operation.entityId,
            entityType: operation.entityType,
            payload: operation.payload,
            timestamp: operation.timestamp,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          // Check for conflict response
          if (response.status === 409) {
            return {
              success: false,
              serverData: errorData.serverData,
              error: 'Conflict detected',
            };
          }

          return {
            success: false,
            error: errorData.message || `HTTP ${response.status}`,
          };
        }

        const data = await response.json();
        return {
          success: true,
          serverVersion: data.version,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Network error',
        };
      }
    };
  }

  private createConflictHandler(): ConflictHandler {
    return async (operation, serverData) => {
      const hasConflict = this.conflictResolver.hasConflict(
        operation.payload,
        serverData,
        operation.conflictData?.baseVersion
      );

      if (!hasConflict) return null;

      return this.conflictResolver.createConflictRecord(operation, serverData);
    };
  }

  /**
   * Check if there are pending changes
   */
  hasPendingChanges(): boolean {
    return this.state.pendingChanges > 0;
  }

  /**
   * Check if there are unresolved conflicts
   */
  hasConflicts(): boolean {
    return this.state.conflicts.length > 0;
  }

  /**
   * Get sync status text
   */
  getStatusText(): string {
    switch (this.state.status) {
      case 'idle':
        return 'Up to date';
      case 'syncing':
        return 'Syncing...';
      case 'synced':
        return 'Synced';
      case 'pending':
        return `${this.state.pendingChanges} changes pending`;
      case 'error':
        return `Sync error: ${this.state.error}`;
      case 'conflict':
        return `${this.state.conflicts.length} conflicts`;
      default:
        return 'Unknown';
    }
  }
}

// =============================================================================
// Singleton & Exports
// =============================================================================

let syncEngineInstance: SyncEngine | null = null;

export function getSyncEngine(config?: SyncEngineConfig): SyncEngine {
  if (!syncEngineInstance) {
    syncEngineInstance = new SyncEngine(config);
  }
  return syncEngineInstance;
}

export async function initializeSyncEngine(config?: SyncEngineConfig): Promise<SyncEngine> {
  const engine = getSyncEngine(config);
  await engine.initialize();
  return engine;
}

export function resetSyncEngine(): void {
  if (syncEngineInstance) {
    syncEngineInstance.destroy();
    syncEngineInstance = null;
  }
}
