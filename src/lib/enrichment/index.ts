/**
 * Item Enrichment Pipeline
 *
 * Multi-source data enrichment system for automatically fetching
 * and normalizing item information from various APIs.
 *
 * Supported sources:
 * - TMDB: Movies and TV shows
 * - IGDB: Video games
 * - Spotify: Music (albums, artists)
 * - Wikipedia: General information (fallback for all categories)
 *
 * Usage:
 * ```typescript
 * import { EnrichmentPipeline } from '@/lib/enrichment';
 *
 * const result = await EnrichmentPipeline.enrich({
 *   name: 'The Matrix',
 *   category: 'movies',
 *   hints: { year: 1999 }
 * });
 *
 * if (result.success) {
 *   console.log(result.data);
 * }
 * ```
 */

// Main pipeline
export { EnrichmentPipeline, EnrichmentPipelineClass } from './EnrichmentPipeline';

// Core components
export { SourceRouter, SourceRouterClass } from './SourceRouter';
export { DataNormalizer, DataNormalizerClass } from './DataNormalizer';
export { ImageSelector, ImageSelectorClass } from './ImageSelector';

// Fetchers
export {
  TMDBFetcher,
  IGDBFetcher,
  SpotifyFetcher,
  WikipediaFetcher,
} from './fetchers';

// Types
export type {
  EnrichmentCategory,
  DataSource,
  ImageMetadata,
  RawSourceData,
  NormalizedItemData,
  EnrichmentInput,
  EnrichmentResult,
  EnrichmentConfig,
  BatchEnrichmentRequest,
  BatchEnrichmentResult,
  SourceRoutingConfig,
  EnrichmentFreshness,
} from './types';

export { DEFAULT_ENRICHMENT_CONFIG } from './types';
