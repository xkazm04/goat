/**
 * Search System Types
 *
 * Type definitions for the unified cross-feature search system.
 */

// =============================================================================
// Search Domain Types
// =============================================================================

export type SearchDomain = 'lists' | 'items' | 'groups' | 'blueprints' | 'users';

export interface SearchDomainConfig {
  /** Human-readable label */
  label: string;
  /** Icon name for display */
  icon: string;
  /** Whether this domain is enabled */
  enabled: boolean;
  /** Default weight for ranking */
  weight: number;
  /** Maximum results to return */
  maxResults: number;
}

export const SEARCH_DOMAINS: Record<SearchDomain, SearchDomainConfig> = {
  lists: {
    label: 'Lists',
    icon: 'List',
    enabled: true,
    weight: 1.0,
    maxResults: 10,
  },
  items: {
    label: 'Items',
    icon: 'Film',
    enabled: true,
    weight: 0.8,
    maxResults: 15,
  },
  groups: {
    label: 'Collections',
    icon: 'FolderOpen',
    enabled: true,
    weight: 0.7,
    maxResults: 8,
  },
  blueprints: {
    label: 'Blueprints',
    icon: 'Layout',
    enabled: true,
    weight: 0.9,
    maxResults: 8,
  },
  users: {
    label: 'Users',
    icon: 'User',
    enabled: false, // Disabled by default until user search is implemented
    weight: 0.5,
    maxResults: 5,
  },
};

// =============================================================================
// Search Result Types
// =============================================================================

/** Base interface for all search results */
export interface BaseSearchResult {
  /** Unique identifier */
  id: string;
  /** Search domain */
  domain: SearchDomain;
  /** Display title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Optional description */
  description?: string;
  /** Optional image URL */
  imageUrl?: string;
  /** Category for filtering */
  category?: string;
  /** Subcategory for filtering */
  subcategory?: string;
  /** Relevance score (0-1) */
  score: number;
  /** Navigation URL */
  url: string;
  /** Timestamp for recency ranking */
  timestamp?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/** List search result */
export interface ListSearchResult extends BaseSearchResult {
  domain: 'lists';
  metadata?: {
    size?: number;
    itemCount?: number;
    userId?: string;
    isUserList?: boolean;
    timePeriod?: string;
  };
}

/** Item search result */
export interface ItemSearchResult extends BaseSearchResult {
  domain: 'items';
  metadata?: {
    year?: number;
    groupId?: string;
    groupName?: string;
    selectionCount?: number;
  };
}

/** Group search result */
export interface GroupSearchResult extends BaseSearchResult {
  domain: 'groups';
  metadata?: {
    itemCount?: number;
  };
}

/** Blueprint search result */
export interface BlueprintSearchResult extends BaseSearchResult {
  domain: 'blueprints';
  metadata?: {
    size?: number;
    author?: string;
    authorId?: string;
    usageCount?: number;
    isFeatured?: boolean;
  };
}

/** User search result */
export interface UserSearchResult extends BaseSearchResult {
  domain: 'users';
  metadata?: {
    listCount?: number;
    avatarUrl?: string;
  };
}

/** Union type for all search results */
export type SearchResult =
  | ListSearchResult
  | ItemSearchResult
  | GroupSearchResult
  | BlueprintSearchResult
  | UserSearchResult;

// =============================================================================
// Search Options & Response Types
// =============================================================================

export interface SearchOptions {
  /** Domains to search in (all enabled domains if not specified) */
  domains?: SearchDomain[];
  /** Category filter */
  category?: string;
  /** Subcategory filter */
  subcategory?: string;
  /** Maximum results per domain */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Minimum relevance score (0-1) */
  minScore?: number;
  /** Whether to include suggestions */
  includeSuggestions?: boolean;
  /** User ID for personalized results */
  userId?: string;
  /** Signal for cancellation */
  signal?: AbortSignal;
}

export interface SearchSuggestion {
  /** Suggestion text */
  text: string;
  /** Source domain */
  domain?: SearchDomain;
  /** Confidence score (0-1) */
  confidence: number;
}

export interface SearchFacet {
  /** Facet field name */
  field: string;
  /** Facet values with counts */
  values: Array<{
    value: string;
    count: number;
  }>;
}

export interface SearchResponse {
  /** Search query */
  query: string;
  /** Total results count */
  totalResults: number;
  /** Results grouped by domain */
  results: SearchResult[];
  /** Results by domain for easier access */
  resultsByDomain: Partial<Record<SearchDomain, SearchResult[]>>;
  /** Search suggestions */
  suggestions: SearchSuggestion[];
  /** Available facets for filtering */
  facets: SearchFacet[];
  /** Search execution time in ms */
  executionTime: number;
  /** Whether more results are available */
  hasMore: boolean;
}

// =============================================================================
// Search History Types
// =============================================================================

export interface SearchHistoryEntry {
  /** Search query */
  query: string;
  /** Domains searched */
  domains: SearchDomain[];
  /** Timestamp */
  timestamp: number;
  /** Number of results */
  resultCount: number;
}

export interface RecentSearchEntry {
  /** Search query */
  query: string;
  /** When the search was performed */
  timestamp: number;
}

// =============================================================================
// Command Palette Filter Types
// =============================================================================

export type CommandFilter =
  | { type: 'domain'; value: SearchDomain }
  | { type: 'category'; value: string }
  | { type: 'user'; value: string };

export interface CommandPaletteState {
  /** Current search query */
  query: string;
  /** Active filters */
  filters: CommandFilter[];
  /** Selected result index */
  selectedIndex: number;
  /** Current mode */
  mode: 'search' | 'create' | 'filter';
}
