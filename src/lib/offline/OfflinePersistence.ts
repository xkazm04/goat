/**
 * OfflinePersistence - Simplified offline session persistence
 *
 * Replaces the over-engineered SyncEngine + SyncQueue + ConflictResolver +
 * NetworkMonitor + QuotaManager (~2000 LOC) with a single module (~200 LOC)
 * that matches the app's actual offline capability:
 *   1. Save session snapshots to IndexedDB on change
 *   2. Enqueue sync operations for replay when online
 *   3. Process the queue via /api/sync
 *
 * DATABASE: goat-offline-db (IndexedDB)
 * This is SECONDARY storage. PRIMARY UI hydration uses Zustand persist (localStorage).
 */

import { sessionLogger } from '@/lib/logger';
import { ListSession } from '@/stores/item-store/types';

const DB_NAME = 'goat-offline-db';
const DB_VERSION = 1;

const STORES = {
  SESSIONS: 'sessions',
  SYNC_QUEUE: 'syncQueue',
} as const;

// ============================================================================
// Types
// ============================================================================

export interface SessionRecord {
  id: string;
  listId: string;
  data: ListSession;
  lastModified: number;
  isDirty: boolean;
}

export interface SyncOperation {
  id: string;
  type: string;
  entityId: string;
  entityType: string;
  payload: unknown;
  timestamp: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  priority: number;
}

type QueueChangeListener = (pendingCount: number) => void;

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function isIndexedDBAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return !!window.indexedDB;
  } catch {
    return false;
  }
}

// ============================================================================
// OfflinePersistence
// ============================================================================

class OfflinePersistence {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isInitialized = false;
  private isProcessing = false;
  private queueListeners = new Set<QueueChangeListener>();

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    if (!isIndexedDBAvailable()) {
      this.isInitialized = true;
      return false;
    }

