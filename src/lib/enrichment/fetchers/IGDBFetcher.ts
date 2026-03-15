/**
 * IGDBFetcher
 *
 * Fetches game data from the IGDB (Internet Game Database) API.
 * Primary source for video game information.
 *
 * Note: IGDB requires Twitch OAuth authentication.
 */

import type { RawSourceData, EnrichmentInput } from '../types';
import { calculateSimilarity } from '../utils/string-similarity';

const IGDB_API_BASE = 'https://api.igdb.com/v4';
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';

interface IGDBGame {
  id: number;
  name: string;
  summary?: string;
  storyline?: string;
  rating?: number;
  aggregated_rating?: number;
  first_release_date?: number;
  cover?: {
    id: number;
    image_id: string;
    url: string;
    width?: number;
    height?: number;
  };
  screenshots?: Array<{
    id: number;
    image_id: string;
  }>;
  genres?: Array<{
    id: number;
    name: string;
  }>;
  platforms?: Array<{
    id: number;
    name: string;
    abbreviation?: string;
  }>;
  involved_companies?: Array<{
    id: number;
    company: {
      id: number;
      name: string;
    };
    developer: boolean;
    publisher: boolean;
  }>;
  websites?: Array<{
    id: number;
    url: string;
    category: number;
  }>;
  similar_games?: number[];
}

class IGDBFetcherClass {
  private clientId: string | null = null;
  private clientSecret: string | null = null;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  /**
   * Initialize with Twitch credentials
   */
  initialize(clientId: string, clientSecret: string): void {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /**
   * Get Twitch client credentials from environment or initialization
   */
  private getCredentials(): { clientId: string; clientSecret: string } {
    const clientId = this.clientId || process.env.TWITCH_CLIENT_ID;
    const clientSecret = this.clientSecret || process.env.TWITCH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('IGDB/Twitch credentials not configured');
    }

    return { clientId, clientSecret };
  }

  /**
   * Get or refresh access token
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    const { clientId, clientSecret } = this.getCredentials();

    const response = await fetch(TWITCH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get Twitch access token: ${response.status}`);
    }

    const data = await response.json();
    const token = data.access_token as string;
    this.accessToken = token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000;

    return token;
  }

  /**
   * Make authenticated request to IGDB
   */
  private async request<T>(endpoint: string, body: string): Promise<T> {
    const { clientId } = this.getCredentials();
    const accessToken = await this.getAccessToken();

    const response = await fetch(`${IGDB_API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'text/plain',
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`IGDB API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Search for games
   */
  async searchGames(query: string, limit: number = 10): Promise<IGDBGame[]> {
    const body = `
      search "${query.replace(/"/g, '\\"')}";
      fields name, summary, storyline, rating, aggregated_rating, first_release_date,
             cover.image_id, cover.width, cover.height,
             screenshots.image_id,
             genres.name,
             platforms.name, platforms.abbreviation,
             involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
             websites.url, websites.category;
      limit ${limit};
    `;

    return this.request<IGDBGame[]>('/games', body);
  }

  /**
   * Get game by ID with full details
   */
  async getGameById(id: number): Promise<IGDBGame | null> {
    const body = `
      fields name, summary, storyline, rating, aggregated_rating, first_release_date,
             cover.image_id, cover.width, cover.height,
             screenshots.image_id,
             genres.name,
             platforms.name, platforms.abbreviation,
             involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
             websites.url, websites.category,
             similar_games;
      where id = ${id};
    `;

    const results = await this.request<IGDBGame[]>('/games', body);
    return results[0] || null;
  }

  /**
   * Find best match from search results
   */
  private findBestMatch(
    results: IGDBGame[],
    input: EnrichmentInput
  ): { result: IGDBGame; confidence: number } | null {
    if (results.length === 0) return null;

    let bestMatch: IGDBGame | null = null;
    let bestConfidence = 0;

    for (const result of results) {
      let confidence = calculateSimilarity(result.name, input.name);

      // Boost if year matches
      if (input.hints?.year && result.first_release_date) {
        const releaseYear = new Date(result.first_release_date * 1000).getFullYear();
        if (releaseYear === input.hints.year) {
          confidence = Math.min(1, confidence + 0.2);
        } else if (Math.abs(releaseYear - input.hints.year) <= 1) {
          confidence = Math.min(1, confidence + 0.1);
        }
      }

      // Boost for higher rated games (likely more popular/correct)
      const rating = result.aggregated_rating || result.rating;
      if (rating) {
        confidence += (rating / 100) * 0.05;
      }

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
   * Fetch enrichment data for a game
   */
  async fetch(input: EnrichmentInput): Promise<RawSourceData> {
    try {
      // Search for game
      const searchResults = await this.searchGames(input.name);
      const match = this.findBestMatch(searchResults, input);

      if (!match) {
        return {
          source: 'igdb',
          rawData: {},
          fetchedAt: Date.now(),
          confidence: 0,
          error: 'No matching game found',
        };
      }

      // Use the full rating (prefer aggregated)
      const rating = match.result.aggregated_rating || match.result.rating;

      // Format data for normalization
      const rawData = {
        id: match.result.id,
        name: match.result.name,
        summary: match.result.summary,
        storyline: match.result.storyline,
        rating: rating,
        first_release_date: match.result.first_release_date,
        cover: match.result.cover,
        screenshots: match.result.screenshots,
        genres: match.result.genres,
        platforms: match.result.platforms,
        involved_companies: match.result.involved_companies,
        websites: match.result.websites,
      };

      return {
        source: 'igdb',
        rawData,
        fetchedAt: Date.now(),
        confidence: match.confidence,
      };
    } catch (error) {
      return {
        source: 'igdb',
        rawData: {},
        fetchedAt: Date.now(),
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if IGDB is available (credentials configured)
   */
  isAvailable(): boolean {
    try {
      this.getCredentials();
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const IGDBFetcher = new IGDBFetcherClass();

// Export class for testing
export { IGDBFetcherClass };
