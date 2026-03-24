'use client';

/**
 * UnsavedChangesBanner - Persistent top-of-page banner for unsynced changes
 *
 * Shows when there are pending changes, especially when offline.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { CloudOff, RefreshCw, Loader2, X, AlertTriangle } from 'lucide-react';

import { DURATION, EASE } from '@/lib/animations/motion-presets';
import React, { useState, useEffect, useCallback } from 'react';

import { cn } from '@/lib/utils';

import { getOfflinePersistence } from './OfflinePersistence';
import { SyncState } from './types';

export interface UnsavedChangesBannerProps {
  minPendingToShow?: number;
  onlyWhenOffline?: boolean;
  className?: string;
  onDismiss?: () => void;
}

export const UnsavedChangesBanner: React.FC<UnsavedChangesBannerProps> = ({
  minPendingToShow = 1,
  onlyWhenOffline = false,
  className,
  onDismiss,
}) => {
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Check network status
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => {
      setIsOffline(true);
      setIsDismissed(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Subscribe to queue changes
    const persistence = getOfflinePersistence();
    const unsubscribe = persistence.onQueueChange((pendingCount) => {
      setSyncState({
        status: pendingCount > 0 ? 'pending' : 'idle',
        lastSyncedAt: null,
        pendingChanges: pendingCount,
        error: null,
      });
      if (pendingCount >= minPendingToShow) {
        setIsDismissed(false);
      }
    });

    // Load initial count
    persistence.getPendingCount().then(count => {
      if (count > 0) {
        setSyncState({
          status: 'pending',
          lastSyncedAt: null,
          pendingChanges: count,
          error: null,
        });
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, [minPendingToShow]);

  const handleSync = useCallback(async () => {
    try {
      setIsSyncing(true);
      const persistence = getOfflinePersistence();
      await persistence.processQueue();
    } catch {
      // Sync failed
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  const formatLastSync = (timestamp: number | null): string => {
    if (!timestamp) return 'never synced';
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  if (!syncState) return null;
  if (isDismissed) return null;

  const pendingCount = syncState.pendingChanges;
  if (pendingCount < minPendingToShow) return null;
  if (onlyWhenOffline && !isOffline) return null;

  const isError = syncState.status === 'error';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -40 }}
        transition={{ duration: DURATION.normal, ease: EASE.out }}
        className={cn(
          'fixed top-0 left-0 right-0 z-toast',
          isError
            ? 'bg-red-600/95'
            : isOffline
              ? 'bg-amber-600/95'
              : 'bg-amber-500/90',
          'backdrop-blur-sm',
          className
        )}
      >
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {isOffline ? (
              <CloudOff className="w-4 h-4 text-white flex-shrink-0" />
            ) : isError ? (
              <AlertTriangle className="w-4 h-4 text-white flex-shrink-0" />
            ) : (
              <RefreshCw className="w-4 h-4 text-white flex-shrink-0" />
            )}
            <span className="text-white text-sm font-medium truncate">
              {pendingCount} unsaved change{pendingCount !== 1 ? 's' : ''}
              {isOffline && ' — you\'re offline'}
              {isError && ` — ${syncState.error || 'sync failed'}`}
            </span>
            <span className="text-white/70 text-xs flex-shrink-0 hidden sm:inline">
              Last sync: {formatLastSync(syncState.lastSyncedAt)}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {!isOffline && (
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className={cn(
                  'px-3 py-1 rounded text-xs font-medium transition-colors',
                  'bg-white/20 text-white hover:bg-white/30',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isSyncing ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Syncing
                  </span>
                ) : (
                  'Sync now'
                )}
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="p-1 text-white/70 hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UnsavedChangesBanner;
