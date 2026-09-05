'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';

import { useOffline } from '@/lib/offline/OfflineProvider';
import { getEffectiveSyncColors } from '@/lib/offline/sync-status-colors';

import type { SyncStatus } from '@/lib/offline/types';

/**
 * Raw hex colors for box-shadow glow effects.
 * Mirrors the Tailwind classes in syncStatusColors but as values
 * usable in inline styles.
 */
const glowColors: Record<SyncStatus | 'offline', string> = {
  synced: '#10b981',   // emerald-500
  pending: '#f59e0b',  // amber-500
  syncing: '#3b82f6',  // blue-500
  error: '#ef4444',    // red-500
  conflict: '#f97316', // orange-500
  offline: '#94a3b8',  // slate-400
  idle: '#6b7280',     // gray-500
};

function resolveEffectiveState(
  status: SyncStatus,
  isOffline: boolean,
  hasConflicts: boolean,
): SyncStatus | 'offline' {
  if (isOffline) return 'offline';
  if (hasConflicts) return 'conflict';
  return status;
}

function deriveSyncStatus(
  isSyncing: boolean,
  hasPendingChanges: boolean,
  pendingCount: number,
): SyncStatus {
  if (isSyncing) return 'syncing';
  if (hasPendingChanges && pendingCount > 0) return 'pending';
  return 'synced';
}

/**
 * Compact 8×8 px sync status dot with animated state transitions.
 *
 * - **syncing**: gentle scale pulse (1 → 1.4 → 1)
 * - **synced**: brief check-scale pop
 * - **error / conflict**: static glow ring (box-shadow)
 * - **offline**: muted with glow ring
 * - **idle / pending**: solid dot, no extra animation
 *
 * Uses the project's `syncStatusColors` tokens via `getEffectiveSyncColors()`
 * and `useOffline()` context for state.
 */
export function SyncStatusDot({ className = '' }: { className?: string }) {
  const {
    isOffline,
    isSyncing,
    hasPendingChanges,
    pendingCount,
    hasConflicts,
  } = useOffline();

  const rawStatus = deriveSyncStatus(isSyncing, hasPendingChanges, pendingCount);
  const effectiveState = resolveEffectiveState(rawStatus, isOffline, hasConflicts);
  const colors = getEffectiveSyncColors(rawStatus, isOffline);
  const glowHex = glowColors[effectiveState];

  const showGlow = effectiveState === 'error' || effectiveState === 'conflict' || effectiveState === 'offline';

  const label = useMemo(() => {
    const labels: Record<SyncStatus | 'offline', string> = {
      synced: 'All changes saved',
      pending: `${pendingCount} unsaved change${pendingCount !== 1 ? 's' : ''}`,
      syncing: 'Syncing…',
      error: 'Sync error',
      conflict: 'Sync conflict',
      offline: 'Offline',
      idle: 'Idle',
    };
    return labels[effectiveState];
  }, [effectiveState, pendingCount]);

  return (
    <div className={`relative flex items-center justify-center ${className}`} title={label}>
      <AnimatePresence mode="wait">
        <motion.div
          key={effectiveState}
          layoutId="sync-status-dot"
          className={`w-2 h-2 rounded-full ${colors.bg}`}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={
            effectiveState === 'syncing'
              ? {
                  scale: [1, 1.4, 1],
                  opacity: 1,
                  transition: {
                    scale: { repeat: Infinity, duration: 1.2, ease: 'easeInOut' },
                    opacity: { duration: 0.2 },
                  },
                }
              : effectiveState === 'synced'
                ? {
                    scale: [1.3, 1],
                    opacity: 1,
                    transition: { duration: 0.3, ease: 'easeOut' },
                  }
                : {
                    scale: 1,
                    opacity: 1,
                    transition: { duration: 0.2 },
                  }
          }
          exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.15 } }}
          style={
            showGlow
              ? { boxShadow: `0 0 0 3px ${glowHex}4D` } // 4D ≈ 30% opacity
              : undefined
          }
        />
      </AnimatePresence>
    </div>
  );
}
