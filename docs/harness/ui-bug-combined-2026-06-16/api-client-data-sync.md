# API Client & Data Sync — Combined UI+Bug Scan
> Context: Typed API client (circuit breaker, rate limiting, request tracing, query-key cache, batch + sync endpoints) — pure infrastructure, no UI surface.
> Files scanned: 15
> Total: 5 (Critical: 1, High: 3, Medium: 1, Low: 0)

## 1. Circuit-breaker HALF_OPEN waiters hang forever when the probe request is coalesced away
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: race-condition / circuit-breaker state machine
- **File**: src/lib/api/goat-api.ts:210-221 (with src/lib/cache/query-cache-config.ts:260-277 and src/lib/api/CircuitBreaker.ts:166-187)
- **Scenario**: A circuit is OPEN and cools down. Two identical GETs to the same endpoint arrive in the same tick. Caller A wins `canRequest()` (OPEN→HALF_OPEN, returns `true`, `probeInFlight=true`) and proceeds. Caller B gets `canRequest()`=`false` (HALF_OPEN branch) and parks in `waitForProbe()`. Caller A's actual fetch runs through `withCoalescing`; if a *third* identical in-flight GET already registered that coalescing key (or A and B share the key and B reached `withCoalescing` first as the "probe"), the request that resolves the circuit is owned by a different promise than the one the breaker considers the probe. Whichever caller throws/returns calls `recordSuccess`/`recordFailure`, which *does* drain the queue — but if the probe-owning caller is the one whose promise was deduped and it returns the *coalesced* result without itself calling `recordSuccess` for this endpoint instance, B's `waitForProbe` promise is only ever resolved by the single winner. The fragile part: `probeInFlight` is a per-key boolean with no timeout, and nothing guarantees the probe caller reaches `recordSuccess`/`recordFailure` — e.g. if the probe caller is cancelled via `AbortSignal` (the error is swallowed/rethrown but `recordFailure` only counts retriable `GoatError`s; an `AbortError`-derived `NETWORK_TIMEOUT` is retriable, but a non-retriable client abort is not), the HALF_OPEN queue is never drained.
- **Root cause**: Two independent dedup layers (circuit-breaker probe election + `withCoalescing`) elect "the one request" by different criteria, and queue draining is tied only to `recordSuccess`/`recordFailure` being reached by the probe owner. There is no watchdog/timeout on `probeInFlight` or on parked `waitForProbe` promises.
- **Impact**: Parked callers (`waitForProbe` promises) never resolve → those React Query fetches hang until their own 30s client timeout or indefinitely if no timeout fires, and the circuit can get stuck in HALF_OPEN with `probeInFlight=true` forever, fast-failing nothing and never re-closing.
- **Fix sketch**: Give `waitForProbe` promises a bounded timeout (resolve `false` after `cooldownMs`), and clear `probeInFlight` + drain the queue in a `finally` keyed to the *actual* probe promise rather than relying on `recordSuccess`/`recordFailure`. Alternatively, have the breaker own coalescing so the probe and the coalesced request are the same promise.

## 2. Batch endpoint drops/overwrites responses when two sub-requests share an `id`
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: data-correctness / edge-case
- **File**: src/app/api/batch/route.ts:496-497
- **Scenario**: A client builds a batch where two entries have the same `id` (easy to do — ids are client-generated, `validateRequest` only checks the id is a non-empty string, never uniqueness). Responses are first written positionally into `responses[index]`, then collapsed via `new Map(responses.map(r => [r.id, r]))`. Two entries with the same id collapse to one Map entry, so `requests.map(req => responseMap.get(req.id)!)` returns the *same* response object for both positions — the second sub-request's real result is silently lost and replaced by the first's.
- **Root cause**: Final ordering keys off `id` (assumed unique) instead of the original array index that was already tracked in `completed`/`responses[index]`.
- **Impact**: Caller receives a wrong/duplicated result for one of the colliding requests with no error — a silent data-correctness failure. With mutating methods (PUT/POST) the caller may believe a write succeeded/failed based on the wrong sub-response.
- **Fix sketch**: Reorder by original index, not id: the `responses` array is already index-aligned to `sortedRequests`; build the final ordered list by mapping each original request to its `sortedRequests` index (or reject batches containing duplicate ids in `validateRequest`).