    try {
      this.db = await this.openDatabase();
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('[OfflinePersistence] Failed to initialize:', error);
      return false;
    }
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        this.dbPromise = null;
        reject(new Error(`Failed to open database: ${request.error?.message}`));
      };

      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
          const store = db.createObjectStore(STORES.SESSIONS, { keyPath: 'id' });
          store.createIndex('isDirty', 'isDirty', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const store = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });

    return this.dbPromise;
  }

  private async getDB(): Promise<IDBDatabase> {
    if (!this.isInitialized) await this.initialize();
    if (!this.db) this.db = await this.openDatabase();
    return this.db;
  }

  // ==========================================================================
  // Session Operations
  // ==========================================================================

  async saveSession(session: ListSession): Promise<void> {
    const db = await this.getDB();
    const record: SessionRecord = {
      id: session.listId,
      listId: session.listId,
      data: session,
      lastModified: Date.now(),
      isDirty: true,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SESSIONS, 'readwrite');
      const request = tx.objectStore(STORES.SESSIONS).put(record);
      request.onerror = () => reject(new Error(`Failed to save session: ${request.error?.message}`));
      request.onsuccess = () => resolve();
    });
  }

  async getSession(listId: string): Promise<ListSession | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SESSIONS, 'readonly');
      const request = tx.objectStore(STORES.SESSIONS).get(listId);
      request.onerror = () => reject(new Error(`Failed to get session: ${request.error?.message}`));
      request.onsuccess = () => {
        const record = request.result as SessionRecord | undefined;
        resolve(record?.data ?? null);
      };
    });
  }

  async deleteSession(listId: string): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SESSIONS, 'readwrite');
      const request = tx.objectStore(STORES.SESSIONS).delete(listId);
      request.onerror = () => reject(new Error(`Failed to delete session: ${request.error?.message}`));
      request.onsuccess = () => resolve();
    });
  }

  async getDirtySessions(): Promise<SessionRecord[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SESSIONS, 'readonly');
      const index = tx.objectStore(STORES.SESSIONS).index('isDirty');
      const request = index.getAll(IDBKeyRange.only(true));
      request.onerror = () => reject(new Error(`Failed to get dirty sessions: ${request.error?.message}`));
      request.onsuccess = () => resolve(request.result ?? []);
    });
  }

  // ==========================================================================
  // Sync Queue Operations
  // ==========================================================================

  async enqueue(
    type: string,
    entityId: string,
    entityType: string,
    payload: unknown,
    priority: number = 1
  ): Promise<SyncOperation> {
    const db = await this.getDB();

    const operation: SyncOperation = {
      id: generateId(),
      type,
      entityId,
      entityType,
      payload,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
      maxRetries: 5,
      priority,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const request = tx.objectStore(STORES.SYNC_QUEUE).put(operation);
      request.onerror = () => reject(new Error(`Failed to enqueue: ${request.error?.message}`));
      request.onsuccess = () => {
        this.notifyQueueChange();
        resolve(operation);
      };
    });
  }

  async enqueueSessionUpdate(sessionId: string, sessionData: unknown): Promise<SyncOperation> {
    const db = await this.getDB();

    // Coalesce: replace existing pending update for same session
    const pending = await this.getPendingOperations();
    const existing = pending.find(
      op => op.entityId === sessionId && op.type === 'UPDATE_SESSION' && op.status === 'pending'
    );

    if (existing) {
      const updated = { ...existing, payload: sessionData, timestamp: Date.now() };
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
        const request = tx.objectStore(STORES.SYNC_QUEUE).put(updated);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          this.notifyQueueChange();
          resolve(updated);
        };
      });
    }

    return this.enqueue('UPDATE_SESSION', sessionId, 'session', sessionData, 2);
  }

  async getPendingOperations(): Promise<SyncOperation[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
      const index = tx.objectStore(STORES.SYNC_QUEUE).index('status');
      const request = index.getAll(IDBKeyRange.only('pending'));
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const results = request.result ?? [];
        results.sort((a: SyncOperation, b: SyncOperation) => {
          if (a.priority !== b.priority) return b.priority - a.priority;
          return a.timestamp - b.timestamp;
        });
        resolve(results);
      };
    });
  }

  async getPendingCount(): Promise<number> {
    const ops = await this.getPendingOperations();
    return ops.length;
  }

  async getAllOperations(): Promise<SyncOperation[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
      const request = tx.objectStore(STORES.SYNC_QUEUE).getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? []);
    });
  }

  private async updateOperation(op: SyncOperation): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const request = tx.objectStore(STORES.SYNC_QUEUE).put(op);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async removeOperation(id: string): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const request = tx.objectStore(STORES.SYNC_QUEUE).delete(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // ==========================================================================
  // Sync Processing
  // ==========================================================================

  async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    this.isProcessing = true;

    try {
      const pendingOps = await this.getPendingOperations();
      if (pendingOps.length === 0) return;

      // Mark as in_progress
      for (const op of pendingOps) {
        await this.updateOperation({ ...op, status: 'in_progress' });
      }

      // Batch send to /api/sync
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operations: pendingOps }),
      });

      if (!response.ok) {
        // Mark all back to pending for retry
        for (const op of pendingOps) {
          await this.updateOperation({
            ...op,
            status: 'pending',
            retryCount: op.retryCount + 1,
            lastError: `HTTP ${response.status}`,
          });
        }
        this.notifyQueueChange();
        return;
      }

      const data = await response.json();
      const results: Array<{ operationId?: string; success: boolean; error?: string }> = data.results ?? [];

      // Map results by operationId
      const resultMap = new Map<string, typeof results[number]>();
      for (const r of results) {
        if (r.operationId) resultMap.set(r.operationId, r);
      }

      for (let i = 0; i < pendingOps.length; i++) {
        const op = pendingOps[i];
        const result = resultMap.get(op.id) ?? results[i];

        if (result?.success) {
          await this.removeOperation(op.id);
        } else {
          const newRetryCount = op.retryCount + 1;
          await this.updateOperation({
            ...op,
            status: newRetryCount >= op.maxRetries ? 'failed' : 'pending',
            retryCount: newRetryCount,
            lastError: result?.error ?? 'Unknown error',
          });
        }
      }

      this.notifyQueueChange();
    } catch (error) {
      sessionLogger.debug('Queue processing failed', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async retryFailed(): Promise<void> {
    const allOps = await this.getAllOperations();
    const failed = allOps.filter(op => op.status === 'failed');

    for (const op of failed) {
      await this.updateOperation({ ...op, status: 'pending', retryCount: 0, lastError: undefined });
    }

    this.notifyQueueChange();
    this.processQueue();
  }

  async clearAll(): Promise<void> {
    const allOps = await this.getAllOperations();
    for (const op of allOps) {
      await this.removeOperation(op.id);
    }
    this.notifyQueueChange();
  }

  // ==========================================================================
  // Queue Change Notifications
  // ==========================================================================

  onQueueChange(listener: QueueChangeListener): () => void {
    this.queueListeners.add(listener);
    return () => this.queueListeners.delete(listener);
  }

  private async notifyQueueChange(): Promise<void> {
    if (this.queueListeners.size === 0) return;
    const count = await this.getPendingCount();
    this.queueListeners.forEach(l => {
      try { l(count); } catch { /* swallow */ }
    });
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.dbPromise = null;
    }
    this.queueListeners.clear();
    this.isInitialized = false;
  }
}

// Singleton
let instance: OfflinePersistence | null = null;

export function getOfflinePersistence(): OfflinePersistence {
  if (!instance) {
    instance = new OfflinePersistence();
  }
  return instance;
}

export function resetOfflinePersistence(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
}
