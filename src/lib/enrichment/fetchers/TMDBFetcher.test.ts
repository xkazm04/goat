import { afterEach, describe, expect, it, vi } from 'vitest';

import { TMDBFetcherClass } from './TMDBFetcher';

import type { EnrichmentInput } from '../types';

interface StubResult {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
}

function stubResult(overrides: Partial<StubResult> = {}): StubResult {
  return {
    id: 1,
    title: 'The Popular Blockbuster',
    overview: 'A film nobody searched for.',
    release_date: '2021-01-01',
    poster_path: null,
    backdrop_path: null,
    vote_average: 7,
    vote_count: 100,
    popularity: 6000,
    genre_ids: [],
    ...overrides,
  };
}

/** Serve every TMDB call from a canned search response. */
function stubFetch(results: StubResult[]) {
  const calls: string[] = [];
  const fetchStub = vi.fn(async (url: string) => {
    calls.push(String(url));
    const detail = String(url).match(/\/movie\/(\d+)/);
    const body = detail
      ? {
          ...(results.find((r) => String(r.id) === detail[1]) ?? results[0]),
          genres: [],
          credits: { cast: [], crew: [] },
        }
      : { results };
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => body,
    } as unknown as Response;
  });
  vi.stubGlobal('fetch', fetchStub);
  return calls;
}

const input: EnrichmentInput = { name: 'Zzzz Unheard Of', category: 'movies' };

describe('TMDBFetcher match confidence', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not accept an unrelated title on its popularity alone', async () => {
    // popularity is a TIEBREAKER. Unbounded, `popularity / 1000 * 0.05` gave a
    // 6000-popularity blockbuster +0.30 -- on its own enough to clear the 0.3
    // accept threshold with a title similarity of exactly 0, so the wrong film
    // was attached to the item and, being source-priority 90, then outranked a
    // correct Wikipedia match in DataNormalizer.mergeSources.
    stubFetch([stubResult()]);
    const fetcher = new TMDBFetcherClass();
    fetcher.initialize('test-key');

    const result = await fetcher.fetch(input);

    expect(result.confidence).toBe(0);
    expect(result.error).toBe('No matching movie found');
  });

  it('still accepts a title that actually matches, popularity or not', async () => {
    stubFetch([stubResult({ title: 'Zzzz Unheard Of', popularity: 1 })]);
    const fetcher = new TMDBFetcherClass();
    fetcher.initialize('test-key');

    const result = await fetcher.fetch(input);

    expect(result.error).toBeUndefined();
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('lets popularity break a tie between two equally similar titles', async () => {
    stubFetch([
      stubResult({ id: 1, title: 'Zzzz Unheard Of', popularity: 1 }),
      stubResult({ id: 2, title: 'Zzzz Unheard Of', popularity: 900 }),
    ]);
    const fetcher = new TMDBFetcherClass();
    fetcher.initialize('test-key');

    const result = await fetcher.fetch(input);

    expect(result.rawData.id).toBe(2);
  });
});
