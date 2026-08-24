/**
 * FacetAggregator
 * Computes facet counts with intersection logic for multi-facet selection.
 * Uses an inverted index (value -> item indices) for incremental count updates
 * instead of re-extracting all facets from all items on every selection change.
 */

import { FacetExtractor, createCollectionFacetExtractor } from './FacetExtractor';
import { DEFAULT_FACET_DEFINITIONS } from './types';
import { getFieldValue as getNestedFieldValue } from './utils';

import type {
  Facet,
  FacetDefinition,
  FacetValue,
  FacetSelection,
  HierarchicalFacet,
  FacetAggregationResult,
} from './types';

/**
 * Cache performance statistics for the inverted index
 */
export interface FacetCacheStats {
  /** Number of times the cached index was reused (reference or fingerprint match) */
  hits: number;
  /** Number of times the index had to be rebuilt */
  misses: number;
  /** Total number of index rebuilds (same as misses, explicit for clarity) */
  rebuilds: number;
  /** Timestamp (ms) of the last rebuild, or null if never rebuilt */
  lastRebuildTime: number | null;
}

/**
 * Options for facet aggregation
 */
export interface FacetAggregationOptions {
  /** Whether to compute counts for currently filtered items only */
  computeFilteredCounts: boolean;
  /** Whether to exclude zero-count values */
  excludeZeroCounts: boolean;
  /** Custom definitions (overrides defaults) */
  definitions?: FacetDefinition[];
}

const DEFAULT_OPTIONS: FacetAggregationOptions = {
  computeFilteredCounts: true,
  excludeZeroCounts: false,
};

/** Count items present in both sets without allocating a new set */
function countIntersection(a: Set<number>, b: Set<number>): number {
  const smaller = a.size <= b.size ? a : b;
  const larger = a.size <= b.size ? b : a;
  let count = 0;
  smaller.forEach((item) => {
    if (larger.has(item)) count++;
  });
  return count;
}

/** Intersect two sets, returning a new set */
function intersectSets(a: Set<number>, b: Set<number>): Set<number> {
  const smaller = a.size <= b.size ? a : b;
  const larger = a.size <= b.size ? b : a;
  const result = new Set<number>();
  smaller.forEach((item) => {
    if (larger.has(item)) result.add(item);
  });
  return result;
}

/**
 * FacetAggregator class
 * Handles multi-facet intersection and real-time count updates
 */
export class FacetAggregator<T extends Record<string, unknown>> {
  private extractor: FacetExtractor<T>;
  private options: FacetAggregationOptions;
  /** Inverted index: facetId -> value -> Set<itemIndex> */
  private invertedIndex: Map<string, Map<string | number | boolean, Set<number>>> | null = null;
  /** Reference to items used to build the current inverted index */
  private indexedItems: T[] | null = null;
  /** Content fingerprint for staleness detection (avoids false cache hits on new array refs) */
  private indexedItemsFingerprint: string = '';
  /** Cache hit/miss/rebuild counters */
  private cacheStats: FacetCacheStats = { hits: 0, misses: 0, rebuilds: 0, lastRebuildTime: null };
  /** Timestamps of recent rebuilds for burst detection */
  private recentRebuildTimestamps: number[] = [];
  /** Max rebuilds within 1 second before logging a warning */
  private static readonly REBUILD_BURST_THRESHOLD = 3;
  /** Window (ms) for burst detection */
  private static readonly REBUILD_BURST_WINDOW = 1000;

  constructor(
    options: Partial<FacetAggregationOptions> = {},
    extractorConfig?: Parameters<typeof createCollectionFacetExtractor>[0]
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.extractor = createCollectionFacetExtractor<T>({
      ...extractorConfig,
      fields: options.definitions ?? extractorConfig?.fields ?? DEFAULT_FACET_DEFINITIONS,
    });
  }

  /**
   * Compute a lightweight fingerprint from items array for staleness detection.
   * Uses length + sampled item IDs (first, middle, last) — O(1) and catches
   * additions, removals, and most reorders without hashing every item.
   */
  private computeItemsFingerprint(items: T[]): string {
    if (items.length === 0) return '0';
    const first = String((items[0] as Record<string, unknown>).id ?? '');
    const mid = String((items[Math.floor(items.length / 2)] as Record<string, unknown>).id ?? '');
    const last = String((items[items.length - 1] as Record<string, unknown>).id ?? '');
    return `${items.length}:${first}:${mid}:${last}`;
  }

