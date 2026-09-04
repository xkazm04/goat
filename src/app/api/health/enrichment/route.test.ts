import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The health probe must read the SAME configuration as the code it reports on.
 *
 * TMDB enrichment reads exactly one name: `TMDB_API_KEY`
 * (src/lib/enrichment/fetchers/TMDBFetcher.ts, getApiKey). This route's TMDB
 * probe used to also accept `NEXT_PUBLIC_TMDB_API_KEY`, so an operator who set
 * only the public name got a probe reporting the source configured while every
 * actual fetch threw "TMDB API key not configured". The probe's own doc comment
 * and its error string both already said `TMDB_API_KEY`; the fallback was the
 * only line in this file that read two names, against four sibling probes that
 * read one.
 *
 * Applies presence-decides-precedence (software-engineering/settings): two names
 * for one setting resolve in one place, or the answer differs per call site.
 */

const ENV_KEYS = [
  'TMDB_API_KEY',
  'NEXT_PUBLIC_TMDB_API_KEY',
  'TWITCH_CLIENT_ID',
  'TWITCH_CLIENT_SECRET',
  'SPOTIFY_CLIENT_ID',
  'SPOTIFY_CLIENT_SECRET',
] as const;

const saved = new Map<string, string | undefined>();

beforeEach(() => {
  for (const k of ENV_KEYS) {
    saved.set(k, process.env[k]);
    delete process.env[k];
  }
  // No probe may reach the network in this suite. A probe that does is a test
  // asserting the internet's mood, not this route's configuration reading.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(null, { status: 200 })),
  );
});

afterEach(() => {
  for (const [k, v] of Array.from(saved.entries())) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  saved.clear();
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function tmdbStatus() {
  vi.resetModules();
  const { GET } = await import('./route');
  const res = await GET();
  const body = (await res.json()) as {
    sources: { tmdb: { status: string; error?: string } };
  };
  return body.sources.tmdb;
}

describe('enrichment health: TMDB key resolution matches the fetcher', () => {
  it('reports unconfigured when no key is set at all', async () => {
    const tmdb = await tmdbStatus();
    expect(tmdb.status).toBe('unconfigured');
  });

  it('reports a configured source when the server-only name is set', async () => {
    process.env.TMDB_API_KEY = 'server-only-value';
    const tmdb = await tmdbStatus();
    expect(tmdb.status).not.toBe('unconfigured');
  });

  it('reports unconfigured when ONLY the public name is set', async () => {
    // The fetcher never reads this name, so enrichment cannot work. A probe
    // that calls this configured disagrees with the code it is reporting on -
    // and it keeps a bundle-exposed variable alive as a supported way to
    // supply a secret.
    process.env.NEXT_PUBLIC_TMDB_API_KEY = 'public-bundle-value';
    const tmdb = await tmdbStatus();
    expect(tmdb.status).toBe('unconfigured');
  });

  it('never sends the public name as the api_key', async () => {
    process.env.NEXT_PUBLIC_TMDB_API_KEY = 'public-bundle-value';
    await tmdbStatus();
    const calls = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const urls = calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes('public-bundle-value'))).toBe(false);
  });
});
