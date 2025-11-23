/**
 * Wiki Image Store
 *
 * Manages auto-fetched Wikipedia images with localStorage caching.
 * Automatically fetches missing item images and persists URLs.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { fetchItemImage } from "@/lib/api/wiki-images";

export interface WikiImageCache {
  /** Item title -> Image URL mapping */
  images: Map<string, string>;
  /** Failed fetches (to avoid retrying) */
  failures: Set<string>;
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
      failures: new Set(),
      fetching: new Set(),

      getImage: (itemTitle: string) => {
        const state = get();
        return state.images.get(itemTitle) || null;
      },

      isFetching: (itemTitle: string) => {
        return get().fetching.has(itemTitle);
      },

      hasFailed: (itemTitle: string) => {
        return get().failures.has(itemTitle);
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

        // Skip if previously failed
        if (state.failures.has(itemTitle)) {
          return null;
        }

        // Mark as fetching
        set((state) => {
          const newFetching = new Set(state.fetching);
          newFetching.add(itemTitle);
          return { fetching: newFetching };
        });

        try {
          console.log("🔍 Fetching Wikipedia image for:", itemTitle);
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
            console.log("✅ Cached Wikipedia image for:", itemTitle);
            return imageUrl;
          } else {
            // Mark as failed to avoid retrying
            set((state) => {
              const newFailures = new Set(state.failures);
              newFailures.add(itemTitle);
              const newFetching = new Set(state.fetching);
              newFetching.delete(itemTitle);
              return { failures: newFailures, fetching: newFetching };
            });
            console.log("⚠️ No Wikipedia image found for:", itemTitle);
            return null;
          }
        } catch (error) {
          console.error("❌ Error fetching Wikipedia image:", error);
          // Mark as failed
          set((state) => {
            const newFailures = new Set(state.failures);
            newFailures.add(itemTitle);
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
          const newFailures = new Set(state.failures);
          newFailures.delete(itemTitle);
          return { images: newImages, failures: newFailures };
        });
      },

      clearImage: (itemTitle: string) => {
        set((state) => {
          const newImages = new Map(state.images);
          newImages.delete(itemTitle);
          const newFailures = new Set(state.failures);
          newFailures.delete(itemTitle);
          return { images: newImages, failures: newFailures };
        });
      },

      clearAll: () => {
        set({
          images: new Map(),
          failures: new Set(),
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
            return {
              state: {
                ...parsed.state,
                images: new Map(Object.entries(parsed.state.images || {})),
                failures: new Set(parsed.state.failures || []),
                fetching: new Set(), // Don't persist fetching state
              },
            };
          } catch (error) {
            console.error("Failed to parse wiki image cache:", error);
            return null;
          }
        },
        setItem: (name, value) => {
          const toStore = {
            state: {
              images: Object.fromEntries(value.state.images),
              failures: Array.from(value.state.failures),
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