  /**
   * Build or reuse the inverted index for the given items.
   * Uses content-based fingerprinting instead of reference equality to detect
   * stale data from Zustand/React re-renders that produce new array references.
   */
  private ensureInvertedIndex(items: T[]): void {
    // Fast path: same reference means definitely same data
    if (this.indexedItems === items && this.invertedIndex) {
      this.cacheStats.hits++;
      return;
    }
    // Content check: avoid rebuild when array ref changed but content is the same
    const fingerprint = this.computeItemsFingerprint(items);
    if (fingerprint === this.indexedItemsFingerprint && this.invertedIndex) {
      this.cacheStats.hits++;
      return;
    }
    // Cache miss — rebuild the inverted index
    this.invertedIndex = this.extractor.buildInvertedIndex(items);
    this.indexedItems = items;
    this.indexedItemsFingerprint = fingerprint;

    this.cacheStats.misses++;
    this.cacheStats.rebuilds++;
    this.cacheStats.lastRebuildTime = Date.now();
    this.detectRebuildBurst();
  }

  /**
   * Compute the set of item indices that pass all facet selections,
   * using the inverted index for set intersection.
   */
  private computeFilteredIndices(
    items: T[],
    selections: FacetSelection[]
  ): Set<number> {
    let result: Set<number> | null = null;

    for (const selection of selections) {
      if (selection.values.length === 0) continue;

      const definition = this.extractor.getDefinition(selection.facetId);

      // Range selections need item-level checks
      if (selection.range && definition?.type === 'range') {
        const rangeMatches = new Set<number>();
        for (let i = 0; i < items.length; i++) {
          const fieldValue = this.getFieldValue(items[i], selection.field);
          if (
            typeof fieldValue === 'number' &&
            fieldValue >= selection.range.min &&
            fieldValue <= selection.range.max
          ) {
            rangeMatches.add(i);
          }
        }
        result = result ? intersectSets(result, rangeMatches) : rangeMatches;
        continue;
      }

      const facetIndex = this.invertedIndex!.get(selection.facetId);
      if (!facetIndex) continue;

      // OR within facet: union of item sets for selected values
      const facetMatches = new Set<number>();
      selection.values.forEach((value) => {
        const itemSet = facetIndex.get(value);
        if (itemSet) {
          itemSet.forEach((idx) => facetMatches.add(idx));
        }
      });

      // AND across facets: intersect
      result = result ? intersectSets(result, facetMatches) : facetMatches;
    }

    if (result) return result;

    // No selections matched — return all indices
    const all = new Set<number>();
    for (let i = 0; i < items.length; i++) all.add(i);
    return all;
  }

  /**
   * Sort facet values according to definition config
   */
  private sortValues(values: FacetValue[], definition: FacetDefinition): FacetValue[] {
    const sortBy = definition.sortBy ?? 'count';
    const sortOrder = definition.sortOrder ?? 'desc';
    const multiplier = sortOrder === 'asc' ? 1 : -1;

    return values.sort((a, b) => {
      switch (sortBy) {
        case 'count':
          return (b.count - a.count) * multiplier;
        case 'alpha':
          return a.label.localeCompare(b.label) * multiplier;
        case 'value':
          if (typeof a.value === 'number' && typeof b.value === 'number') {
            return (a.value - b.value) * multiplier;
          }
          return String(a.value).localeCompare(String(b.value)) * multiplier;
        default:
          return 0;
      }
    });
  }

