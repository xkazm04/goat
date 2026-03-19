'use client';

/**
 * UnsavedChangesBanner - Persistent top-of-page banner for unsynced changes
 *
 * Shows when there are pending changes, especially when offline.
 * Displays change count, last sync time, and a manual sync button.
 * Inspired by Todoist's unsynced indicator pattern.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CloudOff, RefreshCw, Loader2, X, AlertTriangle } from 'lucide-react';
import { SyncState } from './types';
import { getSyncEngine } from './SyncEngine';
import { getNetworkMonitor } from './NetworkMonitor';

export interface UnsavedChangesBannerProps {
  /** Minimum pending changes before showing banner (default: 1) */
  minPendingToShow?: number;
  /** Only show when offline (default: false - shows whenever there are pending changes) */
  onlyWhenOffline?: boolean;
  /** Custom className */
  className?: string;
  /** Whether user has dismissed the banner */
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
    let unsubscribeNetwork: (() => void) | null = null;

    const init = async () => {
      try {
        const engine = getSyncEngine();
        const networkMonitor = getNetworkMonitor();

        engine.setEvents({
          onStateChange: (state) => {
            setSyncState(state);
            setIsSyncing(state.status === 'syncing');
            // Re-show banner if new changes appear after dismiss
            if (state.pendingChanges >= minPendingToShow && state.status === 'pending') {
              setIsDismissed(false);
            }
          },
        });

        unsubscribeNetwork = networkMonitor.subscribe((state) => {
          const offline = state.status === 'offline';
          setIsOffline(offline);
          // Re-show banner when going offline with pending changes
          if (offline) {
            setIsDismissed(false);
          }
        });

        setSyncState(engine.getState());
        setIsOffline(networkMonitor.isOffline());
      } catch {
        // Engine not initialized yet
      }
    };

    init();
    return () => {
      unsubscribeNetwork?.();
    };
  }, [minPendingToShow]);

  const handleSync = useCallback(async () => {
    try {
      setIsSyncing(true);
      const engine = getSyncEngine();
      await engine.forceSync();
    } catch {
      // Sync failed - state will update via events
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

  // Determine visibility
  if (!syncState) return null;
  if (isDismissed) return null;

  const pendingCount = syncState.pendingChanges;
  const hasPending = pendingCount >= minPendingToShow;

  if (!hasPending) return null;
  if (onlyWhenOffline && !isOffline) return null;

  const isError = syncState.status === 'error';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -40 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
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
          {/* Left: Status icon + message */}
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

          {/* Right: Actions */}
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
