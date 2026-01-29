/**
 * FacetAggregator
 * Computes facet counts with intersection logic for multi-facet selection
 */

import type {
  Facet,
  FacetDefinition,
  FacetValue,
  FacetSelection,
  HierarchicalFacet,
  HierarchicalFacetNode,
  FacetAggregationResult,
} from './types';
import { FacetExtractor, createCollectionFacetExtractor } from './FacetExtractor';
import { DEFAULT_FACET_DEFINITIONS } from './types';

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

/**
 * FacetAggregator class
 * Handles multi-facet intersection and real-time count updates
 */
export class FacetAggregator<T extends Record<string, unknown>> {
  private extractor: FacetExtractor<T>;
  private options: FacetAggregationOptions;
  private cachedBaseData: Map<string, FacetValue[]> | null = null;
  private cachedItems: T[] | null = null;

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
   * Aggregate facets from items with current selections
   */
  aggregate(
    items: T[],
    selections: FacetSelection[],
    expandedFacets: Set<string> = new Set()
  ): FacetAggregationResult {
    const startTime = performance.now();

    // Build selection map for quick lookup
    const selectionMap = new Map<string, Set<string | number | boolean>>();
    for (const selection of selections) {
      selectionMap.set(selection.facetId, new Set(selection.values));
    }

    // Extract base facet data (unfiltered counts)
    const baseFacetData = this.extractor.extractFormatted(items, selectionMap);

    // If filtering is enabled, compute filtered counts
    let filteredItems = items;
    if (this.options.computeFilteredCounts && selections.length > 0) {
      filteredItems = this.applyFacetFilters(items, selections);
    }

    // Compute counts for filtered items
    const filteredFacetData = this.options.computeFilteredCounts && selections.length > 0
      ? this.extractor.extractFormatted(filteredItems, selectionMap)
      : baseFacetData;

    // Build facet objects
    const facets: Facet[] = [];
    const definitions = this.extractor.getDefinitions();

    for (const definition of definitions) {
      if (definition.type === 'hierarchy') continue; // Handle separately

      const baseValues = baseFacetData.get(definition.id) ?? [];
      const filteredValues = filteredFacetData.get(definition.id) ?? [];
      const selected = selectionMap.get(definition.id) ?? new Set();

      // Merge base and filtered counts
      const mergedValues = this.mergeValues(
        baseValues,
        filteredValues,
        selected,
        items.length,
        filteredItems.length
      );

      // Filter zero counts if option is set
      const finalValues = this.options.excludeZeroCounts
        ? mergedValues.filter((v) => v.count > 0 || v.selected)
        : mergedValues;

      const facet: Facet = {
        definition,
        values: finalValues,
        totalCount: items.length,
        selectedCount: selected.size,
        isExpanded: expandedFacets.has(definition.id) || definition.defaultExpanded || false,
        isLoading: false,
      };

      // For range facets, compute min/max
      if (definition.type === 'range') {
        const numericValues = finalValues
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

    // Build hierarchical facets (Category > Subcategory)
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
      filteredItems: filteredItems.length,
      computeTime,
    };
  }

  /**
   * Merge base and filtered facet values
   */
  private mergeValues(
    baseValues: FacetValue[],
    filteredValues: FacetValue[],
    selected: Set<string | number | boolean>,
    totalItems: number,
    filteredItemCount: number
  ): FacetValue[] {
    const filteredMap = new Map(filteredValues.map((v) => [v.value, v]));

    return baseValues.map((base) => {
      const filtered = filteredMap.get(base.value);
      const count = filtered?.count ?? 0;

      return {
        ...base,
        count,
        percentage: filteredItemCount > 0 ? (count / filteredItemCount) * 100 : 0,
        selected: selected.has(base.value),
      };
    });
  }

  /**
   * Apply facet selections as filters
   */
  private applyFacetFilters(items: T[], selections: FacetSelection[]): T[] {
    if (selections.length === 0) return items;

    return items.filter((item) => {
      // All selections must match (AND logic between facets)
      for (const selection of selections) {
        if (selection.values.length === 0) continue;

        const definition = this.extractor.getDefinition(selection.facetId);
        if (!definition) continue;

        const fieldValue = this.getFieldValue(item, selection.field);

        // Check if item matches any selected value (OR logic within facet)
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
    // Handle range selection
    if (selection.range && definition.type === 'range') {
      if (typeof fieldValue !== 'number') return false;
      return fieldValue >= selection.range.min && fieldValue <= selection.range.max;
    }

    // Handle array fields (tags)
    if (Array.isArray(fieldValue)) {
      return selection.values.some((v) =>
        fieldValue.some((fv) => String(fv) === String(v))
      );
    }

    // Handle single values
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
    const parts = field.split('.');
    let value: unknown = item;
    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      value = (value as Record<string, unknown>)[part];
    }
    return value;
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
      if (!childDef) {
        // No child field, treat as regular enum facet
        continue;
      }

      // Build hierarchy from items
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

      // Compute expanded path from selection
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
   * Compute counts for a single facet (for async updates)
   */
  computeSingleFacet(
    items: T[],
    facetId: string,
    selections: FacetSelection[]
  ): Facet | null {
    const definition = this.extractor.getDefinition(facetId);
    if (!definition) return null;

    const selectionMap = new Map<string, Set<string | number | boolean>>();
    for (const selection of selections) {
      selectionMap.set(selection.facetId, new Set(selection.values));
    }

    // Filter items by other facets (not this one)
    const otherSelections = selections.filter((s) => s.facetId !== facetId);
    const filteredItems = this.applyFacetFilters(items, otherSelections);

    // Extract this facet's values from filtered items
    const facetData = this.extractor.extractFormatted(filteredItems, selectionMap);
    const values = facetData.get(facetId) ?? [];

    const selected = selectionMap.get(facetId) ?? new Set();

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
   * Get projected count if a value were selected
   */
  getProjectedCount(
    items: T[],
    facetId: string,
    value: string | number | boolean,
    currentSelections: FacetSelection[]
  ): number {
    // Add this value to selections
    const newSelections = [...currentSelections];
    const existingSelection = newSelections.find((s) => s.facetId === facetId);

    if (existingSelection) {
      // Add to existing selection
      if (!existingSelection.values.includes(value)) {
        existingSelection.values = [...existingSelection.values, value];
      }
    } else {
      // Create new selection
      const definition = this.extractor.getDefinition(facetId);
      if (definition) {
        newSelections.push({
          facetId,
          field: definition.field,
          values: [value],
        });
      }
    }

    // Count items matching new selections
    const filtered = this.applyFacetFilters(items, newSelections);
    return filtered.length;
  }

  /**
   * Update extractor configuration
   */
  updateDefinitions(definitions: FacetDefinition[]): void {
    this.extractor.updateConfig({ fields: definitions });
    this.cachedBaseData = null;
    this.cachedItems = null;
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

/**
 * Default aggregator instance
 */
export const defaultFacetAggregator = new FacetAggregator();
