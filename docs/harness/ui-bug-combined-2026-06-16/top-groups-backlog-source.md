# Top Groups & Backlog Source — Combined UI+Bug Scan
> Context: Categorized item catalog (top groups + items) that populates the backlog for any list, with bulk loading and category browsing.
> Files scanned: 18
> Total: 5 (Critical: 0, High: 3, Medium: 2, Low: 0)

## 1. Bulk-items load fails entirely when a category exceeds 100 groups
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: edge-case / partial-failure boundary
- **File**: src/app/api/top/groups/bulk-items/route.ts:49 (and src/lib/api/goat-api.ts:454, src/stores/backlog/actions-data.ts:379)
- **Scenario**: A large category resolves to >100 uncached groups. `startFastProgressiveLoading` maps every group into one `groupIds` array (`actions-data.ts:379`) and calls `goatApi.groups.getBulkItems` with no chunking. The route rejects the whole request with `400 "Too many groups requested (max 100)"` (`route.ts:49-54`).
- **Root cause**: The `MAX_GROUPS_PER_REQUEST = 100` guard is server-side only; neither the client wrapper nor the store batches/caps the ID list, and `getByCategory` already requests `limit: 100` groups (`use-item-groups.ts:165`), so the boundary is reachable in normal use.
- **Impact**: The entire backlog comes back empty for that list — not a degraded subset but zero items, because the single bulk call throws/returns an error object instead of a `{groupId: items[]}` map. The grid then has nothing to drag from.
- **Fix sketch**: Chunk `groupIds` into batches of ≤100 in `getBulkItems` (or in the store) and merge the per-batch maps, so large categories load fully instead of failing all-or-nothing.

## 2. Error response object is consumed as an items map, corrupting state
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: silent failure / type-trust gap
- **File**: src/stores/backlog/actions-data.ts:423 (consumes src/app/api/top/groups/bulk-items/route.ts:36-54)
- **Scenario**: On the missing-param or too-many-groups paths, the route returns `{ error, requestId }` with a 4xx status. If `request()` resolves that body (rather than throwing) the store does `bulkItems[group.id]` against an object that has no group keys, so every group silently resolves to `[] ` (`actions-data.ts:423`, `|| []`).
- **Root cause**: The success and error response shapes are structurally indistinguishable to the consumer — both are plain JSON objects — and the store never checks for an `error` field before indexing by group id.
- **Impact**: Backlog appears to "load successfully" but is completely empty, with no error toast or retry. Indistinguishable from a legitimately empty category, so users/devs can't tell a failure occurred.
- **Fix sketch**: Have the route signal failures via thrown HTTP errors the client rejects on, and/or guard in the store: if the response contains an `error` key or isn't a plain id-keyed map, treat it as a failure and surface it.

## 3. Two divergent item-count sources can disagree per group
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: data inconsistency
- **File**: src/app/api/top/groups/route.ts:39 vs src/app/api/top/groups/categories/[category]/route.ts:40
- **Scenario**: `/api/top/groups` computes `item_count` live from the `items(count)` embedded aggregate (`route.ts:39,66`), while `/api/top/groups/categories/[category]` reads the trigger-maintained `item_count` column and filters `gte('item_count', minItemCount)` (`categories route:40,59`). If the trigger lags or drifts, the same group shows a different count (or is filtered out) depending on which endpoint loaded it.
- **Root cause**: Two independent sources of truth for the same field, one real-time aggregate and one denormalized column, with no reconciliation. `useGroupsByCategory` also re-sorts by `item_count` (`use-item-groups.ts:171`), so a stale column reorders or hides groups.
- **Impact**: Groups with real items can be hidden by the `min_item_count >= 1` filter when the cached column reads 0, making backlog items unreachable; counts shown in the UI disagree between catalog views.
- **Fix sketch**: Pick one count source. Either have the categories route also use the `items(count)` aggregate, or document/verify the trigger and have the listing route read the same column, so both endpoints are consistent.

## 4. Negative/NaN offset and limit fall through to wrong rows or full failure
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: input-trust / pagination boundary
- **File**: src/app/api/top/groups/[id]/items/route.ts:19 (also categories/[category]/route.ts:26-27)
- **Scenario**: `limit`/`offset` are taken via bare `parseInt(...)` with no clamping (`[id]/items:19-20`, `categories:26-27`). A request with `?limit=-5` yields `range(0, -6)` and `?limit=abc` yields `range(0, NaN)`; both produce empty or PostgREST-error responses. `/api/top/groups` and `/api/top/items` correctly clamp with `Math.max/Math.min` (`route.ts:24-25`), so the inconsistency is the tell.
- **Root cause**: Pagination params are trusted as-is in the per-group and per-category routes; only two of the four list endpoints sanitize them.
- **Impact**: Malformed or hostile pagination params return empty item lists (or a 500), breaking "load more" / paginated browsing for a group with no graceful fallback.
- **Fix sketch**: Apply the same `Math.max(1, Math.min(parseInt(...) || default, MAX))` / `Math.max(0, parseInt(...) || 0)` clamping used in `groups/route.ts` to the `[id]/items` and `categories/[category]` routes.

## 5. Empty/whitespace search term still triggers an uncached, unfiltered scan
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: edge-case / caching
- **File**: src/app/api/top/groups/route.ts:31
- **Scenario**: A `?search=` (empty) or `?search=%20%20` (whitespace) param is truthy enough that `shouldCache = !search` becomes `false` (`route.ts:31`), disabling caching, yet `if (search)` for empty string is falsy so no `ilike` filter is applied for `''` — and a whitespace value applies `ilike('%   %')` matching essentially nothing. The hook trims search before keying (`use-item-groups.ts:154,117`) but direct/legacy callers of `/api/top/groups` don't.
- **Root cause**: `search` truthiness drives two different decisions (cache vs filter) without first trimming/normalizing, so blank-but-present search strings get inconsistent treatment.
- **Impact**: Blank searches bypass the 5-minute cache on a reference-data endpoint (extra DB load), and whitespace searches return a near-empty group list, making the backlog catalog look empty for an effectively blank query.
- **Fix sketch**: Normalize once at the top: `const search = (searchParams.get('search') || '').trim() || null;` and derive both `shouldCache` and the filter from that single trimmed value.
