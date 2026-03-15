/**
 * DataNormalizer
 *
 * Merges and standardizes data from multiple sources into a unified format.
 * Handles field mapping, conflict resolution, and confidence scoring.
 */

import type {
  DataSource,
  RawSourceData,
  NormalizedItemData,
  ImageMetadata,
  EnrichmentCategory,
} from './types';

/**
 * Source field mappings for each data source
 * Maps source-specific fields to normalized field names
 */
const SOURCE_FIELD_MAPPINGS: Record<DataSource, Record<string, string>> = {
  tmdb: {
    title: 'name',
    original_title: 'title',
    overview: 'description',
    release_date: 'releaseDate',
    first_air_date: 'releaseDate',
    runtime: 'runtime',
    vote_average: 'rating',
    genres: 'genres',
    poster_path: 'posterPath',
    backdrop_path: 'backdropPath',
    id: 'tmdbId',
    imdb_id: 'imdbId',
    number_of_seasons: 'seasons',
    number_of_episodes: 'episodes',
    status: 'status',
    networks: 'network',
  },
  igdb: {
    name: 'name',
    summary: 'description',
    storyline: 'description',
    first_release_date: 'releaseDate',
    rating: 'rating',
    genres: 'genres',
    cover: 'coverImage',
    screenshots: 'screenshots',
    involved_companies: 'companies',
    platforms: 'platforms',
    id: 'igdbId',
  },
  spotify: {
    name: 'name',
    album: 'album',
    artists: 'artist',
    release_date: 'releaseDate',
    duration_ms: 'duration',
    images: 'images',
    id: 'spotifyId',
    total_tracks: 'tracks',
  },
  wikipedia: {
    title: 'name',
    extract: 'description',
    pageid: 'wikipediaId',
    thumbnail: 'image',
  },
  gemini: {
    name: 'name',
    description: 'description',
    year: 'year',
    genres: 'genres',
  },
};

/**
 * Source priority for field conflicts (higher = more trusted)
 */
const SOURCE_PRIORITIES: Record<DataSource, number> = {
  tmdb: 90, // Very reliable for movies/TV
  igdb: 90, // Very reliable for games
  spotify: 90, // Very reliable for music
  wikipedia: 70, // General purpose, lower priority
  gemini: 50, // AI fallback, lowest priority
};

/**
 * Extract year from various date formats
 */
function extractYear(dateValue: unknown): number | undefined {
  if (!dateValue) return undefined;

  if (typeof dateValue === 'number') {
    // Unix timestamp
    if (dateValue > 1000000000) {
      return new Date(dateValue * 1000).getFullYear();
    }
    // Already a year
    if (dateValue > 1800 && dateValue < 2100) {
      return dateValue;
    }
  }

  if (typeof dateValue === 'string') {
    // ISO date or year string
    const yearMatch = dateValue.match(/^(\d{4})/);
    if (yearMatch) {
      return parseInt(yearMatch[1], 10);
    }
  }

  return undefined;
}

/**
 * Normalize rating to 0-10 scale
 */
function normalizeRating(
  rating: unknown,
  source: DataSource
): number | undefined {
  if (rating === null || rating === undefined) return undefined;

  const numRating = Number(rating);
  if (isNaN(numRating)) return undefined;

  // IGDB uses 0-100
  if (source === 'igdb') {
    return Math.round((numRating / 10) * 10) / 10;
  }

  // TMDB uses 0-10
  if (source === 'tmdb') {
    return Math.round(numRating * 10) / 10;
  }

  // Default: assume 0-10
  return Math.round(numRating * 10) / 10;
}

/**
 * Extract genres as string array
 */
function normalizeGenres(genres: unknown, source: DataSource): string[] {
  if (!genres) return [];

  if (Array.isArray(genres)) {
    return genres
      .map((g) => {
        if (typeof g === 'string') return g;
        if (typeof g === 'object' && g !== null) {
          return (g as Record<string, unknown>).name as string;
        }
        return null;
      })
      .filter((g): g is string => g !== null);
  }

  return [];
}

/**
 * Extract image from various source formats
 */
