/**
 * Safe localStorage utilities that distinguish missing vs corrupted data.
 *
 * When localStorage data fails to parse, it's important to know whether
 * the key was simply absent (first-time use) or the data was corrupted.
 * This module provides helpers that log corruption diagnostics and clear
 * the damaged entry so the store can reinitialize cleanly.
 */

import { createCategoryLogger } from '@/lib/logger';

const storageLogger = createCategoryLogger('session');

export type SafeReadResult<T> =
  | { status: 'missing'; data: null }
  | { status: 'ok'; data: T }
  | { status: 'corrupted'; data: null; rawLength: number; preview: string };

/**
 * Read and parse a localStorage key, distinguishing missing from corrupted.
 *
 * - `missing`: key does not exist in localStorage (null)
 * - `ok`: key exists and parsed successfully
 * - `corrupted`: key exists but JSON.parse failed
 */
export function safeStorageRead<T = unknown>(key: string): SafeReadResult<T> {
  const raw = localStorage.getItem(key);

  if (raw === null) {
    return { status: 'missing', data: null };
  }

  try {
    const parsed = JSON.parse(raw) as T;
    return { status: 'ok', data: parsed };
  } catch {
    const preview = raw.slice(0, 100);
    storageLogger.error(
      `Corrupted localStorage entry "${key}" (${raw.length} chars): ${preview}`
    );

    // Clear the corrupted entry so the store can reinitialize
    localStorage.removeItem(key);

    return { status: 'corrupted', data: null, rawLength: raw.length, preview };
  }
}

/**
 * Create a Zustand-compatible storage adapter with corruption detection.
 *
 * Wraps getItem/setItem/removeItem with safe parsing and corruption logging.
 * On corruption the entry is cleared and null is returned, allowing the store
 * to fall back to its default state.
 */
export function createSafeStorage() {
  return {
    getItem: (name: string): string | null => {
      const result = safeStorageRead<unknown>(name);
      if (result.status === 'ok') {
        // Return the raw string — Zustand's persist middleware does its own parse
        return localStorage.getItem(name);
      }
      // Both 'missing' and 'corrupted' return null (corrupted was already cleared)
      return null;
    },
    setItem: (name: string, value: string): void => {
      localStorage.setItem(name, value);
    },
    removeItem: (name: string): void => {
      localStorage.removeItem(name);
    },
  };
}
