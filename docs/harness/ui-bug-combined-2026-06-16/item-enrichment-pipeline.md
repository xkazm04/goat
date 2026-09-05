# Item Enrichment Pipeline — Combined UI+Bug Scan
> Context: Multi-source item metadata/image enrichment (TMDB/Spotify/IGDB/Wikipedia) with category routing and latency tracking.
> Files scanned: 16
> Total: 5 (Critical: 0, High: 3, Medium: 2, Low: 0)

## 1. `gemini` AI-fallback source is routed everywhere but has no fetcher, so every enrichment emits a phantom error
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: silent failure / dead feature
- **File**: src/lib/enrichment/EnrichmentPipeline.ts:37 (and SourceRouter.ts:19-48)
- **Scenario**: Enrich any item. `SourceRouter.getAllSources()` returns `gemini` in the fallback list for *every* category (movies/tv/games/music/books/sports/general). `SOURCE_FETCHERS` only maps tmdb/igdb/spotify/wikipedia, so `fetchFromSource('gemini', …)` hits the `if (!fetcher)` branch and returns `{ confidence: 0, error: 'No fetcher available for source: gemini' }`.
- **Root cause**: The routing table, the `DataSource` union, `SOURCE_FIELD_MAPPINGS.gemini`, `SOURCE_PRIORITIES.gemini`, and `config.useAiFallback` all advertise a Gemini fallback that was never implemented or wired in. `useAiFallback` is read nowhere in the pipeline.
- **Impact**: Every single `EnrichmentResult.errors` array carries a spurious `{ source: 'gemini', error: 'No fetcher available…' }`. The `/api/items/enrich` response returns this error to clients on otherwise-successful enrichments, and it inflates `sources_attempted` in the structured log. Worse, items that fall through all real sources never get the AI rescue the config implies exists.
- **Fix sketch**: Either remove `gemini` from all `SOURCE_ROUTES` fallbacks (and stop counting unimplemented sources as errors) or implement a `GeminiFetcher` and add it to `SOURCE_FETCHERS`. At minimum, filter "no fetcher available" entries out of the user-facing `errors` array since they are not fetch failures.

