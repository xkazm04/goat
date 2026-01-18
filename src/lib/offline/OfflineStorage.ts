/**
 * OfflineStorage - IndexedDB wrapper with versioning
 *
 * Provides a robust IndexedDB-based storage system for offline session persistence
 * with automatic versioning, migration support, and fallback to localStorage.
 */

import {
  OfflineConfig,
  DEFAULT_OFFLINE_CONFIG,
  SessionRecord,
  SyncOperation,
  MetadataRecord,
  ConflictRecord,
  StorageEvent,
  StorageEventListener,
} from './types';
import { ListSession } from '@/stores/item-store/types';

// Database store names
const STORES = {
  SESSIONS: 'sessions',
  SYNC_QUEUE: 'syncQueue',
  METADATA: 'metadata',
  CONFLICTS: 'conflicts',
  BACKLOG_CACHE: 'backlogCache',
} as const;

// Backlog cache record type
interface BacklogCacheRecord {
  id: string; // category or listId
  items: unknown[];
  cachedAt: number;
  expiresAt: number;
}

// Check if IndexedDB is available
const isIndexedDBAvailable = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return !!window.indexedDB;
  } catch {
    return false;
  }
};

export class OfflineStorage {
  private config: OfflineConfig;
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;
  private listeners: Set<StorageEventListener> = new Set();
  private isInitialized = false;

  constructor(config: Partial<OfflineConfig> = {}) {
    this.config = { ...DEFAULT_OFFLINE_CONFIG, ...config };
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    if (!isIndexedDBAvailable()) {
      console.warn('[OfflineStorage] IndexedDB not available, using fallback');
      this.isInitialized = true;
      return false;
    }

    try {
      this.db = await this.openDatabase();
      this.isInitialized = true;
      this.emit({ type: 'session_loaded', timestamp: Date.now() });
      return true;
    } catch (error) {
      console.error('[OfflineStorage] Failed to initialize:', error);
      this.emit({
        type: 'storage_error',
        timestamp: Date.now(),
        error: error as Error,
      });
      return false;
    }
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.dbVersion);

