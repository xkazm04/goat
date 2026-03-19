/**
 * SourceRouter
 *
 * Determines which data sources to query based on item category.
 * Routes requests to the most appropriate sources for each content type.
 */

import { resolveApiCategory } from '@/lib/config/category-config';

import type {
  EnrichmentCategory,
  DataSource,
  SourceRoutingConfig,
} from './types';

/**
 * Source routing configuration by category
 */
const SOURCE_ROUTES: Record<EnrichmentCategory, SourceRoutingConfig> = {
  movies: {
    primary: ['tmdb'],
    fallback: ['wikipedia', 'gemini'],
  },
  tv: {
    primary: ['tmdb'],
    fallback: ['wikipedia', 'gemini'],
  },
  games: {
    primary: ['igdb'],
    fallback: ['wikipedia', 'gemini'],
  },
  music: {
    primary: ['spotify'],
    fallback: ['wikipedia', 'gemini'],
  },
  books: {
    primary: ['wikipedia'],
    fallback: ['gemini'],
  },
  sports: {
    primary: ['wikipedia'],
    fallback: ['gemini'],
  },
  general: {
    primary: ['wikipedia'],
    fallback: ['gemini'],
  },
};

/**
 * Map raw category strings to enrichment categories
 */
const CATEGORY_MAP: Record<string, EnrichmentCategory> = {
  // Movies
  movies: 'movies',
  movie: 'movies',
  film: 'movies',
  films: 'movies',
  cinema: 'movies',

  // TV
  tv: 'tv',
  'tv shows': 'tv',
  'tv-shows': 'tv',
  television: 'tv',
  series: 'tv',
  'tv series': 'tv',

  // Games
  games: 'games',
  game: 'games',
  'video games': 'games',
  'video-games': 'games',
  gaming: 'games',

  // Music
  music: 'music',
  songs: 'music',
  albums: 'music',
  artists: 'music',

  // Books
  books: 'books',
  book: 'books',
  literature: 'books',
  novels: 'books',

  // Sports
  sports: 'sports',
  sport: 'sports',
  basketball: 'sports',
  'ice-hockey': 'sports',
  soccer: 'sports',
  football: 'sports',
  baseball: 'sports',
  hockey: 'sports',

  // General catch-all
  general: 'general',
  other: 'general',
};

/**
 * Subcategory to category mapping for more specific routing
 */
const SUBCATEGORY_OVERRIDES: Record<string, EnrichmentCategory> = {
  // These subcategories should be treated as their parent category
  action: 'movies',
  drama: 'movies',
  comedy: 'movies',
  'sci-fi': 'movies',
  documentary: 'movies',
  horror: 'movies',
  thriller: 'movies',

  // Music genres
  rock: 'music',
  pop: 'music',
  'hip-hop': 'music',
  electronic: 'music',
  classical: 'music',
  jazz: 'music',

  // Game genres
  rpg: 'games',
  strategy: 'games',
  fps: 'games',
  indie: 'games',
};

class SourceRouterClass {
  /**
   * Normalize a category string to an EnrichmentCategory
   */
  normalizeCategory(
    category: string,
    subcategory?: string
  ): EnrichmentCategory {
    // Resolve API aliases first so enrichment agrees with the backlog store
    // (e.g. "general" → "sports" before looking up the enrichment route).
    const resolved = resolveApiCategory(category);
    const lowerCategory = resolved.toLowerCase().trim();
    const lowerSubcategory = subcategory?.toLowerCase().trim();

    // Check subcategory override first
    if (lowerSubcategory && SUBCATEGORY_OVERRIDES[lowerSubcategory]) {
      return SUBCATEGORY_OVERRIDES[lowerSubcategory];
    }

    // Check category mapping
    if (CATEGORY_MAP[lowerCategory]) {
      return CATEGORY_MAP[lowerCategory];
    }

    // Try partial matching
    for (const [key, value] of Object.entries(CATEGORY_MAP)) {
      if (lowerCategory.includes(key) || key.includes(lowerCategory)) {
        return value;
      }
    }

    return 'general';
  }

  /**
   * Get the routing configuration for a category
   */
  getRouting(
    category: string,
    subcategory?: string
  ): SourceRoutingConfig {
    const normalizedCategory = this.normalizeCategory(category, subcategory);
    return SOURCE_ROUTES[normalizedCategory];
  }

  /**
   * Get all sources to query for a category (primary + fallback)
   */
  getAllSources(
    category: string,
    subcategory?: string
  ): DataSource[] {
    const routing = this.getRouting(category, subcategory);
    return [...routing.primary, ...routing.fallback];
  }

  /**
   * Get primary sources for a category
   */
  getPrimarySources(
    category: string,
    subcategory?: string
  ): DataSource[] {
    return this.getRouting(category, subcategory).primary;
  }

  /**
   * Get fallback sources for a category
   */
  getFallbackSources(
    category: string,
    subcategory?: string
  ): DataSource[] {
    return this.getRouting(category, subcategory).fallback;
  }

  /**
   * Check if a source is appropriate for a category
   */
  isSourceApplicable(
    source: DataSource,
    category: string,
    subcategory?: string
  ): boolean {
    const allSources = this.getAllSources(category, subcategory);
    return allSources.includes(source);
  }

  /**
   * Get the priority of a source for a category (lower = higher priority)
   */
  getSourcePriority(
    source: DataSource,
    category: string,
    subcategory?: string
  ): number {
    const routing = this.getRouting(category, subcategory);

    const primaryIndex = routing.primary.indexOf(source);
    if (primaryIndex !== -1) return primaryIndex;

    const fallbackIndex = routing.fallback.indexOf(source);
    if (fallbackIndex !== -1) return routing.primary.length + fallbackIndex;

    return 999; // Not applicable
  }

  /**
   * Sort sources by priority for a category
   */
  sortSourcesByPriority(
    sources: DataSource[],
    category: string,
    subcategory?: string
  ): DataSource[] {
    return [...sources].sort(
      (a, b) =>
        this.getSourcePriority(a, category, subcategory) -
        this.getSourcePriority(b, category, subcategory)
    );
  }

  /**
   * Get all supported categories
   */
  getSupportedCategories(): EnrichmentCategory[] {
    return Object.keys(SOURCE_ROUTES) as EnrichmentCategory[];
  }

  /**
   * Get all known category aliases
   */
  getCategoryAliases(): Record<string, EnrichmentCategory> {
    return { ...CATEGORY_MAP };
  }
}

// Export singleton instance
export const SourceRouter = new SourceRouterClass();

// Export class for testing
export { SourceRouterClass };
