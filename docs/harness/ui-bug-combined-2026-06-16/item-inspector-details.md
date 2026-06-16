# Item Inspector & Details — Combined UI+Bug Scan
> Context: Deep-dive inspector/popups showing item metadata, ranking distribution, average rank, and trajectory charts.
> Files scanned: 14
> Total: 5 (Critical: 0, High: 3, Medium: 2, Low: 0)

## 1. AverageRankingBadge shows a meaningless "average ranking" derived from batch composition
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: silent failure / data correctness
- **File**: src/app/api/items/stats/route.ts:52
- **Scenario**: A collection of items renders `AverageRankingBadge` (variant=compact) on each tile. Each badge calls `useItemStat(itemId)` → `goatApi.items.getStat(itemId)`, which auto-batches concurrent calls into one `getStats({ item_ids })` request. The route sorts ONLY the requested subset by `selection_count` and assigns `average_ranking = index + 1` and `percentile = round((1 - index/length) * 100)`.
- **Root cause**: The route treats `average_ranking`/`percentile` as a rank *within the queried set*, not a global ranking. The badge UI labels it `#{average_ranking}` ("average ranking") and `Top {100 - percentile}%`, implying a global/community figure. Because batching is a timing artifact (which items land in the same microtask), the rank an item shows is non-deterministic across renders, and any single-item fetch always yields `#1` / `Top 0%`.
- **Impact**: Every item badge displays wrong, unstable numbers; users see "#1 / Top 0%" on arbitrary items. This directly contradicts the real community stats shown in the inspector (`/details` computes a proper average), so the same item shows two different "average rankings".
- **Fix sketch**: Compute `average_ranking`/`percentile` against the full population (or rank by a stored global metric) rather than the requested subset; or rename the badge to "selection rank in view". At minimum, fetch the global ordering server-side independent of `item_ids`.

## 2. Average/median/percentiles render real-looking numbers when there are zero rankings
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: edge-case wilderness / empty data
- **File**: src/app/features/Collection/components/RankingDistribution.tsx:217
- **Scenario**: For an item with no community rankings, `fetchRankingStats` (details/route.ts:218-229) returns a *zeroed* stats object (not `null`). `RankingDistribution` only shows its "No ranking data available" empty state when `stats === null`; with a zeroed object it skips that branch and renders the full stat grid: Avg Position `#0.0`, percentiles `#0 / #0 / #0`, Confidence `0%`, Volatility "Very Stable" (since `volatility < 2`).
- **Root cause**: The empty-state contract is "null = no data", but the API deliberately returns zeroed stats "so the UI always shows the distribution panel". The component never checks `totalRankings === 0`.
- **Impact**: Brand-new / unranked items look authoritatively ranked at position #0 and "Very Stable", which is nonsensical and misleads users into thinking community consensus exists. The chart simply renders empty (chartData length 0) leaving an orphan legend.
- **Fix sketch**: In `RankingDistribution`, treat `!stats || stats.totalRankings === 0` as the empty state; or have the API return `null` when `totalRankings === 0` so the existing empty branch fires.

## 3. ItemInspector "Quick Assign / Add to Grid" is a no-op
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: broken behavior / dead action
- **File**: src/app/features/Collection/components/ItemInspectorProvider.tsx:32
- **Scenario**: User opens the inspector and clicks the prominent "Add to Grid" button. `handleQuickAssign` logs a debug line and returns — the body explicitly comments "the actual assignment would need the full item data" and never calls `assignItemToGrid` (which is destructured but unused). The inspector still closes (ItemInspector.tsx:165), giving the impression the item was added.
- **Root cause**: Provider was stubbed and never finished; it lacks the item payload that `ItemDetailPopupProvider` reconstructs from the backlog store.
- **Impact**: A primary CTA silently does nothing while the panel closes, implying success. Users believe the item was added to the grid; it was not — a confusing, trust-eroding dead button.
- **Fix sketch**: Mirror `ItemDetailPopupProvider.handleQuickAssign` (fetch item via `getItemById`, build the grid item, call `assignItemToGrid`), or hide the `onQuickAssign` prop until implemented so the button doesn't render.

## 4. Distribution chart silently truncates rankings beyond position 50
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: edge-case / off-by-clamp
- **File**: src/app/features/Collection/components/RankingDistribution.tsx:175
- **Scenario**: For a list longer than 50 (or an item frequently ranked low, e.g. positions 60–80), `chartData` clamps `maxPos = Math.min(50, ...)`. Any rankings above position 50 are dropped from the histogram. Worse, if the median itself is > 50, the `ReferenceLine x={Math.round(stats.medianPosition)}` (line 326) points off the rendered axis, so the "Median position" legend item references a line the user can't see, and the highlighted median bar never appears.
- **Root cause**: A hard-coded display ceiling of 50 with no overflow indication, plus a reference line keyed to an unclamped median.
- **Impact**: Items ranked beyond 50 show a misleadingly empty/partial distribution; the median marker can vanish, breaking the chart legend's promise. Stats grid (avg/percentiles) still reflect the full data, so chart and numbers visibly disagree.
- **Fix sketch**: Derive `maxPos` from the actual data range (cap higher, e.g. 100) or bucket the tail into a "50+" column; clamp the `ReferenceLine` x to the visible domain and skip rendering it when the median falls outside.

## 5. Floating popup header lacks dialog semantics, focus management, and accessible controls
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: accessibility / missing polish
- **File**: src/app/features/Collection/components/ItemDetailPopup.tsx:121
- **Scenario**: The popup is a draggable floating card but has no `role="dialog"`/`aria-modal`, no `aria-label`, and never moves focus into itself on open. The close (line 243) and lock (line 228) buttons have only `title` (lock) and nothing (close) — no `aria-label`, so screen readers announce empty buttons. Up to 4 popups stack with no focus trap or programmatic focus; Escape (line 113) closes whichever popup's listener fires but focus is never restored to the trigger.
- **Root cause**: The inspector got dialog semantics (ItemInspector.tsx:202-204) but the popup variant was built purely visually; controls rely on `title` tooltips rather than `aria-label`.
- **Impact**: Keyboard/AT users cannot reliably operate or even perceive the popups; the icon-only close button is unlabeled. Inconsistent with the inspector, which is properly labelled — a design-system accessibility drift.
- **Fix sketch**: Add `role="dialog" aria-label={data?.item.title ?? 'Item details'}` to the card, give the close/lock buttons `aria-label`s, and on mount move focus to the card (and restore to the opener on close), matching the inspector's pattern.