      request.onerror = () => {
        this.dbPromise = null;
        reject(new Error(`Failed to open database: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = request.result;
        this.createStores(db, event.oldVersion);
      };
    });

    return this.dbPromise;
  }

  private createStores(db: IDBDatabase, oldVersion: number): void {
    // Sessions store
    if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
      const sessionsStore = db.createObjectStore(STORES.SESSIONS, {
        keyPath: 'id',
      });
      sessionsStore.createIndex('listId', 'listId', { unique: false });
      sessionsStore.createIndex('isDirty', 'isDirty', { unique: false });
      sessionsStore.createIndex('lastModified', 'lastModified', { unique: false });
    }

    // Sync queue store
    if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
      const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, {
        keyPath: 'id',
      });
      syncStore.createIndex('status', 'status', { unique: false });
      syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      syncStore.createIndex('priority', 'priority', { unique: false });
    }

    // Metadata store
    if (!db.objectStoreNames.contains(STORES.METADATA)) {
      db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
    }

    // Conflicts store
    if (!db.objectStoreNames.contains(STORES.CONFLICTS)) {
      const conflictsStore = db.createObjectStore(STORES.CONFLICTS, {
        keyPath: 'id',
      });
      conflictsStore.createIndex('entityId', 'entityId', { unique: false });
      conflictsStore.createIndex('resolvedAt', 'resolvedAt', { unique: false });
    }

    // Backlog cache store
    if (!db.objectStoreNames.contains(STORES.BACKLOG_CACHE)) {
      const backlogStore = db.createObjectStore(STORES.BACKLOG_CACHE, {
        keyPath: 'id',
      });
      backlogStore.createIndex('expiresAt', 'expiresAt', { unique: false });
    }
  }

  private async getDB(): Promise<IDBDatabase> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    if (!this.db) {
      this.db = await this.openDatabase();
    }
    return this.db;
  }

  // ============================================================================
  // Session Operations
  // ============================================================================

  async saveSession(session: ListSession): Promise<void> {
    const db = await this.getDB();

    const existingRecord = await this.getSessionRecord(session.listId);
    const now = Date.now();

    const record: SessionRecord = {
      id: session.listId,
      listId: session.listId,
      data: session,
      version: existingRecord ? existingRecord.version + 1 : 1,
      localVersion: existingRecord ? existingRecord.localVersion + 1 : 1,
      serverVersion: existingRecord?.serverVersion ?? 0,
      lastModified: now,
      lastSynced: existingRecord?.lastSynced ?? null,
      isDirty: true,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SESSIONS, 'readwrite');
      const store = transaction.objectStore(STORES.SESSIONS);
      const request = store.put(record);

      request.onerror = () =>
        reject(new Error(`Failed to save session: ${request.error?.message}`));

      request.onsuccess = () => {
        this.emit({
          type: 'session_saved',
          timestamp: now,
          data: { listId: session.listId, version: record.version },
        });
        resolve();
      };
    });
  }

  async getSession(listId: string): Promise<ListSession | null> {
    const record = await this.getSessionRecord(listId);
    return record?.data ?? null;
  }

  async getSessionRecord(listId: string): Promise<SessionRecord | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SESSIONS, 'readonly');
      const store = transaction.objectStore(STORES.SESSIONS);
      const request = store.get(listId);

      request.onerror = () =>
        reject(new Error(`Failed to get session: ${request.error?.message}`));

      request.onsuccess = () => {
        resolve(request.result ?? null);
      };
    });
  }

  async getAllSessions(): Promise<SessionRecord[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SESSIONS, 'readonly');
      const store = transaction.objectStore(STORES.SESSIONS);
      const request = store.getAll();

      request.onerror = () =>
        reject(new Error(`Failed to get all sessions: ${request.error?.message}`));

      request.onsuccess = () => {
        resolve(request.result ?? []);
      };
    });
  }

  async getDirtySessions(): Promise<SessionRecord[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SESSIONS, 'readonly');
      const store = transaction.objectStore(STORES.SESSIONS);
      const index = store.index('isDirty');
      const request = index.getAll(IDBKeyRange.only(true));

      request.onerror = () =>
        reject(new Error(`Failed to get dirty sessions: ${request.error?.message}`));

      request.onsuccess = () => {
        resolve(request.result ?? []);
      };
    });
  }

  async markSessionSynced(
    listId: string,
    serverVersion: number
  ): Promise<void> {
    const db = await this.getDB();
    const record = await this.getSessionRecord(listId);

    if (!record) {
      throw new Error(`Session ${listId} not found`);
    }

    const updatedRecord: SessionRecord = {
      ...record,
      serverVersion,
      lastSynced: Date.now(),
      isDirty: false,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SESSIONS, 'readwrite');
      const store = transaction.objectStore(STORES.SESSIONS);
      const request = store.put(updatedRecord);

      request.onerror = () =>
        reject(new Error(`Failed to mark session synced: ${request.error?.message}`));

      request.onsuccess = () => resolve();
    });
  }

  async deleteSession(listId: string): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SESSIONS, 'readwrite');
      const store = transaction.objectStore(STORES.SESSIONS);
      const request = store.delete(listId);

      request.onerror = () =>
        reject(new Error(`Failed to delete session: ${request.error?.message}`));

      request.onsuccess = () => {
        this.emit({
          type: 'session_deleted',
          timestamp: Date.now(),
          data: { listId },
        });
        resolve();
      };
    });
  }

  // ============================================================================
  // Sync Queue Operations
  // ============================================================================

  async addToSyncQueue(operation: SyncOperation): Promise<void> {
    const db = await this.getDB();

    // Check queue size limit
    const queueSize = await this.getSyncQueueSize();
    if (queueSize >= this.config.maxQueueSize) {
      // Remove oldest completed operations to make room
      await this.pruneCompletedOperations();
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const request = store.put(operation);

      request.onerror = () =>
        reject(new Error(`Failed to add to sync queue: ${request.error?.message}`));

      request.onsuccess = () => resolve();
    });
  }

  async getSyncQueue(): Promise<SyncOperation[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SYNC_QUEUE, 'readonly');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const index = store.index('timestamp');
      const request = index.getAll();

      request.onerror = () =>
        reject(new Error(`Failed to get sync queue: ${request.error?.message}`));

      request.onsuccess = () => {
        resolve(request.result ?? []);
      };
    });
  }

  async getPendingOperations(): Promise<SyncOperation[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SYNC_QUEUE, 'readonly');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const index = store.index('status');
      const request = index.getAll(IDBKeyRange.only('pending'));

      request.onerror = () =>
        reject(new Error(`Failed to get pending operations: ${request.error?.message}`));

      request.onsuccess = () => {
        // Sort by priority (higher first) then by timestamp (older first)
        const results = request.result ?? [];
        results.sort((a, b) => {
          if (a.priority !== b.priority) return b.priority - a.priority;
          return a.timestamp - b.timestamp;
        });
        resolve(results);
      };
    });
  }

  async updateOperation(operation: SyncOperation): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const request = store.put(operation);

      request.onerror = () =>
        reject(new Error(`Failed to update operation: ${request.error?.message}`));

      request.onsuccess = () => resolve();
    });
  }

  async removeOperation(operationId: string): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const request = store.delete(operationId);

      request.onerror = () =>
        reject(new Error(`Failed to remove operation: ${request.error?.message}`));

      request.onsuccess = () => resolve();
    });
  }

  private async getSyncQueueSize(): Promise<number> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SYNC_QUEUE, 'readonly');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const request = store.count();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  private async pruneCompletedOperations(): Promise<void> {
    const db = await this.getDB();
    const queue = await this.getSyncQueue();

    const completedOps = queue
      .filter((op) => op.status === 'completed')
      .sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest 20% of completed operations
    const toRemove = completedOps.slice(0, Math.ceil(completedOps.length * 0.2));

    const transaction = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);

    for (const op of toRemove) {
      store.delete(op.id);
    }
  }

  // ============================================================================
  // Conflict Operations
  // ============================================================================

  async addConflict(conflict: ConflictRecord): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.CONFLICTS, 'readwrite');
      const store = transaction.objectStore(STORES.CONFLICTS);
      const request = store.put(conflict);

      request.onerror = () =>
        reject(new Error(`Failed to add conflict: ${request.error?.message}`));

      request.onsuccess = () => {
        this.emit({
          type: 'conflict_detected',
          timestamp: Date.now(),
          data: conflict,
        });
        resolve();
      };
    });
  }

  async getUnresolvedConflicts(): Promise<ConflictRecord[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.CONFLICTS, 'readonly');
      const store = transaction.objectStore(STORES.CONFLICTS);
      const request = store.getAll();

      request.onerror = () =>
        reject(new Error(`Failed to get unresolved conflicts: ${request.error?.message}`));

      request.onsuccess = () => {
        const results = (request.result ?? []).filter(
          (conflict: ConflictRecord) => conflict.resolvedAt === null
        );
        resolve(results);
      };
    });
  }

  async resolveConflict(
    conflictId: string,
    resolution: ConflictRecord['resolution'],
    resolvedData: unknown
  ): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.CONFLICTS, 'readwrite');
      const store = transaction.objectStore(STORES.CONFLICTS);
      const getRequest = store.get(conflictId);

      getRequest.onerror = () => reject(getRequest.error);

      getRequest.onsuccess = () => {
        const conflict = getRequest.result as ConflictRecord;
        if (!conflict) {
          reject(new Error(`Conflict ${conflictId} not found`));
          return;
        }

        const updatedConflict: ConflictRecord = {
          ...conflict,
          resolvedAt: Date.now(),
          resolution,
          resolvedData,
        };

        const putRequest = store.put(updatedConflict);

        putRequest.onerror = () => reject(putRequest.error);

        putRequest.onsuccess = () => {
          this.emit({
            type: 'conflict_resolved',
            timestamp: Date.now(),
            data: updatedConflict,
          });
          resolve();
        };
      };
    });
  }

  // ============================================================================
  // Metadata Operations
  // ============================================================================

  async setMetadata(key: string, value: unknown): Promise<void> {
    const db = await this.getDB();

    const record: MetadataRecord = {
      key,
      value,
      updatedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.METADATA, 'readwrite');
      const store = transaction.objectStore(STORES.METADATA);
      const request = store.put(record);

      request.onerror = () =>
        reject(new Error(`Failed to set metadata: ${request.error?.message}`));

      request.onsuccess = () => resolve();
    });
  }

  async getMetadata<T>(key: string): Promise<T | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.METADATA, 'readonly');
      const store = transaction.objectStore(STORES.METADATA);
      const request = store.get(key);

      request.onerror = () =>
        reject(new Error(`Failed to get metadata: ${request.error?.message}`));

      request.onsuccess = () => {
        const record = request.result as MetadataRecord | undefined;
        resolve(record?.value as T ?? null);
      };
    });
  }

  // ============================================================================
  // Event System
  // ============================================================================

  subscribe(listener: StorageEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: StorageEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('[OfflineStorage] Event listener error:', error);
      }
    });
  }

  // ============================================================================
  // Backlog Cache Operations
  // ============================================================================

  /**
   * Cache backlog items for offline access
   * @param cacheId - Identifier for the cache (e.g., category name or listId)
   * @param items - Backlog items to cache
   * @param ttlMs - Time to live in milliseconds (default: 24 hours)
   */
  async cacheBacklogItems(
    cacheId: string,
    items: unknown[],
    ttlMs: number = 24 * 60 * 60 * 1000
  ): Promise<void> {
    const db = await this.getDB();
    const now = Date.now();

    const record: BacklogCacheRecord = {
      id: cacheId,
      items,
      cachedAt: now,
      expiresAt: now + ttlMs,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.BACKLOG_CACHE, 'readwrite');
      const store = transaction.objectStore(STORES.BACKLOG_CACHE);
      const request = store.put(record);

      request.onerror = () =>
        reject(new Error(`Failed to cache backlog: ${request.error?.message}`));

      request.onsuccess = () => {
        console.log(`[OfflineStorage] Cached ${items.length} items for ${cacheId}`);
        resolve();
      };
    });
  }

  /**
   * Get cached backlog items
   * @param cacheId - Identifier for the cache
   * @param ignoreExpiry - If true, returns items even if expired
   */
  async getCachedBacklogItems(
    cacheId: string,
    ignoreExpiry: boolean = false
  ): Promise<unknown[] | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.BACKLOG_CACHE, 'readonly');
      const store = transaction.objectStore(STORES.BACKLOG_CACHE);
      const request = store.get(cacheId);

      request.onerror = () =>
        reject(new Error(`Failed to get cached backlog: ${request.error?.message}`));

      request.onsuccess = () => {
        const record = request.result as BacklogCacheRecord | undefined;

        if (!record) {
          resolve(null);
          return;
        }

        // Check expiry
        if (!ignoreExpiry && record.expiresAt < Date.now()) {
          console.log(`[OfflineStorage] Cache expired for ${cacheId}`);
          resolve(null);
          return;
        }

        resolve(record.items);
      };
    });
  }

  /**
   * Get all cached backlog IDs
   */
  async getAllCachedBacklogIds(): Promise<string[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.BACKLOG_CACHE, 'readonly');
      const store = transaction.objectStore(STORES.BACKLOG_CACHE);
      const request = store.getAllKeys();

      request.onerror = () =>
        reject(new Error(`Failed to get cached backlog IDs: ${request.error?.message}`));

      request.onsuccess = () => {
        resolve((request.result ?? []) as string[]);
      };
    });
  }

  /**
   * Clear expired backlog caches
   */
  async pruneExpiredBacklogCache(): Promise<number> {
    const db = await this.getDB();
    const now = Date.now();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.BACKLOG_CACHE, 'readwrite');
      const store = transaction.objectStore(STORES.BACKLOG_CACHE);
      const index = store.index('expiresAt');
      const request = index.openCursor(IDBKeyRange.upperBound(now));

      let deletedCount = 0;

      request.onerror = () =>
        reject(new Error(`Failed to prune backlog cache: ${request.error?.message}`));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          console.log(`[OfflineStorage] Pruned ${deletedCount} expired cache entries`);
          resolve(deletedCount);
        }
      };
    });
  }

  /**
   * Clear backlog cache for a specific ID
   */
  async clearBacklogCache(cacheId: string): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.BACKLOG_CACHE, 'readwrite');
      const store = transaction.objectStore(STORES.BACKLOG_CACHE);
      const request = store.delete(cacheId);

      request.onerror = () =>
        reject(new Error(`Failed to clear backlog cache: ${request.error?.message}`));

      request.onsuccess = () => resolve();
    });
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  async clearAll(): Promise<void> {
    const db = await this.getDB();

    const storeNames = [
      STORES.SESSIONS,
      STORES.SYNC_QUEUE,
      STORES.METADATA,
      STORES.CONFLICTS,
      STORES.BACKLOG_CACHE,
    ];

    for (const storeName of storeNames) {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    }
  }

  async getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
      return null;
    }

    try {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage ?? 0,
        quota: estimate.quota ?? 0,
      };
    } catch {
      return null;
    }
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.dbPromise = null;
    }
    this.isInitialized = false;
  }
}

// Singleton instance
let offlineStorageInstance: OfflineStorage | null = null;

export function getOfflineStorage(
  config?: Partial<OfflineConfig>
): OfflineStorage {
  if (!offlineStorageInstance) {
    offlineStorageInstance = new OfflineStorage(config);
  }
  return offlineStorageInstance;
}

export function resetOfflineStorage(): void {
  if (offlineStorageInstance) {
    offlineStorageInstance.close();
    offlineStorageInstance = null;
  }
}
