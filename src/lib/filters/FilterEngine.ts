/**
 * FilterEngine
 * Core filtering logic with combinators for advanced multi-filter system
 */

import type {
  FilterCondition,
  FilterGroup,
  FilterConfig,
  FilterResult,
  FilterEngineOptions,
  FilterValue,
  FilterOperator,
  FilterStatistics,
  FieldDistribution,
} from './types';
import { DEFAULT_FILTER_OPTIONS, EMPTY_FILTER_CONFIG } from './constants';

/**
 * FilterEngine class - handles all filter operations
 */
export class FilterEngine<T extends Record<string, unknown>> {
  private options: Required<FilterEngineOptions>;
  private fieldCache: Map<string, Map<unknown, T[]>> = new Map();

  constructor(options: FilterEngineOptions = {}) {
    this.options = { ...DEFAULT_FILTER_OPTIONS, ...options };
  }

  /**
   * Apply filter configuration to items
   */
  apply(items: T[], config: FilterConfig): FilterResult<T> {
    const startTime = performance.now();

    // Early return for empty config
    if (this.isEmptyConfig(config)) {
      return {
        items,
        total: items.length,
        matched: items.length,
        executionTime: performance.now() - startTime,
        appliedFilters: [],
      };
    }

    // Collect all enabled conditions
    const enabledConditions = this.collectEnabledConditions(config);

    // Apply filters
    const filteredItems = items.filter((item) =>
      this.evaluateConfig(item, config)
    );

    // Limit results if needed
    const finalItems =
      this.options.maxResults && filteredItems.length > this.options.maxResults
        ? filteredItems.slice(0, this.options.maxResults)
        : filteredItems;

    return {
      items: finalItems,
      total: items.length,
      matched: filteredItems.length,
      executionTime: performance.now() - startTime,
      appliedFilters: enabledConditions,
    };
  }

  /**
   * Check if config is empty (no active filters)
   */
  isEmptyConfig(config: FilterConfig): boolean {
    const hasConditions = config.conditions.some((c) => c.enabled);
    const hasGroups = config.groups.some(
      (g) => g.enabled && (g.conditions.length > 0 || g.groups.length > 0)
    );
    return !hasConditions && !hasGroups;
  }

  /**
   * Collect all enabled conditions from config
   */
  private collectEnabledConditions(config: FilterConfig): FilterCondition[] {
    const conditions: FilterCondition[] = [];

    // Root conditions
    for (const condition of config.conditions) {
      if (condition.enabled) {
        conditions.push(condition);
      }
    }

    // Group conditions (recursive)
    const collectFromGroup = (group: FilterGroup) => {
      if (!group.enabled) return;
      for (const condition of group.conditions) {
        if (condition.enabled) {
          conditions.push(condition);
        }
      }
      for (const subGroup of group.groups) {
        collectFromGroup(subGroup);
      }
    };

    for (const group of config.groups) {
      collectFromGroup(group);
    }

    return conditions;
  }

  /**
   * Evaluate entire filter config against an item
   */
  private evaluateConfig(item: T, config: FilterConfig): boolean {
    const results: boolean[] = [];

    // Evaluate root conditions
    for (const condition of config.conditions) {
      if (condition.enabled) {
        results.push(this.evaluateCondition(item, condition));
      }
    }

    // Evaluate groups
    for (const group of config.groups) {
      if (group.enabled) {
        results.push(this.evaluateGroup(item, group));
      }
    }

    // No active filters = match all
    if (results.length === 0) return true;

    // Apply root combinator
    return config.rootCombinator === 'AND'
      ? results.every(Boolean)
      : results.some(Boolean);
  }

  /**
   * Evaluate a filter group against an item
   */
  private evaluateGroup(item: T, group: FilterGroup): boolean {
    const results: boolean[] = [];

    // Evaluate conditions in group
    for (const condition of group.conditions) {
      if (condition.enabled) {
        results.push(this.evaluateCondition(item, condition));
      }
    }

    // Evaluate nested groups
    for (const subGroup of group.groups) {
      if (subGroup.enabled) {
        results.push(this.evaluateGroup(item, subGroup));
      }
    }

    // No active filters in group = match
    if (results.length === 0) return true;

    // Apply group combinator
    return group.combinator === 'AND'
      ? results.every(Boolean)
      : results.some(Boolean);
  }

  /**
   * Evaluate a single condition against an item
   */
  private evaluateCondition(item: T, condition: FilterCondition): boolean {
    const fieldValue = this.getFieldValue(item, condition.field);
    const filterValue = condition.value;

    return this.applyOperator(
      fieldValue,
      filterValue,
      condition.operator,
      condition.valueType
    );
  }

