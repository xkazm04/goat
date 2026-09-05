# Creator Analytics Dashboard — Combined UI+Bug Scan
> Context: Creator dashboard with summary KPIs, an aggregate views bar chart, per-list cards, sparklines, and consensus metrics.
> Files scanned: 7
> Total: 5 (Critical: 0, High: 2, Medium: 2, Low: 1)

## 1. "Views Over Time" charts attribute all views to a share's creation day, not when views occurred
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: data-correctness / misleading-visualization
- **File**: src/app/api/lists/analytics/route.ts:130-135
- **Scenario**: A share row created 12 days ago accrues view_count over the following days (it's a running counter on `shared_rankings`). The API buckets the *entire* current `view_count` onto the share's `created_at` day. A list shared once 12 days ago with 800 cumulative views renders a single 800-view spike on day 18 and zeros everywhere else — implying a one-day viral event that never happened.
- **Root cause**: There is no per-day view event table; the code treats a cumulative counter (`view_count`) as if it were a daily delta and stamps it on `created_at`. The 30-day window (`thirtyDaysAgo`, line 99) is computed but never actually used to filter — only the pre-seeded `viewsByDay` keys gate inclusion.
- **Impact**: Both the per-card `SparklineChart` and the aggregate `AggregateViewsChart` (which sums these buckets, CreatorAnalyticsDashboard.tsx:73-87) show fabricated trend shapes. The headline "trends over time" value proposition of the dashboard is unreliable.
- **Fix sketch**: Drive the time series from an actual per-day view/event source (e.g. a `views` event table or daily snapshot), or relabel the chart to "Shares Over Time" and bucket share *counts* rather than cumulative `view_count`. At minimum, document that the series is shares-by-creation-day, not views-by-day.

## 2. Total Views KPI can read non-zero while the views chart shows "No view data in the last 30 days"
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: edge-case / inconsistent-aggregation
- **File**: src/app/api/lists/analytics/route.ts:108-110 vs 130-136
- **Scenario**: `total_views`/`listViewCount` sums `view_count` across *all* shares regardless of date (line 109), but `views_over_time` only includes shares whose `created_at` day falls in the seeded 30-day map (line 132). A creator whose shares were all created 31+ days ago sees "Total Views: 5,200" in the SummaryCard while AggregateViewsChart renders the empty state "No view data in the last 30 days" (CreatorAnalyticsDashboard.tsx:90-96) and every sparkline shows "No view data yet" (SparklineChart.tsx:42-50).
- **Root cause**: Two different inclusion windows for the same metric — lifetime totals vs a 30-day bucket map — with no reconciliation between them.
- **Impact**: Looks like a data-loss bug to the creator ("where did my views go?"); erodes trust in the whole dashboard.
- **Fix sketch**: Make the windows consistent — either compute the KPI from the same 30-day buckets, or label the KPI "Total Views (all time)" and the chart "Last 30 days" so the divergence is intentional and explained.

## 3. SparklineChart tooltip shows raw ISO date while the aggregate chart shows MM-DD — and sparkline has no axis labels
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: design-system-drift / chart-polish
- **File**: src/app/features/Analytics/SparklineChart.tsx:27
- **Scenario**: Hovering a per-list sparkline shows a tooltip reading `2026-06-16  342 views` (full ISO `payload.date`), whereas the aggregate chart's tooltip uses a `MM-DD` label (CreatorAnalyticsDashboard.tsx:84, `date.slice(5)`). Same dashboard, same metric, two different date formats.
- **Root cause**: The sparkline consumes the unformatted `views_over_time[].date` directly; date formatting was only applied in the aggregate chart's `useMemo`, not centralized.
- **Impact**: Inconsistent, slightly unpolished feel; the long ISO string is also wider than the compact sparkline and can overflow its container on the right edge.
- **Fix sketch**: Format the date once (a shared `formatDay(date)` helper) and use it in both tooltips; render the sparkline tooltip date as `MM-DD` to match the aggregate chart.

## 4. Per-list cards never surface their own error/partial-data state; one missing sub-query silently zeros metrics
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: silent-failure / missing-error-state
- **File**: src/app/api/lists/analytics/route.ts:85-96
- **Scenario**: The `items` lookup (line 86) ignores its error (no `if (error) throw`) and caps at `.slice(0, 500)` item IDs (line 89). A creator with many lists exceeding 500 distinct items, or a transient `items` query failure, yields `top_items`/`most_controversial` names rendered as "Unknown" (route.ts:155, 200) with no signal that data is degraded. The card looks healthy but is wrong.
- **Root cause**: Best-effort enrichment query swallows its error and silently truncates; the UI has only a top-level error state (CreatorAnalyticsDashboard.tsx:230) and no per-card degraded indicator.
- **Impact**: "Most Interacted" and "controversial" item names show as "Unknown" with no explanation; appears as a content bug rather than a known limit.
- **Fix sketch**: Surface the `items` query error (or log + flag), and when names resolve to "Unknown" render a subtle placeholder/tooltip ("item details unavailable") instead of literal "Unknown"; raise or paginate the 500-ID cap.

## 5. Agreement rate defaults to 100% when there is no real consensus data, and reads green
- **Severity**: low
- **Lens**: bug-hunter
- **Category**: edge-case / misleading-metric
- **File**: src/app/api/lists/analytics/route.ts:191-193
- **Scenario**: A brand-new list with zero ranking activities (or every item ranked by only one person, so `positions.length < 2` everywhere, line 180) produces `varianceCount === 0`, so `agreement_rate` falls through to `1` (and to `1` again if `list.size` is 0, making `maxVariance` 0). ListAnalyticsCard.tsx:142 then renders "Agreement 100%" in confident emerald green for a list with no agreement signal at all.
- **Root cause**: The no-data case is conflated with perfect agreement; `agreement_rate` is a non-nullable number with a misleading default.
- **Impact**: New/low-traffic lists boast a fake "100% agreement" badge, misrepresenting engagement quality to creators.
- **Fix sketch**: Return `null`/undefined for `agreement_rate` when `varianceCount === 0`, and have the card render "—" or "Not enough data" in a neutral slate color instead of green 100%.
