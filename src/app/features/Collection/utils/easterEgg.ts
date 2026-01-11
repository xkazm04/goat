/**
 * Easter Egg Spotlight Utility
 *
 * Provides a fun Easter egg feature that highlights a random item
 * when users search for specific "magic" keywords.
 *
 * Usage:
 *   const { spotlightItemId } = useEasterEggSpotlight(searchTerm, items);
 */

import { useState, useEffect, useRef } from 'react';

// Easter egg keywords that trigger the spotlight effect
export const EASTER_EGG_KEYWORDS = ['wizard', 'magic', 'secret', 'hidden'] as const;

// Duration the spotlight effect stays visible (in milliseconds)
export const SPOTLIGHT_DURATION = 5000; // 5 seconds

export type EasterEggKeyword = (typeof EASTER_EGG_KEYWORDS)[number];

export interface SpotlightableItem {
  id: string;
}

export interface UseEasterEggSpotlightResult {
  /** The ID of the currently spotlighted item, or null if none */
  spotlightItemId: string | null;
  /** Whether an Easter egg keyword is currently active */
  isEasterEggActive: boolean;
}

/**
 * Hook that manages the Easter egg spotlight effect.
 *
 * When the search term matches one of the EASTER_EGG_KEYWORDS exactly,
 * a random item from the provided items array is selected and "spotlighted"
 * for SPOTLIGHT_DURATION milliseconds.
 *
 * @param searchTerm - The current search term to check for Easter egg keywords
 * @param items - Array of items that can be spotlighted (must have an `id` property)
 * @returns Object containing spotlightItemId and isEasterEggActive state
 *
 * @example
 * ```tsx
 * const { spotlightItemId, isEasterEggActive } = useEasterEggSpotlight(
 *   searchTerm,
 *   filteredItems
 * );
 *
 * // In render:
 * {items.map(item => (
 *   <CollectionItem
 *     key={item.id}
 *     isSpotlighted={item.id === spotlightItemId}
 *   />
 * ))}
 * ```
 */
export function useEasterEggSpotlight<T extends SpotlightableItem>(
  searchTerm: string,
  items: T[]
): UseEasterEggSpotlightResult {
  const [spotlightItemId, setSpotlightItemId] = useState<string | null>(null);
  const spotlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const searchLower = searchTerm.toLowerCase().trim();

    // Check if the search term matches any Easter egg keyword exactly
    const isEasterEgg = EASTER_EGG_KEYWORDS.some(
      (keyword) => searchLower === keyword
    );

    if (isEasterEgg && items.length > 0) {
      // Clear any existing timeout
      if (spotlightTimeoutRef.current) {
        clearTimeout(spotlightTimeoutRef.current);
      }

      // Select a random item from the items
      const randomIndex = Math.floor(Math.random() * items.length);
      const randomItem = items[randomIndex];
      setSpotlightItemId(randomItem.id);

      // Clear the spotlight after the duration
      spotlightTimeoutRef.current = setTimeout(() => {
        setSpotlightItemId(null);
      }, SPOTLIGHT_DURATION);
    } else if (!isEasterEgg && spotlightItemId) {
      // Clear spotlight if search term changes away from Easter egg
      if (spotlightTimeoutRef.current) {
        clearTimeout(spotlightTimeoutRef.current);
      }
      setSpotlightItemId(null);
    }

    // Cleanup on unmount
    return () => {
      if (spotlightTimeoutRef.current) {
        clearTimeout(spotlightTimeoutRef.current);
      }
    };
  }, [searchTerm, items, spotlightItemId]);

  const isEasterEggActive = spotlightItemId !== null;

  return {
    spotlightItemId,
    isEasterEggActive,
  };
}

/**
 * Utility function to check if a search term is an Easter egg keyword.
 * Useful for conditional styling or behavior without needing the full hook.
 *
 * @param searchTerm - The search term to check
 * @returns Whether the search term matches an Easter egg keyword
 */
export function isEasterEggKeyword(searchTerm: string): boolean {
  const searchLower = searchTerm.toLowerCase().trim();
  return EASTER_EGG_KEYWORDS.some((keyword) => searchLower === keyword);
}
