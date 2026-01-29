'use client';

/**
 * useFacets Hook
 * React hook for managing faceted navigation state
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type {
  Facet,
  FacetSelection,
  FacetState,
  FacetActions,
  FacetDefinition,
  HierarchicalFacet,
} from './types';
import { FacetAggregator, createFacetAggregator } from './FacetAggregator';
import { DEFAULT_FACET_DEFINITIONS } from './types';

/**
 * Hook options
 */
interface UseFacetsOptions<T> {
  /** Items to facet */
  items: T[];
  /** Custom facet definitions */
  definitions?: FacetDefinition[];
  /** Persist to URL params */
  persistToUrl?: boolean;
  /** URL param key prefix */
  urlParamPrefix?: string;
  /** Debounce aggregation (ms) */
  debounceMs?: number;
  /** Initial selections */
  initialSelections?: FacetSelection[];
}

/**
 * Hook return type
 */
interface UseFacetsReturn extends FacetActions {
  /** Computed facets with counts */
  facets: Facet[];
  /** Hierarchical facets */
  hierarchicalFacets: HierarchicalFacet[];
  /** Current selections */
  selections: FacetSelection[];
  /** Filtered items */
  filteredItems: unknown[];
  /** Total item count */
  totalCount: number;
  /** Filtered item count */
  filteredCount: number;
  /** Whether facets are computing */
  isComputing: boolean;
  /** Last compute time in ms */
  computeTime: number;
  /** Search terms for facet value filtering */
  facetSearchTerms: Record<string, string>;
  /** Expanded facet IDs */
  expandedFacets: Set<string>;
}

/**
 * useFacets Hook
 */
