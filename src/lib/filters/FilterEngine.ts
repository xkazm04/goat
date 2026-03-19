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
  SortConfig,
} from './types';
import { DEFAULT_FILTER_OPTIONS, EMPTY_FILTER_CONFIG } from './constants';
import { getFieldValue as getNestedFieldValue } from './utils';

/**
 * Metrics payload fired by FilterEngine and FullTextSearcher
 * when an optional onMetrics callback is provided.
 */
export interface FilterMetrics {
  operation: string;
  durationMs: number;
  itemCount: number;
}

/**
 * FilterEngine class - handles all filter operations
 */
/**
 * Detect regex patterns vulnerable to catastrophic backtracking (ReDoS).
 * Rejects patterns containing nested quantifiers like (a+)+, (a*)*,
 * overlapping alternations with quantifiers, and other known-dangerous constructs.
 * Returns true if the pattern is considered safe.
 */
function isSafeRegex(pattern: string): boolean {
  // Max pattern length to prevent extremely long patterns
  if (pattern.length > 256) return false;

  // Detect nested quantifiers: a quantified group containing a quantifier
  // e.g., (a+)+, (a+)*, (.*)+, (\d+){2,}
  // Matches: group with quantifier inside, followed by outer quantifier
  const nestedQuantifier = /\([^)]*[+*][^)]*\)[+*?]|\([^)]*[+*][^)]*\)\{/;
  if (nestedQuantifier.test(pattern)) return false;

  // Detect overlapping alternations with quantifiers: (a|a)+, (ab|ac)+
  // Simplified: group with alternation followed by quantifier
  const alternationQuantifier = /\([^)]*\|[^)]*\)[+*]\??\{?/;
  // Only flag when the alternation branches share a common prefix
  if (alternationQuantifier.test(pattern)) {
    const altMatch = pattern.match(/\(([^)]*\|[^)]*)\)[+*]/);
    if (altMatch) {
      const branches = altMatch[1].split('|');
      for (let i = 0; i < branches.length; i++) {
        for (let j = i + 1; j < branches.length; j++) {
          // If two branches start with the same character, potential overlap
          if (branches[i].length > 0 && branches[j].length > 0 &&
              branches[i][0] === branches[j][0]) {
            return false;
          }
        }
      }
    }
  }

  // Detect multiple adjacent unbounded quantifiers on overlapping charsets
  // e.g., .*.*,  \s*\s*, \d+\d+
  const adjacentQuantifiers = /[+*]\??\s*[.\\][+*]/;
  if (adjacentQuantifiers.test(pattern)) return false;

  return true;
}

export class FilterEngine<T extends Record<string, unknown>> {
  private options: Required<FilterEngineOptions>;
  private fieldCache: Map<string, Map<unknown, T[]>> = new Map();
  private regexCache: Map<string, RegExp> = new Map();
  /** Tracks patterns rejected by the ReDoS safety check */
  private unsafeRegexCache: Set<string> = new Set();
  private similarityCache: Map<string, number> = new Map();
  private onMetrics?: (metrics: FilterMetrics) => void;
  private static readonly REGEX_CACHE_MAX = 100;
  private static readonly SIMILARITY_CACHE_MAX = 500;
  /** Max string length for Levenshtein; longer strings fall back to substring matching */
  private static readonly FUZZY_MAX_LENGTH = 200;

  constructor(options: FilterEngineOptions = {}) {
    this.options = { ...DEFAULT_FILTER_OPTIONS, ...options };
  }

  /**
   * Set an optional metrics callback for real-time performance visibility.
   * The callback receives {operation, durationMs, itemCount} after each operation.
   */
  setMetricsCallback(callback: (metrics: FilterMetrics) => void): void {
    this.onMetrics = callback;
  }

