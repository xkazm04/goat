/**
 * Offline Persistence
 *
 * Provides offline session persistence to IndexedDB and
 * sync queue for replaying operations when online.
 */

// Types
export * from './types';

// Core persistence module
export {
  getOfflinePersistence,
  resetOfflinePersistence,
} from './OfflinePersistence';

// React hooks
export { useOfflineSync, type UseOfflineSyncReturn } from './useOfflineSync';
export { useNetworkStatus } from './useNetworkStatus';

// Session store integration
export {
  initializeOfflineSessionSync,
  forceSaveToOffline,
  flushPendingSync,
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

// Unsaved changes guard
export { useUnsavedChangesGuard, type UseUnsavedChangesGuardOptions } from './useUnsavedChangesGuard';
export { UnsavedChangesBanner, type UnsavedChangesBannerProps } from './UnsavedChangesBanner';

// Sync status color tokens
export { syncStatusColors, getEffectiveSyncColors, type SyncColorState } from './sync-status-colors';

// Provider
export { OfflineProvider, useOffline } from './OfflineProvider';
