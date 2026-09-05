/**
 * Recent-lists persistence for the command palette.
 *
 * One door for the localStorage read and write. Both are total: a blocked or
 * full storage (Safari private mode, quota, a hostile stored value) reports the
 * failure through `onError` and returns a safe value — it never throws into the
 * click handler that called it, because that handler is also the one that
 * navigates, and a storage failure must not cost the user their navigation.
 */
import { trackError } from '@/lib/errors/error-analytics';

export const RECENT_LISTS_KEY = 'command-palette-recent-lists';
export const MAX_RECENT_LISTS = 5;

export interface RecentListEntry {
  id: string;
  title: string;
  category: string;
  subcategory?: string;
  accessedAt: number;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Accessing `localStorage` itself throws when a browser blocks site data.
    return null;
  }
}

function report(operation: 'readRecentLists' | 'writeRecentLists', error: unknown): void {
  trackError({
    code: 'CLIENT_STORAGE_ERROR',
    category: 'client',
    severity: 'warning',
    traceId: `command-palette-${operation}-${Date.now()}`,
    source: 'CommandPalette',
    context: { operation, message: error instanceof Error ? error.message : String(error) },
  });
}

function isEntry(value: unknown): value is RecentListEntry {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'string' && typeof v.title === 'string' && typeof v.category === 'string';
}

/** Stored entries, newest first, capped and shape-checked. Never throws. */
export function readRecentLists(storage: StorageLike | null = defaultStorage()): RecentListEntry[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(RECENT_LISTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry).slice(0, MAX_RECENT_LISTS);
  } catch (error) {
    report('readRecentLists', error);
    return [];
  }
}

/**
 * Put `entry` at the front, drop its older copy, cap the list, persist.
 * Returns the new in-memory list; `persisted` says whether storage took it.
 */
export function pushRecentList(
  current: RecentListEntry[],
  entry: RecentListEntry,
  storage: StorageLike | null = defaultStorage(),
): { entries: RecentListEntry[]; persisted: boolean } {
  const entries = [entry, ...current.filter((r) => r.id !== entry.id)].slice(0, MAX_RECENT_LISTS);
  if (!storage) return { entries, persisted: false };
  try {
    storage.setItem(RECENT_LISTS_KEY, JSON.stringify(entries));
    return { entries, persisted: true };
  } catch (error) {
    report('writeRecentLists', error);
    return { entries, persisted: false };
  }
}
