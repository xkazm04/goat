import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  withErrorHandler,
  successResponse,
  badRequest,
} from '@/lib/errors';
import {
  fuzzyMatch,
  fuzzyMatchFields,
  recencyBoost,
  popularityBoost,
  combineScores,
} from '@/lib/search';
import type { SearchDomain, SearchFacet } from '@/lib/search';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Valid search domains
const VALID_DOMAINS: SearchDomain[] = ['lists', 'items', 'groups', 'blueprints', 'users'];

// Default limits
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// API-specific result type (simpler than client-side types)
interface ApiSearchResult {
  id: string;
  domain: SearchDomain;
  title: string;
  subtitle?: string;
  score: number;
  url: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}

interface ApiSearchSuggestion {
  text: string;
  type: 'completion' | 'correction' | 'related';
  confidence: number;
}

interface ApiSearchResponse {
  query: string;
  totalResults: number;
  results: ApiSearchResult[];
  resultsByDomain: Partial<Record<SearchDomain, ApiSearchResult[]>>;
  suggestions: ApiSearchSuggestion[];
  facets: SearchFacet[];
  executionTime: number;
}

/**
 * GET /api/search
 *
 * Universal search endpoint that searches across multiple domains.
 *
 * Query Parameters:
 * - q: Search query (required)
 * - domains: Comma-separated list of domains to search (optional, defaults to all)
 * - category: Filter by category (optional)
 * - limit: Maximum results per domain (optional, default 20, max 100)
 * - includeSuggestions: Include search suggestions (optional, default true)
 * - userId: Filter by user ID for personalized results (optional)
 *
 * Example:
 * GET /api/search?q=batman&domains=lists,items&limit=10
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const startTime = performance.now();
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;

  // Extract and validate query
  const query = searchParams.get('q')?.trim();
  if (!query || query.length < 1) {
    throw badRequest('Search query "q" is required');
  }

  // Parse domains
  const domainsParam = searchParams.get('domains');
  const domains: SearchDomain[] = domainsParam
    ? domainsParam.split(',').filter((d): d is SearchDomain => VALID_DOMAINS.includes(d as SearchDomain))
    : VALID_DOMAINS;

  if (domains.length === 0) {
    throw badRequest('At least one valid domain is required');
  }

  // Parse other options
  const category = searchParams.get('category');
  const limit = Math.min(
    parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT)),
    MAX_LIMIT
  );
  const includeSuggestions = searchParams.get('includeSuggestions') !== 'false';
  const userId = searchParams.get('userId');

  // Search all domains in parallel
  const searchPromises = domains.map(domain =>
    searchDomain(supabase, domain, query, { category, limit, userId })
  );

  const domainResults = await Promise.all(searchPromises);

  // Combine and score results
  const allResults: ApiSearchResult[] = [];
  const resultsByDomain: Partial<Record<SearchDomain, ApiSearchResult[]>> = {};
  const facetCounts: Record<string, Record<string, number>> = {
    category: {},
    year: {},
  };

  domains.forEach((domain, index) => {
    const results = domainResults[index];
    resultsByDomain[domain] = results;
    allResults.push(...results);

    // Count facets
    results.forEach(result => {
      const cat = result.metadata?.category;
      if (cat && typeof cat === 'string') {
        facetCounts.category[cat] = (facetCounts.category[cat] || 0) + 1;
      }
      const year = result.metadata?.year;
      if (year !== undefined && year !== null) {
        const yearStr = String(year);
        facetCounts.year[yearStr] = (facetCounts.year[yearStr] || 0) + 1;
      }
    });
  });

  // Sort by score
  allResults.sort((a, b) => b.score - a.score);

  // Build facets
  const facets: SearchFacet[] = [];
  if (Object.keys(facetCounts.category).length > 0) {
    facets.push({
      field: 'category',
      values: Object.entries(facetCounts.category)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
    });
  }
  if (Object.keys(facetCounts.year).length > 0) {
    facets.push({
      field: 'year',
      values: Object.entries(facetCounts.year)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => parseInt(b.value) - parseInt(a.value)),
    });
  }

  // Generate suggestions
  const suggestions = includeSuggestions ? generateSuggestions(query, allResults) : [];

  const response: ApiSearchResponse = {
    query,
    totalResults: allResults.length,
    results: allResults.slice(0, limit),
    resultsByDomain,
    suggestions,
    facets,
    executionTime: Math.round(performance.now() - startTime),
  };

  return successResponse(response);
});

/**
 * Search a specific domain
 */
