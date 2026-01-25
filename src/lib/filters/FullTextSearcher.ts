/**
 * FullTextSearcher
 * Fuse.js wrapper for full-text fuzzy search on collection items
 */

import Fuse, { FuseResult, IFuseOptions, FuseResultMatch } from 'fuse.js';

/**
 * Configuration for the full-text searcher
 */
export interface FullTextSearchConfig {
  /** Fields to search in with optional weights */
  keys: Array<string | { name: string; weight: number }>;
  /** Fuzzy matching threshold (0 = exact, 1 = match anything) */
  threshold?: number;
  /** Minimum characters before searching */
  minMatchCharLength?: number;
  /** Include match information for highlighting */
  includeMatches?: boolean;
  /** Include score in results */
  includeScore?: boolean;
  /** Maximum results to return (0 = unlimited) */
  limit?: number;
  /** Use extended search syntax (AND, OR, exact match) */
  useExtendedSearch?: boolean;
  /** Ignore location of match in string */
  ignoreLocation?: boolean;
  /** Fine-tune location weighting */
  distance?: number;
}

/**
 * Default configuration optimized for collection items
 */
export const DEFAULT_SEARCH_CONFIG: FullTextSearchConfig = {
  keys: [
    { name: 'title', weight: 2 },
    { name: 'name', weight: 2 },
    { name: 'description', weight: 1 },
    { name: 'category', weight: 1.5 },
    { name: 'subcategory', weight: 1 },
    { name: 'tags', weight: 1.5 },
  ],
  threshold: 0.3,
  minMatchCharLength: 2,
  includeMatches: true,
  includeScore: true,
  limit: 100,
  useExtendedSearch: true,
  ignoreLocation: true,
  distance: 100,
};

/**
 * Search result with score and match information
 */
export interface SearchResultItem<T> {
  item: T;
  score: number; // 0-1, lower is better match
  refIndex: number;
  matches?: Array<{
    key: string;
    value: string;
    indices: Array<[number, number]>;
  }>;
}

/**
 * Search statistics
 */
export interface SearchStats {
  totalItems: number;
  matchedItems: number;
  executionTime: number;
  query: string;
}

/**
 * FullTextSearcher class
 * Provides fast, fuzzy full-text search with configurable options
 */
export class FullTextSearcher<T extends Record<string, unknown>> {
  private fuse: Fuse<T> | null = null;
  private items: T[] = [];
  private config: FullTextSearchConfig;
  private lastBuildTime: number = 0;

  constructor(config: Partial<FullTextSearchConfig> = {}) {
    this.config = { ...DEFAULT_SEARCH_CONFIG, ...config };
  }

  /**
   * Build the search index from items
   */
  buildIndex(items: T[]): void {
    const startTime = performance.now();

    this.items = items;

    const fuseOptions: IFuseOptions<T> = {
      keys: this.config.keys,
      threshold: this.config.threshold,
      minMatchCharLength: this.config.minMatchCharLength,
      includeMatches: this.config.includeMatches,
      includeScore: this.config.includeScore,
      useExtendedSearch: this.config.useExtendedSearch,
      ignoreLocation: this.config.ignoreLocation,
      distance: this.config.distance,
      // Performance optimizations
      shouldSort: true,
      findAllMatches: false,
      isCaseSensitive: false,
    };

    this.fuse = new Fuse(items, fuseOptions);
    this.lastBuildTime = performance.now() - startTime;
  }

  /**
   * Check if index is built
   */
  isIndexed(): boolean {
    return this.fuse !== null;
  }

  /**
   * Get the last index build time
   */
  getLastBuildTime(): number {
    return this.lastBuildTime;
  }

  /**
   * Search for items matching the query
   */
  search(query: string): { results: SearchResultItem<T>[]; stats: SearchStats } {
    const startTime = performance.now();

    if (!this.fuse || !query.trim()) {
      return {
        results: [],
        stats: {
          totalItems: this.items.length,
          matchedItems: 0,
          executionTime: performance.now() - startTime,
          query,
        },
      };
    }

    // Handle extended search syntax
    const searchQuery = this.prepareQuery(query);

    let fuseResults = this.fuse.search(searchQuery);

    // Apply limit
    if (this.config.limit && this.config.limit > 0) {
      fuseResults = fuseResults.slice(0, this.config.limit);
    }

    const results = fuseResults.map((result) => this.transformResult(result));

    return {
      results,
      stats: {
        totalItems: this.items.length,
        matchedItems: results.length,
        executionTime: performance.now() - startTime,
        query,
      },
    };
  }

