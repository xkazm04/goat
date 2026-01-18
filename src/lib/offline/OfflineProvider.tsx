'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { initializeOfflineSessionSync, triggerSync } from './sessionStoreIntegration';
import { useServiceWorker, useServiceWorkerUpdate } from './useServiceWorker';
import { useNetworkStatus } from './useNetworkStatus';
import { useOfflineSync, UseOfflineSyncReturn } from './useOfflineSync';
import { ConflictRecord, ConflictResolutionStrategy } from './types';
import { SyncStatusIndicator } from '@/app/features/Match/components/SyncStatusIndicator';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';

interface OfflineContextValue {
  // Network status
  isOnline: boolean;
  isOffline: boolean;
  isSlow: boolean;

  // Sync status
  isSyncing: boolean;
  hasPendingChanges: boolean;
  pendingCount: number;
  lastSyncedAt: number | null;

  // Conflicts
  hasConflicts: boolean;
  conflicts: ConflictRecord[];
  resolveConflict: (
    conflictId: string,
    strategy: ConflictResolutionStrategy,
    mergedData?: unknown
  ) => Promise<void>;

  // Actions
  syncNow: () => Promise<void>;
  retryFailed: () => Promise<void>;

  // Service Worker
  hasUpdate: boolean;
  applyUpdate: () => void;
}

const OfflineContext = createContext<OfflineContextValue | null>(null);

export function useOffline(): OfflineContextValue {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}

interface OfflineProviderProps {
  children: ReactNode;
  showStatusIndicator?: boolean;
  enableAutoSync?: boolean;
}

export function OfflineProvider({
  children,
  showStatusIndicator = true,
  enableAutoSync = true,
}: OfflineProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  // Network status
  const { isOnline, isOffline, isSlow } = useNetworkStatus();

  // Offline sync
  const {
    syncState,
    isSyncing,
    hasPendingChanges,
    hasConflicts,
    conflicts,
    syncNow,
    resolveConflict,
    retryFailed,
  } = useOfflineSync();

  // Service worker
  const { hasUpdate, applyUpdate } = useServiceWorkerUpdate();

  // Initialize offline sync on mount
  useEffect(() => {
    if (isInitialized) return;

    initializeOfflineSessionSync().then(() => {
      setIsInitialized(true);
      console.log('[OfflineProvider] Initialized');
    });
  }, [isInitialized]);

  // Show update banner when service worker update is available
  useEffect(() => {
    if (hasUpdate) {
      setShowUpdateBanner(true);
    }
  }, [hasUpdate]);

  // Auto-show conflict modal when conflicts detected
  useEffect(() => {
    if (hasConflicts && conflicts.length > 0) {
      setShowConflictModal(true);
    }
  }, [hasConflicts, conflicts.length]);

  // Listen for sync requests from service worker
  useEffect(() => {
    const handleSyncRequest = () => {
      if (isOnline && enableAutoSync) {
        triggerSync();
      }
    };

    window.addEventListener('sw-sync-request', handleSyncRequest);
    return () => {
      window.removeEventListener('sw-sync-request', handleSyncRequest);
    };
  }, [isOnline, enableAutoSync]);

  const handleApplyUpdate = useCallback(() => {
    applyUpdate();
    setShowUpdateBanner(false);
  }, [applyUpdate]);

  const handleResolveConflict = useCallback(
    async (
      conflictId: string,
      strategy: ConflictResolutionStrategy,
      mergedData?: unknown
    ) => {
      await resolveConflict(conflictId, strategy, mergedData);

      // Close modal if no more conflicts
      if (conflicts.length <= 1) {
        setShowConflictModal(false);
      }
    },
    [resolveConflict, conflicts.length]
  );

  const contextValue: OfflineContextValue = {
    isOnline,
    isOffline,
    isSlow,
    isSyncing,
    hasPendingChanges,
    pendingCount: syncState.pendingChanges,
    lastSyncedAt: syncState.lastSyncedAt,
    hasConflicts,
    conflicts,
    resolveConflict: handleResolveConflict,
    syncNow,
    retryFailed,
    hasUpdate,
    applyUpdate: handleApplyUpdate,
  };

  return (
    <OfflineContext.Provider value={contextValue}>
      {children}

      {/* Update Banner */}
      <AnimatePresence>
        {showUpdateBanner && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-0 right-0 z-50 bg-blue-600 px-4 py-3"
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-white" />
                <span className="text-white">A new version is available!</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleApplyUpdate}
                  className="px-4 py-1.5 bg-white text-blue-600 rounded font-medium text-sm hover:bg-gray-100 transition-colors"
                >
                  Update Now
                </button>
                <button
                  onClick={() => setShowUpdateBanner(false)}
                  className="p-1 text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sync Status Indicator */}
      {showStatusIndicator && (
        <div className="fixed bottom-4 right-4 z-40">
          <SyncStatusIndicator
            showDetails
            onConflictClick={() => setShowConflictModal(true)}
          />
        </div>
      )}

      {/* Conflict modal removed - ConflictResolutionModal was deleted */}
    </OfflineContext.Provider>
  );
}

export default OfflineProvider;
