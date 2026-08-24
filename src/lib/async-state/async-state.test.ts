/**
 * Tests for the async state model.
 *
 * These encode the FORBIDDEN TRANSITIONS — the edges the boolean-flag rendering
 * this replaced shipped by accident. Each forbidden edge has a name and a test:
 *
 *   SETTLED-DATA -> LOADING on refresh          placeholder over rendered content
 *   anything -> SETTLED-EMPTY while unsettled   the empty flash
 *   FAILED -> SETTLED-EMPTY                     failure dressed as empty success
 *   SETTLED-DATA -> FAILED on refresh failure   held data discarded
 *
 * NEGATIVE CONTROL (test-harness/negative-control-tests): proved able to go red
 * on 2026-08-24 by hoisting `if (error) return { status: 'failed', error }`
 * ABOVE the content check in deriveAsyncState — the single most tempting wrong
 * ordering, and exactly the one that ships "held data discarded because a
 * refresh failed". Reds 4 of these 34 tests (measured). Restored after.
 *
 * A SECOND control was run on the sticky bit: changing
 * `if (settled) return { status: 'empty', … }` to an unconditional return,
 * i.e. deleting the settled guard, which is how the empty-flash gets shipped.
 * Reds 3 tests (measured). Restored after.
 *
 * Two controls rather than one because the two defects live in different halves
 * of the derivation and a mutation in one half says nothing about the other.
 */

import { describe, expect, it } from 'vitest';

import { asyncStateFromQuery } from './from-query';
import {
  createLatestWins,
  deriveAsyncState,
  hasContent,
  isSettledEmpty,
  transitionOnFailure,
  type AsyncState,
} from './index';

const NOTHING = undefined;
const BOOM = new Error('boom');

describe('deriveAsyncState — the four inputs', () => {
  it('unstarted collapses into loading (indistinguishable from asking, from the user seat)', () => {
    expect(
      deriveAsyncState({ inFlight: false, content: NOTHING, settled: false, error: null }),
    ).toEqual({ status: 'loading' });
  });

  it('in flight with nothing held is loading', () => {
    expect(
      deriveAsyncState({ inFlight: true, content: NOTHING, settled: false, error: null }),
    ).toEqual({ status: 'loading' });
  });

  it('content held is loaded', () => {
    expect(
      deriveAsyncState({ inFlight: false, content: [1, 2], settled: true, error: null }),
    ).toEqual({ status: 'loaded', data: [1, 2], isRefreshing: false });
  });

  it('settled with nothing held is empty', () => {
    expect(
      deriveAsyncState({ inFlight: false, content: NOTHING, settled: true, error: null }),
    ).toEqual({ status: 'empty', isRefreshing: false });
  });

  it('a held EMPTY ARRAY is loaded, not empty — emptiness is a property of the data', () => {
    const s = deriveAsyncState({ inFlight: false, content: [], settled: true, error: null });
    expect(s.status).toBe('loaded');
    expect(isSettledEmpty(s, (d: number[]) => d.length === 0)).toBe(true);
  });
});

describe('forbidden edge: SETTLED-DATA -> LOADING on refresh', () => {
  it('a refresh over held content stays loaded and marks isRefreshing', () => {
    const s = deriveAsyncState({ inFlight: true, content: ['a'], settled: true, error: null });
    expect(s.status).toBe('loaded');
    expect(s).toMatchObject({ isRefreshing: true });
  });

  it('held content outranks an outstanding request even on the first render', () => {
    const s = deriveAsyncState({ inFlight: true, content: ['a'], settled: false, error: null });
    expect(s.status).not.toBe('loading');
  });
});

describe('forbidden edge: -> SETTLED-EMPTY while unsettled (the empty flash)', () => {
  it('nothing held and never settled is loading, never empty', () => {
    const s = deriveAsyncState({ inFlight: false, content: NOTHING, settled: false, error: null });
    expect(s.status).toBe('loading');
    expect(isSettledEmpty(s, () => true)).toBe(false);
  });

  it('emptiness is unreachable without a completed response', () => {
    for (const inFlight of [true, false]) {
      const s = deriveAsyncState({ inFlight, content: NOTHING, settled: false, error: null });
      expect(s.status).toBe('loading');
    }
  });
});

describe('forbidden edge: FAILED -> SETTLED-EMPTY (failure dressed as empty success)', () => {
  it('a failure with nothing held is failed, and carries its evidence', () => {
    const s = deriveAsyncState({ inFlight: false, content: NOTHING, settled: true, error: BOOM });
    expect(s).toEqual({ status: 'failed', error: BOOM });
  });

  it('a failed state is never reported as settled-empty', () => {
    const s = deriveAsyncState({ inFlight: false, content: NOTHING, settled: true, error: BOOM });
    expect(isSettledEmpty(s, () => true)).toBe(false);
  });
});

describe('forbidden edge: SETTLED-DATA -> FAILED on refresh failure', () => {
  it('a failed refresh over held content lands in stale, keeping the data', () => {
    const s = deriveAsyncState({ inFlight: false, content: ['a'], settled: true, error: BOOM });
    expect(s).toEqual({ status: 'stale', data: ['a'], error: BOOM, isRefreshing: false });
  });

  it('stale still has content, so a renderer that asks keeps rendering', () => {
    const s = deriveAsyncState({ inFlight: false, content: ['a'], settled: true, error: BOOM });
    expect(hasContent(s)).toBe(true);
  });

  it('a retry in flight over stale content is still stale, not loading', () => {
    const s = deriveAsyncState({ inFlight: true, content: ['a'], settled: true, error: BOOM });
    expect(s.status).toBe('stale');
    expect(s).toMatchObject({ isRefreshing: true });
  });
});