function extractImages(
  data: Record<string, unknown>,
  source: DataSource
): ImageMetadata[] {
  const images: ImageMetadata[] = [];

  if (source === 'tmdb') {
    const posterPath = data.poster_path as string;
    const backdropPath = data.backdrop_path as string;

    if (posterPath) {
      images.push({
        url: `https://image.tmdb.org/t/p/w500${posterPath}`,
        width: 500,
        height: 750,
        source,
        quality: 'high',
        aspectRatio: 0.67,
      });
    }

    if (backdropPath) {
      images.push({
        url: `https://image.tmdb.org/t/p/w1280${backdropPath}`,
        width: 1280,
        height: 720,
        source,
        quality: 'high',
        aspectRatio: 1.78,
      });
    }
  }

  if (source === 'igdb') {
    const cover = data.cover as { url?: string; image_id?: string } | undefined;
    if (cover?.image_id) {
      images.push({
        url: `https://images.igdb.com/igdb/image/upload/t_cover_big/${cover.image_id}.jpg`,
        width: 264,
        height: 374,
        source,
        quality: 'high',
        aspectRatio: 0.71,
      });
    }

    const screenshots = data.screenshots as
      | Array<{ image_id?: string }>
      | undefined;
    if (screenshots) {
      screenshots.forEach((ss) => {
        if (ss.image_id) {
          images.push({
            url: `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${ss.image_id}.jpg`,
            width: 889,
            height: 500,
            source,
            quality: 'medium',
            aspectRatio: 1.78,
          });
        }
      });
    }
  }

  if (source === 'spotify') {
    const albumImages = data.images as
      | Array<{ url: string; width?: number; height?: number }>
      | undefined;
    const album = data.album as { images?: typeof albumImages } | undefined;
    const sourceImages = albumImages || album?.images;

    if (sourceImages) {
      sourceImages.forEach((img) => {
        images.push({
          url: img.url,
          width: img.width,
          height: img.height,
          source,
          quality: img.width && img.width >= 300 ? 'high' : 'medium',
          aspectRatio: 1,
        });
      });
    }
  }

  if (source === 'wikipedia') {
    const thumbnail = data.thumbnail as
      | { source?: string; width?: number; height?: number }
      | undefined;
    if (thumbnail?.source) {
      images.push({
        url: thumbnail.source,
        width: thumbnail.width,
        height: thumbnail.height,
        source,
        quality: thumbnail.width && thumbnail.width >= 300 ? 'high' : 'low',
      });
    }
  }

  return images;
}

/**
 * Extract artist name from various formats
 */
function normalizeArtist(data: Record<string, unknown>, source: DataSource): string | undefined {
  if (source === 'spotify') {
    const artists = data.artists as Array<{ name: string }> | undefined;
    if (artists && artists.length > 0) {
      return artists.map((a) => a.name).join(', ');
    }
  }

  return undefined;
}

/**
 * Extract author from various formats
 */
function normalizeAuthor(data: Record<string, unknown>, _source: DataSource): string | undefined {
  const authors = data.authors as Array<{ name?: string }> | string[] | undefined;
  if (authors && authors.length > 0) {
    return authors.map((a) => (typeof a === 'string' ? a : a.name)).filter(Boolean).join(', ');
  }
  return undefined;
}

/**
 * Extract TV show status
 */
function normalizeStatus(
  status: unknown
): 'ongoing' | 'ended' | 'canceled' | undefined {
  if (!status || typeof status !== 'string') return undefined;

  const lower = status.toLowerCase();
  if (lower.includes('ended') || lower.includes('complete')) return 'ended';
  if (lower.includes('cancel')) return 'canceled';
  if (lower.includes('return') || lower.includes('ongoing') || lower.includes('running')) {
    return 'ongoing';
  }

  return undefined;
}

