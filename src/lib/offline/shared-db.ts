/**
 * Shared IndexedDB connection and event system for goat-offline-db.
 *
 * Provides a single database connection shared across all offline storage
 * modules (sessions, sync queue, conflicts, backlog cache), along with
 * store creation logic and an event emitter.
 *
 * ARCHITECTURE NOTE:
 * This module manages the `goat-offline-db` database ONLY.
 * The `goat-app-storage` database is managed by `src/lib/storage/indexed-db-storage.ts`
 * and is used exclusively by Zustand persist middleware (backlog-store).
 *
 * See `src/lib/storage/storage-registry.ts` for the full storage architecture
 * decision record, entity ownership map, and reconciliation utilities.
 */

import {
  OfflineConfig,
  DEFAULT_OFFLINE_CONFIG,
  StorageEvent,
  StorageEventListener,
} from './types';

// Database store names
export const STORES = {
  SESSIONS: 'sessions',
  SYNC_QUEUE: 'syncQueue',
  METADATA: 'metadata',
  CONFLICTS: 'conflicts',
  BACKLOG_CACHE: 'backlogCache',
} as const;

// Check if IndexedDB is available
const isIndexedDBAvailable = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return !!window.indexedDB;
  } catch {
    return false;
  }
};

export class SharedDB {
  private config: OfflineConfig;
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;
  private listeners: Set<StorageEventListener> = new Set();
  private _isInitialized = false;

  constructor(config: Partial<OfflineConfig> = {}) {
    this.config = { ...DEFAULT_OFFLINE_CONFIG, ...config };
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  async initialize(): Promise<boolean> {
    if (this._isInitialized) return true;

    if (!isIndexedDBAvailable()) {
      console.warn('[OfflineStorage] IndexedDB not available, using fallback');
      this._isInitialized = true;
      return false;
    }

    try {
      this.db = await this.openDatabase();
      this._isInitialized = true;
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

  private createStores(db: IDBDatabase, _oldVersion: number): void {
    if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
      const sessionsStore = db.createObjectStore(STORES.SESSIONS, {
        keyPath: 'id',
      });
      sessionsStore.createIndex('listId', 'listId', { unique: false });
      sessionsStore.createIndex('isDirty', 'isDirty', { unique: false });
      sessionsStore.createIndex('lastModified', 'lastModified', { unique: false });
    }

    if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
      const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, {
        keyPath: 'id',
      });
      syncStore.createIndex('status', 'status', { unique: false });
      syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      syncStore.createIndex('priority', 'priority', { unique: false });
    }

    if (!db.objectStoreNames.contains(STORES.METADATA)) {
      db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
    }

    if (!db.objectStoreNames.contains(STORES.CONFLICTS)) {
      const conflictsStore = db.createObjectStore(STORES.CONFLICTS, {
        keyPath: 'id',
      });
      conflictsStore.createIndex('entityId', 'entityId', { unique: false });
      conflictsStore.createIndex('resolvedAt', 'resolvedAt', { unique: false });
    }

    if (!db.objectStoreNames.contains(STORES.BACKLOG_CACHE)) {
      const backlogStore = db.createObjectStore(STORES.BACKLOG_CACHE, {
        keyPath: 'id',
      });
      backlogStore.createIndex('expiresAt', 'expiresAt', { unique: false });
    }
  }

  async getDB(): Promise<IDBDatabase> {
    if (!this._isInitialized) {
      await this.initialize();
    }
    if (!this.db) {
      this.db = await this.openDatabase();
    }
    return this.db;
  }

  // Event system
  subscribe(listener: StorageEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: StorageEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('[OfflineStorage] Event listener error:', error);
      }
    });
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

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.dbPromise = null;
    }
    this._isInitialized = false;
  }
}
