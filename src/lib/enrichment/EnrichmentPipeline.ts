/**
 * EnrichmentPipeline
 *
 * Orchestrates the complete item enrichment process:
 * 1. Routes to appropriate data sources based on category
 * 2. Fetches data from multiple sources in parallel
 * 3. Normalizes and merges data from all sources
 * 4. Selects the best image
 * 5. Returns unified enrichment result
 */

import { DataNormalizer } from './DataNormalizer';
import {
  TMDBFetcher,
  IGDBFetcher,
  SpotifyFetcher,
  WikipediaFetcher,
} from './fetchers';
import { ImageSelector } from './ImageSelector';
import { SourceLatencyTracker } from './SourceLatencyTracker';
import { SourceRouter } from './SourceRouter';

import type {
  EnrichmentInput,
  EnrichmentResult,
  EnrichmentConfig,
  BatchEnrichmentRequest,
  BatchEnrichmentResult,
  RawSourceData,
  DataSource,
  EnrichmentCategory,
} from './types';

/**
 * Map of data sources to their fetchers
 */
const SOURCE_FETCHERS: Partial<Record<DataSource, { fetch: (input: EnrichmentInput) => Promise<RawSourceData>; isAvailable: () => boolean }>> = {
  tmdb: TMDBFetcher,
  igdb: IGDBFetcher,
  spotify: SpotifyFetcher,
  wikipedia: WikipediaFetcher,
};

class EnrichmentPipelineClass {
  private config: EnrichmentConfig;

