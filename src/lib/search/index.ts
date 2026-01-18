/**
 * Search Library
 *
 * Unified cross-feature search system for the GOAT application.
 *
 * @example
 * ```tsx
 * import { SearchEngine, useSearch, useQuickSearch } from '@/lib/search';
 *
 * // Direct API usage
 * const results = await SearchEngine.search('batman', {
 *   domains: ['lists', 'items'],
 *   category: 'Movies',
 *   limit: 10,
 * });
 *
 * // React hook usage
 * const { data, isLoading } = useSearch('batman');
 * const { suggestions } = useQuickSearch('bat');
 * ```
 */

// Types
export * from './types';

// Fuzzy matching utilities
export {
  fuzzyMatch,
  fuzzyMatchFields,
  highlightMatches,
  recencyBoost,
  popularityBoost,
  combineScores,
  type FuzzyMatchResult,
} from './fuzzy';

// Search engine
export {
  search,
  quickSearch,
  searchDomain,
  SearchEngine,
} from './SearchEngine';
