'use client';

/**
 * SyncIndicator - Visual indicator for offline sync status
 *
 * Displays current sync state with appropriate icons, animations,
 * and user feedback for the offline-first architecture.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  Check,
  WifiOff,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SyncState, SyncStatus, NetworkState, ConflictRecord } from '@/lib/offline/types';
import { getSyncEngine, SyncEngine } from '@/lib/offline/SyncEngine';
import { getNetworkMonitor, NetworkMonitor } from '@/lib/offline/NetworkMonitor';
import { getQuotaManager, QuotaManager, StorageEstimate } from '@/lib/offline/QuotaManager';

// =============================================================================
// Types
// =============================================================================

export interface SyncIndicatorProps {
  /** Position on screen */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show expanded details by default */
  defaultExpanded?: boolean;
  /** Show storage quota info */
  showQuota?: boolean;
  /** Custom class name */
  className?: string;
  /** Callback when sync is triggered manually */
  onSyncClick?: () => void;
  /** Callback when conflict needs resolution */
  onConflictClick?: (conflict: ConflictRecord) => void;
}

// =============================================================================
// Icon Components
// =============================================================================

const StatusIcon: React.FC<{ status: SyncStatus; isOffline: boolean; size: number }> = ({
  status,
  isOffline,
  size,
}) => {
  if (isOffline) {
    return <WifiOff size={size} className="text-amber-500" />;
  }

  switch (status) {
    case 'syncing':
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <RefreshCw size={size} className="text-blue-500" />
        </motion.div>
      );
    case 'synced':
      return <Check size={size} className="text-green-500" />;
    case 'pending':
      return <Cloud size={size} className="text-amber-500" />;
    case 'error':
      return <AlertTriangle size={size} className="text-red-500" />;
    case 'conflict':
      return <AlertTriangle size={size} className="text-orange-500" />;
    case 'idle':
    default:
      return <Cloud size={size} className="text-muted-foreground" />;
  }
};

