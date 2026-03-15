/**
 * SpotifyFetcher
 *
 * Fetches music data from the Spotify Web API.
 * Primary source for music information (albums, artists, tracks).
 *
 * Note: Spotify requires OAuth client credentials flow.
 */

import type { RawSourceData, EnrichmentInput } from '../types';
import { calculateSimilarity } from '../utils/string-similarity';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

interface SpotifyImage {
  url: string;
  width: number;
  height: number;
}

interface SpotifyArtist {
  id: string;
  name: string;
  images?: SpotifyImage[];
  genres?: string[];
  popularity?: number;
}

interface SpotifyAlbum {
  id: string;
  name: string;
  album_type: 'album' | 'single' | 'compilation';
  artists: SpotifyArtist[];
  images: SpotifyImage[];
  release_date: string;
  release_date_precision: 'year' | 'month' | 'day';
  total_tracks: number;
  genres?: string[];
  popularity?: number;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  popularity: number;
  track_number: number;
  disc_number: number;
}

interface SpotifySearchResult {
  albums?: { items: SpotifyAlbum[] };
  artists?: { items: SpotifyArtist[] };
  tracks?: { items: SpotifyTrack[] };
}

class SpotifyFetcherClass {
  private clientId: string | null = null;
  private clientSecret: string | null = null;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  /**
   * Initialize with Spotify credentials
   */
  initialize(clientId: string, clientSecret: string): void {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /**
   * Get credentials from environment or initialization
   */
  private getCredentials(): { clientId: string; clientSecret: string } {
    const clientId = this.clientId || process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = this.clientSecret || process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Spotify credentials not configured');
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
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`Failed to get Spotify access token: ${response.status}`);
    }

    const data = await response.json();
    const token = data.access_token as string;
    this.accessToken = token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000;