## 3. `request-id` correlation IDs collide under concurrency (weak randomness, no per-process entropy)
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: tracing / request-id collision
- **File**: src/lib/api/request-id.ts:15-19
- **Scenario**: `generateRequestId()` = `goat-<Date.now() base36>-<Math.random() 6 base36 chars>`. The random suffix is only `Math.random().toString(36).slice(2,8)` — at most 6 base36 chars (~31 bits, and the leading char is biased/sometimes shorter). When many requests fire within the same millisecond (batch fan-out, parallel hooks, retry storms), the timestamp component is identical, so uniqueness rests entirely on ~6 random chars. By the birthday bound, collisions become likely well under a thousand same-ms requests; over a session, duplicate `X-Request-ID`s are effectively guaranteed.
- **Root cause**: Non-cryptographic, low-entropy suffix with no monotonic counter or per-instance salt, used as the primary correlation key in `trackApiError` and logs.
- **Impact**: Two distinct failing requests log/track under the same `traceId`, corrupting error correlation and any per-request debugging — exactly when you need tracing most (incident with high concurrency). Note `request-timing.ts:19-23` uses a counter and is collision-safe; the client path is not, so client and server ids diverge in robustness.
- **Fix sketch**: Use `crypto.randomUUID()` (available in browsers and Node 18+) or append a monotonic counter like `request-timing.ts` does, so same-ms requests cannot collide.

## 4. Sync batch can partially commit then report success-then-failure with no rollback across entities
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: data-loss / partial-failure
- **File**: src/app/api/sync/route.ts:468-508 (with 281-307)
- **Scenario**: Entity groups are processed in parallel (`Promise.all`). Within a group, a failure stops *that* group, but other groups have already committed via `atomicReplaceListItems` (which deletes + reinserts list_items). A `DELETE_SESSION` op (line 289) issues `supabase.from('list_items').delete().eq('list_id', listId)` with **no error check at all** — the awaited result's `error` is ignored, so a failed delete is reported as `success: true` (line 295-299). Combined: the client sees a 200 with a mixed `results` array; some entities mutated, some not, one falsely reported successful. The offline sync queue treats `success:true` results as committed and drops them locally, so a silently-failed `DELETE_SESSION` (or a delete that hit an RLS/transient error) loses the operation permanently.
- **Root cause**: `processDeleteSession` ignores the Supabase `{ error }` channel (only `try/catch` catches thrown errors, but supabase-js returns errors in-band, it does not throw). No cross-entity transaction; each group commits independently.
- **Impact**: Permanent, silent data loss on the client side for delete operations whose server-side delete failed but was reported successful; inconsistent partial commits with no way for the client to know which entities to retry.
- **Fix sketch**: Destructure and check `const { error } = await supabase...delete()` in `processDeleteSession` and return `success:false` on error. For cross-entity atomicity, document that partial commits are possible and ensure the client only marks individually-`success:true` ops as done (it appears to, but the false-success makes that unsafe).

## 5. Client `request()` leaks an `abort` listener on every call sharing a long-lived external signal
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: resource-leak / timing
- **File**: src/lib/api/client.ts:232-234 (and timeout handling 226-229, 273)
- **Scenario**: When `options.signal` is provided (e.g. a React Query / component-scoped `AbortSignal` reused across multiple requests, or a never-aborting app-lifetime signal), every `request()` call does `options.signal.addEventListener('abort', () => controller.abort())` and never removes it. The listener closes over the per-request `controller`, so each request pins its `AbortController` (and the timeout closure) in memory for the entire lifetime of the external signal. Additionally, on the success path `clearTimeout` runs at line 273 before `response.json()`, but the external-signal listener is never cleaned up on any path.
- **Root cause**: One-way listener registration with no `removeEventListener` and no `{ once: true }` / no teardown in a `finally`.
- **Impact**: Steadily growing listener list and retained `AbortController`/timeout closures on any reused or long-lived signal — a slow memory leak and, for a signal reused across many requests, an O(n) fan-out where one external abort fires N stale handlers. Most visible in long sessions with a shared signal.
- **Fix sketch**: Register with `options.signal.addEventListener('abort', onAbort, { once: true })` and remove the listener in a `finally` block (also clear the timeout there to consolidate the duplicated `clearTimeout` calls), or use `AbortSignal.any([options.signal, AbortSignal.timeout(...)])` where supported.