describe('failure outranks loading when nothing is held', () => {
  it('an error with a retry in flight and nothing held reports failed', () => {
    // The model does not let loading "win": a retry renders as loading only
    // because the retry CLEARS the error when it starts.
    const s = deriveAsyncState({ inFlight: true, content: NOTHING, settled: true, error: BOOM });
    expect(s.status).toBe('failed');
  });

  it('once the retry clears the error, the region is loading again', () => {
    const s = deriveAsyncState({ inFlight: true, content: NOTHING, settled: true, error: null });
    expect(s.status).toBe('loading');
  });
});

describe('transitionOnFailure — where a failure lands depends on what is held', () => {
  it('a failed first attempt goes to failed', () => {
    expect(transitionOnFailure<string[]>({ status: 'loading' }, BOOM)).toEqual({
      status: 'failed',
      error: BOOM,
    });
  });

  it('a failed reload over data goes to stale, not failed', () => {
    const prev: AsyncState<string[]> = { status: 'loaded', data: ['a'], isRefreshing: true };
    expect(transitionOnFailure(prev, BOOM)).toEqual({
      status: 'stale',
      data: ['a'],
      error: BOOM,
      isRefreshing: false,
    });
  });

  it('a second failure over stale data keeps the data', () => {
    const prev: AsyncState<string[]> = {
      status: 'stale',
      data: ['a'],
      error: new Error('first'),
      isRefreshing: true,
    };
    expect(transitionOnFailure(prev, BOOM)).toMatchObject({ status: 'stale', data: ['a'] });
  });

  it('a failure from idle goes to failed', () => {
    expect(transitionOnFailure<string[]>({ status: 'idle' }, BOOM)).toEqual({
      status: 'failed',
      error: BOOM,
    });
  });
});

describe('createLatestWins — overlap, latest wins', () => {
  it('applies responses that arrive in order', () => {
    const g = createLatestWins();
    const a = g.issue();
    expect(g.shouldApply(a)).toBe(true);
    const b = g.issue();
    expect(g.shouldApply(b)).toBe(true);
  });

  it('DROPS a slow stale response that lands after a fast fresh one', () => {
    const g = createLatestWins();
    const slow = g.issue();
    const fast = g.issue();
    expect(g.shouldApply(fast)).toBe(true);
    // The slow one now arrives. Without this guard the surface silently shows
    // the wrong answer while claiming to be settled.
    expect(g.shouldApply(slow)).toBe(false);
  });

  it('keeps applying the newest after a drop', () => {
    const g = createLatestWins();
    const a = g.issue();
    const b = g.issue();
    g.shouldApply(b);
    g.shouldApply(a);
    const c = g.issue();
    expect(g.shouldApply(c)).toBe(true);
  });

  it('reports what it issued and applied', () => {
    const g = createLatestWins();
    g.issue();
    const t = g.issue();
    g.shouldApply(t);
    expect(g.stats()).toEqual({ issued: 2, applied: 2 });
  });
});

describe('asyncStateFromQuery — derived from the request machinery', () => {
  const q = <T>(over: Partial<{
    data: T | undefined;
    error: Error | null;
    isFetching: boolean;
    isFetched: boolean;
  }>) => ({ data: undefined, error: null, isFetching: false, isFetched: false, ...over });

  it('first render, request outstanding -> loading', () => {
    expect(asyncStateFromQuery(q<string[]>({ isFetching: true })).status).toBe('loading');
  });

  it('data present, background refetch -> loaded + refreshing', () => {
    expect(
      asyncStateFromQuery(q({ data: ['a'], isFetched: true, isFetching: true })),
    ).toMatchObject({ status: 'loaded', isRefreshing: true });
  });

  it('fetched with no data -> empty (the sticky bit came from the cache, not a component)', () => {
    expect(asyncStateFromQuery(q<string[]>({ isFetched: true })).status).toBe('empty');
  });

  it('error with no data -> failed', () => {
    expect(asyncStateFromQuery(q<string[]>({ isFetched: true, error: BOOM }))).toEqual({
      status: 'failed',
      error: BOOM,
    });
  });

  it('error with data -> stale, and the data survives', () => {
    expect(
      asyncStateFromQuery(q({ data: ['a'], isFetched: true, error: BOOM })),
    ).toMatchObject({ status: 'stale', data: ['a'] });
  });

  it('a remount reads the sticky bit from the cache, so it does not re-ghost', () => {
    // isFetched stays true across a remount because it lives in the query
    // cache. A component-owned hasLoaded flag would be false here and the
    // surface would show a skeleton over content the user already saw.
    expect(asyncStateFromQuery(q({ data: ['a'], isFetched: true })).status).toBe('loaded');
  });
});

describe('isSettledEmpty', () => {
  it('is true for the empty status', () => {
    expect(isSettledEmpty({ status: 'empty', isRefreshing: false }, () => false)).toBe(true);
  });

  it('is true for loaded with an empty payload', () => {
    expect(
      isSettledEmpty({ status: 'loaded', data: [], isRefreshing: false }, (d: unknown[]) => d.length === 0),
    ).toBe(true);
  });

  it('is false while loading', () => {
    expect(isSettledEmpty({ status: 'loading' }, () => true)).toBe(false);
  });

  it('is false for stale content', () => {
    expect(
      isSettledEmpty({ status: 'stale', data: [], error: BOOM, isRefreshing: false }, () => true),
    ).toBe(false);
  });
});