async function searchDomain(
  supabase: Awaited<ReturnType<typeof createClient>>,
  domain: SearchDomain,
  query: string,
  options: { category?: string | null; limit: number; userId?: string | null }
): Promise<ApiSearchResult[]> {
  const queryLower = query.toLowerCase();

  switch (domain) {
    case 'lists':
      return searchLists(supabase, queryLower, options);
    case 'items':
      return searchItems(supabase, queryLower, options);
    case 'groups':
      return searchGroups(supabase, queryLower, options);
    case 'blueprints':
      return searchBlueprints(supabase, queryLower, options);
    case 'users':
      return searchUsers(supabase, queryLower, options);
    default:
      return [];
  }
}

/**
 * Search lists
 */
async function searchLists(
  supabase: Awaited<ReturnType<typeof createClient>>,
  query: string,
  options: { category?: string | null; limit: number; userId?: string | null }
): Promise<ApiSearchResult[]> {
  let dbQuery = supabase
    .from('lists')
    .select('id, title, description, category, subcategory, created_at, user_id')
    .ilike('title', `%${query}%`)
    .order('created_at', { ascending: false })
    .limit(options.limit * 2); // Fetch more to allow for scoring/filtering

  if (options.category) {
    dbQuery = dbQuery.eq('category', options.category);
  }

  const { data, error } = await dbQuery;
  if (error || !data) return [];

  return data.map(list => {
    const matchResult = fuzzyMatchFields(query, [
      { text: list.title || '', weight: 1.0 },
      { text: list.description || '', weight: 0.5 },
      { text: list.category || '', weight: 0.3 },
    ]);

    const baseScore = matchResult.score;
    const recency = recencyBoost(list.created_at);
    const isUserList = !!(options.userId && list.user_id === options.userId);

    return {
      id: list.id,
      domain: 'lists' as const,
      title: list.title || 'Untitled List',
      subtitle: list.category ? `${list.category}${list.subcategory ? ` • ${list.subcategory}` : ''}` : undefined,
      score: combineScores([
        { score: baseScore, weight: 0.7 },
        { score: recency, weight: 0.2 },
        { score: isUserList ? 1 : 0, weight: 0.1 },
      ]),
      url: `/list/${list.id}`,
      imageUrl: undefined,
      metadata: {
        category: list.category,
        subcategory: list.subcategory,
        isUserList,
      },
    };
  }).sort((a, b) => b.score - a.score).slice(0, options.limit);
}

/**
 * Search items (from top_items table)
 */
async function searchItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  query: string,
  options: { category?: string | null; limit: number; userId?: string | null }
): Promise<ApiSearchResult[]> {
  const dbQuery = supabase
    .from('top_items')
    .select('id, name, group_id, image_url')
    .ilike('name', `%${query}%`)
    .limit(options.limit * 2);

  const { data, error } = await dbQuery;
  if (error || !data) return [];

  return data.map(item => {
    const matchResult = fuzzyMatch(query, (item.name || '').toLowerCase());

    return {
      id: item.id,
      domain: 'items' as const,
      title: item.name || 'Unknown Item',
      subtitle: undefined,
      score: matchResult.score,
      url: `/item/${item.id}`,
      imageUrl: item.image_url || undefined,
      metadata: {
        groupId: item.group_id,
      },
    };
  }).sort((a, b) => b.score - a.score).slice(0, options.limit);
}

/**
 * Search groups (item collections/categories)
 */