class DataNormalizerClass {
  /**
   * Normalize a single source's raw data
   */
  normalizeSource(
    sourceData: RawSourceData,
    category: EnrichmentCategory
  ): Partial<NormalizedItemData> {
    const { source, rawData } = sourceData;
    const data = rawData as Record<string, unknown>;
    const normalized: Partial<NormalizedItemData> = {};

    // Basic fields
    const nameField = data.name || data.title;
    if (nameField && typeof nameField === 'string') {
      normalized.name = nameField;
    }

    const titleField = data.original_title || data.title;
    if (titleField && typeof titleField === 'string') {
      normalized.title = titleField;
    }

    const descField = data.description || data.overview || data.summary || data.extract;
    if (descField && typeof descField === 'string') {
      normalized.description = descField;
    }

    // Temporal
    const dateField = data.release_date || data.first_air_date ||
      data.releaseDate || data.first_release_date || data.publish_date || data.date;
    normalized.year = extractYear(dateField);
    if (dateField && typeof dateField === 'string') {
      normalized.releaseDate = dateField;
    }

    // Rating
    normalized.rating = normalizeRating(data.rating || data.vote_average, source);

    // Genres
    normalized.genres = normalizeGenres(data.genres, source);

    // Images
    normalized.images = extractImages(data, source);

    // Category-specific normalization
    if (category === 'movies' || category === 'tv') {
      if (data.director) {
        normalized.director = String(data.director);
      }
      if (data.runtime && typeof data.runtime === 'number') {
        normalized.runtime = data.runtime;
      }
      if (data.cast && Array.isArray(data.cast)) {
        normalized.cast = data.cast
          .slice(0, 10)
          .map((c) => (typeof c === 'string' ? c : (c as { name?: string })?.name))
          .filter((c): c is string => Boolean(c));
      }
    }

    if (category === 'tv') {
      if (data.number_of_seasons) {
        normalized.seasons = Number(data.number_of_seasons);
      }
      if (data.number_of_episodes) {
        normalized.episodes = Number(data.number_of_episodes);
      }
      if (data.networks && Array.isArray(data.networks)) {
        normalized.network = (data.networks[0] as { name?: string })?.name;
      }
      normalized.status = normalizeStatus(data.status);
    }

    if (category === 'games') {
      const companies = data.involved_companies as
        | Array<{ company?: { name?: string }; developer?: boolean; publisher?: boolean }>
        | undefined;
      if (companies) {
        const dev = companies.find((c) => c.developer);
        const pub = companies.find((c) => c.publisher);
        if (dev?.company?.name) normalized.developer = dev.company.name;
        if (pub?.company?.name) normalized.publisher = pub.company.name;
      }

      if (data.platforms && Array.isArray(data.platforms)) {
        normalized.platforms = data.platforms
          .map((p) => (typeof p === 'string' ? p : (p as { name?: string })?.name))
          .filter((p): p is string => Boolean(p));
      }
    }

    if (category === 'music') {
      normalized.artist = normalizeArtist(data, source);

      if (data.album) {
        normalized.album = typeof data.album === 'string'
          ? data.album
          : (data.album as { name?: string })?.name;
      }

      if (data.duration_ms) {
        normalized.duration = Math.round(Number(data.duration_ms) / 1000);
      }

      if (data.total_tracks) {
        normalized.tracks = Number(data.total_tracks);
      }
    }

    if (category === 'books') {
      normalized.author = normalizeAuthor(data, source);

      if (data.number_of_pages || data.pageCount) {
        normalized.pages = Number(data.number_of_pages || data.pageCount);
      }

      // ISBN extraction
      if (data.isbn_13) {
        normalized.isbn = String(data.isbn_13);
      } else if (data.isbn_10) {
        normalized.isbn = String(data.isbn_10);
      } else if (data.industryIdentifiers && Array.isArray(data.industryIdentifiers)) {
        const isbn13 = data.industryIdentifiers.find(
          (id: { type?: string }) => id.type === 'ISBN_13'
        ) as { identifier?: string } | undefined;
        const isbn10 = data.industryIdentifiers.find(
          (id: { type?: string }) => id.type === 'ISBN_10'
        ) as { identifier?: string } | undefined;
        normalized.isbn = isbn13?.identifier || isbn10?.identifier;
      }
    }

    // External IDs
    normalized.externalIds = {};
    if (data.id && source === 'tmdb') {
      normalized.externalIds.tmdb = String(data.id);
    }
    if (data.imdb_id) {
      normalized.externalIds.imdb = String(data.imdb_id);
    }
    if (data.id && source === 'igdb') {
      normalized.externalIds.igdb = String(data.id);
    }
    if (data.id && source === 'spotify') {
      normalized.externalIds.spotify = String(data.id);
    }
    if (data.pageid && source === 'wikipedia') {
      normalized.externalIds.wikipedia = String(data.pageid);
    }
    if (normalized.isbn) {
      normalized.externalIds.isbn = normalized.isbn;
    }

    return normalized;
  }

