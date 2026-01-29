'use client';

/**
 * FacetContext
 * React context for faceted navigation state management
 * Integrates with CollectionFilterIntegration for unified filtering
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
  useRef,
  useEffect,
  ReactNode,
} from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type {
  Facet,
  FacetSelection,
  FacetDefinition,
  HierarchicalFacet,
  FacetActions,
  FacetAggregationResult,
} from './types';
import { DEFAULT_FACET_DEFINITIONS } from './types';
import { FacetAggregator, createFacetAggregator } from './FacetAggregator';

/**
 * Facet context state
 */
export interface FacetContextState {
  /** Computed facets with counts */
  facets: Facet[];
  /** Hierarchical facets (Category > Subcategory) */
  hierarchicalFacets: HierarchicalFacet[];
  /** Current facet selections */
  selections: FacetSelection[];
  /** Search terms for filtering facet values */
  facetSearchTerms: Record<string, string>;
  /** Expanded facet IDs */
  expandedFacets: Set<string>;
  /** Whether facets are computing */
  isComputing: boolean;
  /** Last compute time in ms */
  computeTime: number;
  /** Total items count */
  totalItems: number;
  /** Filtered items count */
  filteredItems: number;
}

/**
 * Full context value
 */
export interface FacetContextValue extends FacetContextState, FacetActions {
  /** Apply facet filters to items */
  applyFacetFilters: <T extends Record<string, unknown>>(items: T[]) => T[];
  /** Recompute facets with new items */
  recompute: <T extends Record<string, unknown>>(items: T[]) => void;
}

/**
 * Context
 */
const FacetContext = createContext<FacetContextValue | undefined>(undefined);

/**
 * Provider props
 */
export interface FacetProviderProps {
  children: ReactNode;
  /** Items to compute facets from */
  items: Record<string, unknown>[];
  /** Custom facet definitions */
  definitions?: FacetDefinition[];
  /** Persist selections to URL */
  persistToUrl?: boolean;
  /** URL param prefix */
  urlParamPrefix?: string;
  /** Initial selections */
  initialSelections?: FacetSelection[];
  /** Callback when filtered items change */
  onFilteredItemsChange?: (items: unknown[], count: number) => void;
}

/**
 * FacetProvider
 * Provides faceted navigation state to child components
 */
export function FacetProvider({
  children,
  items,
  definitions = DEFAULT_FACET_DEFINITIONS,
  persistToUrl = false,
  urlParamPrefix = 'facet_',
  initialSelections = [],
  onFilteredItemsChange,
}: FacetProviderProps) {
  // Router for URL persistence
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Aggregator ref
  const aggregatorRef = useRef<FacetAggregator<Record<string, unknown>> | null>(null);

  // Initialize aggregator
  if (!aggregatorRef.current) {
    aggregatorRef.current = createFacetAggregator({ definitions });
  }

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

  // Compute facet aggregation
  const aggregationResult = useMemo((): FacetAggregationResult => {
    if (!aggregatorRef.current || items.length === 0) {
      return {
        facets: [],
        hierarchicalFacets: [],
        totalItems: 0,
        filteredItems: 0,
        computeTime: 0,
      };
    }

    const result = aggregatorRef.current.aggregate(items, selections, expandedFacets);
    setComputeTime(result.computeTime);
    return result;
  }, [items, selections, expandedFacets]);

  // Apply facet filters to items
  const applyFacetFilters = useCallback(
    <T extends Record<string, unknown>>(itemsToFilter: T[]): T[] => {
      if (selections.length === 0) return itemsToFilter;

      return itemsToFilter.filter((item) => {
        for (const selection of selections) {
          if (selection.values.length === 0) continue;

          const definition = definitions.find((d) => d.id === selection.facetId);
          if (!definition) continue;

          const fieldValue = getNestedValue(item, selection.field);

          // Range selection
          if (selection.range && definition.type === 'range') {
            if (typeof fieldValue !== 'number') return false;
            if (fieldValue < selection.range.min || fieldValue > selection.range.max) {
              return false;
            }
            continue;
          }

          // Array fields (tags)
          if (Array.isArray(fieldValue)) {
            const matches = selection.values.some((v) =>
              fieldValue.some((fv) => String(fv) === String(v))
            );
            if (!matches) return false;
            continue;
          }

          // Single values
          const matches = selection.values.some((v) => {
            if (typeof fieldValue === 'boolean') return fieldValue === v;
            return String(fieldValue) === String(v);
          });
          if (!matches) return false;
        }
        return true;
      });
    },
    [selections, definitions]
  );

  // Filtered items
  const filteredItems = useMemo(() => {
    return applyFacetFilters(items);
  }, [items, applyFacetFilters]);

  // Notify parent of filtered items change
  useEffect(() => {
    if (onFilteredItemsChange) {
      onFilteredItemsChange(filteredItems, filteredItems.length);
    }
  }, [filteredItems, onFilteredItemsChange]);

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

  const drillDown = useCallback(
    (facetId: string, path: string[]) => {
      const definition = definitions.find((d) => d.id === facetId);
      if (!definition) return;

      setSelections((prev) => {
        const value = path.join('/');
        const existing = prev.find((s) => s.facetId === facetId);

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
    },
    [definitions]
  );

  const drillUp = useCallback((facetId: string) => {
    setSelections((prev) => {
      const existing = prev.find((s) => s.facetId === facetId);
      if (!existing || existing.values.length === 0) return prev;

      const currentPath = String(existing.values[0]).split('/');
      if (currentPath.length <= 1) {
        return prev.filter((s) => s.facetId !== facetId);
      }

      const newPath = currentPath.slice(0, -1);
      return prev.map((s) =>
        s.facetId === facetId ? { ...s, values: [newPath.join('/')] } : s
      );
    });
  }, []);

  const recompute = useCallback(
    <T extends Record<string, unknown>>(newItems: T[]) => {
      // Force re-aggregation by updating aggregator
      if (aggregatorRef.current) {
        aggregatorRef.current.aggregate(newItems, selections, expandedFacets);
      }
    },
    [selections, expandedFacets]
  );

  // Build context value
  const value: FacetContextValue = {
    // State
    facets: aggregationResult.facets,
    hierarchicalFacets: aggregationResult.hierarchicalFacets,
    selections,
    facetSearchTerms,
    expandedFacets,
    isComputing,
    computeTime,
    totalItems: items.length,
    filteredItems: filteredItems.length,

    // Actions
    toggleFacetValue,
    setFacetValues,
    clearFacet,
    clearAllFacets,
    toggleFacetExpanded,
    setFacetSearchTerm,
    drillDown,
    drillUp,
    applyFacetFilters,
    recompute,
  };

  return <FacetContext.Provider value={value}>{children}</FacetContext.Provider>;
}

/**
 * Hook to access facet context
 */
export function useFacetContext(): FacetContextValue {
  const context = useContext(FacetContext);

  if (context === undefined) {
    throw new Error(
      'useFacetContext must be used within a FacetProvider. ' +
        'Wrap your component tree with <FacetProvider> to use this hook.'
    );
  }

  return context;
}

/**
 * Optional hook that returns undefined if not in provider
 */
export function useFacetContextOptional(): FacetContextValue | undefined {
  return useContext(FacetContext);
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
 * Get nested field value from object
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let value: unknown = obj;
  for (const part of parts) {
    if (value === null || value === undefined) return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}

export default FacetProvider;
