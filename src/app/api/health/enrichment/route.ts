/**
 * Enrichment Sources Health Check Endpoint
 *
 * Probes external enrichment data sources (TMDB, Wikipedia, IGDB, Spotify)
 * to verify their availability and measure latency. Uses lightweight requests
 * (HEAD or minimal API calls) to avoid unnecessary load.
 *
 * Returns per-source status with latency measurements and an overall status.
 *
 * GET /api/health/enrichment
 */

import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SourceStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unconfigured';

interface SourceHealth {
  status: SourceStatus;
  latencyMs: number;
  error?: string;
}

interface EnrichmentHealthResponse {
  status: SourceStatus;
  sources: {
    tmdb: SourceHealth;
    wikipedia: SourceHealth;
    igdb: SourceHealth;
    spotify: SourceHealth;
  };
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Probe helpers
// ---------------------------------------------------------------------------

const PROBE_TIMEOUT_MS = 8_000;
const DEGRADED_THRESHOLD_MS = 3_000;

/**
 * Generic fetch probe with timeout and latency measurement.
 */
async function probe(
  url: string,
  init?: RequestInit
): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const latencyMs = Date.now() - start;

    if (!response.ok) {
      return {
        ok: false,
        latencyMs,
        error: `HTTP ${response.status} ${response.statusText}`,
      };
    }

    return { ok: true, latencyMs };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

function toSourceHealth(result: {
  ok: boolean;
  latencyMs: number;
  error?: string;
}): SourceHealth {
  if (!result.ok) {
    return {
      status: 'unhealthy',
      latencyMs: result.latencyMs,
      error: result.error,
    };
  }

  return {
    status: result.latencyMs > DEGRADED_THRESHOLD_MS ? 'degraded' : 'healthy',
    latencyMs: result.latencyMs,
  };
}

// ---------------------------------------------------------------------------
// Per-source probes (lightweight)
// ---------------------------------------------------------------------------

/**
 * TMDB: Hit the /configuration endpoint (no search, minimal data).
 * Requires TMDB_API_KEY env var.
 */
async function probeTMDB(): Promise<SourceHealth> {
  const apiKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
  if (!apiKey) {
    return { status: 'unconfigured', latencyMs: 0, error: 'TMDB_API_KEY not set' };
  }

  const result = await probe(
    `https://api.themoviedb.org/3/configuration?api_key=${apiKey}`
  );
  return toSourceHealth(result);
}

/**
 * Wikipedia: Hit the MediaWiki API with a minimal siteinfo query.
 * No API key required.
 */
async function probeWikipedia(): Promise<SourceHealth> {
  const result = await probe(
    'https://en.wikipedia.org/w/api.php?action=query&meta=siteinfo&format=json'
  );
  return toSourceHealth(result);
}

/**
 * IGDB: Probe requires Twitch OAuth. If credentials missing, report unconfigured.
 * We just check if the token endpoint responds rather than doing a full auth flow.
 */
async function probeIGDB(): Promise<SourceHealth> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return { status: 'unconfigured', latencyMs: 0, error: 'TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET not set' };
  }

  // Probe the Twitch token endpoint with a minimal request
  const result = await probe('https://id.twitch.tv/oauth2/validate', {
    headers: { 'Client-Id': clientId },
  });

  // A 401 from validate means the endpoint is reachable (we just don't have a token)
  // That's still "healthy" from a connectivity standpoint
  if (!result.ok && result.error?.includes('401')) {
    return {
      status: result.latencyMs > DEGRADED_THRESHOLD_MS ? 'degraded' : 'healthy',
      latencyMs: result.latencyMs,
    };
  }

  return toSourceHealth(result);
}

/**
 * Spotify: Probe the Spotify accounts endpoint.
 * If credentials are missing, report unconfigured.
 */
async function probeSpotify(): Promise<SourceHealth> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return { status: 'unconfigured', latencyMs: 0, error: 'SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET not set' };
  }

  // Probe the token endpoint with an OPTIONS-like lightweight request
  const result = await probe('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`,
  });

  return toSourceHealth(result);
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

function overallStatus(sources: EnrichmentHealthResponse['sources']): SourceStatus {
  const statuses = Object.values(sources).map((s) => s.status);
  // Ignore unconfigured sources in overall assessment
  const configured = statuses.filter((s) => s !== 'unconfigured');
  if (configured.length === 0) return 'unconfigured';
  if (configured.includes('unhealthy')) return 'unhealthy';
  if (configured.includes('degraded')) return 'degraded';
  return 'healthy';
}

export async function GET() {
  const [tmdb, wikipedia, igdb, spotify] = await Promise.all([
    probeTMDB(),
    probeWikipedia(),
    probeIGDB(),
    probeSpotify(),
  ]);

  const sources = { tmdb, wikipedia, igdb, spotify };
  const status = overallStatus(sources);

  const response: EnrichmentHealthResponse = {
    status,
    sources,
    timestamp: Date.now(),
  };

  const httpStatus = status === 'unhealthy' ? 503 : 200;

  return NextResponse.json(response, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