    return token;
  }

  /**
   * Make authenticated request to Spotify
   */
  private async request<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const accessToken = await this.getAccessToken();
    const url = new URL(`${SPOTIFY_API_BASE}${endpoint}`);

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Search for music
   */
  async search(
    query: string,
    types: ('album' | 'artist' | 'track')[] = ['album', 'artist', 'track'],
    limit: number = 10
  ): Promise<SpotifySearchResult> {
    return this.request<SpotifySearchResult>('/search', {
      q: query,
      type: types.join(','),
      limit: String(limit),
    });
  }

  /**
   * Get album details
   */
  async getAlbum(id: string): Promise<SpotifyAlbum> {
    return this.request<SpotifyAlbum>(`/albums/${id}`);
  }

  /**
   * Get artist details
   */
  async getArtist(id: string): Promise<SpotifyArtist> {
    return this.request<SpotifyArtist>(`/artists/${id}`);
  }

  /**
   * Get album tracks
   */
  async getAlbumTracks(id: string): Promise<{ items: SpotifyTrack[] }> {
    return this.request<{ items: SpotifyTrack[] }>(`/albums/${id}/tracks`);
  }

  /**
   * Find best album match
   */
  private findBestAlbumMatch(
    albums: SpotifyAlbum[],
    input: EnrichmentInput
  ): { result: SpotifyAlbum; confidence: number } | null {
    if (albums.length === 0) return null;

    let bestMatch: SpotifyAlbum | null = null;
    let bestConfidence = 0;

    for (const album of albums) {
      let confidence = calculateSimilarity(album.name, input.name);

      // Boost if artist matches hint
      if (input.hints?.artist) {
        const artistNames = album.artists.map((a) => a.name.toLowerCase());
        const hintArtist = input.hints.artist.toLowerCase();
        if (artistNames.some((name) => name.includes(hintArtist) || hintArtist.includes(name))) {
          confidence = Math.min(1, confidence + 0.3);
        }
      }

      // Boost if year matches
      if (input.hints?.year && album.release_date) {
        const year = parseInt(album.release_date.substring(0, 4), 10);
        if (year === input.hints.year) {
          confidence = Math.min(1, confidence + 0.15);
        }
      }

      // Prefer albums over singles/compilations
      if (album.album_type === 'album') {
        confidence = Math.min(1, confidence + 0.1);
      }

      // Consider popularity
      if (album.popularity) {
        confidence += (album.popularity / 100) * 0.05;
      }

      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestMatch = album;
      }
    }

    if (!bestMatch || bestConfidence < 0.3) {
      return null;
    }

    return { result: bestMatch, confidence: Math.min(1, bestConfidence) };
  }

  /**
   * Find best artist match
   */
  private findBestArtistMatch(
    artists: SpotifyArtist[],
    input: EnrichmentInput
  ): { result: SpotifyArtist; confidence: number } | null {
    if (artists.length === 0) return null;

    let bestMatch: SpotifyArtist | null = null;
    let bestConfidence = 0;

    for (const artist of artists) {
      let confidence = calculateSimilarity(artist.name, input.name);

      // Consider popularity
      if (artist.popularity) {
        confidence += (artist.popularity / 100) * 0.1;
      }

      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestMatch = artist;
      }
    }

    if (!bestMatch || bestConfidence < 0.5) {
      return null;
    }

    return { result: bestMatch, confidence: Math.min(1, bestConfidence) };
  }

  /**
   * Fetch enrichment data for an album
   */
  async fetchAlbum(input: EnrichmentInput): Promise<RawSourceData> {
    try {
      // Build search query - include artist hint if available
      let query = input.name;
      if (input.hints?.artist) {
        query = `album:${input.name} artist:${input.hints.artist}`;
      }

      const searchResults = await this.search(query, ['album']);
      const match = this.findBestAlbumMatch(searchResults.albums?.items || [], input);

      if (!match) {
        return {
          source: 'spotify',
          rawData: {},
          fetchedAt: Date.now(),
          confidence: 0,
          error: 'No matching album found',
        };
      }

      return {
        source: 'spotify',
        rawData: {
          id: match.result.id,
          name: match.result.name,
          album_type: match.result.album_type,
          artists: match.result.artists,
          images: match.result.images,
          release_date: match.result.release_date,
          total_tracks: match.result.total_tracks,
          genres: match.result.genres,
          popularity: match.result.popularity,
        },
        fetchedAt: Date.now(),
        confidence: match.confidence,
      };
    } catch (error) {
      return {
        source: 'spotify',
        rawData: {},
        fetchedAt: Date.now(),
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fetch enrichment data for an artist
   */
  async fetchArtist(input: EnrichmentInput): Promise<RawSourceData> {
    try {
      const searchResults = await this.search(input.name, ['artist']);
      const match = this.findBestArtistMatch(searchResults.artists?.items || [], input);

      if (!match) {
        return {
          source: 'spotify',
          rawData: {},
          fetchedAt: Date.now(),
          confidence: 0,
          error: 'No matching artist found',
        };
      }

      // Get full artist details
      const artist = await this.getArtist(match.result.id);

      return {
        source: 'spotify',
        rawData: {
          id: artist.id,
          name: artist.name,
          images: artist.images,
          genres: artist.genres,
          popularity: artist.popularity,
        },
        fetchedAt: Date.now(),
        confidence: match.confidence,
      };
    } catch (error) {
      return {
        source: 'spotify',
        rawData: {},
        fetchedAt: Date.now(),
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fetch data based on subcategory
   */
  async fetch(input: EnrichmentInput): Promise<RawSourceData> {
    const subcategory = input.subcategory?.toLowerCase();

    // If explicitly looking for an artist
    if (subcategory === 'artists' || subcategory === 'artist') {
      return this.fetchArtist(input);
    }

    // Default to album search
    return this.fetchAlbum(input);
  }

  /**
   * Check if Spotify is available (credentials configured)
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
export const SpotifyFetcher = new SpotifyFetcherClass();

// Export class for testing
export { SpotifyFetcherClass };
