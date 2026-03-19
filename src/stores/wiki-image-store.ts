/**
 * Wiki Image Store
 *
 * Manages auto-fetched Wikipedia images with localStorage caching.
 * Automatically fetches missing item images and persists URLs.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { fetchItemImage } from "@/lib/api/wiki-images";
import { wikiImageLogger } from "@/lib/logger";

/** How long failed lookups are cached before retrying (24 hours) */
const FAILURE_TTL_MS = 24 * 60 * 60 * 1000;

export interface WikiImageCache {
  /** Item title -> Image URL mapping */
  images: Map<string, string>;
  /** Failed fetches with timestamp (title -> epoch ms) */
  failures: Map<string, number>;
  /** Currently fetching items */
  fetching: Set<string>;
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
 * Create Wiki Image Store with localStorage persistence
 */
export const useWikiImageStore = create<WikiImageStore>()(
  persist(
    (set, get) => ({
      images: new Map(),
      failures: new Map(),
      fetching: new Set(),

      getImage: (itemTitle: string) => {
        const state = get();
        return state.images.get(itemTitle) || null;
      },

      isFetching: (itemTitle: string) => {
        return get().fetching.has(itemTitle);
      },

      hasFailed: (itemTitle: string) => {
        const failedAt = get().failures.get(itemTitle);
        if (failedAt === undefined) return false;
        if (Date.now() - failedAt > FAILURE_TTL_MS) {
          // TTL expired — allow retry
          set((state) => {
            const newFailures = new Map(state.failures);
            newFailures.delete(itemTitle);
            return { failures: newFailures };
          });
          return false;
        }
        return true;
      },

      fetchImage: async (itemTitle: string) => {
        const state = get();

        // Return cached if available
        if (state.images.has(itemTitle)) {
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
            // Cache successful fetch
            set((state) => {
              const newImages = new Map(state.images);
              newImages.set(itemTitle, imageUrl);
              const newFetching = new Set(state.fetching);
              newFetching.delete(itemTitle);
              return { images: newImages, fetching: newFetching };
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
              return { failures: newFailures, fetching: newFetching };
            });
            wikiImageLogger.debug("No Wikipedia image found for:", itemTitle);
            return null;
          }
        } catch (error) {
          wikiImageLogger.error("Error fetching Wikipedia image:", error);
          // Mark as failed with timestamp for TTL-based retry
          set((state) => {
            const newFailures = new Map(state.failures);
            newFailures.set(itemTitle, Date.now());
            const newFetching = new Set(state.fetching);
            newFetching.delete(itemTitle);
            return { failures: newFailures, fetching: newFetching };
          });
          return null;
        }
      },

      setImage: (itemTitle: string, url: string) => {
        set((state) => {
          const newImages = new Map(state.images);
          newImages.set(itemTitle, url);
          const newFailures = new Map(state.failures);
          newFailures.delete(itemTitle);
          return { images: newImages, failures: newFailures };
        });
      },

      clearImage: (itemTitle: string) => {
        set((state) => {
          const newImages = new Map(state.images);
          newImages.delete(itemTitle);
          const newFailures = new Map(state.failures);
          newFailures.delete(itemTitle);
          return { images: newImages, failures: newFailures };
        });
      },

      clearAll: () => {
        set({
          images: new Map(),
          failures: new Map(),
          fetching: new Set(),
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
            return {
              state: {
                ...parsed.state,
                images: new Map(Object.entries(parsed.state.images || {})),
                failures: failuresMap,
                fetching: new Set(), // Don't persist fetching state
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