  /**
   * Aggregate facets from items with current selections.
   * Uses a pre-built inverted index so that selection changes only require
   * set intersections (O(values * filtered)) instead of full re-extraction (O(items * facets)).
   */
  aggregate(
    items: T[],
    selections: FacetSelection[],
    expandedFacets: Set<string> = new Set()
  ): FacetAggregationResult {
    const startTime = performance.now();

    // Build/reuse inverted index (cached by items reference)
    this.ensureInvertedIndex(items);

    // Build selection map for quick lookup
    const selectionMap = new Map<string, Set<string | number | boolean>>();
    for (const selection of selections) {
      selectionMap.set(selection.facetId, new Set(selection.values));
    }

    // Compute filtered item indices using inverted index
    let filteredIndices: Set<number> | null = null;
    let filteredCount = items.length;
    if (this.options.computeFilteredCounts && selections.length > 0) {
      filteredIndices = this.computeFilteredIndices(items, selections);
      filteredCount = filteredIndices.size;
    }

    // Build facet objects from inverted index
    const definitions = this.extractor.getDefinitions();
    const facets: Facet[] = [];

    for (const definition of definitions) {
      if (definition.type === 'hierarchy') continue; // Handle separately

      const facetIndex = this.invertedIndex!.get(definition.id);
      if (!facetIndex) continue;

      const selected = selectionMap.get(definition.id) ?? new Set();

      // Compute counts from inverted index
      let values: FacetValue[] = [];
      facetIndex.forEach((itemSet, value) => {
        const count = filteredIndices
          ? countIntersection(itemSet, filteredIndices)
          : itemSet.size;

        values.push({
          value,
          label: this.extractor.formatValue(definition.field, value),
          count,
          percentage: filteredCount > 0 ? (count / filteredCount) * 100 : 0,
          selected: selected.has(value),
        });
      });

      // Filter zero counts if option is set
      if (this.options.excludeZeroCounts) {
        values = values.filter((v) => v.count > 0 || v.selected);
      }

      // Sort
      values = this.sortValues(values, definition);

      const facet: Facet = {
        definition,
        values,
        totalCount: items.length,
        selectedCount: selected.size,
        isExpanded: expandedFacets.has(definition.id) || definition.defaultExpanded || false,
        isLoading: false,
      };

      // For range facets, compute min/max
      if (definition.type === 'range') {
        const numericValues = values
          .map((v) => typeof v.value === 'number' ? v.value : null)
          .filter((v): v is number => v !== null);
        if (numericValues.length > 0) {
          facet.range = {
            min: Math.min(...numericValues),
            max: Math.max(...numericValues),
          };
        }
      }

      facets.push(facet);
    }

    // Build hierarchical facets — still uses item iteration
    const filteredItems = filteredIndices
      ? items.filter((_, i) => filteredIndices!.has(i))
      : items;
    const hierarchicalFacets = this.buildHierarchicalFacets(
      items,
      filteredItems,
      selections,
      expandedFacets
    );

    const computeTime = performance.now() - startTime;

    return {
      facets: facets.sort((a, b) => (a.definition.priority ?? 99) - (b.definition.priority ?? 99)),
      hierarchicalFacets,
      totalItems: items.length,
      filteredItems: filteredCount,
      computeTime,
    };
  }

  /**
   * Apply facet selections as filters.
   * Uses the inverted index when available for faster filtering.
   */
  applyFacetFilters(items: T[], selections: FacetSelection[]): T[] {
    if (selections.length === 0) return items;

    // Use inverted index if available for these items (fingerprint-based check)
    const fingerprint = this.computeItemsFingerprint(items);
    if (fingerprint === this.indexedItemsFingerprint && this.invertedIndex) {
      const indices = this.computeFilteredIndices(items, selections);
      return items.filter((_, i) => indices.has(i));
    }

    // Fallback: item-level filtering
    return items.filter((item) => {
      for (const selection of selections) {
        if (selection.values.length === 0) continue;

        const definition = this.extractor.getDefinition(selection.facetId);
        if (!definition) continue;

        const fieldValue = this.getFieldValue(item, selection.field);
        const matches = this.matchesFacetSelection(fieldValue, selection, definition);
        if (!matches) return false;
      }
      return true;
    });
  }

  /**
   * Check if field value matches facet selection
   */
  private matchesFacetSelection(
    fieldValue: unknown,
    selection: FacetSelection,
    definition: FacetDefinition
  ): boolean {
    if (selection.range && definition.type === 'range') {
      if (typeof fieldValue !== 'number') return false;
      return fieldValue >= selection.range.min && fieldValue <= selection.range.max;
    }

    if (Array.isArray(fieldValue)) {
      return selection.values.some((v) =>
        fieldValue.some((fv) => String(fv) === String(v))
      );
    }

    return selection.values.some((v) => {
      if (typeof fieldValue === 'boolean') {
        return fieldValue === v;
      }
      return String(fieldValue) === String(v);
    });
  }

  /**
   * Get field value from item (supports nested paths)
   */
  private getFieldValue(item: T, field: string): unknown {
    return getNestedFieldValue(item as Record<string, unknown>, field);
  }

  /**
   * Build hierarchical facets
   */
  private buildHierarchicalFacets(
    items: T[],
    filteredItems: T[],
    selections: FacetSelection[],
    expandedFacets: Set<string>
  ): HierarchicalFacet[] {
    const definitions = this.extractor.getDefinitions();
    const hierarchicalDefs = definitions.filter((d) => d.type === 'hierarchy');
    const hierarchicalFacets: HierarchicalFacet[] = [];

    for (const definition of hierarchicalDefs) {
      const childDef = definitions.find((d) => d.parentField === definition.field);
      if (!childDef) continue;

      const selectedPaths = new Set<string>();
      const selection = selections.find((s) => s.facetId === definition.id);
      if (selection) {
        selection.values.forEach((v) => selectedPaths.add(String(v)));
      }

      const nodes = this.extractor.extractHierarchical(
        this.options.computeFilteredCounts ? filteredItems : items,
        definition.field,
        childDef.field,
        selectedPaths
      );

      const expandedPath: string[] = [];
      if (selection && selection.values.length > 0) {
        const firstValue = String(selection.values[0]);
        if (firstValue.includes('/')) {
          expandedPath.push(...firstValue.split('/'));
        } else {
          expandedPath.push(firstValue);
        }
      }

      hierarchicalFacets.push({
        definition,
        nodes,
        expandedPath,
        totalCount: items.length,
        selectedCount: selectedPaths.size,
        isExpanded: expandedFacets.has(definition.id) || definition.defaultExpanded || false,
        isLoading: false,
      });
    }

    return hierarchicalFacets;
  }

