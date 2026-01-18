/**
 * SearchEngine - Unified Cross-Feature Search
 *
 * Provides unified search across lists, items, groups, blueprints, and users
 * with relevance ranking, faceting, and suggestions.
 */

import { goatApi } from '@/lib/api';
import {
  fuzzyMatchFields,
  recencyBoost,
  popularityBoost,
  combineScores,
} from './fuzzy';
import type {
  SearchDomain,
  SearchOptions,
  SearchResponse,
  SearchResult,
  SearchSuggestion,
  SearchFacet,
  ListSearchResult,
  ItemSearchResult,
  GroupSearchResult,
  BlueprintSearchResult,
  SEARCH_DOMAINS,
} from './types';
import type { TopList } from '@/types/top-lists';
import type { Blueprint } from '@/types/blueprint';
import type {
  Item,
  ItemGroup,
  PaginatedResponse,
} from '@/lib/api/goat-api';

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_OPTIONS: SearchOptions = {
  limit: 10,
  offset: 0,
  minScore: 0.1,
  includeSuggestions: true,
};

// =============================================================================
// Result Transformers
// =============================================================================

function transformListToResult(
  list: TopList,
  score: number,
  userId?: string
): ListSearchResult {
  return {
    id: list.id,
    domain: 'lists',
    title: list.title,
    subtitle: [list.category, list.subcategory].filter(Boolean).join(' › '),
    description: list.time_period ? `${list.time_period}` : undefined,
    category: list.category,
    subcategory: list.subcategory,
    score,
    url: `/match-test?list=${list.id}`,
    timestamp: list.created_at,
    metadata: {
      size: list.size,
      userId: list.user_id,
      isUserList: userId ? list.user_id === userId : false,
      timePeriod: list.time_period,
    },
  };
}

function transformItemToResult(
  item: Item,
  score: number
): ItemSearchResult {
  return {
    id: item.id,
    domain: 'items',
    title: item.name,
    subtitle: [item.category, item.subcategory].filter(Boolean).join(' › '),
    description: item.item_year ? `${item.item_year}` : undefined,
    imageUrl: item.image_url,
    category: item.category,
    subcategory: item.subcategory,
    score,
    url: `/items/${item.id}`,
    timestamp: item.created_at,
    metadata: {
      year: item.item_year,
      groupId: item.group_id,
      selectionCount: item.selection_count,
    },
  };
}

function transformGroupToResult(
  group: ItemGroup,
  score: number
): GroupSearchResult {
  return {
    id: group.id,
    domain: 'groups',
    title: group.name,
    subtitle: [group.category, group.subcategory].filter(Boolean).join(' › '),
    description: group.item_count ? `${group.item_count} items` : undefined,
    imageUrl: group.image_url,
    category: group.category,
    subcategory: group.subcategory,
    score,
    url: `/collections/${group.id}`,
    timestamp: group.created_at,
    metadata: {
      itemCount: group.item_count,
    },
  };
}

function transformBlueprintToResult(
  blueprint: Blueprint,
  score: number
): BlueprintSearchResult {
  return {
    id: blueprint.id,
    domain: 'blueprints',
    title: blueprint.title,
    subtitle: [blueprint.category, blueprint.subcategory].filter(Boolean).join(' › '),
    description: blueprint.description || `Top ${blueprint.size}`,
    category: blueprint.category,
    subcategory: blueprint.subcategory,
    score,
    url: `/blueprints/${blueprint.slug || blueprint.id}`,
    timestamp: blueprint.createdAt,
    metadata: {
      size: blueprint.size,
      author: blueprint.author,
      authorId: blueprint.authorId,
      usageCount: blueprint.usageCount,
      isFeatured: blueprint.isFeatured,
    },
  };
}

// =============================================================================
// Domain Search Functions
// =============================================================================

