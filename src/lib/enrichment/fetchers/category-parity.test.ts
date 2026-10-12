import { afterEach, describe, expect, it, vi } from 'vitest';

import { SourceRouter } from '../SourceRouter';
import { TMDBFetcherClass } from './TMDBFetcher';
import { WikipediaFetcherClass } from './WikipediaFetcher';

/**
 * SourceRouter owns the category alias table: it decides that "films" and
 * "cinema" are movies and that "tv shows" is tv, and the pipeline routes to
 * TMDB on that decision. Each fetcher then RE-DERIVED the category from the raw
 * string with its own, smaller list -- so an item the router had already called
 * a film reached TMDB's generic multi-search path, and Wikipedia's query lost
 * its disambiguation term. This pins both against the router's table.
 */

const MOVIE_ALIASES = ['movies', 'movie', 'film', 'films', 'cinema'];
const TV_ALIASES = ['tv', 'tv shows', 'tv-shows', 'television', 'series', 'tv series'];

function stubJson(bodyFor: (url: string) => unknown) {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      calls.push(String(url));
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => bodyFor(String(url)),
      } as unknown as Response;
    })
  );
  return calls;
}

describe('fetchers agree with SourceRouter on what a category is', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is testing aliases the router really does route to tmdb', () => {
    for (const alias of MOVIE_ALIASES) {
      expect(SourceRouter.normalizeCategory(alias)).toBe('movies');
    }
    for (const alias of TV_ALIASES) {
      expect(SourceRouter.normalizeCategory(alias)).toBe('tv');
    }
  });

  for (const alias of MOVIE_ALIASES) {
    it(`sends a "${alias}" item to TMDB's movie search, not multi-search`, async () => {
      const calls = stubJson((url) =>
        url.includes('/search/')
          ? { results: [{ id: 7, title: 'A Film', popularity: 1, media_type: 'movie' }] }
          : { id: 7, title: 'A Film', genres: [], credits: { cast: [], crew: [] } }
      );
      const fetcher = new TMDBFetcherClass();
      fetcher.initialize('test-key');

      await fetcher.fetch({ name: 'A Film', category: alias });

      expect(calls.some((c) => c.includes('/search/movie'))).toBe(true);
      expect(calls.some((c) => c.includes('/search/multi'))).toBe(false);
    });
  }

  for (const alias of TV_ALIASES) {
    it(`sends a "${alias}" item to TMDB's tv search, not multi-search`, async () => {
      const calls = stubJson((url) =>
        url.includes('/search/')
          ? { results: [{ id: 9, name: 'A Show', popularity: 1, media_type: 'tv' }] }
          : { id: 9, name: 'A Show', genres: [], credits: { cast: [], crew: [] } }
      );
      const fetcher = new TMDBFetcherClass();
      fetcher.initialize('test-key');

      await fetcher.fetch({ name: 'A Show', category: alias });

      expect(calls.some((c) => c.includes('/search/tv'))).toBe(true);
      expect(calls.some((c) => c.includes('/search/multi'))).toBe(false);
    });
  }

  for (const alias of ['cinema', 'films']) {
    it(`disambiguates a "${alias}" Wikipedia query with the film term`, async () => {
      const calls = stubJson((url) =>
        url.includes('list=search')
          ? { query: { search: [{ pageid: 3, title: 'A Film', snippet: 'a film' }] } }
          : { query: { pages: { '3': { pageid: 3, title: 'A Film', extract: 'text' } } } }
      );
      const fetcher = new WikipediaFetcherClass();

      await fetcher.fetch({ name: 'A Film', category: alias });

      const search = calls.find((c) => c.includes('list=search')) ?? '';
      expect(new URL(search).searchParams.get('srsearch')).toBe('A Film film');
    });
  }
});