## 2. `enrichBatch` mutates the shared singleton config — concurrent batch requests corrupt each other's settings
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: race condition / shared mutable state
- **File**: src/lib/enrichment/EnrichmentPipeline.ts:334-340, 378
- **Scenario**: `EnrichmentPipeline` is an exported singleton. Two `POST /api/items/batch-enrich` requests arrive concurrently (trivially possible on a Next.js server). Request A saves `savedConfig = this.config` and sets `this.config = batchConfigA`. Request B then runs, saves `savedConfig = batchConfigA` (A's mutated value, not the original default), sets `this.config = batchConfigB`, and on completion restores `this.config = batchConfigA`. Now A's `await`ed `enrich()` calls run under B's config, and after both finish the singleton is left holding `batchConfigA` instead of the default — config leaks permanently.
- **Root cause**: Per-request configuration is applied by mutating module-global state across `await` points, on the assumption of single-threaded request isolation that does not hold for an in-memory singleton serving overlapping async requests.
- **Impact**: One batch's `minConfidence` / `sourceTimeoutMs` / `maxParallelSources` silently overrides another's mid-flight, producing wrong success/fail classifications, and a leaked override degrades all subsequent single-item enrichments until the process restarts.
- **Fix sketch**: Don't mutate `this.config`. Thread an effective config through `enrich()` / `fetchFromSources()` / `fetchFromSource()` as a parameter, or construct a throwaway `new EnrichmentPipelineClass(batchConfig)` per batch request.

## 3. Failed enrichment sources leave the on-screen badges stuck shimmering "active" forever
- **Severity**: high
- **Lens**: ui-perfectionist
- **Category**: stuck loading state / missing error affordance
- **File**: src/components/visual/EnrichmentSourceBadges.tsx:18 (driver: src/stores/backlog/actions-data.ts:310)
- **Scenario**: A backlog load begins → sources flip to `status: 'active'` (animated cyan shimmer + glow). The fetch then throws. The error handler sets only `state.enrichmentSources.active = false` and never resets the per-source `status`, so each pill remains `'active'`. The component's null-guard is `!active && sources.every(s => s.status === 'pending')` — that is false (statuses are `'active'`, not `'pending'`), so the badges keep rendering and shimmering indefinitely.
- **Root cause**: There is no `'error'`/`'failed'` member in the source-status state machine; the error path deactivates the container flag but leaves child pills in their last in-flight state, and the render guard only recognizes the all-pending and all-done terminal states.
- **Impact**: After any load failure the user sees data sources that appear to be perpetually "still loading," with no indication that enrichment actually failed — a misleading, never-resolving spinner.
- **Fix sketch**: Add a `'failed'` status, set it on the error path in actions-data.ts, render it with a distinct (e.g. amber/red) treatment, and broaden the component's terminal-state guard so a settled-but-not-done set of pills either hides or shows the failed state.

## 4. Early-stop heuristic is effectively dead for single-primary categories, wasting time and over-querying APIs
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: performance / logic flaw
- **File**: src/lib/enrichment/EnrichmentPipeline.ts:176-194
- **Scenario**: For movies/tv/games/music the route is `[primary, wikipedia, gemini]` (3 sources) and `maxParallelSources` is 3, so all sources land in a *single* chunk. The early-stop check (`break` after a chunk) only runs *between* chunks, so it can never short-circuit these categories — Wikipedia is always queried even when TMDB/IGDB/Spotify already returned a high-confidence match. Additionally the guard `results.filter(r => !r.error).length >= 2` requires two non-errored results, but `gemini` always errors (finding #1), so for categories with only one real fallback the count rarely reaches 2 anyway.
- **Root cause**: The chunking math (`Math.ceil(sources/maxParallelSources)`) collapses the common 3-source routes into one chunk, defeating the between-chunk early-exit, and the exit predicate assumes ≥2 successful sources that the `gemini` phantom prevents.
- **Impact**: Redundant Wikipedia/network calls on every movie/tv/game/music enrichment (extra latency + third-party rate-limit pressure) despite an already-confident primary result. The "stop early" optimization silently does nothing for the hot path.
- **Fix sketch**: Evaluate the high-confidence short-circuit *within* the chunk (e.g. fire primary first, await it, and skip fallbacks if it clears `minConfidence`), or query primary and fallbacks in priority order rather than one fixed-size chunk. Drop the `>= 2 non-errored` requirement (or count only real sources) so a single strong primary can end the fetch.

## 5. Spotify/IGDB OAuth token refresh is unsynchronized on the shared fetcher singleton (token stampede)
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: race condition / external-API thrash
- **File**: src/lib/enrichment/fetchers/SpotifyFetcher.ts:92-120 (same pattern: IGDBFetcher.ts:93-123)
- **Scenario**: A high-priority batch processes 5 items in parallel (EnrichmentPipeline.ts:355-358). Each calls the singleton `SpotifyFetcher.fetch()`. On a cold start (`accessToken` null/expired), all 5 enter `getAccessToken()` before any has set `this.accessToken`, so all 5 fire a `POST /api/token` simultaneously. There is no in-flight-promise dedupe and no failure handling: if the token POST returns 200 but a body without `access_token` (rate-limited / malformed), `token` is `undefined`, `this.accessToken = undefined` and `tokenExpiresAt = Date.now() + undefined*1000 = NaN` — the cache check `Date.now() < NaN - 60000` is always false, so every subsequent call re-authenticates forever.
- **Root cause**: Lazy token caching on a shared mutable singleton with no mutex/single-flight promise, and no validation that the token-endpoint response actually contains a token before caching expiry.
- **Impact**: Bursty duplicate auth requests against Spotify/Twitch under batch load (risking 429s that then cascade into enrichment failures), and a poisoned `NaN` expiry that permanently disables token caching after one malformed auth response.
- **Fix sketch**: Cache the in-flight token *promise* (single-flight) so concurrent callers await one request; validate `data.access_token` and `data.expires_in` are present before assigning, and throw (not cache) on a malformed response so the next call retries cleanly.