  constructor(config?: Partial<EnrichmentConfig>) {
    // Import default config directly to avoid circular dependency
    this.config = {
      maxParallelSources: 3,
      sourceTimeoutMs: 10000,
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
        preferredAspectRatio: 0.67,
      },
      ...config,
    };
  }

  /**
   * Configure the pipeline
   */
  configure(config: Partial<EnrichmentConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): EnrichmentConfig {
    return { ...this.config };
  }

  /**
   * Fetch from a single source with timeout and timing instrumentation
   */
  private async fetchFromSource(
    source: DataSource,
    input: EnrichmentInput,
    config: EnrichmentConfig
  ): Promise<RawSourceData> {
    const fetcher = SOURCE_FETCHERS[source];

    if (!fetcher) {
      return {
        source,
        rawData: {},
        fetchedAt: Date.now(),
        confidence: 0,
        error: `No fetcher available for source: ${source}`,
      };
    }

    if (!fetcher.isAvailable()) {
      return {
        source,
        rawData: {},
        fetchedAt: Date.now(),
        confidence: 0,
        error: `Source ${source} is not available (missing credentials)`,
      };
    }

    const fetchStart = Date.now();

    // Create timeout promise. The handle is kept so the loser of the race can
    // be cancelled: an uncleared timer stayed live for the whole
    // sourceTimeoutMs after the source had already answered, and a batch
    // parked one of them per source per item.
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<RawSourceData>((resolve) => {
      timeoutHandle = setTimeout(() => {
        resolve({
          source,
          rawData: {},
          fetchedAt: Date.now(),
          confidence: 0,
          fetchDurationMs: Date.now() - fetchStart,
          error: `Timeout after ${config.sourceTimeoutMs}ms`,
        });
      }, config.sourceTimeoutMs);
    });

    // Race fetch against timeout
    try {
      const result = await Promise.race([fetcher.fetch(input), timeoutPromise]);
      const durationMs = Date.now() - fetchStart;
      result.fetchDurationMs = durationMs;

      // Record latency for histogram tracking
      SourceLatencyTracker.record(source, durationMs);

      // Track when a source exceeds 80% of the timeout threshold via SourceLatencyTracker

      return result;
    } catch (error) {
      const durationMs = Date.now() - fetchStart;
      SourceLatencyTracker.record(source, durationMs);

      return {
        source,
        rawData: {},
        fetchedAt: Date.now(),
        confidence: 0,
        fetchDurationMs: durationMs,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
    }
  }

  /**
   * Fetch from multiple sources in parallel (with concurrency limit)
   */
  private async fetchFromSources(
    sources: DataSource[],
    input: EnrichmentInput,
    config: EnrichmentConfig
  ): Promise<RawSourceData[]> {
    const results: RawSourceData[] = [];
    const chunks: DataSource[][] = [];

    // Split into chunks based on maxParallelSources
    for (let i = 0; i < sources.length; i += config.maxParallelSources) {
      chunks.push(sources.slice(i, i + config.maxParallelSources));
    }

    // Process chunks sequentially, sources within chunk in parallel
    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map((source) => this.fetchFromSource(source, input, config))
      );
      results.push(...chunkResults);

      // If we got a high-confidence result, we can stop early
      const highConfidence = chunkResults.find(
        (r) => r.confidence >= config.minConfidence && !r.error
      );
      if (highConfidence && results.filter((r) => !r.error).length >= 2) {
        break;
      }
    }

    return results;
  }

  /**
   * Enrich a single item
   */
  async enrich(input: EnrichmentInput): Promise<EnrichmentResult> {
    return this.enrichWith(input, this.config);
  }

  /**
   * Enrich a single item against an EXPLICIT config.
   *
   * The config travels with the call rather than through `this.config`:
   * enrichBatch used to assign its per-request overrides onto the singleton
   * and restore them at the end, so two batches -- or a batch and a plain
   * enrich -- in flight at once read each other's settings.
   */
  private async enrichWith(
    input: EnrichmentInput,
    config: EnrichmentConfig
  ): Promise<EnrichmentResult> {
    const startedAt = Date.now();
    const errors: Array<{ source: DataSource; error: string }> = [];

    try {
      // Get category and route to sources
      const category = SourceRouter.normalizeCategory(
        input.category,
        input.subcategory
      ) as EnrichmentCategory;
      const allSources = SourceRouter.getAllSources(input.category, input.subcategory);

      // Fetch from all sources
      const sourceResults = await this.fetchFromSources(allSources, input, config);

      // Collect errors
      for (const result of sourceResults) {
        if (result.error) {
          errors.push({ source: result.source, error: result.error });
        }
      }

      // Filter successful results
      const successfulResults = sourceResults.filter(
        (r) => !r.error && r.confidence > 0
      );

      // Build per-source timing breakdown
      const sourceTiming: Record<string, number> = {};
      for (const r of sourceResults) {
        sourceTiming[r.source] = r.fetchDurationMs ?? 0;
      }

      if (successfulResults.length === 0) {
        const completedAt = Date.now();
        return {
          success: false,
          input,
          sourcesUsed: [],
          sourceResults,
          errors,
          timing: {
            startedAt,
            completedAt,
            durationMs: completedAt - startedAt,
          },
        };
      }

      // Normalize and merge data
      const normalizedData = DataNormalizer.normalize(successfulResults, category);

      // Select best image
      if (normalizedData.images.length > 0) {
        normalizedData.selectedImage = ImageSelector.selectBest(
          normalizedData.images,
          config.preferredImageSize
        );
      }

      // Check if we have minimum required data
      const hasMinimumData = Boolean(
        normalizedData.name &&
        normalizedData.confidence >= config.minConfidence
      );

      const completedAt = Date.now();
      const durationMs = completedAt - startedAt;

      return {
        success: hasMinimumData,
        input,
        data: normalizedData,
        sourcesUsed: normalizedData.sources,
        sourceResults,
        errors,
        timing: {
          startedAt,
          completedAt,
          durationMs,
        },
      };
    } catch (error) {
      return {
        success: false,
        input,
        sourcesUsed: [],
        sourceResults: [],
        errors: [
          {
            source: 'wikipedia' as DataSource, // Placeholder
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
        timing: {
          startedAt,
          completedAt: Date.now(),
          durationMs: Date.now() - startedAt,
        },
      };
    }
  }

  /**
   * Enrich multiple items in batch
   */
  async enrichBatch(request: BatchEnrichmentRequest): Promise<BatchEnrichmentResult> {
    const startedAt = Date.now();

    // A local merged config, passed down the call chain. Nothing on the
    // singleton is written, so concurrent batches cannot read each other's
    // overrides.
    const batchConfig = request.config
      ? { ...this.config, ...request.config }
      : this.config;

    const results: EnrichmentResult[] = [];
    let successful = 0;
    let failed = 0;

    // Process items based on priority
    const items = [...request.items];
    if (request.priority === 'high') {
      // High priority - process all in parallel (up to limit)
      const chunks: EnrichmentInput[][] = [];
      for (let i = 0; i < items.length; i += 5) {
        chunks.push(items.slice(i, i + 5));
      }

      for (const chunk of chunks) {
        const chunkResults = await Promise.all(
          chunk.map((item) => this.enrichWith(item, batchConfig))
        );
        for (const result of chunkResults) {
          results.push(result);
          if (result.success) successful++;
          else failed++;
        }
      }
    } else {
      // Normal/low priority - process sequentially
      for (const item of items) {
        const result = await this.enrichWith(item, batchConfig);
        results.push(result);
        if (result.success) successful++;
        else failed++;
      }
    }

    const completedAt = Date.now();

    return {
      total: items.length,
      successful,
      failed,
      results,
      timing: {
        startedAt,
        completedAt,
        averagePerItem: items.length > 0 ? (completedAt - startedAt) / items.length : 0,
      },
    };
  }

  /**
   * Check which sources are available
   */
  getAvailableSources(): DataSource[] {
    const available: DataSource[] = [];

    Object.entries(SOURCE_FETCHERS).forEach(([source, fetcher]) => {
      if (fetcher && fetcher.isAvailable()) {
        available.push(source as DataSource);
      }
    });

    return available;
  }

  /**
   * Check if a specific source is available
   */
  isSourceAvailable(source: DataSource): boolean {
    const fetcher = SOURCE_FETCHERS[source];
    return fetcher ? fetcher.isAvailable() : false;
  }

  /**
   * Get sources that would be used for a category
   */
  getSourcesForCategory(
    category: string,
    subcategory?: string
  ): { primary: DataSource[]; fallback: DataSource[]; available: DataSource[] } {
    const routing = SourceRouter.getRouting(category, subcategory);
    const available = this.getAvailableSources();

    return {
      primary: routing.primary,
      fallback: routing.fallback,
      available: routing.primary
        .concat(routing.fallback)
        .filter((s) => available.includes(s)),
    };
  }
}

// Export singleton instance
export const EnrichmentPipeline = new EnrichmentPipelineClass();

// Export class for testing and custom instances
export { EnrichmentPipelineClass };
