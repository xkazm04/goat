import { isConsistent } from './reducer';

import type { History } from './history';
import type { EditorStore } from './store';
import type { ListItem } from './types';

/**
 * Local persistence for an open list. The whole history is saved, not just
 * the document, so a reload keeps undo (M1 exit: rank, reload, undo).
 */
export interface Saved {
  version: 1;
  history: History;
  items: ListItem[];
  savedAt: string;
}

export interface ListStorage {
  load(listId: string): Promise<Saved | null>;
  save(listId: string, value: Saved): Promise<void>;
}

/** Reject anything that is not a consistent saved list: old shapes, hand edits, corruption. */
export function readSaved(value: unknown): Saved | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Partial<Saved>;
  const h = v.history;
  if (v.version !== 1 || !h || !Array.isArray(v.items)) return null;
  if (!Array.isArray(h.past) || !Array.isArray(h.future) || !h.present) return null;
  const docs = [...h.past, h.present, ...h.future];
  return docs.every((d) => d && Array.isArray(d.order) && Array.isArray(d.pool) && isConsistent(d)) ? (v as Saved) : null;
}

export function memoryStorage(): ListStorage {
  const data = new Map<string, string>();
  return {
    async load(id) {
      const raw = data.get(id);
      return raw ? readSaved(JSON.parse(raw)) : null;
    },
    async save(id, value) {
      data.set(id, JSON.stringify(value));
    },
  };
}

const DB_NAME = 'goat-v2';
const STORE = 'lists';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** IndexedDB in the browser. Any failure (private mode, quota) degrades to "not saved", never a crash. */
export function indexedDbStorage(): ListStorage {
  let db: Promise<IDBDatabase> | null = null;
  const getDb = () => (db ??= openDb());

  return {
    async load(id) {
      try {
        const conn = await getDb();
        const value = await new Promise<unknown>((resolve, reject) => {
          const req = conn.transaction(STORE, 'readonly').objectStore(STORE).get(id);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        return readSaved(value);
      } catch {
        return null;
      }
    },
    async save(id, value) {
      try {
        const conn = await getDb();
        await new Promise<void>((resolve, reject) => {
          const tx = conn.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).put(value, id);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch {
        // Unsaved locally; the in-memory state is still correct.
      }
    },
  };
}

/**
 * Save the store whenever its history changes, debounced. Returns a stop
 * function that flushes a pending save first.
 */
export function autosave(store: EditorStore, storage: ListStorage, delayMs = 400): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const write = () => {
    timer = null;
    const { history, items } = store.getState();
    void storage.save(history.present.id, {
      version: 1,
      history,
      items: Object.values(items),
      savedAt: new Date().toISOString(),
    });
  };

  const unsubscribe = store.subscribe((state, prev) => {
    if (state.history === prev.history) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(write, delayMs);
  });

  return () => {
    unsubscribe();
    if (timer) {
      clearTimeout(timer);
      write();
    }
  };
}
