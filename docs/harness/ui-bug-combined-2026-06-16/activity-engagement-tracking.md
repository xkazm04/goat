# Activity & Engagement Tracking — Combined UI+Bug Scan
> Context: Records and surfaces user activity events (rankings, edits, item interactions) in timelines and feeds.
> Files scanned: 6
> Total: 5 (Critical: 0, High: 3, Medium: 2, Low: 0)

## 1. Real network failures fabricate fake "demo" activity into the live feed every poll
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: silent-failure / data-integrity
- **File**: src/stores/activity-store.ts:200-208
- **Scenario**: The API at `/api/activities` is reachable but transiently fails (500, timeout, JSON parse error, offline). The `catch` block runs every poll cycle (10s) while the outage persists.
- **Root cause**: The catch treats *any* thrown error as "API not available" and injects a randomly chosen `generateDemoActivities()[...]` entry with a fresh `local`-style id and `new Date()` timestamp, then swallows the error (`error: null`). There is no distinction between "endpoint missing" and "endpoint failing".
- **Impact**: During any backend hiccup the user sees a steady stream of fabricated activity (`Swift Ranker42 ranked...`) that never happened. The feed silently lies; the error state is cleared so no UI ever signals the outage. Because it fires on every interval, the fake events also crowd out real ones (20-item cap).
- **Fix sketch**: Only seed demo data once on first 404 (feature-absent) detection, gated behind an explicit `isDemoMode` flag. On real errors set `error` and stop fabricating; let the UI show a stale/error indicator. Distinguish HTTP failures from network exceptions.

## 2. Trajectory sparkline is built only from the last N events but presented as full rank history
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: correctness / misleading-data
- **File**: src/app/api/items/[id]/activity/route.ts:50-58
- **Scenario**: An item has 80 activity events. The query applies `.limit(limit)` (max 50, default 20) ordered `created_at DESC`. `trajectory` is then derived from that already-truncated `events` array.
- **Root cause**: `positionEvents` filters and `.reverse()`s the *limited* result set, not the full history. `totalEvents` is the true `count` (80), but the trajectory only covers the most recent ≤20 position events, while the sparkline is labeled "Rank Trajectory" with a `Climbing/Falling (N positions)` summary implying lifetime trend.
- **Impact**: The "trend" headline and sparkline can show "Climbing 3 positions" when the item's full history actually fell — the chart silently drops the older half. Endpoints (`#minPos`/`#maxPos`) are min/max of a partial window, so the reported best/worst rank is wrong.
- **Fix sketch**: Run a separate, unbounded (or higher-limit) query for position-bearing events to build the trajectory, or relabel the sparkline to "Recent trajectory (last N)". Do not derive lifetime trend from a paginated slice.

## 3. Activity feed store and `/api/activities` shapes diverge; fetched events never render and dedupe is unstable
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: contract-mismatch / dead-code
- **File**: src/stores/activity-store.ts:183-199
- **Scenario**: `fetchRecentActivities` calls `/api/activities?limit=10`, which returns `ActivityRecord[]` with a string `timestamp` (ISO) and id like `activity-…`/`demo-1`. These are merged directly as `ActivityItem` (which expects a `Date` timestamp).
- **Root cause**: No mapping/normalization between the API `ActivityRecord` (string timestamp) and the store `ActivityItem` (Date). `removeOldActivities` calls `new Date(activity.timestamp).getTime()` so it tolerates strings, but other consumers expecting a `Date` will break, and the server's static `demo-1/2/3` ids are filtered out forever after the first poll (they're added to `existingIds`), so the server's real seed data only appears once. `setActivities` is defined but never called anywhere — dead API.
- **Impact**: Mixed `Date`/`string` timestamps cause inconsistent `formatTimeAgo`-style rendering; server demo records appear once then vanish; the two activity subsystems (`/api/activities` feed vs `/api/items/[id]/activity` timeline) share names but are wholly incompatible, inviting future regressions.
- **Fix sketch**: Add an explicit mapper `ActivityRecord → ActivityItem` that coerces `timestamp` to `Date`; remove or wire up `setActivities`; key dedupe on a stable server id rather than mixing demo/local/server id namespaces.

## 4. Timeline never surfaces fetch errors — failure is indistinguishable from "No activity yet"
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: missing-error-state
- **File**: src/app/features/Collection/components/ActivityTimeline.tsx:73-114
- **Scenario**: The `/api/items/:id/activity` request throws (network) or returns a non-`ok` status (500 from Supabase error). `data` stays `null`, loading ends.
- **Root cause**: The `catch` is empty ("silently fail") and a non-`ok` response is ignored (only `res.ok` sets data). The render then falls into the `!data` branch, which shows the cheerful empty state "No activity yet / Ranking events will appear here".
- **Impact**: A genuine backend failure is presented as a confirmed empty history. Users (and support) cannot tell "this item truly has no activity" from "the activity service is down," and there is no retry affordance. This is the timeline's only failure path and it misleads.
- **Fix sketch**: Track an `error` state; on non-ok/throw render a distinct error block (icon + "Couldn't load activity" + Retry button) separate from the empty state. Keep the empty state strictly for a successful response with zero events.

## 5. Sparkline single-point flatline and divide-by-fragility; verbose duplicated min/max math
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: edge-case / component-architecture
- **File**: src/app/features/Collection/components/ActivityTimeline.tsx:230-337
- **Scenario**: An item has exactly 2 position events at the *same* rank (e.g. assigned at #5, rank_change still #5). `range = Math.max(maxP-minP, 1)` clamps to 1, so the path is a flat line — acceptable — but the endpoint `<circle>` blocks recompute `Math.min(...)`/`Math.max(...)` inline four separate times, and the header shows `#minPos`/`#maxPos` as identical (`#5 … #5`) with label "Stable", which reads oddly next to a flat line and wastes vertical space.
- **Root cause**: Endpoint Y-coordinates are computed with copy-pasted `Math.min/Math.max` spread expressions instead of reusing the memoized `minPos`/`maxPos`/`range` already derived above, duplicating logic and risking drift if the formula changes. The 2-point guard (`trajectory.length >= 2`) also means a brand-new item with a single assign event shows no trajectory at all with no explanatory text.
- **Impact**: Maintainability hazard (four divergent copies of the same normalization), and a minor UX gap where single-event items silently omit the trajectory section with no "not enough data yet" hint. Visual polish suffers on flat/degenerate series.
- **Fix sketch**: Compute endpoint Y from the already-memoized `minPos`/`range` values; collapse the duplicated spreads into one helper. Optionally render a subtle "Not enough history for a trend" hint when `trajectory.length < 2` instead of rendering nothing.