  /**
   * Apply filter configuration to items, with optional sorting
   */
  apply(items: T[], config: FilterConfig, sortConfig?: SortConfig | null): FilterResult<T> {
    const startTime = performance.now();

    // Early return for empty config
    if (this.isEmptyConfig(config) && !sortConfig) {
      return {
        items,
        total: items.length,
        matched: items.length,
        executionTime: performance.now() - startTime,
        appliedFilters: [],
        appliedSort: null,
      };
    }

    // Collect all enabled conditions
    const enabledConditions = this.collectEnabledConditions(config);

    // Apply filters
    let filteredItems: T[];
    if (this.isEmptyConfig(config)) {
      filteredItems = [...items];
    } else {
      // Try indexed fast path for O(1) hash lookups
      const indexedResult = this.applyIndexed(items, config);
      if (indexedResult !== null) {
        filteredItems = indexedResult;
      } else {
        filteredItems = items.filter((item) =>
          this.evaluateConfig(item, config)
        );
      }
    }

    // Apply sort
    if (sortConfig) {
      filteredItems = this.sortItems(filteredItems, sortConfig);
    }

    // Limit results if needed
    const finalItems =
      this.options.maxResults && filteredItems.length > this.options.maxResults
        ? filteredItems.slice(0, this.options.maxResults)
        : filteredItems;

    const durationMs = performance.now() - startTime;

    if (this.onMetrics) {
      this.onMetrics({
        operation: 'filter.apply',
        durationMs,
        itemCount: items.length,
      });
    }

    return {
      items: finalItems,
      total: items.length,
      matched: filteredItems.length,
      executionTime: durationMs,
      appliedFilters: enabledConditions,
      appliedSort: sortConfig || null,
    };
  }

  /**
   * Sort items by field and direction.
   * Uses Schwartzian transform: precompute sort keys in O(n), then sort
   * with a simple comparator instead of running type detection per comparison.
   */
  sortItems(items: T[], sortConfig: SortConfig): T[] {
    const { field, direction } = sortConfig;
    const multiplier = direction === 'asc' ? 1 : -1;

    // O(n) pass: extract and classify each value once
    const decorated = items.map((item, index) => {
      const raw = this.getFieldValue(item, field);
      return { item, key: this.toSortKey(raw), index };
    });

    // Sort using precomputed keys (no per-comparison type detection)
    decorated.sort((a, b) => {
      const ak = a.key;
      const bk = b.key;

      // Nulls always pushed to end regardless of direction
      if (ak.isNull && bk.isNull) return 0;
      if (ak.isNull) return 1;
      if (bk.isNull) return -1;

      // Numeric keys (numbers, dates, parsed date-strings, booleans)
      if (ak.numeric !== null && bk.numeric !== null) {
        const diff = ak.numeric - bk.numeric;
        return (diff !== 0 ? diff : 0) * multiplier;
      }

      // Fallback: string comparison
      return ak.str.localeCompare(bk.str) * multiplier;
    });

    return decorated.map((d) => d.item);
  }

