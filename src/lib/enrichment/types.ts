/**
 * Enrichment Pipeline Types
 *
 * Defines the data structures used throughout the item enrichment system.
 */

/**
 * Categories supported by the enrichment pipeline
 */
export type EnrichmentCategory =
  | 'movies'
  | 'tv'
  | 'games'
  | 'music'
  | 'books'
  | 'sports'
  | 'general';

/**
 * Data sources for enrichment
 */
export type DataSource =
  | 'tmdb'
  | 'igdb'
  | 'spotify'
  | 'wikipedia'
  | 'gemini';

/**
 * Image metadata for quality scoring
 */
export interface ImageMetadata {
  url: string;
  width?: number;
  height?: number;
  source: DataSource;
  quality?: 'low' | 'medium' | 'high';
  aspectRatio?: number;
}

/**
 * Raw data from a single source (before normalization)
 */
export interface RawSourceData {
  source: DataSource;
  rawData: Record<string, unknown>;
  fetchedAt: number;
  confidence: number; // 0-1, how confident we are in the match
  error?: string;
}

/**
 * Normalized item data (after merging multiple sources)
 */
export interface NormalizedItemData {
  // Core fields
  name: string;
  title?: string;
  description?: string;
  category: string;
  subcategory?: string;

  // Temporal
  year?: number;
  yearEnd?: number;
  releaseDate?: string;

  // Media
  images: ImageMetadata[];
  selectedImage?: ImageMetadata;

  // Category-specific
  director?: string;
  cast?: string[];
  runtime?: number; // minutes
  rating?: number; // 0-10
  genres?: string[];

  // Games
  developer?: string;
  publisher?: string;
  platforms?: string[];

  // Music
  artist?: string;
  album?: string;
  tracks?: number;
  duration?: number; // seconds

  // TV
  seasons?: number;
  episodes?: number;
  network?: string;
  status?: 'ongoing' | 'ended' | 'canceled';

  // Books
  author?: string;
  pages?: number;
  isbn?: string;

  // External references
  externalIds: {
    tmdb?: string;
    imdb?: string;
    igdb?: string;
    spotify?: string;
    wikipedia?: string;
    isbn?: string;
  };

  // Metadata
  sources: DataSource[];
  enrichedAt: number;
  confidence: number;
  missingFields: string[];
}

/**
 * Input for enrichment pipeline
 */
export interface EnrichmentInput {
  name: string;
  category: string;
  subcategory?: string;
  existingData?: Partial<NormalizedItemData>;
  hints?: {
    year?: number;
    director?: string;
    artist?: string;
    author?: string;
  };
}

/**
 * Output from enrichment pipeline
 */
export interface EnrichmentResult {
  success: boolean;
  input: EnrichmentInput;
  data?: NormalizedItemData;
  sourcesUsed: DataSource[];
  sourceResults: RawSourceData[];
  errors: Array<{ source: DataSource; error: string }>;
  timing: {
    startedAt: number;
    completedAt: number;
    durationMs: number;
  };
}

/**
 * Configuration for the enrichment pipeline
 */
export interface EnrichmentConfig {
  /** Maximum sources to query in parallel */
  maxParallelSources: number;
  /** Timeout per source in ms */
  sourceTimeoutMs: number;
  /** Minimum confidence to accept a match */
  minConfidence: number;
  /** Whether to use AI fallback */
  useAiFallback: boolean;
  /** Required fields per category */
  requiredFields: Record<string, string[]>;
  /** Preferred image dimensions */
  preferredImageSize: {
    minWidth: number;
    minHeight: number;
    preferredAspectRatio: number;
  };
}

/**
 * Default enrichment configuration
 */
export const DEFAULT_ENRICHMENT_CONFIG: EnrichmentConfig = {
  maxParallelSources: 3,
  sourceTimeoutMs: 10000, // 10 seconds
  minConfidence: 0.6,
  useAiFallback: true,
  requiredFields: {
    movies: ['year', 'description'],
    tv: ['year', 'description'],
    games: ['year', 'description'],
    music: ['artist', 'description'],
    books: ['author', 'description'],
    general: ['description'],
  },
  preferredImageSize: {
    minWidth: 300,
    minHeight: 300,
    preferredAspectRatio: 0.67, // 2:3 for posters
  },
};

/**
 * Source routing configuration per category
 */
export interface SourceRoutingConfig {
  primary: DataSource[];
  fallback: DataSource[];
}

/**
 * Batch enrichment request
 */
export interface BatchEnrichmentRequest {
  items: EnrichmentInput[];
  config?: Partial<EnrichmentConfig>;
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Batch enrichment result
 */
export interface BatchEnrichmentResult {
  total: number;
  successful: number;
  failed: number;
  results: EnrichmentResult[];
  timing: {
    startedAt: number;
    completedAt: number;
    averagePerItem: number;
  };
}

/**
 * Freshness tracking for re-enrichment
 */
export interface EnrichmentFreshness {
  itemId: string;
  lastEnrichedAt: number;
  sources: DataSource[];
  nextRefreshAt: number;
  refreshCount: number;
}
