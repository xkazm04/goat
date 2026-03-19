'use client';

/**
 * SyncIndicator - Visual indicator for offline sync status
 *
 * Displays current sync state with appropriate icons, animations,
 * and user feedback for the offline-first architecture.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DURATION } from '@/lib/animations/motion-presets';
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
import { SyncErrorIllustration, classifySyncError } from '@/components/illustrations/SyncErrorIllustrations';
import { getSyncEngine, SyncEngine } from '@/lib/offline/SyncEngine';
import { getNetworkMonitor, NetworkMonitor } from '@/lib/offline/NetworkMonitor';
import { getQuotaManager, QuotaManager, StorageEstimate } from '@/lib/offline/QuotaManager';
import { syncStatusColors, getEffectiveSyncColors } from '@/lib/offline/sync-status-colors';

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
// Branded Progress Components
// =============================================================================

/** Horizontal storage quota bar with gradient fill (green → amber → red) and goat-horn endpoint */
const StorageQuotaBar: React.FC<{ usagePercent: number }> = ({ usagePercent }) => {
  const clampedPercent = Math.min(100, Math.max(0, usagePercent));

  // Gradient stop: green at 0%, amber at 70%, red at 100%
  const gradientId = 'quota-gradient';

  return (
    <div className="w-full space-y-1">
      <div className="flex items-center justify-between text-2xs text-muted-foreground">
        <span>Storage</span>
        <span>{clampedPercent.toFixed(0)}%</span>
      </div>
      <div className="relative h-2 w-full">
        <svg
          viewBox="0 0 100 8"
          preserveAspectRatio="none"
          className="h-2 w-full rounded-full overflow-hidden"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="70%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
          {/* Track */}
          <rect x="0" y="0" width="100" height="8" rx="4" className="fill-gray-800" />
          {/* Fill */}
          <motion.rect
            x="0"
            y="0"
            height="8"
            rx="4"
            fill={`url(#${gradientId})`}
            initial={{ width: 0 }}
            animate={{ width: clampedPercent }}
            transition={{ duration: DURATION.emphasis, ease: 'easeOut' }}
          />
        </svg>
        {/* Goat-horn endpoint marker */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
          initial={{ left: '0%' }}
          animate={{ left: `${clampedPercent}%` }}
          transition={{ duration: DURATION.emphasis, ease: 'easeOut' }}
          style={{ marginLeft: -5 }}
        >
          <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
            <path
              d="M2 10C2 6 1 3 3 1C4.5 -0.5 5.5 -0.5 7 1C9 3 8 6 8 10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="text-foreground/70"
            />
          </svg>
        </motion.div>
      </div>
    </div>
  );
};

/** Circular micro-progress arc for active sync (items synced / total) */
const SyncProgressArc: React.FC<{ progress: number; size?: number }> = ({
  progress,
  size = 18,
}) => {
  const radius = (size - 3) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const dashOffset = circumference * (1 - clampedProgress);
  const center = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      {/* Track */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        strokeWidth="2"
        className="stroke-gray-800"
      />
      {/* Progress arc */}
      <motion.circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        strokeWidth="2"
        className="stroke-blue-500"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: dashOffset }}
        transition={{ duration: DURATION.normal, ease: 'easeOut' }}
        transform={`rotate(-90 ${center} ${center})`}
      />
    </svg>
  );
};

// =============================================================================
// Icon Components
// =============================================================================

const StatusIcon: React.FC<{ status: SyncStatus; isOffline: boolean; size: number }> = ({
  status,
  isOffline,
  size,
}) => {
  const colors = getEffectiveSyncColors(status, isOffline);

  if (isOffline) {
    return <WifiOff size={size} className={colors.text} />;
  }

  switch (status) {
    case 'syncing':
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <RefreshCw size={size} className={colors.text} />
        </motion.div>
      );
    case 'synced':
      return <Check size={size} className={colors.text} />;
    case 'pending':
      return <Cloud size={size} className={colors.text} />;
    case 'error':
      return <AlertTriangle size={size} className={colors.text} />;
    case 'conflict':
      return <AlertTriangle size={size} className={colors.text} />;
    case 'idle':
    default:
      return <Cloud size={size} className={colors.text} />;
  }
};