  /**
   * Get nested field value from item
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
   * Apply operator to compare values
   */
  private applyOperator(
    fieldValue: unknown,
    filterValue: FilterValue,
    operator: FilterOperator,
    _valueType: string
  ): boolean {
    // Handle empty checks first
    if (operator === 'is_empty') {
      return this.isEmpty(fieldValue);
    }
    if (operator === 'is_not_empty') {
      return !this.isEmpty(fieldValue);
    }

    // Normalize values for comparison
    const normalizedField = this.normalizeValue(fieldValue);
    const normalizedFilter = this.normalizeValue(filterValue);

    switch (operator) {
      case 'equals':
        return this.isEqual(normalizedField, normalizedFilter);

      case 'not_equals':
        return !this.isEqual(normalizedField, normalizedFilter);

      case 'contains':
        return this.contains(normalizedField, normalizedFilter);

      case 'not_contains':
        return !this.contains(normalizedField, normalizedFilter);

      case 'starts_with':
        return this.startsWith(normalizedField, normalizedFilter);

      case 'ends_with':
        return this.endsWith(normalizedField, normalizedFilter);

      case 'greater_than':
        return this.compare(normalizedField, normalizedFilter) > 0;

      case 'less_than':
        return this.compare(normalizedField, normalizedFilter) < 0;

      case 'greater_equal':
        return this.compare(normalizedField, normalizedFilter) >= 0;

      case 'less_equal':
        return this.compare(normalizedField, normalizedFilter) <= 0;

      case 'between':
        return this.isBetween(normalizedField, filterValue);

      case 'in':
        return this.isIn(normalizedField, filterValue);

      case 'not_in':
        return !this.isIn(normalizedField, filterValue);

      case 'matches_regex':
        return this.matchesRegex(normalizedField, normalizedFilter);

      default:
        return true;
    }
  }

  /**
   * Check if value is empty
   */
  private isEmpty(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  /**
   * Normalize value for comparison
   */
  private normalizeValue(value: unknown): unknown {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' && !this.options.caseSensitive) {
      return value.toLowerCase();
    }
    return value;
  }

  /**
   * Check equality with fuzzy matching support
   */
  private isEqual(fieldValue: unknown, filterValue: unknown): boolean {
    if (this.options.fuzzyMatching && typeof fieldValue === 'string' && typeof filterValue === 'string') {
      const similarity = this.calculateSimilarity(fieldValue, filterValue);
      return similarity >= (1 - this.options.fuzzyThreshold);
    }
    return fieldValue === filterValue;
  }

  /**
   * Check if field contains filter value
   */
  private contains(fieldValue: unknown, filterValue: unknown): boolean {
    if (Array.isArray(fieldValue)) {
      const normalizedFilter = this.normalizeValue(filterValue);
      return fieldValue.some(
        (item) => this.normalizeValue(item) === normalizedFilter
      );
    }
    if (typeof fieldValue === 'string' && typeof filterValue === 'string') {
      if (this.options.fuzzyMatching) {
        const similarity = this.calculateSimilarity(fieldValue, filterValue);
        return fieldValue.includes(filterValue) || similarity >= (1 - this.options.fuzzyThreshold);
      }
      return fieldValue.includes(filterValue);
    }
    return false;
  }

  /**
   * Check if field starts with filter value
   */
  private startsWith(fieldValue: unknown, filterValue: unknown): boolean {
    if (typeof fieldValue === 'string' && typeof filterValue === 'string') {
      return fieldValue.startsWith(filterValue);
    }
    return false;
  }

  /**
   * Check if field ends with filter value
   */
  private endsWith(fieldValue: unknown, filterValue: unknown): boolean {
    if (typeof fieldValue === 'string' && typeof filterValue === 'string') {
      return fieldValue.endsWith(filterValue);
    }
    return false;
  }

  /**
   * Compare two values numerically or alphabetically
   */
  private compare(fieldValue: unknown, filterValue: unknown): number {
    if (typeof fieldValue === 'number' && typeof filterValue === 'number') {
      return fieldValue - filterValue;
    }
    if (fieldValue instanceof Date && filterValue instanceof Date) {
      return fieldValue.getTime() - filterValue.getTime();
    }
    return String(fieldValue).localeCompare(String(filterValue));
  }

  /**
   * Check if value is between min and max
   */
  private isBetween(fieldValue: unknown, filterValue: FilterValue): boolean {
    if (
      filterValue &&
      typeof filterValue === 'object' &&
      'min' in filterValue &&
      'max' in filterValue
    ) {
      const { min, max } = filterValue as { min: number | Date; max: number | Date };
      return this.compare(fieldValue, min) >= 0 && this.compare(fieldValue, max) <= 0;
    }
    return false;
  }

  /**
   * Check if value is in array
   */
  private isIn(fieldValue: unknown, filterValue: FilterValue): boolean {
    if (Array.isArray(filterValue)) {
      const normalizedField = this.normalizeValue(fieldValue);
      return filterValue.some(
        (v) => this.normalizeValue(v) === normalizedField
      );
    }
    return false;
  }

