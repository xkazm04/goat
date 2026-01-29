/**
 * FacetExtractor
 * Extracts facetable values from item collections
 */

import type {
  FacetDefinition,
  FacetValue,
  HierarchicalFacetNode,
  FacetExtractionConfig,
} from './types';
import { DEFAULT_FACET_DEFINITIONS } from './types';

/**
 * Raw extracted facet data before aggregation
 */
interface ExtractedFacetData {
  facetId: string;
  field: string;
  values: Map<string | number | boolean, number>;
  type: FacetDefinition['type'];
}

/**
 * FacetExtractor class
 * Derives facets from item fields with support for various field types
 */
export class FacetExtractor<T extends Record<string, unknown>> {
  private config: Required<FacetExtractionConfig>;
  private fieldAccessors: Map<string, (item: T) => unknown> = new Map();

  constructor(config: Partial<FacetExtractionConfig> = {}) {
    this.config = {
      fields: config.fields ?? DEFAULT_FACET_DEFINITIONS,
      minCount: config.minCount ?? 1,
      maxValues: config.maxValues ?? 100,
      includeEmpty: config.includeEmpty ?? false,
      formatValue: config.formatValue ?? this.defaultFormatValue,
    };

    // Pre-compile field accessors for performance
    for (const field of this.config.fields) {
      this.fieldAccessors.set(field.field, this.createFieldAccessor(field.field));
    }
  }

  /**
   * Create a field accessor function for nested fields
   */
  private createFieldAccessor(fieldPath: string): (item: T) => unknown {
    const parts = fieldPath.split('.');
    return (item: T) => {
      let value: unknown = item;
      for (const part of parts) {
        if (value === null || value === undefined) return undefined;
        value = (value as Record<string, unknown>)[part];
      }
      return value;
    };
  }

  /**
   * Default value formatter
   */
  private defaultFormatValue = (field: string, value: unknown): string => {
    if (value === null || value === undefined) return '(None)';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toString();
    return String(value);
  };

  /**
   * Extract facets from items
   */
  extract(items: T[]): ExtractedFacetData[] {
    const results: ExtractedFacetData[] = [];

    for (const definition of this.config.fields) {
      const accessor = this.fieldAccessors.get(definition.field);
      if (!accessor) continue;

      const valueCounts = new Map<string | number | boolean, number>();

      for (const item of items) {
        const rawValue = accessor(item);
        const values = this.normalizeValue(rawValue, definition.type);

        for (const value of values) {
          if (!this.config.includeEmpty && this.isEmpty(value)) continue;
          valueCounts.set(value, (valueCounts.get(value) ?? 0) + 1);
        }
      }

      results.push({
        facetId: definition.id,
        field: definition.field,
        values: valueCounts,
        type: definition.type,
      });
    }

    return results;
  }

  /**
   * Extract facet values with formatting
   */
  extractFormatted(
    items: T[],
    selectedValues: Map<string, Set<string | number | boolean>> = new Map()
  ): Map<string, FacetValue[]> {
    const extracted = this.extract(items);
    const result = new Map<string, FacetValue[]>();
    const totalItems = items.length;

    for (const data of extracted) {
      const definition = this.config.fields.find((f) => f.id === data.facetId);
      if (!definition) continue;

      const selected = selectedValues.get(data.facetId) ?? new Set();

      // Convert to FacetValue array
      let facetValues: FacetValue[] = Array.from(data.values.entries())
        .filter(([, count]) => count >= this.config.minCount)
        .map(([value, count]) => ({
          value,
          label: this.config.formatValue(definition.field, value),
          count,
          percentage: totalItems > 0 ? (count / totalItems) * 100 : 0,
          selected: selected.has(value),
        }));

      // Sort facet values
      facetValues = this.sortFacetValues(facetValues, definition);

      // Limit max values
      if (facetValues.length > this.config.maxValues) {
        facetValues = facetValues.slice(0, this.config.maxValues);
      }

      result.set(data.facetId, facetValues);
    }

    return result;
  }

