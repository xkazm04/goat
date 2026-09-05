/**
 * The adapter: TanStack Query result -> AsyncState.
 *
 * Registry: async-ui-states/state-model ("derive, never hand-maintain"),
 * client-state/status-fsms.
 *
 * The request machinery is the only thing that honestly knows whether a request
 * is outstanding, so the four model inputs are read from it rather than from
 * booleans a component sets and clears. This file is deliberately the ONLY
 * place that knows TanStack's field names, so a version bump that renames
 * `isFetching` is a one-file change rather than a search across every surface.
 *
 * The sticky `settled` bit maps to `isFetched`, which TanStack sets on the
 * first completed response (success OR failure) and does not unset on refetch.
 * That is precisely the semantics the model requires, and reading it from the
 * cache is what makes the bit survive a remount — a hand-maintained bit owned
 * by the component dies with the component and re-ghosts content the user has
 * already seen.
 */

import { deriveAsyncState, type AsyncState } from './index';

/**
 * The shape this adapter needs. Structural rather than importing TanStack's
 * `UseQueryResult`, so a unit test can exercise every branch without a
 * QueryClient — the technique's own point that a test needing five unrelated
 * things constructed is a measurement of coupling somebody already paid for.
 */
export interface QueryLikeResult<T, E = Error> {
  data: T | undefined;
  error: E | null;
  /** Any request outstanding, including a background refetch. */
  isFetching: boolean;
  /** Sticky: has any request for this key ever completed. */
  isFetched: boolean;
}

export function asyncStateFromQuery<T, E = Error>(
  q: QueryLikeResult<T, E>,
): AsyncState<T, E> {
  return deriveAsyncState<T, E>({
    inFlight: q.isFetching,
    content: q.data,
    settled: q.isFetched,
    error: q.error,
  });
}
