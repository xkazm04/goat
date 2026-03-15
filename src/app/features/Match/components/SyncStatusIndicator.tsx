'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  WifiOff,
  Loader2,
} from 'lucide-react';
import { useNetworkStatus, useOfflineSync, syncStatusColors } from '@/lib/offline';
import { SyncStatus } from '@/lib/offline/types';
import { SyncErrorIllustration, classifySyncError } from '@/components/illustrations/SyncErrorIllustrations';

interface SyncStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
  onConflictClick?: () => void;
}

const STATUS_CONFIG: Record<
  SyncStatus,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
    label: string;
  }
> = {
  idle: {
    icon: Cloud,
    color: syncStatusColors.idle.text,
    bgColor: syncStatusColors.idle.bgMuted,
    label: 'Idle',
  },
  syncing: {
    icon: Loader2,
    color: syncStatusColors.syncing.text,
    bgColor: syncStatusColors.syncing.bgMuted,
    label: 'Syncing',
  },
  synced: {
    icon: CheckCircle,
    color: syncStatusColors.synced.text,
    bgColor: syncStatusColors.synced.bgMuted,
    label: 'Synced',
  },
  pending: {
    icon: RefreshCw,
    color: syncStatusColors.pending.text,
    bgColor: syncStatusColors.pending.bgMuted,
    label: 'Pending',
  },
  error: {
    icon: AlertTriangle,
    color: syncStatusColors.error.text,
    bgColor: syncStatusColors.error.bgMuted,
    label: 'Error',
  },
  conflict: {
    icon: AlertTriangle,
    color: syncStatusColors.conflict.text,
    bgColor: syncStatusColors.conflict.bgMuted,
    label: 'Conflict',
  },
};

export function SyncStatusIndicator({
  className = '',
  showDetails = false,
  onConflictClick,
}: SyncStatusIndicatorProps) {
  const { isOffline, statusText } = useNetworkStatus();
  const { syncState, isSyncing, hasPendingChanges, hasConflicts, syncNow } =
    useOfflineSync();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showOfflineToast, setShowOfflineToast] = useState(false);

  // Show toast when going offline
  useEffect(() => {
    if (isOffline) {
      setShowOfflineToast(true);
      const timer = setTimeout(() => setShowOfflineToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOffline]);

  const config = STATUS_CONFIG[syncState.status];
  const Icon = isOffline ? WifiOff : config.icon;

  const formatLastSync = (timestamp: number | null): string => {
    if (!timestamp) return 'Never';
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <>
      {/* Offline Toast */}
      <AnimatePresence>
        {showOfflineToast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 shadow-lg flex items-center gap-3"
          >
            <WifiOff className={`w-5 h-5 ${syncStatusColors.offline.text}`} />
            <div>
              <p className="text-white font-medium">You're offline</p>
              <p className="text-gray-400 text-sm">
                Changes will sync when you're back online
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Indicator */}
      <div className={`relative ${className}`}>
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
            isOffline ? syncStatusColors.offline.bgMuted : config.bgColor
          }`}
        >
          <motion.div
            animate={isSyncing ? { rotate: 360 } : {}}
            transition={
              isSyncing
                ? { duration: 1, repeat: Infinity, ease: 'linear' }
                : {}
            }
          >
            <Icon
              className={`w-4 h-4 ${isOffline ? syncStatusColors.offline.text : config.color}`}
            />
          </motion.div>

          {showDetails && (
            <span
              className={`text-sm ${isOffline ? syncStatusColors.offline.text : config.color}`}
            >
              {isOffline ? 'Offline' : config.label}
            </span>
          )}

          {/* Pending count badge */}
          {hasPendingChanges && !isSyncing && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`absolute -top-1 -right-1 ${syncStatusColors.pending.bg} text-gray-900 text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold`}
            >
              {syncState.pendingChanges}
            </motion.span>
          )}

          {/* Conflict indicator */}
          {hasConflicts && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`absolute -top-1 -right-1 ${syncStatusColors.conflict.bg} text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold`}
            >
              !
            </motion.span>
          )}
        </motion.button>

        {/* Expanded Details Dropdown */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-full right-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">Sync Status</span>
                  <span
                    className={`text-sm ${
                      isOffline ? syncStatusColors.offline.text : config.color
                    }`}
                  >
                    {isOffline ? 'Offline' : statusText}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="px-4 py-3 space-y-3">
                {/* Last synced */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Last synced</span>
                  <span className="text-gray-200">
                    {formatLastSync(syncState.lastSyncedAt)}
                  </span>
                </div>

                {/* Pending changes */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Pending changes</span>
                  <span className="text-gray-200">
                    {syncState.pendingChanges}
                  </span>
                </div>

                {/* Current operation */}
                {syncState.currentOperation && (
                  <div className="text-sm text-gray-400">
                    {syncState.currentOperation}
                  </div>
                )}

                {/* Error message with illustration */}
                {syncState.error && (
                  <div className={`flex flex-col items-center gap-2 px-3 py-3 rounded text-center ${
                    classifySyncError(syncState.error) === 'quota'
                      ? syncStatusColors.pending.bgMuted
                      : syncStatusColors.error.bgMuted
                  }`}>
                    <SyncErrorIllustration error={syncState.error} width={56} height={56} />
                    <span className={`text-sm ${
                      classifySyncError(syncState.error) === 'quota'
                        ? syncStatusColors.pending.text
                        : syncStatusColors.error.text
                    }`}>
                      {syncState.error}
                    </span>
                  </div>
                )}

                {/* Conflicts */}
                {hasConflicts && (
                  <button
                    onClick={() => {
                      setIsExpanded(false);
                      onConflictClick?.();
                    }}
                    className={`w-full flex flex-col items-center gap-2 text-sm ${syncStatusColors.conflict.text} ${syncStatusColors.conflict.bgMuted} px-3 py-3 rounded hover:bg-orange-900/30 transition-colors`}
                  >
                    <SyncErrorIllustration error="conflict" width={48} height={48} />
                    {syncState.conflicts.length} conflict
                    {syncState.conflicts.length > 1 ? 's' : ''} need resolution
                  </button>
                )}
              </div>

              {/* Actions */}
              <div className="px-4 py-3 border-t border-gray-700">
                <button
                  onClick={() => {
                    syncNow();
                    setIsExpanded(false);
                  }}
                  disabled={isOffline || isSyncing}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded transition-colors text-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Click outside to close */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </>
  );
}

export default SyncStatusIndicator;
