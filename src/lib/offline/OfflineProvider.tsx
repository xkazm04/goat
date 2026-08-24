'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo, ReactNode } from 'react';

import { initDerivedSessionSync } from '@/stores/derived-session-sync';

import { initializeOfflineSessionSync, triggerSync } from './sessionStoreIntegration';
import { ConflictRecord, ConflictResolutionStrategy } from './types';
import { useNetworkStatus } from './useNetworkStatus';
import { useOfflineSync } from './useOfflineSync';
import { useServiceWorkerUpdate } from './useServiceWorker';
import { useUnsavedChangesGuard } from './useUnsavedChangesGuard';

interface OfflineContextValue {
  isOnline: boolean;
  isOffline: boolean;
  isSlow: boolean;
  isSyncing: boolean;
  hasPendingChanges: boolean;
  pendingCount: number;
  lastSyncedAt: number | null;
  hasConflicts: boolean;
  conflicts: ConflictRecord[];
  resolveConflict: (
    conflictId: string,
    strategy: ConflictResolutionStrategy,
    mergedData?: unknown
  ) => Promise<void>;
  syncNow: () => Promise<void>;
  retryFailed: () => Promise<void>;
  hasUpdate: boolean;
  applyUpdate: () => void;
}

const OfflineContext = createContext<OfflineContextValue | null>(null);

const OFFLINE_DEFAULTS: OfflineContextValue = {
  isOnline: true,
  isOffline: false,
  isSlow: false,
  isSyncing: false,
  hasPendingChanges: false,
  pendingCount: 0,
  lastSyncedAt: null,
  hasConflicts: false,
  conflicts: [],
  resolveConflict: async () => {},
  syncNow: async () => {},
  retryFailed: async () => {},
  hasUpdate: false,
  applyUpdate: () => {},
};

export function useOffline(): OfflineContextValue {
  const context = useContext(OfflineContext);
  return context ?? OFFLINE_DEFAULTS;
}

interface OfflineProviderProps {
  children: ReactNode;
  enableAutoSync?: boolean;
}

export function OfflineProvider({
  children,
  enableAutoSync = true,
}: OfflineProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  useUnsavedChangesGuard();

  // Initialize derived session sync (grid→session projection).
  // Safe to call multiple times — subsequent calls are no-ops.
  useEffect(() => {
    initDerivedSessionSync();
  }, []);

  const { isOnline, isOffline, isSlow } = useNetworkStatus();

  const {
    syncState,
    isSyncing,
    hasPendingChanges,
    syncNow,
    retryFailed,
  } = useOfflineSync();

  const { hasUpdate, applyUpdate } = useServiceWorkerUpdate();

  useEffect(() => {
    if (isInitialized) return;
    initializeOfflineSessionSync().then(() => setIsInitialized(true));
  }, [isInitialized]);

  useEffect(() => {
    if (hasUpdate) setShowUpdateBanner(true);
  }, [hasUpdate]);

  // Auto-sync when coming online
  useEffect(() => {
    const handleSyncRequest = () => {
      if (isOnline && enableAutoSync) {
        triggerSync();
      }
    };

    window.addEventListener('sw-sync-request', handleSyncRequest);
    return () => window.removeEventListener('sw-sync-request', handleSyncRequest);
  }, [isOnline, enableAutoSync]);

  // Auto-sync on interval (every 2 minutes) when there are pending changes
  const autoSyncRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (autoSyncRef.current) {
      clearInterval(autoSyncRef.current);
      autoSyncRef.current = null;
    }

    if (!enableAutoSync || !isOnline) return;

    autoSyncRef.current = setInterval(() => {
      const pending = syncState.pendingChanges;
      if (pending > 0 && !isSyncing) {
        triggerSync();
      }
    }, 2 * 60 * 1000); // 2 minutes

    return () => {
      if (autoSyncRef.current) {
        clearInterval(autoSyncRef.current);
        autoSyncRef.current = null;
      }
    };
  }, [enableAutoSync, isOnline, isSyncing, syncState.pendingChanges]);

  const handleApplyUpdate = useCallback(() => {
    applyUpdate();
    setShowUpdateBanner(false);
  }, [applyUpdate]);

  const resolveConflict = useCallback(async () => {
    // No-op: conflicts are not generated in current implementation
  }, []);

  const contextValue: OfflineContextValue = useMemo(() => ({
    isOnline,
    isOffline,
    isSlow,
    isSyncing,
    hasPendingChanges,
    pendingCount: syncState.pendingChanges,
    lastSyncedAt: syncState.lastSyncedAt,
    hasConflicts: false,
    conflicts: [],
    resolveConflict,
    syncNow,
    retryFailed,
    hasUpdate,
    applyUpdate: handleApplyUpdate,
  }), [
    isOnline, isOffline, isSlow,
    isSyncing, hasPendingChanges, syncState.pendingChanges, syncState.lastSyncedAt,
    resolveConflict, syncNow, retryFailed,
    hasUpdate, handleApplyUpdate,
  ]);

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
            className="fixed top-0 left-0 right-0 z-toast bg-blue-600 px-4 py-3"
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
    </OfflineContext.Provider>
  );
}

export default OfflineProvider;
