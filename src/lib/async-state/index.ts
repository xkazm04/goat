/**
 * The async state model — one discriminated union for request state, derived.
 *
 * Registry: async-ui-states/state-model, client-state/status-fsms.
 *
 * WHY THIS EXISTS
 * ---------------
 * Until 2026-08-24 request state in this repo was boolean flags everywhere —
 * `isLoading` / `isError` / `error` passed down independently — and no
 * discriminated union for a request existed anywhere in `src/`. The `'idle' |
 * …` unions that did exist (patterns/drag-drop/types.ts, lib/debate/types.ts)
 * are DOMAIN machines, not request state.
 *
 * The soup accumulates innocently. `isLoading` ships first; a bug report
 * ("empty state flashes before the first load") adds `hasLoaded`; another
 * ("error and data showing together") adds `isError`; a refresh feature adds
 * `isRefreshing`. Four booleans encode sixteen representable states, the domain
 * has about six, and the other ten are each a bug with no name. The defining
 * property is that every illegal state must be prevented at EVERY WRITE SITE,
 * and write sites multiply.
 *
 * An explicit status inverts the burden: illegal states become unrepresentable
 * and only illegal TRANSITIONS remain, guarded in one place — here.
 *
 * DERIVE, NEVER HAND-MAINTAIN
 * ---------------------------
 * The inputs come from the request machinery (TanStack Query), which is the
 * thing that actually knows whether a request is outstanding. A hand-set flag
 * drifts in exactly the ways that matter: set before the request and cleared in
 * the success path, it stays true forever on failure; cleared in a shared
 * completion path, it goes wrong the moment two requests overlap; owned by the
 * surface, it dies with the surface and re-ghosts content the user already saw.
 */

export type AsyncState<T, E = Error> =
  /** Never attempted. Renders identically to `loading` — see below. */
  | { readonly status: 'idle' }
  /** First attempt in flight, nothing held. */
  | { readonly status: 'loading' }
  /**
   * An attempt completed and a result is held. A held EMPTY result is still
   * `loaded`: emptiness is a property of the data, not a status.
   * `isRefreshing` marks a background attempt over held content — it does NOT
   * demote the region to `loading`.
   */
  | {
      readonly status: 'loaded';
      readonly data: T;
      readonly isRefreshing: boolean;
    }
  /**
   * A request completed and carried NOTHING. Reachable only through the sticky
   * `settled` bit, which is the whole point: there is no path to "nothing here"
   * that does not pass through a completed response, so an empty rendering can
   * never be a first-frame guess.
   *
   * A separate status rather than `loaded` with `data: undefined` on purpose —
   * the second shape requires a cast that lies about the type, and a union that
   * lies is worse than the booleans it replaced.
   */
  | { readonly status: 'empty'; readonly isRefreshing: boolean }
  /**
   * An attempt completed unsuccessfully and NOTHING is held. Carries its
   * evidence, because the consumer that renders failure needs the cause and
   * re-deriving it later is impossible.
   */
  | { readonly status: 'failed'; readonly error: E }
  /**
   * A result is held AND the last attempt to refresh it failed. The shown data
   * is still real, merely no longer guaranteed current. This is the state that
   * stops a background refresh dying from punishing the user by blanking the
   * screen.
   */
  | {
      readonly status: 'stale';
      readonly data: T;
      readonly error: E;
      readonly isRefreshing: boolean;
    };

/** The four inputs the model is a pure function of. */
export interface AsyncInputs<T, E = Error> {
  /** Is a request currently outstanding. */
  readonly inFlight: boolean;
  /** What the region currently holds. `undefined` means nothing held. */
  readonly content: T | undefined;
  /**
   * Has ANY request ever completed — success or failure. STICKY: set on the
   * first completed response and never unset, not on refresh and not on a
   * filter change within the same context. It resets only when the region
   * starts asking a categorically different question.
   *
   * This bit is what makes the empty-flash structurally impossible rather than
   * usually avoided.
   */
  readonly settled: boolean;
  /** The last failure, cleared by the next success. */
  readonly error: E | null | undefined;
}

/**
 * The derivation. The ORDERING is the content of the model, not an
 * implementation detail:
 *
 *   1. Presence of content dominates everything — held data outranks an
 *      outstanding request and even a failure.
 *   2. Failure outranks loading when nothing is held. A retry in flight after a
 *      failure may render as loading again, but only because the retry CLEARS
 *      the error when it starts, not because loading "wins".
 *   3. Empty requires settling. There is no path to "nothing here" that does
 *      not pass through a completed response.
 *   4. Unstarted collapses into loading. From the user's seat "about to ask"
 *      and "asking" are indistinguishable; keep the difference in
 *      instrumentation, never in the rendering.
 */