// =============================================================================
// Network Transition Toast
// =============================================================================

type NetworkToastState = 'online' | 'slow' | 'offline' | null;

const SIGNAL_BAR_CONFIGS: Record<Exclude<NetworkToastState, null>, { bars: number; color: string; label: string }> = {
  online: { bars: 3, color: 'bg-green-500', label: 'Back online' },
  slow: { bars: 2, color: 'bg-amber-500', label: 'Slow connection' },
  offline: { bars: 0, color: 'bg-red-500', label: 'You\'re offline' },
};

const SignalBars: React.FC<{ activeBars: number; color: string }> = ({ activeBars, color }) => {
  const heights = ['h-2', 'h-3', 'h-4'];
  return (
    <motion.div className="flex items-end gap-0.5" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
      {heights.map((h, i) => (
        <motion.div
          key={i}
          className={cn('w-1 rounded-sm', i < activeBars ? color : 'bg-muted-foreground/30')}
          variants={{
            hidden: { scaleY: 0, opacity: 0 },
            visible: { scaleY: 1, opacity: 1 },
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          style={{ transformOrigin: 'bottom' }}
        >
          <div className={h} />
        </motion.div>
      ))}
    </motion.div>
  );
};

const NetworkTransitionToast: React.FC<{ networkStatus: NetworkState['status'] }> = ({ networkStatus }) => {
  const [toastState, setToastState] = useState<NetworkToastState>(null);
  const prevStatus = useRef(networkStatus);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (prevStatus.current === networkStatus) return;
    prevStatus.current = networkStatus;

    // Show toast on status change
    setToastState(networkStatus as NetworkToastState);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToastState(null), 2000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [networkStatus]);

  const config = toastState ? SIGNAL_BAR_CONFIGS[toastState] : null;

  return (
    <AnimatePresence>
      {toastState && config && (
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="absolute bottom-full mb-2 left-0 right-0 flex justify-center pointer-events-none"
        >
          <div className="bg-background/95 backdrop-blur-sm rounded-container px-4 py-2.5 shadow-xl border flex items-center gap-2.5">
            <SignalBars activeBars={config.bars} color={config.color} />
            <span className="text-xs font-medium text-foreground">{config.label}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
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
    sm: { icon: 14, padding: 'p-1.5', text: 'text-xs', badge: 'text-2xs' },
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

    let unsubscribeEngine: (() => void) | null = null;

    const initialize = async () => {
      try {
        // Get instances
        syncEngine = getSyncEngine();
        networkMonitor = getNetworkMonitor();
        quotaManager = getQuotaManager();

        // Initialize sync engine (idempotent)
        await syncEngine.initialize();

        // Subscribe to engine events (multi-subscriber safe)
        unsubscribeEngine = syncEngine.subscribeEvents({
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
      if (unsubscribeEngine) {
        unsubscribeEngine();
      }
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
        'fixed z-toast',
        positionClasses[position],
        className
      )}
    >
      {/* Network transition toast */}
      <NetworkTransitionToast networkStatus={networkState.status} />

      <motion.div
        layout
        className={cn(
          'bg-background/95 backdrop-blur-xs border rounded-card shadow-lg',
          'transition-colors duration-200'
        )}
      >
        {/* Compact View */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'flex items-center gap-2 w-full',
            config.padding,
            'hover:bg-muted/50 rounded-card transition-colors'
          )}
        >
          {syncState.status === 'syncing' ? (
            <SyncProgressArc progress={syncState.syncProgress} size={config.icon} />
          ) : (
            <StatusIcon
              status={syncState.status}
              isOffline={isOffline}
              size={config.icon}
            />
          )}

          {/* Badge for pending changes */}
          {syncState.pendingChanges > 0 && !isExpanded && (
            <span
              className={cn(
                syncStatusColors.pending.bg, 'text-white px-1.5 py-0.5 rounded-full font-medium',
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
                syncStatusColors.conflict.bg, 'text-white px-1.5 py-0.5 rounded-full font-medium',
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
              transition={{ duration: DURATION.quick }}
              className="overflow-hidden"
            >
              <div className={cn('border-t px-4 py-3 space-y-3', config.text)}>
                {/* Network Status Section */}
                <div>
                  <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground/70">Network</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-muted-foreground">Status</span>
                    <span
                      className={cn(
                        'font-medium',
                        isOffline ? syncStatusColors.error.text : syncStatusColors.synced.text
                      )}
                    >
                      {networkState.status === 'slow' ? 'Slow' : networkState.status}
                    </span>
                  </div>
                </div>

                <div className="border-b border-border/30" />

                {/* Sync Status Section */}
                <div>
                  <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground/70">Sync</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium capitalize">{syncState.status}</span>
                  </div>

                  {/* Pending Changes */}
                  {syncState.pendingChanges > 0 && (
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-muted-foreground">Pending</span>
                      <span className={cn('font-medium', syncStatusColors.pending.text)}>
                        {syncState.pendingChanges} changes
                      </span>
                    </div>
                  )}

                  {/* Last Synced */}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-muted-foreground">Last sync</span>
                    <span className="font-medium">
                      {formatLastSynced(syncState.lastSyncedAt)}
                    </span>
                  </div>
                </div>

                {/* Storage Quota Bar */}
                {showQuota && quotaEstimate && (
                  <>
                    <div className="border-b border-border/30" />
                    <StorageQuotaBar usagePercent={quotaEstimate.usagePercent} />
                  </>
                )}

                {/* Error Message with Illustration */}
                {syncState.error && (
                  <div className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded text-xs text-center',
                    classifySyncError(syncState.error) === 'quota'
                      ? `${syncStatusColors.pending.bgMuted} ${syncStatusColors.pending.text}`
                      : `${syncStatusColors.error.bgMuted} ${syncStatusColors.error.text}`
                  )}>
                    <SyncErrorIllustration error={syncState.error} width={64} height={64} />
                    <span>{syncState.error}</span>
                  </div>
                )}

                {/* Conflicts */}
                {syncState.conflicts.length > 0 && (
                  <div className="space-y-1">
                    <span className={cn(syncStatusColors.conflict.text, 'font-medium text-xs')}>
                      {syncState.conflicts.length} conflict(s)
                    </span>
                    {syncState.conflicts.slice(0, 3).map((conflict) => (
                      <button
                        key={conflict.id}
                        onClick={() => handleConflictClick(conflict)}
                        className={cn('block w-full text-left text-xs p-1.5 rounded hover:bg-orange-500/20 transition-colors', syncStatusColors.conflict.bgMuted)}
                      >
                        {conflict.entityType}: {conflict.entityId.slice(0, 8)}...
                      </button>
                    ))}
                  </div>
                )}

                <div className="border-b border-border/30" />

                {/* Sync Button */}
                <button
                  onClick={handleSyncClick}
                  disabled={isOffline || syncState.status === 'syncing'}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 min-h-[36px] rounded-card',
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
    let unsubscribeEngine: (() => void) | null = null;
    let unsubscribeNetwork: (() => void) | null = null;

    const initialize = async () => {
      const syncEngine = getSyncEngine();
      const networkMonitor = getNetworkMonitor();

      await syncEngine.initialize();

      // Subscribe via multi-subscriber pattern (no overwrite)
      unsubscribeEngine = syncEngine.subscribeEvents({
        onStateChange: setSyncState,
      });

      unsubscribeNetwork = networkMonitor.subscribe((state) => {
        setIsOffline(state.status === 'offline');
      });

      setSyncState(syncEngine.getState());
    };

    initialize();

    return () => {
      unsubscribeEngine?.();
      unsubscribeNetwork?.();
    };
  }, []);

  if (!syncState) return null;

  const getStatusColor = () => {
    return getEffectiveSyncColors(syncState.status, isOffline).bg;
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-1.5 px-2 py-1 rounded-badge',
        'bg-muted hover:bg-muted/80 transition-colors',
        'text-xs font-medium',
        className
      )}
    >
      {syncState.status === 'syncing' ? (
        <SyncProgressArc progress={syncState.syncProgress} size={14} />
      ) : (
        <span
          className={cn('w-2 h-2 rounded-full', getStatusColor())}
        />
      )}
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
