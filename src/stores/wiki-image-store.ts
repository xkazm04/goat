/**
 * Wiki Image Store
 *
 * Manages auto-fetched Wikipedia images with localStorage caching.
 * Automatically fetches missing item images and persists URLs.
 * Uses LRU eviction to bound cache size and prevent localStorage bloat.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { fetchItemImage } from "@/lib/api/wiki-images";
import { wikiImageLogger } from "@/lib/logger";

/** How long failed lookups are cached before retrying (24 hours) */
const FAILURE_TTL_MS = 24 * 60 * 60 * 1000;

/** Maximum number of cached image entries before LRU eviction kicks in */
const MAX_CACHE_SIZE = 500;

/** Maximum number of cached failure entries */
const MAX_FAILURES_SIZE = 200;

/** Log cache size every N writes in dev mode */
const DEV_LOG_INTERVAL = 100;

/** Write counter for dev-mode logging */
let writeCount = 0;

/**
 * Move a key to the end of the access order array (most recently used).
 * Returns a new array if the key was moved, or the same array with key appended.
 */
function touchLRU(accessOrder: string[], key: string): string[] {
  const idx = accessOrder.indexOf(key);
  if (idx === accessOrder.length - 1) return accessOrder; // already MRU
  const next = idx >= 0
    ? [...accessOrder.slice(0, idx), ...accessOrder.slice(idx + 1), key]
    : [...accessOrder, key];
  return next;
}

/**
 * Evict least-recently-used entries from the images map until it fits maxSize.
 * Returns updated images map and access order.
 */
function evictLRU(
  images: Map<string, string>,
  accessOrder: string[],
  maxSize: number
): { images: Map<string, string>; accessOrder: string[] } {
  if (images.size <= maxSize) return { images, accessOrder };

  const newImages = new Map(images);
  const newOrder = [...accessOrder];
  while (newImages.size > maxSize && newOrder.length > 0) {
    const evicted = newOrder.shift()!;
    newImages.delete(evicted);
  }
  return { images: newImages, accessOrder: newOrder };
}

/**
 * Evict oldest failure entries when over the limit.
 */
function evictFailures(
  failures: Map<string, number>,
  maxSize: number
): Map<string, number> {
  if (failures.size <= maxSize) return failures;

  // Sort by timestamp ascending (oldest first), evict oldest
  const entries = Array.from(failures.entries()).sort((a, b) => a[1] - b[1]);
  const newFailures = new Map<string, number>();
  const keep = entries.slice(entries.length - maxSize);
  for (const [k, v] of keep) {
    newFailures.set(k, v);
  }
  return newFailures;
}

function logCacheSizeIfNeeded(images: Map<string, string>) {
  if (process.env.NODE_ENV !== "development") return;
  writeCount++;
  if (writeCount % DEV_LOG_INTERVAL === 0) {
    console.info(
      `[wiki-image-store] Cache size: ${images.size}/${MAX_CACHE_SIZE} images (write #${writeCount})`
    );
  }
}

export interface WikiImageCache {
  /** Item title -> Image URL mapping */
  images: Map<string, string>;
  /** Failed fetches with timestamp (title -> epoch ms) */
  failures: Map<string, number>;
  /** Currently fetching items */
  fetching: Set<string>;
  /** LRU access order (oldest first, newest last) */
  accessOrder: string[];
}

export interface WikiImageStore extends WikiImageCache {
  /** Get cached image URL for an item */
  getImage: (itemTitle: string) => string | null;

  /** Check if image is currently being fetched */
  isFetching: (itemTitle: string) => boolean;

  /** Check if fetch previously failed */
  hasFailed: (itemTitle: string) => boolean;

  /** Fetch image for an item (auto-caches result) */
  fetchImage: (itemTitle: string) => Promise<string | null>;

  /** Manually set an image URL */
  setImage: (itemTitle: string, url: string) => void;

