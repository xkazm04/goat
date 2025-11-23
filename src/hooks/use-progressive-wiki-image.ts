/**
 * Progressive Wikipedia Image Hook
 *
 * Auto-fetches Wikipedia images for items without images.
 * Integrates with wiki-image-store for caching.
 */

import { useEffect, useState } from "react";
import { useWikiImageStore } from "@/stores/wiki-image-store";

export interface UseProgressiveWikiImageOptions {
  /** Item title to search for */
  itemTitle: string;

  /** Existing image URL (if any) */
  existingImage?: string | null;

  /** Enable auto-fetch */
  autoFetch?: boolean;

  /** Delay before fetching (ms) */
  fetchDelay?: number;
}

export interface UseProgressiveWikiImageResult {
  /** Final image URL (existing or fetched) */
  imageUrl: string | null;

  /** Whether image is currently being fetched */
  isFetching: boolean;

  /** Whether fetch failed */
  hasFailed: boolean;

  /** Manually trigger fetch */
  refetch: () => Promise<void>;
}

/**
 * Hook to progressively load Wikipedia images for items
 *
 * @example
 * ```tsx
 * const { imageUrl, isFetching } = useProgressiveWikiImage({
 *   itemTitle: "The Matrix",
 *   existingImage: item.image,
 *   autoFetch: true,
 * });
 * ```
 */
export function useProgressiveWikiImage({
  itemTitle,
  existingImage,
  autoFetch = true,
  fetchDelay = 500,
}: UseProgressiveWikiImageOptions): UseProgressiveWikiImageResult {
  const wikiStore = useWikiImageStore();
  const [isFetching, setIsFetching] = useState(false);

  // Get cached image
  const cachedImage = wikiStore.getImage(itemTitle);
  const hasFailed = wikiStore.hasFailed(itemTitle);

  // Final image URL (priority: existing > cached > null)
  const imageUrl = existingImage || cachedImage || null;

  // Auto-fetch if no image exists
  useEffect(() => {
    if (!autoFetch) return;
    if (existingImage) return; // Already has image
    if (cachedImage) return; // Already cached
    if (hasFailed) return; // Previously failed
    if (wikiStore.isFetching(itemTitle)) return; // Already fetching
    if (!itemTitle || itemTitle.trim().length === 0) return; // Invalid title

    // Delay fetch to avoid rate limiting on initial render
    const timeoutId = setTimeout(() => {
      setIsFetching(true);
      wikiStore
        .fetchImage(itemTitle)
        .then(() => {
          setIsFetching(false);
        })
        .catch(() => {
          setIsFetching(false);
        });
    }, fetchDelay);

    return () => clearTimeout(timeoutId);
  }, [
    autoFetch,
    itemTitle,
    existingImage,
    cachedImage,
    hasFailed,
    wikiStore,
    fetchDelay,
  ]);

  // Manual refetch
  const refetch = async () => {
    if (wikiStore.isFetching(itemTitle)) return;

    setIsFetching(true);
    try {
      await wikiStore.fetchImage(itemTitle);
    } finally {
      setIsFetching(false);
    }
  };

  return {
    imageUrl,
    isFetching: isFetching || wikiStore.isFetching(itemTitle),
    hasFailed,
    refetch,
  };
}
