/**
 * Offline-First Architecture Types
 *
 * Type definitions for the offline storage, sync queue, and conflict resolution systems.
 */

import { ListSession } from '@/stores/item-store/types';

// ============================================================================
// Database Schema Types
// ============================================================================

export interface OfflineDBSchema {
  sessions: SessionRecord;
  syncQueue: SyncOperation;
  metadata: MetadataRecord;
  conflicts: ConflictRecord;
}

export interface SessionRecord {
  id: string;
  listId: string;
  data: ListSession;
  version: number;
  localVersion: number;
  serverVersion: number;
  lastModified: number;
  lastSynced: number | null;
  isDirty: boolean;
}

export interface MetadataRecord {
  key: string;
  value: unknown;
  updatedAt: number;
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
  type: OperationType;
  entityId: string;
  entityType: 'session' | 'grid' | 'backlog';
  payload: unknown;
  timestamp: number;
  status: OperationStatus;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  conflictData?: ConflictData;
  priority: number;
}

export interface SyncQueueState {
  operations: SyncOperation[];
  isProcessing: boolean;
  lastProcessedAt: number | null;
  failedCount: number;
  pendingCount: number;
}

// ============================================================================
// Conflict Resolution Types
// ============================================================================

export type ConflictType =
  | 'update_update'    // Both local and server modified same data
  | 'update_delete'    // Local updated, server deleted
  | 'delete_update';   // Local deleted, server updated

export type ConflictResolutionStrategy =
  | 'local_wins'       // Keep local changes
  | 'server_wins'      // Keep server changes
  | 'merge'            // Attempt to merge changes
  | 'manual';          // Require user decision

export interface ConflictData {
  localVersion: unknown;
  serverVersion: unknown;
  baseVersion: unknown;
  localTimestamp: number;
  serverTimestamp: number;
}

export interface ConflictRecord {
  id: string;
  operationId: string;
  entityId: string;
  entityType: 'session' | 'grid' | 'backlog';
  conflictType: ConflictType;
  localData: unknown;
  serverData: unknown;
  baseData: unknown;
  createdAt: number;
  resolvedAt: number | null;
  resolution: ConflictResolutionStrategy | null;
  resolvedData: unknown | null;
}

export interface ConflictResolutionResult {
  resolved: boolean;
  strategy: ConflictResolutionStrategy;
  mergedData: unknown;
  requiresManualResolution: boolean;
}

// ============================================================================
// Network State Types
// ============================================================================

export type NetworkStatus = 'online' | 'offline' | 'slow';

export interface NetworkState {
  status: NetworkStatus;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
  lastOnlineAt: number | null;
  lastOfflineAt: number | null;
}

// ============================================================================
// Sync State Types
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
  syncProgress: number;
  currentOperation: string | null;
  error: string | null;
  conflicts: ConflictRecord[];
}

// ============================================================================
// Storage Event Types
// ============================================================================

export type StorageEventType =
  | 'session_saved'
  | 'session_loaded'
  | 'session_deleted'
  | 'sync_started'
  | 'sync_completed'
  | 'sync_failed'
  | 'conflict_detected'
  | 'conflict_resolved'
  | 'network_changed'
  | 'storage_error';

export interface StorageEvent {
  type: StorageEventType;
  timestamp: number;
  data?: unknown;
  error?: Error;
}

export type StorageEventListener = (event: StorageEvent) => void;

// ============================================================================
// Configuration Types
// ============================================================================

export interface OfflineConfig {
  dbName: string;
  dbVersion: number;
  maxRetries: number;
  retryBaseDelay: number;
  retryMaxDelay: number;
  syncDebounceMs: number;
  conflictStrategy: ConflictResolutionStrategy;
  enableBackgroundSync: boolean;
  maxQueueSize: number;
}

export const DEFAULT_OFFLINE_CONFIG: OfflineConfig = {
  dbName: 'goat-offline-db',
  dbVersion: 1,
  maxRetries: 5,
  retryBaseDelay: 1000,
  retryMaxDelay: 30000,
  syncDebounceMs: 500,
  conflictStrategy: 'server_wins',
  enableBackgroundSync: true,
  maxQueueSize: 100,
};
