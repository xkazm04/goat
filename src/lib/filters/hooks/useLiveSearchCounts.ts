'use client';

/**
 * useLiveSearchCounts
 * Provides debounced live result counts as users type,
 * including per-facet category breakdowns.
 */

import { useState, useEffect, useRef } from 'react';
import type { FilterableItem } from '../CollectionFilterIntegration';

/**
 * Facet count for a single category value
 */
export interface FacetCount {
  value: string;
  count: number;
}

/**
 * Live search counts result
 */
export interface LiveSearchCounts {
  totalMatches: number;
  totalItems: number;
  facetCounts: Record<string, FacetCount[]>;
  isCalculating: boolean;
}

/**
 * Hook options
 */
interface UseLiveSearchCountsOptions {
  items: FilterableItem[];
  debounceMs?: number;
  facetFields?: string[];
  maxFacetValues?: number;
}

/**
 * Simple text match for fast preview counts
 */
function quickMatch(item: FilterableItem, query: string): boolean {
  const lower = query.toLowerCase();
  if (item.title?.toLowerCase().includes(lower)) return true;
  if (item.name?.toLowerCase().includes(lower)) return true;
  if (item.description?.toLowerCase().includes(lower)) return true;
  if (item.category?.toLowerCase().includes(lower)) return true;
  if (item.subcategory?.toLowerCase().includes(lower)) return true;
  if (item.tags?.some((t) => t.toLowerCase().includes(lower))) return true;
  return false;
}

/**
 * Hook that provides live result counts as the user types
 */
export function useLiveSearchCounts(
  query: string,
  options: UseLiveSearchCountsOptions
): LiveSearchCounts {
  const {
    items,
    debounceMs = 100,
    facetFields = ['category', 'subcategory'],
    maxFacetValues = 5,
  } = options;

  const [counts, setCounts] = useState<LiveSearchCounts>({
    totalMatches: items.length,
    totalItems: items.length,
    facetCounts: {},
    isCalculating: false,
  });
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // No query: show total
    if (!query.trim()) {
      setCounts({
        totalMatches: items.length,
        totalItems: items.length,
        facetCounts: {},
        isCalculating: false,
      });
      return;
    }

    setCounts((prev) => ({ ...prev, isCalculating: true }));

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      const matched = items.filter((item) => quickMatch(item, query));

      // Calculate facet counts from matched items
      const facetCounts: Record<string, FacetCount[]> = {};

      for (const field of facetFields) {
        const valueCounts = new Map<string, number>();

        for (const item of matched) {
          const value = (item as Record<string, unknown>)[field];
          if (value != null) {
            const strValue = String(value);
            valueCounts.set(strValue, (valueCounts.get(strValue) || 0) + 1);
          }
        }

        facetCounts[field] = Array.from(valueCounts.entries())
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, maxFacetValues);
      }

      setCounts({
        totalMatches: matched.length,
        totalItems: items.length,
        facetCounts,
        isCalculating: false,
      });
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [query, items, debounceMs, facetFields, maxFacetValues]);

  return counts;
}