  /**
   * Extract hierarchical facet (Category > Subcategory)
   */
  extractHierarchical(
    items: T[],
    parentField: string,
    childField: string,
    selectedValues: Set<string> = new Set()
  ): HierarchicalFacetNode[] {
    const parentAccessor = this.fieldAccessors.get(parentField) ?? this.createFieldAccessor(parentField);
    const childAccessor = this.fieldAccessors.get(childField) ?? this.createFieldAccessor(childField);

    // Build hierarchy map: parent -> children -> count
    const hierarchy = new Map<string, Map<string, number>>();
    const parentCounts = new Map<string, number>();

    for (const item of items) {
      const parentValue = String(parentAccessor(item) ?? '');
      const childValue = String(childAccessor(item) ?? '');

      if (!parentValue && !this.config.includeEmpty) continue;

      // Increment parent count
      parentCounts.set(parentValue, (parentCounts.get(parentValue) ?? 0) + 1);

      // Increment child count within parent
      if (!hierarchy.has(parentValue)) {
        hierarchy.set(parentValue, new Map());
      }
      const children = hierarchy.get(parentValue)!;
      if (childValue || this.config.includeEmpty) {
        children.set(childValue, (children.get(childValue) ?? 0) + 1);
      }
    }

    // Convert to hierarchical nodes
    const nodes: HierarchicalFacetNode[] = [];

    for (const [parentValue, count] of Array.from(parentCounts.entries())) {
      const childrenMap = hierarchy.get(parentValue) ?? new Map();
      const childNodes: HierarchicalFacetNode[] = Array.from(childrenMap.entries())
        .filter(([, c]) => c >= this.config.minCount)
        .map(([childValue, childCount]) => ({
          value: childValue,
          label: this.config.formatValue(childField, childValue),
          count: childCount,
          level: 1,
          parentValue,
          children: [],
          selected: selectedValues.has(`${parentValue}/${childValue}`),
          expanded: false,
        }))
        .sort((a, b) => b.count - a.count);

      nodes.push({
        value: parentValue,
        label: this.config.formatValue(parentField, parentValue),
        count,
        level: 0,
        children: childNodes,
        selected: selectedValues.has(parentValue),
        expanded: childNodes.some((c) => c.selected),
      });
    }

    // Sort by count
    return nodes.sort((a, b) => b.count - a.count);
  }

  /**
   * Normalize a raw value to an array of facet values
   */
  private normalizeValue(
    value: unknown,
    type: FacetDefinition['type']
  ): (string | number | boolean)[] {
    if (value === null || value === undefined) {
      return this.config.includeEmpty ? [''] : [];
    }

    switch (type) {
      case 'tags':
        // Arrays get split into individual values
        if (Array.isArray(value)) {
          return value.map((v) => String(v)).filter((v) => v || this.config.includeEmpty);
        }
        // Comma-separated strings get split
        if (typeof value === 'string' && value.includes(',')) {
          return value.split(',').map((v) => v.trim()).filter((v) => v || this.config.includeEmpty);
        }
        return [String(value)];

      case 'boolean':
        return [Boolean(value)];

      case 'range':
        // For range facets, we return the numeric value
        if (typeof value === 'number') return [value];
        const parsed = Number(value);
        return isNaN(parsed) ? [] : [parsed];

      case 'enum':
      case 'hierarchy':
      default:
        // Single value
        return [String(value)];
    }
  }

  /**
   * Sort facet values according to definition
   */
  private sortFacetValues(
    values: FacetValue[],
    definition: FacetDefinition
  ): FacetValue[] {
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
   * Check if value is empty
   */
  private isEmpty(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    return false;
  }

  /**
   * Get field definition by ID
   */
  getDefinition(facetId: string): FacetDefinition | undefined {
    return this.config.fields.find((f) => f.id === facetId);
  }

  /**
   * Get all field definitions
   */
  getDefinitions(): FacetDefinition[] {
    return [...this.config.fields];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FacetExtractionConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.fields) {
      this.fieldAccessors.clear();
      for (const field of this.config.fields) {
        this.fieldAccessors.set(field.field, this.createFieldAccessor(field.field));
      }
    }
  }
}

/**
 * Create a facet extractor for collection items
 */
export function createCollectionFacetExtractor<T extends Record<string, unknown>>(
  config?: Partial<FacetExtractionConfig>
): FacetExtractor<T> {
  return new FacetExtractor<T>(config);
}

/**
 * Default facet extractor instance
 */
export const defaultFacetExtractor = new FacetExtractor();