// =============================================================================
// Main Component
// =============================================================================

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({
  position = 'bottom-right',
  size = 'md',
  defaultExpanded = false,
  showQuota = true,
  className,
  onSyncClick,
  onConflictClick,
}) => {
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'idle',
    lastSyncedAt: null,
    pendingChanges: 0,
    syncProgress: 0,
    currentOperation: null,
    error: null,
    conflicts: [],
  });
  const [networkState, setNetworkState] = useState<NetworkState>({
    status: 'online',
    effectiveType: null,
    downlink: null,
    rtt: null,
    lastOnlineAt: null,
    lastOfflineAt: null,
  });
  const [quotaEstimate, setQuotaEstimate] = useState<StorageEstimate | null>(null);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isInitialized, setIsInitialized] = useState(false);

  // Size configurations
  const sizeConfig = {
    sm: { icon: 14, padding: 'p-1.5', text: 'text-xs', badge: 'text-[10px]' },
    md: { icon: 18, padding: 'p-2', text: 'text-sm', badge: 'text-xs' },
    lg: { icon: 22, padding: 'p-2.5', text: 'text-base', badge: 'text-sm' },
  };

  const config = sizeConfig[size];

  // Position classes
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  // Initialize and subscribe to updates
  useEffect(() => {
    let syncEngine: SyncEngine | null = null;
    let networkMonitor: NetworkMonitor | null = null;
    let quotaManager: QuotaManager | null = null;
    let unsubscribeNetwork: (() => void) | null = null;

    const initialize = async () => {
      try {
        // Get instances
        syncEngine = getSyncEngine();
        networkMonitor = getNetworkMonitor();
        quotaManager = getQuotaManager();

        // Initialize sync engine
        await syncEngine.initialize();

        // Subscribe to sync state changes
        syncEngine.setEvents({
          onStateChange: setSyncState,
          onNetworkChange: setNetworkState,
        });

        // Subscribe to network changes
        unsubscribeNetwork = networkMonitor.subscribe(setNetworkState);

        // Get initial quota estimate
        const estimate = await quotaManager.getEstimate();
        setQuotaEstimate(estimate);

        // Set initial state
        setSyncState(syncEngine.getState());
        setIsInitialized(true);
      } catch (error) {
        console.error('[SyncIndicator] Initialization error:', error);
      }
    };

    initialize();

    return () => {
      if (unsubscribeNetwork) {
        unsubscribeNetwork();
      }
    };
  }, []);

  // Refresh quota periodically
  useEffect(() => {
    if (!showQuota || !isInitialized) return;

    const refreshQuota = async () => {
      const quotaManager = getQuotaManager();
      const estimate = await quotaManager.getEstimate();
      setQuotaEstimate(estimate);
    };

    const interval = setInterval(refreshQuota, 30000);
    return () => clearInterval(interval);
  }, [showQuota, isInitialized]);

  const handleSyncClick = useCallback(async () => {
    if (onSyncClick) {
      onSyncClick();
      return;
    }

    const syncEngine = getSyncEngine();
    await syncEngine.forceSync();
  }, [onSyncClick]);

  const handleConflictClick = useCallback(
    (conflict: ConflictRecord) => {
      if (onConflictClick) {
        onConflictClick(conflict);
      }
    },
    [onConflictClick]
  );

  const formatLastSynced = (timestamp: number | null): string => {
    if (!timestamp) return 'Never';

    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const isOffline = networkState.status === 'offline';

  if (!isInitialized) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed z-50',
        positionClasses[position],
        className
      )}
    >
      <motion.div
        layout
        className={cn(
          'bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg',
          'transition-colors duration-200'
        )}
      >
        {/* Compact View */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'flex items-center gap-2 w-full',
            config.padding,
            'hover:bg-muted/50 rounded-lg transition-colors'
          )}
        >
          <StatusIcon
            status={syncState.status}
            isOffline={isOffline}
            size={config.icon}
          />

          {/* Badge for pending changes */}
          {syncState.pendingChanges > 0 && !isExpanded && (
            <span
              className={cn(
                'bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-medium',
                config.badge
              )}
            >
              {syncState.pendingChanges}
            </span>
          )}

          {/* Conflicts badge */}
          {syncState.conflicts.length > 0 && !isExpanded && (
            <span
              className={cn(
                'bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-medium',
                config.badge
              )}
            >
              {syncState.conflicts.length}!
            </span>
          )}

          {isExpanded ? (
            <ChevronUp size={config.icon - 4} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={config.icon - 4} className="text-muted-foreground" />
          )}
        </button>

        {/* Expanded View */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className={cn('border-t px-3 py-2 space-y-2', config.text)}>
                {/* Network Status */}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Network</span>
                  <span
                    className={cn(
                      'font-medium',
                      isOffline ? 'text-red-500' : 'text-green-500'
                    )}
                  >
                    {networkState.status === 'slow' ? 'Slow' : networkState.status}
                  </span>
                </div>

                {/* Sync Status */}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium capitalize">{syncState.status}</span>
                </div>

                {/* Pending Changes */}
                {syncState.pendingChanges > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Pending</span>
                    <span className="font-medium text-amber-500">
                      {syncState.pendingChanges} changes
                    </span>
                  </div>
                )}

                {/* Last Synced */}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last sync</span>
                  <span className="font-medium">
                    {formatLastSynced(syncState.lastSyncedAt)}
                  </span>
                </div>

                {/* Storage Quota */}
                {showQuota && quotaEstimate && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Storage</span>
                    <span
                      className={cn(
                        'font-medium',
                        quotaEstimate.usagePercent > 90
                          ? 'text-red-500'
                          : quotaEstimate.usagePercent > 70
                          ? 'text-amber-500'
                          : 'text-muted-foreground'
                      )}
                    >
                      {quotaEstimate.usagePercent.toFixed(0)}%
                    </span>
                  </div>
                )}

                {/* Error Message */}
                {syncState.error && (
                  <div className="text-red-500 text-xs bg-red-500/10 p-2 rounded">
                    {syncState.error}
                  </div>
                )}

                {/* Conflicts */}
                {syncState.conflicts.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-orange-500 font-medium text-xs">
                      {syncState.conflicts.length} conflict(s)
                    </span>
                    {syncState.conflicts.slice(0, 3).map((conflict) => (
                      <button
                        key={conflict.id}
                        onClick={() => handleConflictClick(conflict)}
                        className="block w-full text-left text-xs p-1.5 bg-orange-500/10 rounded hover:bg-orange-500/20 transition-colors"
                      >
                        {conflict.entityType}: {conflict.entityId.slice(0, 8)}...
                      </button>
                    ))}
                  </div>
                )}

                {/* Sync Button */}
                <button
                  onClick={handleSyncClick}
                  disabled={isOffline || syncState.status === 'syncing'}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 py-1.5 rounded',
                    'bg-primary text-primary-foreground',
                    'hover:bg-primary/90 transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    config.text
                  )}
                >
                  {syncState.status === 'syncing' ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={14} />
                      Sync Now
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// =============================================================================
// Compact Variant
// =============================================================================

export interface SyncBadgeProps {
  className?: string;
  onClick?: () => void;
}

/**
 * Compact sync status badge for use in headers/toolbars
 */
export const SyncBadge: React.FC<SyncBadgeProps> = ({ className, onClick }) => {
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      const syncEngine = getSyncEngine();
      const networkMonitor = getNetworkMonitor();

      await syncEngine.initialize();

      syncEngine.setEvents({
        onStateChange: setSyncState,
      });

      const unsubscribe = networkMonitor.subscribe((state) => {
        setIsOffline(state.status === 'offline');
      });

      setSyncState(syncEngine.getState());

      return () => {
        unsubscribe();
      };
    };

    initialize();
  }, []);

  if (!syncState) return null;

  const getStatusColor = () => {
    if (isOffline) return 'bg-amber-500';
    switch (syncState.status) {
      case 'syncing':
        return 'bg-blue-500';
      case 'synced':
        return 'bg-green-500';
      case 'pending':
        return 'bg-amber-500';
      case 'error':
        return 'bg-red-500';
      case 'conflict':
        return 'bg-orange-500';
      default:
        return 'bg-muted-foreground';
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-1.5 px-2 py-1 rounded-full',
        'bg-muted hover:bg-muted/80 transition-colors',
        'text-xs font-medium',
        className
      )}
    >
      <span
        className={cn('w-2 h-2 rounded-full', getStatusColor())}
        style={{
          animation: syncState.status === 'syncing' ? 'pulse 1s infinite' : undefined,
        }}
      />
      {isOffline ? (
        'Offline'
      ) : syncState.pendingChanges > 0 ? (
        `${syncState.pendingChanges} pending`
      ) : (
        'Synced'
      )}
    </button>
  );
};

export default SyncIndicator;
