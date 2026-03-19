'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  Upload,
} from 'lucide-react';
import { useOffline } from '@/lib/offline/OfflineProvider';
import { getSyncQueue } from '@/lib/offline/SyncQueue';
import type { SyncOperation, OperationStatus } from '@/lib/offline/types';

interface PendingChangesPanelProps {
  className?: string;
  defaultExpanded?: boolean;
}

const STATUS_CONFIG: Record<
  OperationStatus,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    label: string;
  }
> = {
  pending: {
    icon: Clock,
    color: 'text-yellow-400',
    label: 'Pending',
  },
  in_progress: {
    icon: Loader2,
    color: 'text-blue-400',
    label: 'Syncing',
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-400',
    label: 'Synced',
  },
  failed: {
    icon: AlertCircle,
    color: 'text-red-400',
    label: 'Failed',
  },
  conflict: {
    icon: AlertCircle,
    color: 'text-orange-400',
    label: 'Conflict',
  },
};

const OPERATION_LABELS: Record<string, string> = {
  CREATE_SESSION: 'Create session',
  UPDATE_SESSION: 'Update session',
  DELETE_SESSION: 'Delete session',
  UPDATE_GRID: 'Update rankings',
  UPDATE_BACKLOG: 'Update backlog',
};

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export function PendingChangesPanel({
  className = '',
  defaultExpanded = false,
}: PendingChangesPanelProps) {
  const { hasPendingChanges, pendingCount, isSyncing, syncNow, retryFailed, isOnline } =
    useOffline();

  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [operations, setOperations] = useState<SyncOperation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load operations when expanded
  useEffect(() => {
    if (!isExpanded) return;

    const loadOperations = async () => {
      setIsLoading(true);
      try {
        const state = await getSyncQueue().getState();
        setOperations(state.operations);
      } catch (error) {
        console.error('Failed to load operations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadOperations();

    // Poll for updates while expanded
    const interval = setInterval(loadOperations, 2000);
    return () => clearInterval(interval);
  }, [isExpanded]);

  // Don't show panel if no pending changes and not syncing
  if (!hasPendingChanges && !isSyncing && operations.length === 0) {
    return null;
  }

  const pendingOps = operations.filter((op) => op.status === 'pending');
  const failedOps = operations.filter((op) => op.status === 'failed');
  const conflictOps = operations.filter((op) => op.status === 'conflict');

  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-card overflow-hidden ${className}`}>
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Upload className="w-5 h-5 text-gray-400" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 text-gray-900 text-2xs font-bold rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </div>
          <div className="text-left">
            <div className="text-sm font-medium text-white">Pending Changes</div>
            <div className="text-xs text-gray-400">
              {isSyncing
                ? 'Syncing...'
                : pendingCount > 0
                  ? `${pendingCount} waiting to sync`
                  : 'All changes synced'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {failedOps.length > 0 && (
            <span className="px-2 py-0.5 bg-red-900/30 text-red-400 text-xs rounded">
              {failedOps.length} failed
            </span>
          )}
          {isSyncing ? (
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          ) : isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-700">
              {/* Quick Actions */}
              <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-700/50">
                <button
                  onClick={syncNow}
                  disabled={!isOnline || isSyncing || pendingOps.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded text-sm font-medium transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  Sync Now
                </button>
                {failedOps.length > 0 && (
                  <button
                    onClick={retryFailed}
                    disabled={!isOnline || isSyncing}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded text-sm font-medium transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry Failed
                  </button>
                )}
              </div>

              {/* Operations List */}
              <div className="max-h-64 overflow-y-auto">
                {isLoading ? (
                  <div className="px-4 py-8 text-center">
                    <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto" />
                    <p className="text-sm text-gray-400 mt-2">Loading...</p>
                  </div>
                ) : operations.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <CheckCircle className="w-8 h-8 text-green-400 mx-auto" />
                    <p className="text-sm text-gray-400 mt-2">
                      All changes have been synced
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-700/50">
                    {operations.map((operation) => {
                      const config = STATUS_CONFIG[operation.status];
                      const StatusIcon = config.icon;

                      return (
                        <div
                          key={operation.id}
                          className="px-4 py-3 hover:bg-gray-800/30 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <StatusIcon
                                className={`w-4 h-4 mt-0.5 shrink-0 ${config.color} ${
                                  operation.status === 'in_progress'
                                    ? 'animate-spin'
                                    : ''
                                }`}
                              />
                              <div className="min-w-0">
                                <div className="text-sm text-white">
                                  {OPERATION_LABELS[operation.type] || operation.type}
                                </div>
                                <div className="text-xs text-gray-400 truncate">
                                  {operation.entityId.slice(0, 20)}...
                                </div>
                                {operation.lastError && (
                                  <div className="text-xs text-red-400 mt-1 truncate">
                                    {operation.lastError}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className={`text-xs ${config.color}`}>
                                {config.label}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatTimeAgo(operation.timestamp)}
                              </div>
                              {operation.retryCount > 0 && (
                                <div className="text-xs text-gray-500">
                                  Retry {operation.retryCount}/{operation.maxRetries}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Status Bar */}
              {!isOnline && (
                <div className="px-4 py-2 bg-yellow-900/20 border-t border-yellow-900/30 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-yellow-400">
                    You're offline. Changes will sync when you reconnect.
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PendingChangesPanel;