  /** Clear cache for specific item */
  clearImage: (itemTitle: string) => void;

  /** Clear all cached images */
  clearAll: () => void;
}

/**
 * Create Wiki Image Store with localStorage persistence and LRU eviction
 */
export const useWikiImageStore = create<WikiImageStore>()(
  persist(
    (set, get) => ({
      images: new Map(),
      failures: new Map(),
      fetching: new Set(),
      accessOrder: [],

      getImage: (itemTitle: string) => {
        const state = get();
        const url = state.images.get(itemTitle);
        if (url) {
          // Touch LRU on read
          set({ accessOrder: touchLRU(state.accessOrder, itemTitle) });
          return url;
        }
        return null;
      },

      isFetching: (itemTitle: string) => {
        return get().fetching.has(itemTitle);
      },

      // A READ. useProgressiveWikiImage calls this during render, so it must not
      // write: until 2026-09-05 an expired entry was deleted from here via set(),
      // which is a store update inside a React render for every card whose
      // lookup failed more than FAILURE_TTL_MS ago. The expired entry is pruned
      // by the write path (fetchImage / setImage) instead.
      hasFailed: (itemTitle: string) => {
        const failedAt = get().failures.get(itemTitle);
        if (failedAt === undefined) return false;
        return Date.now() - failedAt <= FAILURE_TTL_MS;
      },

      fetchImage: async (itemTitle: string) => {
        const state = get();

        // Return cached if available (touch LRU)
        if (state.images.has(itemTitle)) {
          set({ accessOrder: touchLRU(state.accessOrder, itemTitle) });
          return state.images.get(itemTitle) || null;
        }

        // Skip if already fetching
        if (state.fetching.has(itemTitle)) {
          return null;
        }

        // Skip if previously failed (and TTL hasn't expired)
        if (get().hasFailed(itemTitle)) {
          return null;
        }

        // Mark as fetching
        set((state) => {
          const newFetching = new Set(state.fetching);
          newFetching.add(itemTitle);
          return { fetching: newFetching };
        });

        try {
          wikiImageLogger.debug("Fetching Wikipedia image for:", itemTitle);
          const imageUrl = await fetchItemImage(itemTitle);

          if (imageUrl) {
            // Cache successful fetch with LRU tracking + eviction
            set((state) => {
              const newImages = new Map(state.images);
              newImages.set(itemTitle, imageUrl);
              const newOrder = touchLRU(state.accessOrder, itemTitle);
              const evicted = evictLRU(newImages, newOrder, MAX_CACHE_SIZE);
              const newFetching = new Set(state.fetching);
              newFetching.delete(itemTitle);
              // A success after an expired failure retires that failure entry.
              const newFailures = new Map(state.failures);
              newFailures.delete(itemTitle);
              logCacheSizeIfNeeded(evicted.images);
              return {
                images: evicted.images,
                accessOrder: evicted.accessOrder,
                fetching: newFetching,
                failures: newFailures,
              };
            });
            wikiImageLogger.debug("Cached Wikipedia image for:", itemTitle);
            return imageUrl;
          } else {
            // Mark as failed with timestamp for TTL-based retry
            set((state) => {
              const newFailures = new Map(state.failures);
              newFailures.set(itemTitle, Date.now());
              const newFetching = new Set(state.fetching);
              newFetching.delete(itemTitle);
              return {
                failures: evictFailures(newFailures, MAX_FAILURES_SIZE),
                fetching: newFetching,
              };
            });
            wikiImageLogger.debug("No Wikipedia image found for:", itemTitle);
            return null;
          }
        } catch (error) {
          wikiImageLogger.error("Error fetching Wikipedia image:", error);
          // Mark as failed + clear from fetching to prevent deadlock
          set((state) => {
            const newFailures = new Map(state.failures);
            newFailures.set(itemTitle, Date.now());
            const newFetching = new Set(state.fetching);
            newFetching.delete(itemTitle);
            return {
              failures: evictFailures(newFailures, MAX_FAILURES_SIZE),
              fetching: newFetching,
            };
          });
          return null;
        }
      },

      setImage: (itemTitle: string, url: string) => {
        set((state) => {
          const newImages = new Map(state.images);
          newImages.set(itemTitle, url);
          const newOrder = touchLRU(state.accessOrder, itemTitle);
          const evicted = evictLRU(newImages, newOrder, MAX_CACHE_SIZE);
          const newFailures = new Map(state.failures);
          newFailures.delete(itemTitle);
          logCacheSizeIfNeeded(evicted.images);
          return {
            images: evicted.images,
            accessOrder: evicted.accessOrder,
            failures: newFailures,
          };
        });
      },

      clearImage: (itemTitle: string) => {
        set((state) => {
          const newImages = new Map(state.images);
          newImages.delete(itemTitle);
          const newFailures = new Map(state.failures);
          newFailures.delete(itemTitle);
          const newOrder = state.accessOrder.filter((k) => k !== itemTitle);
          return { images: newImages, failures: newFailures, accessOrder: newOrder };
        });
      },

      clearAll: () => {
        set({
          images: new Map(),
          failures: new Map(),
          fetching: new Set(),
          accessOrder: [],
        });
      },
    }),
    {
      name: "wiki-image-cache",
      // Custom storage to handle Map/Set serialization
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;

          try {
            const parsed = JSON.parse(str);
            // Migrate legacy failures format (array of strings → object with timestamps)
            const rawFailures = parsed.state.failures;
            let failuresMap: Map<string, number>;
            if (Array.isArray(rawFailures)) {
              // Legacy format: string[] — treat as already expired so they get retried
              failuresMap = new Map(rawFailures.map((key: string) => [key, 0]));
            } else {
              failuresMap = new Map(Object.entries(rawFailures || {}).map(
                ([k, v]) => [k, v as number]
              ));
            }

            const imagesMap = new Map(Object.entries(parsed.state.images || {}));

            // Restore or rebuild accessOrder from persisted data
            let accessOrder: string[] = parsed.state.accessOrder;
            if (!Array.isArray(accessOrder)) {
              // Migration: no accessOrder persisted yet — seed from image keys
              accessOrder = Array.from(imagesMap.keys());
            }

            // Apply size bounds on load in case MAX_CACHE_SIZE was lowered
            const evicted = evictLRU(
              imagesMap as Map<string, string>,
              accessOrder,
              MAX_CACHE_SIZE
            );

            return {
              state: {
                ...parsed.state,
                images: evicted.images,
                failures: evictFailures(failuresMap, MAX_FAILURES_SIZE),
                fetching: new Set(), // Don't persist fetching state
                accessOrder: evicted.accessOrder,
              },
            };
          } catch (error) {
            // Corrupted entry — log diagnostics for recovery analysis
            wikiImageLogger.error(
              `Corrupted localStorage "${name}" (${str.length} chars): ${str.slice(0, 100)}`,
              error
            );
            // Clear the corrupted entry so the store reinitializes cleanly
            localStorage.removeItem(name);
            return null;
          }
        },
        setItem: (name, value) => {
          const toStore = {
            state: {
              images: Object.fromEntries(value.state.images),
              failures: Object.fromEntries(value.state.failures),
              accessOrder: value.state.accessOrder,
              // Don't persist fetching state
            },
          };
          localStorage.setItem(name, JSON.stringify(toStore));
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        },
      },
    }
  )
);

// Safety net: clear the fetching Set on unhandled rejections to prevent deadlocks
// where items get stuck in a permanent "fetching" state
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", () => {
    const state = useWikiImageStore.getState();
    if (state.fetching.size > 0) {
      useWikiImageStore.setState({ fetching: new Set() });
      wikiImageLogger.debug(
        "Cleared fetching set after unhandled rejection to prevent deadlock"
      );
    }
  });
}
