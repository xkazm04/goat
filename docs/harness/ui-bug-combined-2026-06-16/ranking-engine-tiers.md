# Ranking Engine & Tiers — Combined UI+Bug Scan
> Context: Position-assignment engine, S/A/B tier boundary math, placement prediction, and the cross-list ranking graph.
> Files scanned: 15
> Total: 5 (Critical: 1, High: 2, Medium: 2, Low: 0)

## 1. Pyramid tier mapping produces NaN boundaries for tierCount > 5
- **Severity**: critical
- **Lens**: bug-hunter
- **Category**: NaN propagation / state corruption
- **File**: src/lib/ranking/RankingEngine.ts:849
- **Scenario**: Call `engine.toTiers({ algorithm: 'pyramid', tierCount: 6 })` (or 7, 9 — all valid per the config type and the app's 6/9-tier presets). `calculateTierMappings` hardcodes `const weights = [1, 2, 3, 4, 5].slice(0, config.tierCount)`, so for `tierCount = 6` it yields only 5 weights. On the 6th iteration `weights[5]` is `undefined`, so `tierSize = Math.ceil((undefined / totalWeight) * size)` evaluates to `NaN`.
- **Root cause**: The weight table is a fixed 5-element literal but `tierCount` is caller-controlled and the surrounding system supports up to 10 tiers. No guard ties the array length to `tierCount`.
- **Impact**: `endPosition = Math.min(position + NaN, size) = NaN`, so the 6th tier and every tier after it gets `startPosition`/`endPosition` of `NaN`. The `position >= startPosition && position < endPosition` filter in `toTiers` (line 536) is always false against `NaN`, so those tiers silently render empty and items in the tail of the ranking vanish from the tier view entirely — data loss in the displayed ranking.
- **Fix sketch**: Generate weights from `tierCount` instead of a literal, e.g. `Array.from({ length: config.tierCount }, (_, i) => i + 1)`, or reuse the validated `calculatePyramidBoundaries` from TierCalculator. Add a fallback that clamps any non-finite `tierSize` to ≥1.

## 2. Tier percentile goes negative for sparse / large-grid rankings
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: off-by-context math / boundary
- **File**: src/lib/tiers/TierCalculator.ts:301
- **Scenario**: A 50-slot list with 5 filled items at absolute positions 0, 12, 25, 40, 49. `assignTiersToItems` sets `total = sorted.length = 5`, then computes `percentile = Math.round(((total - item.position - 1) / total) * 100)`. For the item at position 49: `((5 - 49 - 1) / 5) * 100 = -900`.
- **Root cause**: The formula assumes `item.position` is a dense 0..total-1 rank, but `position` is the absolute grid slot, which routinely exceeds the count of filled items in partially-filled lists.
- **Impact**: Percentile badges show absurd negative values (e.g. "-900th percentile"), and any downstream logic that thresholds on percentile (tier suggestion confidence, "top X%" labels) is wrong for every partially-filled list — the common case during ranking.
- **Fix sketch**: Percentile should be derived from the item's rank index within `sorted` (its array index after sorting), not its absolute `position`: `percentile = Math.round(((total - rankIndex - 1) / total) * 100)`, or normalize against `listSize` instead of `total`.

## 3. Boundary drag-adjust can crash on the top/bottom-most boundary
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: edge-case / undefined access
- **File**: src/stores/ranking-store.ts:1268-1272
- **Scenario**: `adjustBoundary(boundaryIndex, newPosition)` validates `boundaryIndex` only against `boundaries.length`. When `boundaryIndex === 0` it reads `currentTiers[0].startPosition` (line 1269); when `currentTiers` is empty — e.g. smart tiers enabled but `calculateSmartTiers` never ran, so `boundaries` was hydrated from persisted `customThresholds` while `currentTiers` is still `[]` — `currentTiers[0]` is `undefined` and `.startPosition` throws. The same hazard exists at line 1272 (`currentTiers[currentTiers.length - 1]` → `currentTiers[-1]`).
- **Root cause**: `boundaries` and `currentTiers` are assumed to always be populated together, but persistence only restores `configuration` (which feeds `boundaries` indirectly), not `currentTiers`, so the two arrays can be out of sync after rehydrate.
- **Impact**: Dragging a tier separator before the first smart-tier calculation throws a `TypeError`, breaking the boundary-editing UI (uncaught in a Zustand `set` updater → React render error).
- **Fix sketch**: Guard early: `if (currentTiers.length === 0 || boundaryIndex < 0 || boundaryIndex >= boundaries.length) return;` and bounds-check `currentTiers[boundaryIndex + 1]` before mutating it.

## 4. TierRow images have no error/loading state and a redundant ref
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: missing polish (error state) / responsiveness
- **File**: src/lib/tiers/TierRow.tsx:215-223
- **Scenario**: An item's `image_url` is set but the asset 404s or is slow. The bare `<img>` shows a broken-image glyph over the tier's colored gradient with no fallback, no `loading="lazy"`, and no `onError` handling. The title still renders, but the thumbnail box is visibly broken — especially jarring against the vivid S-tier gold/red gradients.
- **Root cause**: Raw `<img>` used instead of the project's image component / a fallback wrapper; no defensive state for the (common) broken-URL case in user-supplied ranking data.
- **Impact**: Degraded, inconsistent visuals in the headline tier view whenever any thumbnail fails; on slow connections every tier flashes broken boxes before load. (Also `containerRef` at line 298/325 is written but never read — dead code.)
- **Fix sketch**: Add `loading="lazy"` and an `onError` that hides the image box or swaps to a placeholder initial, matching the empty-image treatment elsewhere; remove the unused `containerRef`.

## 5. Universal-rating badge silently caches `undefined`, suppressing retry forever
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: silent failure / success theater
- **File**: src/stores/ranking-graph-store.ts:52 (consumed at src/hooks/use-ranking-graph.ts:39-43)
- **Scenario**: `GET /api/ranking-graph/[itemId]` returns 200 but the JSON lacks a `rating` field (e.g. service returns `{ insights, trajectory }` for an item with no rating yet). `fetchItemRating` does `ratings: { ...state.ratings, [itemId]: data.rating }`, writing `undefined`. The `useItemUniversalRating` auto-fetch effect guards with `if (itemId && !rating)`, but `ratings[itemId] ?? null` is still `null`, so the effect re-runs `fetchItemRating` — yet the 5-minute cache check (`cached && Date.now() - cached.lastComputed`) is `undefined && ...` → falsy, so it refetches on every render that touches the store.
- **Root cause**: The store treats "key present with undefined value" and "key absent" inconsistently — the cache-freshness path requires a truthy `cached`, but the React hook's "should I fetch" path keys off `null`-vs-value, so a successful-but-empty response neither caches nor stops the retry.
- **Impact**: Items lacking a rating trigger a request storm (one fetch per render of any component using the badge), wasting network and Supabase calls, with no user-visible error since each call "succeeds".
- **Fix sketch**: Only write `ratings[itemId]` when `data.rating` is non-null, or cache a sentinel/negative entry (e.g. `{ ...empty, lastComputed: Date.now() }`) so both the freshness check and the hook's `!rating` guard see a settled value and stop refetching.