  /**
   * Quick search returning just matched items (no score/match info)
   */
  quickSearch(query: string, limit?: number): T[] {
    if (!this.fuse || !query.trim()) {
      return [];
    }

    const searchQuery = this.prepareQuery(query);
    let results = this.fuse.search(searchQuery);

    if (limit && limit > 0) {
      results = results.slice(0, limit);
    }

    return results.map((r) => r.item);
  }

  /**
   * Get search suggestions based on partial query
   */
  getSuggestions(partial: string, maxSuggestions: number = 5): string[] {
    if (!partial.trim() || partial.length < 2) {
      return [];
    }

    const results = this.quickSearch(partial, maxSuggestions * 2);
    const suggestions = new Set<string>();

    // Extract unique titles/names that match
    for (const item of results) {
      const title = (item.title || item.name) as string | undefined;
      if (title && title.toLowerCase().includes(partial.toLowerCase())) {
        suggestions.add(title);
        if (suggestions.size >= maxSuggestions) break;
      }
    }

    return Array.from(suggestions);
  }

  /**
   * Filter items that match the query (returns all matching items)
   */
  filter(query: string): T[] {
    if (!this.fuse || !query.trim()) {
      return this.items;
    }

    const searchQuery = this.prepareQuery(query);
    return this.fuse.search(searchQuery).map((r) => r.item);
  }

  /**
   * Check if an item matches the query
   */
  matches(item: T, query: string): boolean {
    if (!query.trim()) return true;

    // Create a temporary Fuse instance for single item check
    const tempFuse = new Fuse([item], {
      keys: this.config.keys,
      threshold: this.config.threshold,
      useExtendedSearch: this.config.useExtendedSearch,
    });

    const searchQuery = this.prepareQuery(query);
    return tempFuse.search(searchQuery).length > 0;
  }

  /**
   * Update the configuration
   */
  updateConfig(config: Partial<FullTextSearchConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.items.length > 0) {
      this.buildIndex(this.items);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): FullTextSearchConfig {
    return { ...this.config };
  }

  /**
   * Clear the index
   */
  clear(): void {
    this.fuse = null;
    this.items = [];
  }

  /**
   * Prepare query for Fuse.js extended search
   * Supports:
   * - Simple terms: batman → searches all fields
   * - Exact match: "batman" → exact phrase match
   * - Field-specific: title:batman → search specific field
   * - OR: batman | superman → match either
   * - AND: batman superman → match both (default)
   * - NOT: !robin → exclude items matching robin
   */
  private prepareQuery(query: string): string {
    const trimmed = query.trim();

    // If already using extended syntax, return as-is
    if (this.hasExtendedSyntax(trimmed)) {
      return trimmed;
    }

    // Simple query - just return for basic fuzzy matching
    return trimmed;
  }

  /**
   * Check if query uses Fuse.js extended search syntax
   */
  private hasExtendedSyntax(query: string): boolean {
    return (
      query.includes('|') ||
      query.includes('!') ||
      query.includes("'") ||
      query.includes('^') ||
      query.includes('=') ||
      query.includes('$') ||
      /\w+:/.test(query)
    );
  }

  /**
   * Transform Fuse result to our format
   */
  private transformResult(result: FuseResult<T>): SearchResultItem<T> {
    const transformed: SearchResultItem<T> = {
      item: result.item,
      score: result.score ?? 0,
      refIndex: result.refIndex,
    };

    if (result.matches) {
      transformed.matches = result.matches.map((m: FuseResultMatch) => ({
        key: m.key || '',
        value: m.value || '',
        indices: (m.indices || []) as Array<[number, number]>,
      }));
    }

    return transformed;
  }
}

/**
 * Create a pre-configured searcher for collection items
 */
export function createCollectionSearcher<T extends Record<string, unknown>>(
  items?: T[],
  config?: Partial<FullTextSearchConfig>
): FullTextSearcher<T> {
  const searcher = new FullTextSearcher<T>(config);
  if (items) {
    searcher.buildIndex(items);
  }
  return searcher;
}

/**
 * Highlight matched text with markers
 */
export function highlightMatches(
  text: string,
  indices: Array<[number, number]>,
  marker: { start: string; end: string } = { start: '<mark>', end: '</mark>' }
): string {
  if (!indices || indices.length === 0) return text;

  // Sort indices by start position (descending) to process from end
  const sortedIndices = [...indices].sort((a, b) => b[0] - a[0]);

  let result = text;
  for (const [start, end] of sortedIndices) {
    result =
      result.slice(0, start) +
      marker.start +
      result.slice(start, end + 1) +
      marker.end +
      result.slice(end + 1);
  }

  return result;
}

/**
 * Default instance for convenience
 */
export const defaultSearcher = new FullTextSearcher();
