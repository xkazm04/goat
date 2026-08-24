/**
 * Offline Persistence Types
 *
 * Minimal type definitions for offline session persistence and sync.
 */

import { ListSession } from '@/stores/item-store/types';

// ============================================================================
// Database Types
// ============================================================================

export interface SessionRecord {
  id: string;
  listId: string;
  data: ListSession;
  lastModified: number;
  isDirty: boolean;
}

// ============================================================================
// Sync Queue Types
// ============================================================================

export type OperationType =
  | 'CREATE_SESSION'
  | 'UPDATE_SESSION'
  | 'DELETE_SESSION'
  | 'UPDATE_GRID'
  | 'UPDATE_BACKLOG';

export type OperationStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'conflict';

export interface SyncOperation {
  id: string;
  type: OperationType | string;
  entityId: string;
  entityType: string;
  payload: unknown;
  timestamp: number;
  status: OperationStatus;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  priority: number;
}

// ============================================================================
// Sync State Types (used by UI components)
// ============================================================================

export type SyncStatus =
  | 'idle'
  | 'syncing'
  | 'synced'
  | 'pending'
  | 'error'
  | 'conflict';

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: number | null;
  pendingChanges: number;
  error: string | null;
}

// ============================================================================
// Conflict Types (kept for ConflictResolutionModal interface)
// ============================================================================

export type ConflictResolutionStrategy =
  | 'local_wins'
  | 'server_wins'
  | 'merge'
  | 'manual';

export interface ConflictRecord {
  id: string;
  operationId: string;
  entityId: string;
  entityType: string;
  conflictType: string;
  localData: unknown;
  serverData: unknown;
  baseData: unknown;
  createdAt: number;
  resolvedAt: number | null;
  resolution: ConflictResolutionStrategy | null;
  resolvedData: unknown | null;
}