  /**
   * Merge multiple normalized sources into final data
   * Uses source priority for conflict resolution
   */
  mergeSources(
    sources: Array<{ source: DataSource; data: Partial<NormalizedItemData>; confidence: number }>,
    category: EnrichmentCategory
  ): NormalizedItemData {
    // Sort by priority (highest first)
    const sortedSources = [...sources].sort(
      (a, b) => SOURCE_PRIORITIES[b.source] - SOURCE_PRIORITIES[a.source]
    );

    const merged: NormalizedItemData = {
      name: '',
      category,
      images: [],
      externalIds: {},
      sources: [],
      enrichedAt: Date.now(),
      confidence: 0,
      missingFields: [],
    };

    // Collect all images from all sources
    const allImages: ImageMetadata[] = [];

    // Merge fields by priority
    for (const { source, data, confidence } of sortedSources) {
      merged.sources.push(source);
      merged.confidence = Math.max(merged.confidence, confidence);

      // Only set field if not already set (first one wins due to priority sort)
      if (data.name && !merged.name) merged.name = data.name;
      if (data.title && !merged.title) merged.title = data.title;
      if (data.description && !merged.description) merged.description = data.description;
      if (data.year && !merged.year) merged.year = data.year;
      if (data.releaseDate && !merged.releaseDate) merged.releaseDate = data.releaseDate;
      if (data.rating && !merged.rating) merged.rating = data.rating;
      if (data.genres?.length && !merged.genres?.length) merged.genres = data.genres;
      if (data.director && !merged.director) merged.director = data.director;
      if (data.cast?.length && !merged.cast?.length) merged.cast = data.cast;
      if (data.runtime && !merged.runtime) merged.runtime = data.runtime;
      if (data.developer && !merged.developer) merged.developer = data.developer;
      if (data.publisher && !merged.publisher) merged.publisher = data.publisher;
      if (data.platforms?.length && !merged.platforms?.length) merged.platforms = data.platforms;
      if (data.artist && !merged.artist) merged.artist = data.artist;
      if (data.album && !merged.album) merged.album = data.album;
      if (data.tracks && !merged.tracks) merged.tracks = data.tracks;
      if (data.duration && !merged.duration) merged.duration = data.duration;
      if (data.seasons && !merged.seasons) merged.seasons = data.seasons;
      if (data.episodes && !merged.episodes) merged.episodes = data.episodes;
      if (data.network && !merged.network) merged.network = data.network;
      if (data.status && !merged.status) merged.status = data.status;
      if (data.author && !merged.author) merged.author = data.author;
      if (data.pages && !merged.pages) merged.pages = data.pages;
      if (data.isbn && !merged.isbn) merged.isbn = data.isbn;

      // Collect images
      if (data.images) {
        allImages.push(...data.images);
      }

      // Merge external IDs (collect all)
      if (data.externalIds) {
        merged.externalIds = { ...merged.externalIds, ...data.externalIds };
      }
    }

    merged.images = allImages;

    // Calculate missing fields
    merged.missingFields = this.calculateMissingFields(merged, category);

    return merged;
  }

  /**
   * Process raw source data through full normalization pipeline
   */
  normalize(
    rawSources: RawSourceData[],
    category: EnrichmentCategory
  ): NormalizedItemData {
    // Filter out errored sources
    const validSources = rawSources.filter((s) => !s.error && s.confidence > 0);

    if (validSources.length === 0) {
      return {
        name: '',
        category,
        images: [],
        externalIds: {},
        sources: [],
        enrichedAt: Date.now(),
        confidence: 0,
        missingFields: ['name', 'description'],
      };
    }

    // Normalize each source
    const normalizedSources = validSources.map((s) => ({
      source: s.source,
      data: this.normalizeSource(s, category),
      confidence: s.confidence,
    }));

    // Merge all sources
    return this.mergeSources(normalizedSources, category);
  }

  /**
   * Calculate which required fields are missing
   */
  calculateMissingFields(
    data: Partial<NormalizedItemData>,
    category: EnrichmentCategory
  ): string[] {
    const missing: string[] = [];

    // Universal required
    if (!data.name) missing.push('name');
    if (!data.description) missing.push('description');

    // Category-specific
    if (category === 'movies' || category === 'tv' || category === 'games') {
      if (!data.year) missing.push('year');
    }

    if (category === 'music') {
      if (!data.artist) missing.push('artist');
    }

    if (category === 'books') {
      if (!data.author) missing.push('author');
    }

    if (!data.images || data.images.length === 0) {
      missing.push('images');
    }

    return missing;
  }

  /**
   * Get source priority for a data source
   */
  getSourcePriority(source: DataSource): number {
    return SOURCE_PRIORITIES[source];
  }

  /**
   * Get field mappings for a source
   */
  getFieldMappings(source: DataSource): Record<string, string> {
    return SOURCE_FIELD_MAPPINGS[source];
  }
}

// Export singleton instance
export const DataNormalizer = new DataNormalizerClass();

// Export class for testing
export { DataNormalizerClass };