export function useFacets<T extends Record<string, unknown>>({
  items,
  definitions = DEFAULT_FACET_DEFINITIONS,
  persistToUrl = false,
  urlParamPrefix = 'f_',
  debounceMs = 100,
  initialSelections = [],
}: UseFacetsOptions<T>): UseFacetsReturn {
  // Router for URL persistence
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Create aggregator
  const aggregator = useMemo(
    () => createFacetAggregator<T>({ definitions }),
    [definitions]
  );

  // State
  const [selections, setSelections] = useState<FacetSelection[]>(() => {
    if (persistToUrl && searchParams) {
      return parseSelectionsFromUrl(searchParams, urlParamPrefix, definitions);
    }
    return initialSelections;
  });
  const [expandedFacets, setExpandedFacets] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    definitions.forEach((d) => {
      if (d.defaultExpanded) initial.add(d.id);
    });
    return initial;
  });
  const [facetSearchTerms, setFacetSearchTerms] = useState<Record<string, string>>({});
  const [isComputing, setIsComputing] = useState(false);
  const [computeTime, setComputeTime] = useState(0);

  // Compute facets
  const aggregationResult = useMemo(() => {
    const result = aggregator.aggregate(items, selections, expandedFacets);
    setComputeTime(result.computeTime);
    return result;
  }, [items, selections, expandedFacets, aggregator]);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (selections.length === 0) return items;

    return items.filter((item) => {
      for (const selection of selections) {
        if (selection.values.length === 0) continue;

        const definition = definitions.find((d) => d.id === selection.facetId);
        if (!definition) continue;

        const fieldValue = getFieldValue(item, selection.field);

        // Handle range selection
        if (selection.range && definition.type === 'range') {
          if (typeof fieldValue !== 'number') return false;
          if (fieldValue < selection.range.min || fieldValue > selection.range.max) {
            return false;
          }
          continue;
        }

        // Handle array fields (tags)
        if (Array.isArray(fieldValue)) {
          const matches = selection.values.some((v) =>
            fieldValue.some((fv) => String(fv) === String(v))
          );
          if (!matches) return false;
          continue;
        }

        // Handle single values
        const matches = selection.values.some((v) => {
          if (typeof fieldValue === 'boolean') {
            return fieldValue === v;
          }
          return String(fieldValue) === String(v);
        });
        if (!matches) return false;
      }
      return true;
    });
  }, [items, selections, definitions]);

  // Sync to URL
  useEffect(() => {
    if (!persistToUrl) return;

    const newParams = new URLSearchParams(searchParams?.toString() ?? '');

    // Clear existing facet params
    Array.from(newParams.keys())
      .filter((key) => key.startsWith(urlParamPrefix))
      .forEach((key) => newParams.delete(key));

    // Add current selections
    for (const selection of selections) {
      if (selection.values.length > 0) {
        newParams.set(
          `${urlParamPrefix}${selection.facetId}`,
          selection.values.map(String).join(',')
        );
      }
    }

    const newUrl = `${pathname}?${newParams.toString()}`;
    router.replace(newUrl, { scroll: false });
  }, [selections, persistToUrl, urlParamPrefix, pathname, router, searchParams]);

  // Actions
  const toggleFacetValue = useCallback(
    (facetId: string, value: string | number | boolean) => {
      setSelections((prev) => {
        const existing = prev.find((s) => s.facetId === facetId);
        const definition = definitions.find((d) => d.id === facetId);

        if (existing) {
          const hasValue = existing.values.includes(value);
          const newValues = hasValue
            ? existing.values.filter((v) => v !== value)
            : [...existing.values, value];

          if (newValues.length === 0) {
            return prev.filter((s) => s.facetId !== facetId);
          }

          return prev.map((s) =>
            s.facetId === facetId ? { ...s, values: newValues } : s
          );
        }

        return [
          ...prev,
          {
            facetId,
            field: definition?.field ?? facetId,
            values: [value],
          },
        ];
      });
    },
    [definitions]
  );

  const setFacetValues = useCallback(
    (facetId: string, values: (string | number | boolean)[]) => {
      setSelections((prev) => {
        const definition = definitions.find((d) => d.id === facetId);

        if (values.length === 0) {
          return prev.filter((s) => s.facetId !== facetId);
        }

        const existing = prev.find((s) => s.facetId === facetId);
        if (existing) {
          return prev.map((s) =>
            s.facetId === facetId ? { ...s, values } : s
          );
        }

        return [
          ...prev,
          {
            facetId,
            field: definition?.field ?? facetId,
            values,
          },
        ];
      });
    },
    [definitions]
  );

  const clearFacet = useCallback((facetId: string) => {
    setSelections((prev) => prev.filter((s) => s.facetId !== facetId));
  }, []);

  const clearAllFacets = useCallback(() => {
    setSelections([]);
  }, []);

  const toggleFacetExpanded = useCallback((facetId: string) => {
    setExpandedFacets((prev) => {
      const next = new Set(prev);
      if (next.has(facetId)) {
        next.delete(facetId);
      } else {
        next.add(facetId);
      }
      return next;
    });
  }, []);

  const setFacetSearchTerm = useCallback((facetId: string, term: string) => {
    setFacetSearchTerms((prev) => ({ ...prev, [facetId]: term }));
  }, []);

  const drillDown = useCallback((facetId: string, path: string[]) => {
    // For hierarchical navigation, set the selection to the full path
    const definition = definitions.find((d) => d.id === facetId);
    if (!definition) return;

    setSelections((prev) => {
      const existing = prev.find((s) => s.facetId === facetId);
      const value = path.join('/');

      if (existing) {
        return prev.map((s) =>
          s.facetId === facetId ? { ...s, values: [value] } : s
        );
      }

      return [
        ...prev,
        {
          facetId,
          field: definition.field,
          values: [value],
        },
      ];
    });
  }, [definitions]);

  const drillUp = useCallback((facetId: string) => {
    setSelections((prev) => {
      const existing = prev.find((s) => s.facetId === facetId);
      if (!existing || existing.values.length === 0) return prev;

      const currentPath = String(existing.values[0]).split('/');
      if (currentPath.length <= 1) {
        // At root, clear selection
        return prev.filter((s) => s.facetId !== facetId);
      }

      // Go up one level
      const newPath = currentPath.slice(0, -1);
      return prev.map((s) =>
        s.facetId === facetId ? { ...s, values: [newPath.join('/')] } : s
      );
    });
  }, []);

  return {
    facets: aggregationResult.facets,
    hierarchicalFacets: aggregationResult.hierarchicalFacets,
    selections,
    filteredItems,
    totalCount: items.length,
    filteredCount: filteredItems.length,
    isComputing,
    computeTime,
    facetSearchTerms,
    expandedFacets,
    // Actions
    toggleFacetValue,
    setFacetValues,
    clearFacet,
    clearAllFacets,
    toggleFacetExpanded,
    setFacetSearchTerm,
    drillDown,
    drillUp,
  };
}

/**
 * Parse selections from URL search params
 */
function parseSelectionsFromUrl(
  searchParams: URLSearchParams,
  prefix: string,
  definitions: FacetDefinition[]
): FacetSelection[] {
  const selections: FacetSelection[] = [];

  searchParams.forEach((value, key) => {
    if (!key.startsWith(prefix)) return;

    const facetId = key.slice(prefix.length);
    const definition = definitions.find((d) => d.id === facetId);
    if (!definition) return;

    const values = value.split(',').map((v) => {
      // Try to parse as number or boolean
      if (v === 'true') return true;
      if (v === 'false') return false;
      const num = Number(v);
      if (!isNaN(num) && definition.type === 'range') return num;
      return v;
    });

    selections.push({
      facetId,
      field: definition.field,
      values,
    });
  });

  return selections;
}

/**
 * Get nested field value from item
 */
function getFieldValue<T extends Record<string, unknown>>(
  item: T,
  field: string
): unknown {
  const parts = field.split('.');
  let value: unknown = item;
  for (const part of parts) {
    if (value === null || value === undefined) return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}

export default useFacets;
