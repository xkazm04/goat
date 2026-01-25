/**
 * Offline-First Architecture
 *
 * Main entry point for offline functionality. Provides a unified API
 * for offline storage, sync queue, conflict resolution, network monitoring,
 * background synchronization, and storage quota management.
 */

// Types
export * from './types';

// Core modules
export {
  OfflineStorage,
  getOfflineStorage,
  resetOfflineStorage,
} from './OfflineStorage';

export {
  SyncQueue,
  getSyncQueue,
  resetSyncQueue,
  type SyncExecutor,
  type ConflictHandler,
  type SyncQueueEvents,
} from './SyncQueue';

export {
  ConflictResolver,
  getConflictResolver,
  type GridMergeResult,
  type SessionMergeResult,
} from './ConflictResolver';

export {
  NetworkMonitor,
  getNetworkMonitor,
  resetNetworkMonitor,
  type NetworkStateListener,
} from './NetworkMonitor';

// Sync Engine - Background synchronization orchestrator
export {
  SyncEngine,
  getSyncEngine,
  initializeSyncEngine,
  resetSyncEngine,
  type SyncEngineConfig,
  type SyncEngineEvents,
  type SyncResult,
  type SelectiveSyncOptions,
} from './SyncEngine';

// Quota Manager - Storage quota management
export {
  QuotaManager,
  getQuotaManager,
  resetQuotaManager,
  type StorageEstimate,
  type QuotaManagerConfig,
  type PruneStrategy,
  type QuotaWarningCallback,
  type QuotaCriticalCallback,
} from './QuotaManager';

// React hooks
export { useOfflineSync, type UseOfflineSyncReturn } from './useOfflineSync';
export { useNetworkStatus } from './useNetworkStatus';

// Session store integration
export {
  initializeOfflineSessionSync,
  forceSaveToOffline,
  deleteFromOffline,
  getOfflineSession,
  hasUnsyncedChanges,
  getPendingOperationsCount,
  triggerSync,
  saveSessionToOffline,
} from './sessionStoreIntegration';

// Service Worker
export {
  useServiceWorker,
  useServiceWorkerUpdate,
  type ServiceWorkerState,
  type UseServiceWorkerReturn,
} from './useServiceWorker';

// Provider (exported from .tsx file)
export { OfflineProvider, useOffline } from './OfflineProvider';
