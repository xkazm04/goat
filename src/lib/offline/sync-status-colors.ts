/**
 * Unified Sync Status Color Tokens
 *
 * Single source of truth for sync-state color mappings used across
 * SyncIndicator, SyncBadge, SyncStatusIndicator, and the offline page.
 */

import { SyncStatus } from './types';

export type SyncColorState = SyncStatus | 'offline';

interface SyncStatusColorSet {
  /** Tailwind text color class (e.g. "text-emerald-500") */
  text: string;
  /** Tailwind bg color class for dot indicators / badges */
  bg: string;
  /** Tailwind bg color class with low opacity for panels / backdrops */
  bgMuted: string;
}

export const syncStatusColors: Record<SyncColorState, SyncStatusColorSet> = {
  synced: {
    text: 'text-emerald-500',
    bg: 'bg-emerald-500',
    bgMuted: 'bg-emerald-900/30',
  },
  pending: {
    text: 'text-amber-500',
    bg: 'bg-amber-500',
    bgMuted: 'bg-amber-900/30',
  },
  syncing: {
    text: 'text-blue-500',
    bg: 'bg-blue-500',
    bgMuted: 'bg-blue-900/30',
  },
  error: {
    text: 'text-red-500',
    bg: 'bg-red-500',
    bgMuted: 'bg-red-900/30',
  },
  conflict: {
    text: 'text-orange-500',
    bg: 'bg-orange-500',
    bgMuted: 'bg-orange-900/30',
  },
  offline: {
    text: 'text-slate-400',
    bg: 'bg-slate-400',
    bgMuted: 'bg-slate-900/30',
  },
  idle: {
    text: 'text-muted-foreground',
    bg: 'bg-muted-foreground',
    bgMuted: 'bg-gray-800/50',
  },
};

/**
 * Resolves the effective color state, prioritizing offline over sync status.
 */
export function getEffectiveSyncColors(
  status: SyncStatus,
  isOffline: boolean
): SyncStatusColorSet {
  if (isOffline) return syncStatusColors.offline;
  return syncStatusColors[status];
}
