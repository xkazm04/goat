/**
 * Progressive Wikipedia Image Hook
 *
 * Auto-fetches Wikipedia images for items without images.
 * Integrates with wiki-image-store for caching.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useWikiImageStore } from "@/stores/wiki-image-store";

// Default fetch delay to avoid rate limiting
const DEFAULT_FETCH_DELAY_MS = 500;

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
  fetchDelay = DEFAULT_FETCH_DELAY_MS,
}: UseProgressiveWikiImageOptions): UseProgressiveWikiImageResult {
  // Use individual selectors to get stable references
  const getImage = useWikiImageStore((state) => state.getImage);
  const isFetchingStore = useWikiImageStore((state) => state.isFetching);
  const hasFailedStore = useWikiImageStore((state) => state.hasFailed);
  const fetchImage = useWikiImageStore((state) => state.fetchImage);

  const [isFetching, setIsFetching] = useState(false);
  const hasFetchedRef = useRef(false);

  // Get cached image
  const cachedImage = getImage(itemTitle);
  const hasFailed = hasFailedStore(itemTitle);
  const isStoreFetching = isFetchingStore(itemTitle);

  // Final image URL (priority: existing > cached > null)
  const imageUrl = existingImage || cachedImage || null;

  // Auto-fetch if no image exists
  useEffect(() => {
    // Skip conditions
    if (!autoFetch) return;
    if (existingImage) return;
    if (cachedImage) return;
    if (hasFailed) return;
    if (isStoreFetching) return;
    if (!itemTitle || itemTitle.trim().length === 0) return;
    if (hasFetchedRef.current) return;

    // Mark as fetched to prevent re-triggering
    hasFetchedRef.current = true;

    // Delay fetch to avoid rate limiting on initial render
    const timeoutId = setTimeout(() => {
      setIsFetching(true);
      fetchImage(itemTitle).finally(() => setIsFetching(false));
    }, fetchDelay);

    return () => clearTimeout(timeoutId);
  }, [autoFetch, itemTitle, existingImage, cachedImage, hasFailed, isStoreFetching, fetchImage, fetchDelay]);

  // Reset hasFetchedRef when itemTitle changes
  useEffect(() => {
    hasFetchedRef.current = false;
  }, [itemTitle]);

  // Manual refetch
  const refetch = useCallback(async () => {
    if (isFetchingStore(itemTitle)) return;

    setIsFetching(true);
    try {
      await fetchImage(itemTitle);
    } finally {
      setIsFetching(false);
    }
  }, [itemTitle, isFetchingStore, fetchImage]);

  return {
    imageUrl,
    isFetching: isFetching || isStoreFetching,
    hasFailed,
    refetch,
  };
}