export function deriveAsyncState<T, E = Error>({
  inFlight,
  content,
  settled,
  error,
}: AsyncInputs<T, E>): AsyncState<T, E> {
  if (content !== undefined) {
    // (1) Held content dominates. A failed refresh over rendered content lands
    //     in `stale`, never `failed` — the forbidden SETTLED-DATA -> FAILED edge.
    if (error) return { status: 'stale', data: content, error, isRefreshing: inFlight };
    return { status: 'loaded', data: content, isRefreshing: inFlight };
  }
  // (2) Nothing held: failure outranks loading.
  if (error) return { status: 'failed', error };
  // (3)+(4) Nothing held, no error: in flight, or never started, or settled empty.
  if (inFlight) return { status: 'loading' };
  if (settled) return { status: 'empty', isRefreshing: false };
  return { status: 'loading' };
}

/**
 * Where a failure lands depends on WHAT IS HELD, and the rule belongs in the
 * machine rather than at every call site.
 *
 *   - a failed FIRST attempt goes to `failed`: nothing is held, and rendering
 *     emptiness would dress failure as absence;
 *   - a failed RELOAD of a family that has data goes to `stale`, not `failed`.
 */
export function transitionOnFailure<T, E = Error>(
  previous: AsyncState<T, E>,
  error: E,
): AsyncState<T, E> {
  if (previous.status === 'loaded' || previous.status === 'stale') {
    return { status: 'stale', data: previous.data, error, isRefreshing: false };
  }
  return { status: 'failed', error };
}

/**
 * Map the held data without changing the state.
 *
 * A view of a request — the first six of a list, a filtered subset — must ride
 * ON the state rather than being computed beside it. Computed beside it, the
 * truncation and the state can disagree about whether there is anything to
 * show: `slice(0, 6)` of `undefined` is a crash, and of a not-yet-loaded `[]`
 * is an empty array that then renders as "nothing here".
 */
export function mapAsyncData<T, U, E = Error>(
  s: AsyncState<T, E>,
  fn: (data: T) => U,
): AsyncState<U, E> {
  if (s.status === 'loaded') return { status: 'loaded', data: fn(s.data), isRefreshing: s.isRefreshing };
  if (s.status === 'stale') {
    return { status: 'stale', data: fn(s.data), error: s.error, isRefreshing: s.isRefreshing };
  }
  return s;
}

/** True when the region holds something renderable. */
export function hasContent<T, E>(
  s: AsyncState<T, E>,
): s is Extract<AsyncState<T, E>, { data: T }> {
  return s.status === 'loaded' || s.status === 'stale';
}

/**
 * `SETTLED-EMPTY` in the presentation model: a completed response that carried
 * nothing. Reachable ONLY through `loaded`, which is only reachable through a
 * completed response — so an "empty" rendering can never be a first-frame
 * guess. `isEmpty` takes the emptiness predicate because "empty" for an array
 * and for a record are different questions.
 */
export function isSettledEmpty<T, E>(
  s: AsyncState<T, E>,
  isEmpty: (data: T) => boolean,
): boolean {
  if (s.status === 'empty') return true;
  if (s.status !== 'loaded') return false;
  return isEmpty(s.data);
}

/**
 * Latest-wins guard for overlapping requests.
 *
 * When a second request starts before the first completes, a response must be
 * applied ONLY if it belongs to the most recent request. Without this a slow
 * stale response lands after a fast fresh one and the surface silently shows
 * the wrong answer while claiming to be settled.
 *
 * The sequence is carried WITH the request rather than read from a mutable
 * outer variable at completion time, which is the version of this guard that
 * does not work.
 */
export function createLatestWins() {
  let issued = 0;
  let applied = 0;
  return {
    /** Call when a request STARTS; keep the token with that request. */
    issue(): number {
      issued += 1;
      return issued;
    },
    /** Call when a response arrives. False means: drop it, it is stale. */
    shouldApply(token: number): boolean {
      if (token < applied) return false;
      applied = token;
      return true;
    },
    /** For assertions and instrumentation only. */
    stats(): { issued: number; applied: number } {
      return { issued, applied };
    },
  };
}
