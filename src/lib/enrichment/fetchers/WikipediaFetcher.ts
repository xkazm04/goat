/**
 * WikipediaFetcher
 *
 * Fetches general information from Wikipedia API.
 * Used as a fallback source for all categories and primary
 * source for sports and general content.
 *
 * No API key required - uses the free MediaWiki API.
 */

import { calculateSimilarity } from '../utils/string-similarity';

import type { RawSourceData, EnrichmentInput } from '../types';

const WIKIPEDIA_API_BASE = 'https://en.wikipedia.org/w/api.php';

interface WikipediaSearchResult {
  pageid: number;
  title: string;
  snippet: string;
}

interface WikipediaPage {
  pageid: number;
  title: string;
  extract?: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  pageimage?: string;
  categories?: Array<{ title: string }>;
  links?: Array<{ title: string }>;
}

interface WikipediaParseResult {
  title: string;
  pageid: number;
  text?: { '*': string };
  categories?: Array<{ '*': string }>;
  images?: string[];
  sections?: Array<{ line: string; index: string }>;
}

/**
 * Strip HTML tags from text
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Clean up Wikipedia extract
 */
function cleanExtract(extract: string): string {
  // Remove common noise patterns
  let cleaned = extract
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Limit length
  if (cleaned.length > 2000) {
    cleaned = cleaned.substring(0, 2000);
    const lastPeriod = cleaned.lastIndexOf('.');
    if (lastPeriod > 1500) {
      cleaned = cleaned.substring(0, lastPeriod + 1);
    }
  }

  return cleaned;
}

class WikipediaFetcherClass {
  /**
   * Make request to Wikipedia API
   */
  private async request<T>(params: Record<string, string>): Promise<T> {
    const url = new URL(WIKIPEDIA_API_BASE);
    url.searchParams.set('format', 'json');
    url.searchParams.set('origin', '*');

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Wikipedia API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Search for pages
   */
  async search(query: string, limit: number = 10): Promise<WikipediaSearchResult[]> {
    const result = await this.request<{
      query?: { search?: WikipediaSearchResult[] };
    }>({
      action: 'query',
      list: 'search',
      srsearch: query,
      srlimit: String(limit),
    });

    return result.query?.search || [];
  }

  /**
   * Get page summary and thumbnail
   */
  async getPageSummary(title: string): Promise<WikipediaPage | null> {
    const result = await this.request<{
      query?: { pages?: Record<string, WikipediaPage> };
    }>({
      action: 'query',
      titles: title,
      prop: 'extracts|pageimages|categories',
      exintro: '1',
      explaintext: '1',
      piprop: 'thumbnail',
      pithumbsize: '500',
      cllimit: '50',
    });

    if (!result.query?.pages) return null;

    const pages = Object.values(result.query.pages);
    const page = pages[0];

    // Check if page exists (missing pages have no pageid or pageid = -1)
    if (!page || page.pageid === undefined || page.pageid < 0) {
      return null;
    }

    return page;
  }

  /**
   * Get full page extract
   */
  async getPageExtract(title: string): Promise<string | null> {
    const result = await this.request<{
      query?: { pages?: Record<string, { extract?: string }> };
    }>({
      action: 'query',
      titles: title,
      prop: 'extracts',
      explaintext: '1',
      exsectionformat: 'plain',
    });

    if (!result.query?.pages) return null;

    const pages = Object.values(result.query.pages);
    return pages[0]?.extract || null;
  }

  /**
   * Get page images
   */
  async getPageImages(title: string): Promise<string[]> {
    const result = await this.request<{
      query?: { pages?: Record<string, { images?: Array<{ title: string }> }> };
    }>({
      action: 'query',
      titles: title,
      prop: 'images',
      imlimit: '20',
    });

    if (!result.query?.pages) return [];

    const pages = Object.values(result.query.pages);
    const images = pages[0]?.images || [];

    // Filter out non-image files
    return images
      .map((img) => img.title)
      .filter((title) => /\.(jpg|jpeg|png|gif|svg)$/i.test(title));
  }

  /**
   * Find best match from search results
   */
  private findBestMatch(
    results: WikipediaSearchResult[],
    input: EnrichmentInput
  ): { result: WikipediaSearchResult; confidence: number } | null {
    if (results.length === 0) return null;

    let bestMatch: WikipediaSearchResult | null = null;
    let bestConfidence = 0;

    for (const result of results) {
      let confidence = calculateSimilarity(result.title, input.name);

      // Check snippet for category hints
      const snippet = result.snippet.toLowerCase();
      const category = input.category.toLowerCase();

      if (category === 'movies' || category === 'film') {
        if (snippet.includes('film') || snippet.includes('movie')) {
          confidence = Math.min(1, confidence + 0.15);
        }
      }

      if (category === 'games') {
        if (snippet.includes('video game') || snippet.includes('game')) {
          confidence = Math.min(1, confidence + 0.15);
        }
      }

      if (category === 'music') {
        if (snippet.includes('album') || snippet.includes('musician') || snippet.includes('band')) {
          confidence = Math.min(1, confidence + 0.15);
        }
      }

      if (category === 'books') {
        if (snippet.includes('book') || snippet.includes('novel') || snippet.includes('author')) {
          confidence = Math.min(1, confidence + 0.15);
        }
      }

      if (category === 'sports') {
        if (snippet.includes('athlete') || snippet.includes('player') || snippet.includes('sports')) {
          confidence = Math.min(1, confidence + 0.15);
        }
      }

      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestMatch = result;
      }
    }

    if (!bestMatch || bestConfidence < 0.25) {
      return null;
    }

    return { result: bestMatch, confidence: Math.min(1, bestConfidence) };
  }

