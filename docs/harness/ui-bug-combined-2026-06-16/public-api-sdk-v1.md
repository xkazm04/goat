# Public API & SDK (v1) — Combined UI+Bug Scan
> Context: Versioned public REST API + JS SDK + embeddable widgets + agent task bridge — a public, internet-facing trust boundary.
> Files scanned: 14
> Total: 5 (Critical: 2, High: 2, Medium: 0, Low: 1)

## 1. API key validation is a mock that accepts ANY well-formed string — total auth bypass
- **Severity**: critical
- **Lens**: bug-hunter
- **Category**: authentication / access-control
- **File**: src/lib/api/public-api.ts:233-294
- **Scenario**: Send `X-API-Key: goat_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` (any string matching `/^goat_[a-zA-Z0-9_]{28,60}$/`, line 46) to any `/api/v1/*` endpoint. `validateApiKey` never queries a database; it only checks the regex format and then returns `{ valid: true, tier: 'free', keyId: 'key_'+key.slice(5,13), features: {...} }`.
- **Root cause**: The function is a placeholder ("In production, this would lookup the key in the database") wired into every live public route. There is no key store, no revocation, no per-customer attribution — `keyId` is derived from the attacker-chosen string itself.
- **Impact**: Anyone can mint unlimited "valid" free-tier keys with zero registration, defeating quotas, billing, abuse tracking, and the entire tier-gating model. Worse, because `keyId` (used as `api_key_id` in `ranking_submissions`, submit/route.ts:113) is attacker-controlled, an attacker can forge submissions attributed to arbitrary key IDs and poison another tenant's aggregate consensus.
- **Fix sketch**: Replace with a real lookup against an `api_keys` table by hashed key, validating active/revoked status and returning the stored tier/keyId/features; fail closed (`return null`) on any miss. Until then, do not treat format validity as authentication.

## 2. Agent-bridge task API has no authentication and an unbounded in-memory store (RCE-adjacent DoS)
- **Severity**: critical
- **Lens**: bug-hunter
- **Category**: access-control / resource-exhaustion (DoS)
- **File**: src/app/api/agent-bridge/tasks/route.ts:101 (POST) ; src/lib/agent-bridge/task-memory-manager.ts:139-172
- **Scenario**: `POST /api/agent-bridge/tasks` with `{ "name": "x" }` — no API key, no origin check, no rate limit (the file imports none of `extractApiKey`/`validateApiKey`; grep over `src/app/api/agent-bridge` finds zero auth references). Loop it: each call appends to an in-process `Map`, and `completeTask` accepts up to `maxOutputSizeBytes` = 10 MB per task (types.ts:257) for `maxTasks` = 1000 tasks (types.ts:256) → ~10 GB resident, plus `chunkOutput` duplicates the full `JSON.stringify` in memory.
- **Root cause**: The bridge was built as an internal/dev utility but is exposed under `/api/` (publicly routable) with all lifecycle mutations (create/start/complete/fail/cancel/delete) open to anonymous callers. `getStats`/`getTasks` also leak every task's metadata (names, ownerIds, tags) to anyone.
- **Impact**: Unauthenticated memory-exhaustion DoS of the Node process, plus information disclosure of all in-flight task metadata and outputs across users. Any client can also delete/cancel another caller's tasks by ID.
- **Fix sketch**: Require an authenticated key (reuse `extractApiKey`/`validateApiKey`) plus rate limiting on all agent-bridge routes; scope `getTask`/`getTasks`/mutations to the caller's `ownerId`; and cap aggregate memory (sum of `outputSizeBytes`) not just task count.

## 3. Rate limiting is non-atomic and per-instance — effectively unenforced at scale
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: rate-limiting / race condition
- **File**: src/lib/api/public-api.ts:64-95
- **Scenario**: `checkRateLimit` does a read-modify-write (`cached.count++`) on a module-level `Map` with no locking. Fire N concurrent requests in the same window: each reads the same `count` before any increments land, so far more than `limit` requests pass. Separately, on serverless/multi-worker deploys each instance holds its own `rateLimitCache`, so the effective limit is `limit × instances`, and a cold start resets it entirely.
- **Root cause**: An in-memory single-process counter is being used as the global rate limiter (the comment even says "would use Redis in production"), and JS async interleaving makes the increment non-atomic across awaited handlers.
- **Impact**: The advertised per-minute caps (free 10 → enterprise 1000) are not actually enforced under concurrency or horizontal scaling, undermining abuse protection and tier monetization — directly amplifying findings #1 and #2.
- **Fix sketch**: Move to a shared atomic backend (Redis `INCR` with TTL, or Upstash ratelimit) keyed by `keyId`; until then document that limits are best-effort per-instance and lower the ceiling accordingly.

## 4. Widget API key transmitted as query param + wildcard CORS leaks keys via Referer/logs
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: secret-exposure / CORS
- **File**: src/lib/api/public-api.ts:37 (`api_key` query param) ; src/lib/api/public-api.ts:109 + all v1 routes (`Access-Control-Allow-Origin: *`)
- **Scenario**: `extractApiKey` accepts the key from `?api_key=` in the URL. The embed SDK encourages putting the key in client HTML (`data-goat-api-key`, embed.js:705). Any request carrying the key in the query string (or any page embedding the widget) exposes the key in browser history, server/CDN access logs, and the `Referer` header sent to third parties. Because every response sets ACAO `*`, the key also works from any origin with no allow-list.
- **Root cause**: Designed for easy embedding, but a bearer credential placed in URLs + universal CORS means the "secret" is effectively public and replayable from anywhere — there is no per-key allowed-origin/domain binding.
- **Impact**: API keys are trivially harvested from logs/Referer and reused by anyone from any origin, compounding the abuse surface. For a paid/tiered API this is a credential-theft and quota-theft vector.
- **Fix sketch**: Drop the `api_key` query-param path (header only); issue separate publishable widget keys bound to an allow-listed set of origins and echo only matching origins in `Access-Control-Allow-Origin` (not `*`); never log full keys.

## 5. Embed widget uses invalid `shrink: 0` CSS — rank/image/votes columns collapse on long names
- **Severity**: low
- **Lens**: ui-perfectionist
- **Category**: visual-layout
- **File**: src/app/api/v1/widgets/embed.js/route.ts:151, 163, 177
- **Scenario**: The injected stylesheet declares `shrink: 0;` on `.goat-widget-rank`, `.goat-widget-image`, and `.goat-widget-votes`. `shrink` is not a real CSS property (the correct one, `flex-shrink: 0`, is used correctly on `.goat-drag-handle` at line 256). With a long `item.name`, the flex `.goat-widget-name` (flex:1) squeezes the rank badge, thumbnail, and vote count instead of those staying fixed-width — the `#1` badge truncates and the 32×32 image shrinks/distorts.
- **Root cause**: Copy-paste typo; the embed CSS is hand-authored as a template string with no linting, so the invalid declaration is silently ignored by browsers.
- **Impact**: Visible layout breakage in the most prominent third-party-facing surface (the embeddable ranking list), degrading the "Powered by GOAT" brand impression on partner sites.
- **Fix sketch**: Replace the three `shrink: 0;` declarations with `flex-shrink: 0;` (and add `min-width:0` to `.goat-widget-name` so it truncates with the existing ellipsis rule).
