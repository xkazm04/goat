/**
 * TMDBFetcher
 *
 * Fetches movie and TV data from The Movie Database (TMDB) API.
 * Primary source for movies and TV shows.
 */

import type { RawSourceData, EnrichmentInput } from '../types';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';

interface TMDBSearchResult {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
  media_type?: string;
}

interface TMDBDetailResult extends TMDBSearchResult {
  runtime?: number;
  episode_run_time?: number[];
  genres: Array<{ id: number; name: string }>;
  imdb_id?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
  networks?: Array<{ name: string }>;
  credits?: {
    cast: Array<{ name: string; character: string; order: number }>;
    crew: Array<{ name: string; job: string; department: string }>;
  };
}

/**
 * Calculate string similarity for matching
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;

  // Simple word overlap
  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));

  let overlap = 0;
  words1.forEach((word) => {
    if (words2.has(word)) overlap++;
  });

  return overlap / Math.max(words1.size, words2.size);
}

class TMDBFetcherClass {
  private apiKey: string | null = null;

  /**
   * Initialize with API key
   */
  initialize(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Get API key from environment or initialization
   */
  private getApiKey(): string {
    const key = this.apiKey || process.env.TMDB_API_KEY;
    if (!key) {
      throw new Error('TMDB API key not configured');
    }
    return key;
  }

  /**
   * Make authenticated request to TMDB
   */
  private async request<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const apiKey = this.getApiKey();
    const url = new URL(`${TMDB_API_BASE}${endpoint}`);
    url.searchParams.set('api_key', apiKey);

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Search for movies
   */
  async searchMovies(query: string, year?: number): Promise<TMDBSearchResult[]> {
    const params: Record<string, string> = { query };
    if (year) params.year = String(year);

    const response = await this.request<{ results: TMDBSearchResult[] }>(
      '/search/movie',
      params
    );

    return response.results;
  }

  /**
   * Search for TV shows
   */
  async searchTV(query: string, year?: number): Promise<TMDBSearchResult[]> {
    const params: Record<string, string> = { query };
    if (year) params.first_air_date_year = String(year);

    const response = await this.request<{ results: TMDBSearchResult[] }>(
      '/search/tv',
      params
    );

    return response.results;
  }

  /**
   * Multi-search (movies, TV, people)
   */
  async multiSearch(query: string): Promise<TMDBSearchResult[]> {
    const response = await this.request<{ results: TMDBSearchResult[] }>(
      '/search/multi',
      { query }
    );

    // Filter to only movies and TV
    return response.results.filter(
      (r) => r.media_type === 'movie' || r.media_type === 'tv'
    );
  }

  /**
   * Get movie details with credits
   */
  async getMovieDetails(id: number): Promise<TMDBDetailResult> {
    return this.request<TMDBDetailResult>(
      `/movie/${id}`,
      { append_to_response: 'credits' }
    );
  }

  /**
   * Get TV show details with credits
   */
  async getTVDetails(id: number): Promise<TMDBDetailResult> {
    return this.request<TMDBDetailResult>(
      `/tv/${id}`,
      { append_to_response: 'credits' }
    );
  }

  /**
   * Find best match from search results
   */
  private findBestMatch(
    results: TMDBSearchResult[],
    input: EnrichmentInput
  ): { result: TMDBSearchResult; confidence: number } | null {
    if (results.length === 0) return null;

    let bestMatch: TMDBSearchResult | null = null;
    let bestConfidence = 0;

    for (const result of results) {
      const title = result.title || result.name || '';
      let confidence = calculateSimilarity(title, input.name);

      // Boost if year matches
      if (input.hints?.year) {
        const resultYear = result.release_date || result.first_air_date;
        if (resultYear) {
          const year = parseInt(resultYear.substring(0, 4), 10);
          if (year === input.hints.year) {
            confidence = Math.min(1, confidence + 0.2);
          } else if (Math.abs(year - input.hints.year) <= 1) {
            confidence = Math.min(1, confidence + 0.1);
          }
        }
      }

      // Consider popularity as tiebreaker
      confidence += (result.popularity / 1000) * 0.05;

      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestMatch = result;
      }
    }

    if (!bestMatch || bestConfidence < 0.3) {
      return null;
    }

    return { result: bestMatch, confidence: Math.min(1, bestConfidence) };
  }

  /**
   * Fetch enrichment data for a movie
   */
  async fetchMovie(input: EnrichmentInput): Promise<RawSourceData> {
    const startTime = Date.now();

    try {
      // Search for movie
      const searchResults = await this.searchMovies(input.name, input.hints?.year);
      const match = this.findBestMatch(searchResults, input);

      if (!match) {
        return {
          source: 'tmdb',
          rawData: {},
          fetchedAt: Date.now(),
          confidence: 0,
          error: 'No matching movie found',
        };
      }

      // Get full details
      const details = await this.getMovieDetails(match.result.id);

      // Extract director and cast
      let director: string | undefined;
      const cast: string[] = [];

      if (details.credits) {
        const directorCredit = details.credits.crew.find((c) => c.job === 'Director');
        if (directorCredit) director = directorCredit.name;

        for (const actor of details.credits.cast.slice(0, 10)) {
          cast.push(actor.name);
        }
      }

      return {
        source: 'tmdb',
        rawData: {
          ...details,
          director,
          cast,
        },
        fetchedAt: Date.now(),
        confidence: match.confidence,
      };
    } catch (error) {
      return {
        source: 'tmdb',
        rawData: {},
        fetchedAt: Date.now(),
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fetch enrichment data for a TV show
   */
  async fetchTV(input: EnrichmentInput): Promise<RawSourceData> {
    try {
      // Search for TV show
      const searchResults = await this.searchTV(input.name, input.hints?.year);
      const match = this.findBestMatch(searchResults, input);

      if (!match) {
        return {
          source: 'tmdb',
          rawData: {},
          fetchedAt: Date.now(),
          confidence: 0,
          error: 'No matching TV show found',
        };
      }

      // Get full details
      const details = await this.getTVDetails(match.result.id);

      // Extract creator and cast
      const cast: string[] = [];
      if (details.credits) {
        for (const actor of details.credits.cast.slice(0, 10)) {
          cast.push(actor.name);
        }
      }

      return {
        source: 'tmdb',
        rawData: {
          ...details,
          cast,
        },
        fetchedAt: Date.now(),
        confidence: match.confidence,
      };
    } catch (error) {
      return {
        source: 'tmdb',
        rawData: {},
        fetchedAt: Date.now(),
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fetch data based on category
   */
  async fetch(input: EnrichmentInput): Promise<RawSourceData> {
    const category = input.category.toLowerCase();

    if (category === 'movies' || category === 'movie' || category === 'film') {
      return this.fetchMovie(input);
    }

    if (category === 'tv' || category === 'television' || category === 'series') {
      return this.fetchTV(input);
    }

    // Try multi-search as fallback
    try {
      const results = await this.multiSearch(input.name);
      const match = this.findBestMatch(results, input);

      if (!match) {
        return {
          source: 'tmdb',
          rawData: {},
          fetchedAt: Date.now(),
          confidence: 0,
          error: 'No matching content found',
        };
      }

      // Get details based on media type
      if (match.result.media_type === 'movie') {
        return this.fetchMovie(input);
      } else {
        return this.fetchTV(input);
      }
    } catch (error) {
      return {
        source: 'tmdb',
        rawData: {},
        fetchedAt: Date.now(),
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if TMDB is available (API key configured)
   */
  isAvailable(): boolean {
    try {
      this.getApiKey();
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const TMDBFetcher = new TMDBFetcherClass();

// Export class for testing
export { TMDBFetcherClass };