  /**
   * Build search query with category context
   */
  private buildSearchQuery(input: EnrichmentInput): string {
    const name = input.name;
    const category = input.category.toLowerCase();

    // Add category disambiguation
    const categoryTerms: Record<string, string[]> = {
      movies: ['film'],
      tv: ['TV series', 'television'],
      games: ['video game'],
      music: ['album', 'band', 'musician'],
      books: ['novel', 'book'],
      sports: ['athlete', 'player'],
    };

    const terms = categoryTerms[category];
    if (terms && terms.length > 0) {
      // Try with disambiguation first
      return `${name} ${terms[0]}`;
    }

    return name;
  }

  /**
   * Fetch enrichment data from Wikipedia
   */
  async fetch(input: EnrichmentInput): Promise<RawSourceData> {
    try {
      // Search with category context
      const query = this.buildSearchQuery(input);
      const searchResults = await this.search(query);

      // If no results with category, try plain name
      let match = this.findBestMatch(searchResults, input);
      if (!match) {
        const plainResults = await this.search(input.name);
        match = this.findBestMatch(plainResults, input);
      }

      if (!match) {
        return {
          source: 'wikipedia',
          rawData: {},
          fetchedAt: Date.now(),
          confidence: 0,
          error: 'No matching Wikipedia page found',
        };
      }

      // Get page summary
      const page = await this.getPageSummary(match.result.title);

      if (!page) {
        return {
          source: 'wikipedia',
          rawData: {},
          fetchedAt: Date.now(),
          confidence: 0,
          error: 'Failed to fetch page details',
        };
      }

      const rawData: Record<string, unknown> = {
        pageid: page.pageid,
        title: page.title,
        extract: page.extract ? cleanExtract(page.extract) : undefined,
        thumbnail: page.thumbnail,
        categories: page.categories?.map((c) => c.title.replace('Category:', '')),
      };

      return {
        source: 'wikipedia',
        rawData,
        fetchedAt: Date.now(),
        confidence: match.confidence,
      };
    } catch (error) {
      return {
        source: 'wikipedia',
        rawData: {},
        fetchedAt: Date.now(),
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if Wikipedia is available (always true - no auth required)
   */
  isAvailable(): boolean {
    return true;
  }
}

// Export singleton instance
export const WikipediaFetcher = new WikipediaFetcherClass();

// Export class for testing
export { WikipediaFetcherClass };