  /**
   * Check if value matches regex pattern
   */
  private matchesRegex(fieldValue: unknown, filterValue: unknown): boolean {
    if (typeof fieldValue === 'string' && typeof filterValue === 'string') {
      try {
        const regex = new RegExp(filterValue, this.options.caseSensitive ? '' : 'i');
        return regex.test(fieldValue);
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Calculate string similarity (Levenshtein-based)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate filter statistics
   */
  calculateStatistics(
    items: T[],
    matchedItems: T[],
    fields: string[]
  ): FilterStatistics {
    const fieldDistribution: Record<string, FieldDistribution> = {};

    for (const field of fields) {
      fieldDistribution[field] = this.calculateFieldDistribution(
        matchedItems,
        field
      );
    }

    return {
      totalItems: items.length,
      matchedItems: matchedItems.length,
      matchPercentage:
        items.length > 0 ? (matchedItems.length / items.length) * 100 : 0,
      activeFilters: 0, // Set by caller
      fieldDistribution,
      lastUpdated: new Date(),
    };
  }

  /**
   * Calculate distribution for a single field
   */
  private calculateFieldDistribution(
    items: T[],
    field: string
  ): FieldDistribution {
    const valueCounts = new Map<string | number, number>();
    let numericValues: number[] = [];

    for (const item of items) {
      const value = this.getFieldValue(item, field);

      if (typeof value === 'number') {
        numericValues.push(value);
        const key = value;
        valueCounts.set(key, (valueCounts.get(key) || 0) + 1);
      } else if (Array.isArray(value)) {
        for (const v of value) {
          const key = String(v);
          valueCounts.set(key, (valueCounts.get(key) || 0) + 1);
        }
      } else if (value !== null && value !== undefined) {
        const key = String(value);
        valueCounts.set(key, (valueCounts.get(key) || 0) + 1);
      }
    }

    const values = Array.from(valueCounts.entries())
      .map(([value, count]) => ({
        value,
        count,
        percentage: items.length > 0 ? (count / items.length) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const result: FieldDistribution = {
      field,
      values,
    };

    if (numericValues.length > 0) {
      result.min = Math.min(...numericValues);
      result.max = Math.max(...numericValues);
      result.average =
        numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
    }

    return result;
  }

  /**
   * Build index for a field (for faster filtering)
   */
  buildIndex(items: T[], field: string): void {
    const index = new Map<unknown, T[]>();

    for (const item of items) {
      const value = this.getFieldValue(item, field);
      const key = this.normalizeValue(value);

      if (!index.has(key)) {
        index.set(key, []);
      }
      index.get(key)!.push(item);
    }

    this.fieldCache.set(field, index);
  }

  /**
   * Clear all indexes
   */
  clearIndexes(): void {
    this.fieldCache.clear();
  }

  /**
   * Count active conditions in config
   */
  countActiveConditions(config: FilterConfig): number {
    return this.collectEnabledConditions(config).length;
  }

  /**
   * Serialize config to URL-safe string
   */
  serializeConfig(config: FilterConfig): string {
    try {
      return btoa(JSON.stringify(config));
    } catch {
      return '';
    }
  }

  /**
   * Deserialize config from URL string
   */
  deserializeConfig(encoded: string): FilterConfig | null {
    try {
      return JSON.parse(atob(encoded)) as FilterConfig;
    } catch {
      return null;
    }
  }

  /**
   * Create a simple single-condition config
   */
  static createSimpleConfig(
    field: string,
    operator: FilterOperator,
    value: FilterValue,
    valueType: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'enum' = 'string'
  ): FilterConfig {
    return {
      rootCombinator: 'AND',
      groups: [],
      conditions: [
        {
          id: `${field}-${Date.now()}`,
          field,
          operator,
          value,
          valueType,
          enabled: true,
        },
      ],
    };
  }

  /**
   * Merge two filter configs
   */
  static mergeConfigs(
    config1: FilterConfig,
    config2: FilterConfig,
    combinator: 'AND' | 'OR' = 'AND'
  ): FilterConfig {
    return {
      rootCombinator: combinator,
      groups: [...config1.groups, ...config2.groups],
      conditions: [...config1.conditions, ...config2.conditions],
    };
  }
}

/**
 * Create a memoized filter function
 */
export function createFilterMemo<T extends Record<string, unknown>>(
  options?: FilterEngineOptions
) {
  const engine = new FilterEngine<T>(options);
  let lastConfig: string = '';
  let lastItems: T[] = [];
  let lastResult: FilterResult<T> | null = null;

  return (items: T[], config: FilterConfig): FilterResult<T> => {
    const configStr = JSON.stringify(config);

    if (configStr === lastConfig && items === lastItems && lastResult) {
      return lastResult;
    }

    lastConfig = configStr;
    lastItems = items;
    lastResult = engine.apply(items, config);

    return lastResult;
  };
}

/**
 * Default filter engine instance
 */
export const defaultFilterEngine = new FilterEngine();