async function searchGroups(
  supabase: Awaited<ReturnType<typeof createClient>>,
  query: string,
  options: { category?: string | null; limit: number; userId?: string | null }
): Promise<ApiSearchResult[]> {
  let dbQuery = supabase
    .from('top_groups')
    .select('id, name, category, subcategory, description, item_count')
    .ilike('name', `%${query}%`)
    .limit(options.limit * 2);

  if (options.category) {
    dbQuery = dbQuery.eq('category', options.category);
  }

  const { data, error } = await dbQuery;
  if (error || !data) return [];

  return data.map(group => {
    const matchResult = fuzzyMatchFields(query, [
      { text: group.name || '', weight: 1.0 },
      { text: group.description || '', weight: 0.5 },
      { text: group.category || '', weight: 0.3 },
    ]);

    const popularity = popularityBoost(group.item_count || 0, 0.15, 500);

    return {
      id: group.id,
      domain: 'groups' as const,
      title: group.name || 'Unknown Collection',
      subtitle: `${group.item_count || 0} items${group.category ? ` • ${group.category}` : ''}`,
      score: combineScores([
        { score: matchResult.score, weight: 0.8 },
        { score: popularity, weight: 0.2 },
      ]),
      url: `/collection/${group.id}`,
      metadata: {
        category: group.category,
        subcategory: group.subcategory,
        itemCount: group.item_count,
      },
    };
  }).sort((a, b) => b.score - a.score).slice(0, options.limit);
}

/**
 * Search blueprints
 */
async function searchBlueprints(
  supabase: Awaited<ReturnType<typeof createClient>>,
  query: string,
  options: { category?: string | null; limit: number; userId?: string | null }
): Promise<ApiSearchResult[]> {
  let dbQuery = supabase
    .from('blueprints')
    .select('id, slug, title, description, category')
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .limit(options.limit * 2);

  if (options.category) {
    dbQuery = dbQuery.eq('category', options.category);
  }

  const { data, error } = await dbQuery;
  if (error || !data) return [];

  return data.map(blueprint => {
    const matchResult = fuzzyMatchFields(query, [
      { text: blueprint.title || '', weight: 1.0 },
      { text: blueprint.description || '', weight: 0.5 },
    ]);

    return {
      id: blueprint.id,
      domain: 'blueprints' as const,
      title: blueprint.title || 'Untitled Blueprint',
      subtitle: blueprint.category || undefined,
      score: matchResult.score,
      url: `/blueprint/${blueprint.slug || blueprint.id}`,
      metadata: {
        category: blueprint.category,
        slug: blueprint.slug,
      },
    };
  }).sort((a, b) => b.score - a.score).slice(0, options.limit);
}

/**
 * Search users (basic implementation - expand as needed)
 */
async function searchUsers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  query: string,
  options: { category?: string | null; limit: number; userId?: string | null }
): Promise<ApiSearchResult[]> {
  // Users search is a placeholder - implement based on your user table structure
  // For now, return empty results
  return [];
}

/**
 * Generate search suggestions based on results
 */
function generateSuggestions(
  query: string,
  results: ApiSearchResult[]
): ApiSearchSuggestion[] {
  const suggestions: ApiSearchSuggestion[] = [];
  const seen = new Set<string>();

  // Add completions from top results
  results.slice(0, 5).forEach(result => {
    const title = result.title.toLowerCase();
    if (title.includes(query) && title !== query && !seen.has(title)) {
      seen.add(title);
      suggestions.push({ text: result.title, type: 'completion', confidence: result.score });
    }
  });

  // Add related category suggestions
  const categories = new Set<string>();
  results.forEach(result => {
    const cat = result.metadata?.category;
    if (cat && typeof cat === 'string') {
      categories.add(cat);
    }
  });

  categories.forEach(category => {
    const suggestion = `${query} ${category.toLowerCase()}`;
    if (!seen.has(suggestion)) {
      seen.add(suggestion);
      suggestions.push({ text: suggestion, type: 'related', confidence: 0.5 });
    }
  });

  return suggestions.slice(0, 5);
}