  /**
   * Convert a raw field value into a pre-resolved sort key.
   * Called once per item (O(n)), not once per comparison (O(n log n)).
   */
  private toSortKey(raw: unknown): { isNull: boolean; numeric: number | null; str: string } {
    if (raw == null) {
      return { isNull: true, numeric: null, str: '' };
    }

    if (typeof raw === 'number') {
      return { isNull: false, numeric: raw, str: String(raw) };
    }

    if (raw instanceof Date) {
      return { isNull: false, numeric: raw.getTime(), str: raw.toISOString() };
    }

    if (typeof raw === 'boolean') {
      return { isNull: false, numeric: raw ? 1 : 0, str: String(raw) };
    }

    if (typeof raw === 'string') {
      // Detect ISO-style date strings (must contain '-' to avoid matching plain numbers)
      if (raw.includes('-')) {
        const parsed = Date.parse(raw);
        if (!isNaN(parsed)) {
          return { isNull: false, numeric: parsed, str: raw };
        }
      }
      return { isNull: false, numeric: null, str: raw };
    }

    // Unknown types: stringify
    return { isNull: false, numeric: null, str: String(raw) };
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
   * Try to apply filters using pre-built field indexes for O(1) lookups.
   * Returns null if the config can't be resolved via indexes (falls back to linear scan).
   * Only handles root-level conditions with indexable operators (equals, not_equals, in, not_in).
   * Skipped when fuzzy matching is enabled since similarity-based equality differs from exact match.
   */
  private applyIndexed(items: T[], config: FilterConfig): T[] | null {
    // Skip if fuzzy matching is on — index assumes exact equality
    if (this.options.fuzzyMatching) return null;

    // Only handle simple configs: root-level conditions, no active groups
    const hasActiveGroups = config.groups.some(
      (g) => g.enabled && (g.conditions.length > 0 || g.groups.length > 0)
    );
    if (hasActiveGroups) return null;

    const enabledConditions = config.conditions.filter((c) => c.enabled);
    if (enabledConditions.length === 0) return null;

    // Try to resolve every condition from indexes
    const conditionSets: Set<T>[] = [];
    for (const condition of enabledConditions) {
      const resultSet = this.resolveConditionFromIndex(items, condition);
      if (resultSet === null) return null; // Can't index this condition
      conditionSets.push(resultSet);
    }

    // Combine per-condition result sets
    let matchSet: Set<T>;
    if (config.rootCombinator === 'AND') {
      // Intersection: start with smallest set for efficiency
      conditionSets.sort((a, b) => a.size - b.size);
      matchSet = conditionSets[0];
      for (let i = 1; i < conditionSets.length; i++) {
        const next = conditionSets[i];
        const intersection = new Set<T>();
        matchSet.forEach((item) => {
          if (next.has(item)) intersection.add(item);
        });
        matchSet = intersection;
      }
    } else {
      // Union
      matchSet = new Set<T>();
      for (const set of conditionSets) {
        set.forEach((item) => matchSet.add(item));
      }
    }

    // Preserve original item order
    return items.filter((item) => matchSet.has(item));
  }

  /**
   * Resolve a single condition using a field index.
   * Returns matching items as a Set, or null if the condition can't be indexed.
   */
  private resolveConditionFromIndex(
    items: T[],
    condition: FilterCondition
  ): Set<T> | null {
    const index = this.fieldCache.get(condition.field);
    if (!index) return null;

    const { operator, value: filterValue } = condition;

    if (operator === 'equals') {
      const key = this.normalizeValue(filterValue);
      return new Set(index.get(key) || []);
    }

    if (operator === 'not_equals') {
      const key = this.normalizeValue(filterValue);
      const excluded = new Set(index.get(key) || []);
      const result = new Set<T>();
      for (const item of items) {
        if (!excluded.has(item)) result.add(item);
      }
      return result;
    }

    if (operator === 'in' && Array.isArray(filterValue)) {
      const result = new Set<T>();
      for (const v of filterValue) {
        const key = this.normalizeValue(v);
        const bucket = index.get(key) || [];
        for (const item of bucket) result.add(item);
      }
      return result;
    }

    if (operator === 'not_in' && Array.isArray(filterValue)) {
      const excluded = new Set<T>();
      for (const v of filterValue) {
        const key = this.normalizeValue(v);
        const bucket = index.get(key) || [];
        for (const item of bucket) excluded.add(item);
      }
      const result = new Set<T>();
      for (const item of items) {
        if (!excluded.has(item)) result.add(item);
      }
      return result;
    }

    return null; // Operator not indexable
  }

  /**
   * Get nested field value from item
   */
  private getFieldValue(item: T, field: string): unknown {
    return getNestedFieldValue(item, field);
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
   * Check if value matches regex pattern.
   * Validates patterns against known ReDoS-vulnerable constructs before compilation.
   */
  private matchesRegex(fieldValue: unknown, filterValue: unknown): boolean {
    if (typeof fieldValue === 'string' && typeof filterValue === 'string') {
      try {
        const flags = this.options.caseSensitive ? '' : 'i';
        const cacheKey = `${filterValue}\0${flags}`;

        // Fast reject: pattern was previously flagged as unsafe
        if (this.unsafeRegexCache.has(cacheKey)) {
          return false;
        }

        let regex = this.regexCache.get(cacheKey);
        if (!regex) {
          // Guard against catastrophic backtracking (ReDoS)
          if (!isSafeRegex(filterValue)) {
            this.unsafeRegexCache.add(cacheKey);
            console.warn('[FilterEngine] matchesRegex: pattern rejected (potential ReDoS)', {
              pattern: filterValue,
            });
            return false;
          }

          if (this.regexCache.size >= FilterEngine.REGEX_CACHE_MAX) {
            // Evict oldest 25%
            const evictCount = Math.ceil(FilterEngine.REGEX_CACHE_MAX * 0.25);
            const keys = this.regexCache.keys();
            for (let i = 0; i < evictCount; i++) {
              const key = keys.next().value;
              if (key !== undefined) this.regexCache.delete(key);
            }
          }
          regex = new RegExp(filterValue, flags);
          this.regexCache.set(cacheKey, regex);
        }
        return regex.test(fieldValue);
      } catch (error) {
        console.warn('[FilterEngine] matchesRegex: invalid regex pattern', {
          pattern: filterValue,
          input: fieldValue,
          error: error instanceof Error ? error.message : String(error),
        });
        return false;
      }
    }
    return false;
  }

  /**
   * Calculate string similarity (Levenshtein-based).
   * Falls back to substring matching for strings exceeding FUZZY_MAX_LENGTH.
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const cacheKey = `${str1}\0${str2}`;
    const cached = this.similarityCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    let result: number;

    // For long strings, fall back to substring-based similarity
    if (longer.length > FilterEngine.FUZZY_MAX_LENGTH) {
      result = longer.includes(shorter)
        ? shorter.length / longer.length
        : 0;
    } else {
      // Max allowed edit distance based on fuzzy threshold
      const maxDistance = Math.floor(longer.length * this.options.fuzzyThreshold);
      const editDistance = this.boundedLevenshtein(longer, shorter, maxDistance);
      result = (longer.length - editDistance) / longer.length;
    }

    // LRU eviction: delete oldest 25% when at capacity
    if (this.similarityCache.size >= FilterEngine.SIMILARITY_CACHE_MAX) {
      const evictCount = Math.ceil(FilterEngine.SIMILARITY_CACHE_MAX * 0.25);
      const keys = this.similarityCache.keys();
      for (let i = 0; i < evictCount; i++) {
        const key = keys.next().value;
        if (key !== undefined) this.similarityCache.delete(key);
      }
    }
    this.similarityCache.set(cacheKey, result);

    return result;
  }

  /**
   * Bounded Levenshtein distance using two-row O(min(n,m)) space.
   * Short-circuits and returns maxDistance + 1 when the minimum possible
   * distance exceeds maxDistance.
   */
  private boundedLevenshtein(str1: string, str2: string, maxDistance: number): number {
    // Ensure str1 is the longer string
    let a = str1;
    let b = str2;
    if (a.length < b.length) {
      [a, b] = [b, a];
    }
    const n = a.length;
    const m = b.length;

    // If length difference alone exceeds max, short-circuit
    if (n - m > maxDistance) return maxDistance + 1;

    // Two-row optimization: only keep previous and current rows
    let prev = new Array(m + 1);
    let curr = new Array(m + 1);

    for (let j = 0; j <= m; j++) {
      prev[j] = j;
    }

    for (let i = 1; i <= n; i++) {
      curr[0] = i;
      let rowMin = curr[0];

      for (let j = 1; j <= m; j++) {
        const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        curr[j] = Math.min(
          prev[j - 1] + cost,
          prev[j] + 1,
          curr[j - 1] + 1
        );
        if (curr[j] < rowMin) rowMin = curr[j];
      }

      // If the best value in this row already exceeds maxDistance, short-circuit
      if (rowMin > maxDistance) return maxDistance + 1;

      [prev, curr] = [curr, prev];
    }

    return prev[m];
  }

  /**
   * Calculate filter statistics
   */
  calculateStatistics(
    items: T[],
    matchedItems: T[],
    fields: string[]
  ): FilterStatistics {
    const startTime = performance.now();
    const fieldDistribution: Record<string, FieldDistribution> = {};

    for (const field of fields) {
      fieldDistribution[field] = this.calculateFieldDistribution(
        matchedItems,
        field
      );
    }

    if (this.onMetrics) {
      this.onMetrics({
        operation: 'filter.calculateStatistics',
        durationMs: performance.now() - startTime,
        itemCount: matchedItems.length,
      });
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
   * Build index for a field (for faster filtering).
   * Array-valued fields are expanded so each element becomes a separate key.
   */
  buildIndex(items: T[], field: string): void {
    const index = new Map<unknown, T[]>();

    for (const item of items) {
      const value = this.getFieldValue(item, field);

      if (Array.isArray(value)) {
        // Index each array element separately for containment lookups
        for (const element of value) {
          const key = this.normalizeValue(element);
          if (!index.has(key)) {
            index.set(key, []);
          }
          index.get(key)!.push(item);
        }
      } else {
        const key = this.normalizeValue(value);
        if (!index.has(key)) {
          index.set(key, []);
        }
        index.get(key)!.push(item);
      }
    }

    this.fieldCache.set(field, index);
  }

  /**
   * Rebuild indexes for specified fields, clearing stale entries first
   */
  rebuildIndexes(items: T[], fields: string[]): void {
    this.fieldCache.clear();
    for (const field of fields) {
      this.buildIndex(items, field);
    }
  }

  /**
   * Check if a field has a pre-built index
   */
  hasIndex(field: string): boolean {
    return this.fieldCache.has(field);
  }

  /**
   * Clear all indexes
   */
  clearIndexes(): void {
    this.fieldCache.clear();
    this.regexCache.clear();
    this.unsafeRegexCache.clear();
    this.similarityCache.clear();
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
    } catch (error) {
      console.warn('[FilterEngine] serializeConfig: failed to serialize filter config', {
        conditionCount: config.conditions?.length ?? 0,
        groupCount: config.groups?.length ?? 0,
        error: error instanceof Error ? error.message : String(error),
      });
      return '';
    }
  }

  /**
   * Deserialize config from URL string
   */
  deserializeConfig(encoded: string): FilterConfig | null {
    try {
      return JSON.parse(atob(encoded)) as FilterConfig;
    } catch (error) {
      console.warn('[FilterEngine] deserializeConfig: failed to deserialize filter config', {
        inputLength: encoded.length,
        inputPreview: encoded.slice(0, 50),
        error: error instanceof Error ? error.message : String(error),
      });
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
 * Compute a fast structural hash for a FilterConfig.
 * Walks the config tree producing a numeric hash from field counts,
 * combinators, and condition key values. This avoids JSON.stringify
 * on every memoization check (the common "config unchanged" case
 * becomes near-zero cost).
 */
function hashFilterConfig(config: FilterConfig): number {
  // FNV-1a inspired hash — fast, good distribution for short inputs
  let h = 0x811c9dc5; // FNV offset basis (32-bit)

  const mix = (val: number) => {
    h ^= val & 0xffff;
    h = Math.imul(h, 0x01000193); // FNV prime
    h ^= (val >>> 16) & 0xffff;
    h = Math.imul(h, 0x01000193);
  };

  const mixStr = (s: string) => {
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
  };

  // Root combinator
  mixStr(config.rootCombinator);

  // Conditions
  mix(config.conditions.length);
  for (const c of config.conditions) {
    mixStr(c.id);
    mixStr(c.field);
    mixStr(c.operator);
    mix(c.enabled ? 1 : 0);
    // Hash the value — cover common types without full serialization
    const v = c.value;
    if (typeof v === 'string') {
      mixStr(v);
    } else if (typeof v === 'number') {
      mix(v | 0);
      // Capture fractional part
      mix((v * 100000) | 0);
    } else if (typeof v === 'boolean') {
      mix(v ? 1 : 0);
    } else if (v === null || v === undefined) {
      mix(0);
    } else if (Array.isArray(v)) {
      mix(v.length);
      for (const el of v) {
        if (typeof el === 'string') mixStr(el);
        else if (typeof el === 'number') mix(el | 0);
        else mixStr(String(el));
      }
    } else if (typeof v === 'object') {
      // Range values ({min, max}) or other objects
      const keys = Object.keys(v as Record<string, unknown>);
      mix(keys.length);
      for (const k of keys) {
        mixStr(k);
        const ov = (v as Record<string, unknown>)[k];
        if (typeof ov === 'number') mix(ov | 0);
        else mixStr(String(ov));
      }
    }
    mixStr(c.valueType);
  }

  // Groups (recursive)
  const hashGroup = (g: FilterGroup) => {
    mixStr(g.id);
    mixStr(g.combinator);
    mix(g.enabled ? 1 : 0);
    mix(g.conditions.length);
    for (const c of g.conditions) {
      mixStr(c.id);
      mixStr(c.field);
      mixStr(c.operator);
      mix(c.enabled ? 1 : 0);
      const v = c.value;
      if (typeof v === 'string') mixStr(v);
      else if (typeof v === 'number') { mix(v | 0); mix((v * 100000) | 0); }
      else if (typeof v === 'boolean') mix(v ? 1 : 0);
      else if (Array.isArray(v)) { mix(v.length); for (const el of v) { if (typeof el === 'string') mixStr(el); else mix(Number(el) | 0); } }
      else if (v !== null && v !== undefined && typeof v === 'object') { const keys = Object.keys(v as Record<string, unknown>); mix(keys.length); for (const k of keys) { mixStr(k); const ov = (v as Record<string, unknown>)[k]; if (typeof ov === 'number') mix(ov | 0); else mixStr(String(ov)); } }
      else mix(0);
      mixStr(c.valueType);
    }
    mix(g.groups.length);
    for (const sg of g.groups) {
      hashGroup(sg);
    }
  };

  mix(config.groups.length);
  for (const g of config.groups) {
    hashGroup(g);
  }

  return h >>> 0; // Ensure unsigned 32-bit
}

/**
 * Create a memoized filter function.
 * Uses a fast structural hash for config comparison instead of JSON.stringify.
 * The hash makes the common hot-path (config changed every keystroke) near-zero
 * cost by detecting differences without serialization. Falls back to
 * JSON.stringify only when hashes collide (statistically rare with FNV-1a).
 */
export function createFilterMemo<T extends Record<string, unknown>>(
  options?: FilterEngineOptions
) {
  const engine = new FilterEngine<T>(options);
  let lastHash: number = -1;
  let lastConfigRef: FilterConfig | null = null;
  let lastConfigJson: string = '';
  let lastItems: T[] = [];
  let lastResult: FilterResult<T> | null = null;

  return (items: T[], config: FilterConfig): FilterResult<T> => {
    // Fastest path: exact same object references
    if (config === lastConfigRef && items === lastItems && lastResult) {
      return lastResult;
    }

    const hash = hashFilterConfig(config);

    if (hash === lastHash && items === lastItems && lastResult) {
      // Hash matches — fall back to JSON.stringify only on hash collision.
      // This path is rare: either config is truly unchanged (most likely)
      // or we have a hash collision (extremely unlikely with FNV-1a).
      const configJson = JSON.stringify(config);
      if (configJson === lastConfigJson) {
        lastConfigRef = config;
        return lastResult;
      }
      // Genuine hash collision — update all state and recompute
      lastConfigJson = configJson;
    } else {
      // Hash differs → config definitely changed, no stringify needed for comparison
      lastHash = hash;
      // Lazily store JSON for future collision checks
      lastConfigJson = JSON.stringify(config);
    }

    lastConfigRef = config;
    lastItems = items;
    lastResult = engine.apply(items, config);

    return lastResult;
  };
}