  /**
   * Compute counts for a single facet using inverted index
   */
  computeSingleFacet(
    items: T[],
    facetId: string,
    selections: FacetSelection[]
  ): Facet | null {
    const definition = this.extractor.getDefinition(facetId);
    if (!definition) return null;

    this.ensureInvertedIndex(items);

    const selectionMap = new Map<string, Set<string | number | boolean>>();
    for (const selection of selections) {
      selectionMap.set(selection.facetId, new Set(selection.values));
    }

    // Filter by other facets (not this one) using index
    const otherSelections = selections.filter((s) => s.facetId !== facetId);
    let filteredIndices: Set<number> | null = null;
    let filteredCount = items.length;
    if (otherSelections.length > 0) {
      filteredIndices = this.computeFilteredIndices(items, otherSelections);
      filteredCount = filteredIndices.size;
    }

    const facetIndex = this.invertedIndex!.get(facetId);
    if (!facetIndex) return null;

    const selected = selectionMap.get(facetId) ?? new Set();

    let values: FacetValue[] = [];
    facetIndex.forEach((itemSet, value) => {
      const count = filteredIndices
        ? countIntersection(itemSet, filteredIndices)
        : itemSet.size;

      values.push({
        value,
        label: this.extractor.formatValue(definition.field, value),
        count,
        percentage: filteredCount > 0 ? (count / filteredCount) * 100 : 0,
        selected: selected.has(value),
      });
    });

    values = this.sortValues(values, definition);

    return {
      definition,
      values,
      totalCount: items.length,
      selectedCount: selected.size,
      isExpanded: definition.defaultExpanded || false,
      isLoading: false,
    };
  }

  /**
   * Get projected count if a value were selected, using inverted index
   */
  getProjectedCount(
    items: T[],
    facetId: string,
    value: string | number | boolean,
    currentSelections: FacetSelection[]
  ): number {
    this.ensureInvertedIndex(items);

    const newSelections = currentSelections.map((s) =>
      s.facetId === facetId && !s.values.includes(value)
        ? { ...s, values: [...s.values, value] }
        : { ...s }
    );

    // If facet wasn't in selections, add it
    if (!newSelections.some((s) => s.facetId === facetId)) {
      const definition = this.extractor.getDefinition(facetId);
      if (definition) {
        newSelections.push({
          facetId,
          field: definition.field,
          values: [value],
        });
      }
    }

    const indices = this.computeFilteredIndices(items, newSelections);
    return indices.size;
  }

  /**
   * Update extractor configuration
   */
  updateDefinitions(definitions: FacetDefinition[]): void {
    this.extractor.updateConfig({ fields: definitions });
    this.invertedIndex = null;
    this.indexedItems = null;
    this.indexedItemsFingerprint = '';
  }

  /**
   * Return a snapshot of cache hit/miss/rebuild statistics.
   */
  getCacheStats(): Readonly<FacetCacheStats> {
    return { ...this.cacheStats };
  }

  /**
   * Detect rapid rebuilds that suggest unnecessary new array references
   * from Zustand/React re-renders.
   */
  private detectRebuildBurst(): void {
    const now = Date.now();
    this.recentRebuildTimestamps.push(now);
    // Prune timestamps outside the window
    this.recentRebuildTimestamps = this.recentRebuildTimestamps.filter(
      (t) => now - t <= FacetAggregator.REBUILD_BURST_WINDOW
    );
    if (this.recentRebuildTimestamps.length >= FacetAggregator.REBUILD_BURST_THRESHOLD) {
      console.warn(
        `[FacetAggregator] ${this.recentRebuildTimestamps.length} index rebuilds within 1 s — ` +
          'Zustand/React may be producing unnecessary new array references. ' +
          `Stats: ${JSON.stringify(this.cacheStats)}`
      );
    }
  }
}

/**
 * Create a facet aggregator for collection items
 */
export function createFacetAggregator<T extends Record<string, unknown>>(
  options?: Partial<FacetAggregationOptions>,
  extractorConfig?: Parameters<typeof createCollectionFacetExtractor>[0]
): FacetAggregator<T> {
  return new FacetAggregator<T>(options, extractorConfig);
}