async function searchLists(
  query: string,
  options: SearchOptions
): Promise<ListSearchResult[]> {
  try {
    // Fetch lists from API
    const [userLists, allLists] = await Promise.all([
      options.userId
        ? goatApi.lists.getByUser(options.userId, {
            category: options.category,
            subcategory: options.subcategory,
            limit: 50,
          })
        : Promise.resolve([]),
      goatApi.lists.search({
        category: options.category,
        subcategory: options.subcategory,
        search: query,
        limit: 100,
      }),
    ]);

    // Combine and dedupe
    const listMap = new Map<string, TopList>();
    for (const list of userLists) {
      listMap.set(list.id, list);
    }
    for (const list of allLists) {
      if (!listMap.has(list.id)) {
        listMap.set(list.id, list);
      }
    }

    // Score and filter
    const results: ListSearchResult[] = [];
    const limit = options.limit || DEFAULT_OPTIONS.limit!;
    const minScore = options.minScore || DEFAULT_OPTIONS.minScore!;

    for (const list of Array.from(listMap.values())) {
      const match = fuzzyMatchFields(query, [
        { text: list.title, weight: 1.0 },
        { text: list.category || '', weight: 0.7 },
        { text: list.subcategory || '', weight: 0.6 },
      ]);

      if (!match.matches || match.score < minScore) continue;

      // Apply boosts
      const finalScore = combineScores([
        { score: match.score, weight: 1.0 },
        { score: recencyBoost(list.created_at), weight: 0.2 },
        { score: options.userId && list.user_id === options.userId ? 0.3 : 0, weight: 0.3 },
      ]);

      results.push(transformListToResult(list, finalScore, options.userId));
    }

    // Sort by score and limit
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (error) {
    console.error('Search lists error:', error);
    return [];
  }
}

async function searchItems(
  query: string,
  options: SearchOptions
): Promise<ItemSearchResult[]> {
  try {
    const response = await goatApi.items.search({
      category: options.category,
      subcategory: options.subcategory,
      search: query,
      limit: 100,
    });

    const items = response.data || [];
    const results: ItemSearchResult[] = [];
    const limit = options.limit || DEFAULT_OPTIONS.limit!;
    const minScore = options.minScore || DEFAULT_OPTIONS.minScore!;

    for (const item of items) {
      const match = fuzzyMatchFields(query, [
        { text: item.name, weight: 1.0 },
        { text: item.category || '', weight: 0.5 },
        { text: item.subcategory || '', weight: 0.4 },
        { text: item.item_year?.toString() || '', weight: 0.3 },
      ]);

      if (!match.matches || match.score < minScore) continue;

      // Apply boosts
      const finalScore = combineScores([
        { score: match.score, weight: 1.0 },
        { score: popularityBoost(item.selection_count), weight: 0.3 },
        { score: recencyBoost(item.created_at, 0.1), weight: 0.1 },
      ]);

      results.push(transformItemToResult(item, finalScore));
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (error) {
    console.error('Search items error:', error);
    return [];
  }
}

async function searchGroups(
  query: string,
  options: SearchOptions
): Promise<GroupSearchResult[]> {
  try {
    const groups = await goatApi.groups.search({
      category: options.category,
      subcategory: options.subcategory,
      search: query,
      limit: 100,
    });

    const results: GroupSearchResult[] = [];
    const limit = options.limit || DEFAULT_OPTIONS.limit!;
    const minScore = options.minScore || DEFAULT_OPTIONS.minScore!;

    for (const group of groups) {
      const match = fuzzyMatchFields(query, [
        { text: group.name, weight: 1.0 },
        { text: group.category || '', weight: 0.6 },
        { text: group.subcategory || '', weight: 0.5 },
      ]);

      if (!match.matches || match.score < minScore) continue;

      // Apply boosts
      const finalScore = combineScores([
        { score: match.score, weight: 1.0 },
        { score: popularityBoost(group.item_count, 0.2, 50), weight: 0.3 },
      ]);

      results.push(transformGroupToResult(group, finalScore));
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (error) {
    console.error('Search groups error:', error);
    return [];
  }
}

async function searchBlueprints(
  query: string,
  options: SearchOptions
): Promise<BlueprintSearchResult[]> {
  try {
    const blueprints = await goatApi.blueprints.search({
      category: options.category,
      subcategory: options.subcategory,
      search: query,
      limit: 100,
    });

    const results: BlueprintSearchResult[] = [];
    const limit = options.limit || DEFAULT_OPTIONS.limit!;
    const minScore = options.minScore || DEFAULT_OPTIONS.minScore!;

    for (const blueprint of blueprints) {
      const match = fuzzyMatchFields(query, [
        { text: blueprint.title, weight: 1.0 },
        { text: blueprint.category || '', weight: 0.6 },
        { text: blueprint.subcategory || '', weight: 0.5 },
        { text: blueprint.description || '', weight: 0.3 },
      ]);

      if (!match.matches || match.score < minScore) continue;

      // Apply boosts
      const finalScore = combineScores([
        { score: match.score, weight: 1.0 },
        { score: blueprint.isFeatured ? 0.2 : 0, weight: 0.2 },
        { score: popularityBoost(blueprint.usageCount), weight: 0.2 },
        { score: recencyBoost(blueprint.createdAt, 0.1), weight: 0.1 },
      ]);

      results.push(transformBlueprintToResult(blueprint, finalScore));
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (error) {
    console.error('Search blueprints error:', error);
    return [];
  }
}

// =============================================================================
// Suggestion Generation
// =============================================================================

async function generateSuggestions(
  query: string,
  results: SearchResult[],
  options: SearchOptions
): Promise<SearchSuggestion[]> {
  const suggestions: SearchSuggestion[] = [];

  // Extract unique terms from results for suggestions
  const termCounts = new Map<string, { count: number; domain?: SearchDomain }>();

  for (const result of results.slice(0, 20)) {
    const words = result.title.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.length > 2 && !query.toLowerCase().includes(word)) {
        const existing = termCounts.get(word);
        termCounts.set(word, {
          count: (existing?.count || 0) + 1,
          domain: existing?.domain || result.domain,
        });
      }
    }
  }

  // Convert to suggestions
  for (const [term, data] of Array.from(termCounts.entries())) {
    if (data.count >= 2) {
      suggestions.push({
        text: `${query} ${term}`,
        domain: data.domain,
        confidence: Math.min(data.count / 10, 1),
      });
    }
  }

  // Try to get API suggestions if available
  try {
    const apiSuggestions = await goatApi.groups.getSuggestions(query, {
      category: options.category,
      limit: 5,
    });

    for (const text of apiSuggestions.suggestions) {
      if (!suggestions.some(s => s.text.toLowerCase() === text.toLowerCase())) {
        suggestions.push({
          text,
          domain: 'groups',
          confidence: 0.8,
        });
      }
    }
  } catch {
    // Ignore suggestion errors
  }

  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}

// =============================================================================
// Facet Generation
// =============================================================================

function generateFacets(results: SearchResult[]): SearchFacet[] {
  const facets: SearchFacet[] = [];

  // Domain facet
  const domainCounts = new Map<string, number>();
  for (const result of results) {
    domainCounts.set(result.domain, (domainCounts.get(result.domain) || 0) + 1);
  }
  facets.push({
    field: 'domain',
    values: Array.from(domainCounts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count),
  });

  // Category facet
  const categoryCounts = new Map<string, number>();
  for (const result of results) {
    if (result.category) {
      categoryCounts.set(result.category, (categoryCounts.get(result.category) || 0) + 1);
    }
  }
  facets.push({
    field: 'category',
    values: Array.from(categoryCounts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count),
  });

  return facets;
}

// =============================================================================
// Main Search Function
// =============================================================================

/**
 * Unified search across all domains
 */
export async function search(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  const startTime = performance.now();
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  // Handle empty query
  if (!query.trim()) {
    return {
      query,
      totalResults: 0,
      results: [],
      resultsByDomain: {},
      suggestions: [],
      facets: [],
      executionTime: 0,
      hasMore: false,
    };
  }

  // Determine which domains to search
  const domains = mergedOptions.domains || ['lists', 'items', 'groups', 'blueprints'];

  // Search all domains in parallel
  const searchPromises: Promise<SearchResult[]>[] = [];

  if (domains.includes('lists')) {
    searchPromises.push(searchLists(query, mergedOptions));
  }
  if (domains.includes('items')) {
    searchPromises.push(searchItems(query, mergedOptions));
  }
  if (domains.includes('groups')) {
    searchPromises.push(searchGroups(query, mergedOptions));
  }
  if (domains.includes('blueprints')) {
    searchPromises.push(searchBlueprints(query, mergedOptions));
  }

  // Wait for all searches
  const searchResults = await Promise.all(searchPromises);

  // Flatten and sort all results
  const allResults = searchResults.flat().sort((a, b) => b.score - a.score);

  // Group by domain
  const resultsByDomain: Partial<Record<SearchDomain, SearchResult[]>> = {};
  for (const result of allResults) {
    if (!resultsByDomain[result.domain]) {
      resultsByDomain[result.domain] = [];
    }
    resultsByDomain[result.domain]!.push(result);
  }

  // Generate suggestions
  const suggestions = mergedOptions.includeSuggestions
    ? await generateSuggestions(query, allResults, mergedOptions)
    : [];

  // Generate facets
  const facets = generateFacets(allResults);

  const executionTime = performance.now() - startTime;

  return {
    query,
    totalResults: allResults.length,
    results: allResults.slice(0, (mergedOptions.limit || 10) * domains.length),
    resultsByDomain,
    suggestions,
    facets,
    executionTime,
    hasMore: allResults.length > (mergedOptions.limit || 10) * domains.length,
  };
}

/**
 * Quick search for autocomplete (faster, fewer results)
 */
export async function quickSearch(
  query: string,
  options: Partial<SearchOptions> = {}
): Promise<SearchResult[]> {
  const result = await search(query, {
    ...options,
    limit: 5,
    includeSuggestions: false,
  });
  return result.results.slice(0, 10);
}

/**
 * Search within a single domain
 */
export async function searchDomain(
  domain: SearchDomain,
  query: string,
  options: Omit<SearchOptions, 'domains'> = {}
): Promise<SearchResult[]> {
  const result = await search(query, {
    ...options,
    domains: [domain],
  });
  return result.resultsByDomain[domain] || [];
}

// Export the SearchEngine as a singleton-like object
export const SearchEngine = {
  search,
  quickSearch,
  searchDomain,
};

export default SearchEngine;
