# Combined UI+Bug Fix Wave 9 — Wrong-data-source / misleading data (T8)

> 3 commits, 4 findings closed (3 high + 1 medium). All self-contained data-correctness fixes.
> Baseline preserved: TypeScript 53 → 53 (zero regression). Branch: `vibeman/ui-bug-wave9-datasrc` (off wave 8).
> Note: the CollectionView ordering source-of-truth (also a T8 item) was already fixed in Wave 2.

## Commits

| # | Commit | Finding | Severity | Files |
|---|---|---|---|---|
| 1 | `c4abd71` | item-inspector #2 + #4 — zeroed stats render real; chart truncates past 50 | high + medium | `RankingDistribution.tsx` |
| 2 | `94c664c` | item-inspector #1 — AverageRankingBadge ranks subset, not population | high | `items/stats/route.ts` |
| 3 | `b0b3336` | list-preview #3 — vacuous "avg rank" preview stat | high | `ListPreviewPopover.tsx` |

## What was fixed

1. **Zeroed stats rendered as real (high).** The `/details` API returns a *zeroed* stats object (not null) for unranked items, so `RankingDistribution` skipped its "No ranking data" branch and showed "Avg #0.0 / percentiles #0 / Very Stable", implying community consensus that doesn't exist. Now treats `totalRankings === 0` as the empty state.

   **Chart truncation (medium, same commit).** `chartData` clamped `maxPos` to 50, silently dropping rankings 50–100 from the histogram while the stats grid showed the full data (chart and numbers disagreed), and the median `ReferenceLine` could point off-axis (legend referencing an invisible line). Raised the cap to 100 and only render the median line when it falls within the visible domain.

2. **AverageRankingBadge ranked the subset (high).** `/api/items/stats` sorted only the requested `item_ids` and assigned `average_ranking = subset index + 1`. Because badges auto-batch concurrent fetches, the rank depended on which items shared a microtask (non-deterministic across renders), and a single-item fetch always read "#1 / Top 0%" — contradicting the inspector's real `/details` stats. When `item_ids` is provided the route now fetches the full population's `selection_count`s (category-scoped if given), ranks globally, and maps each requested item to its global rank/percentile.

3. **Vacuous "avg rank" preview (high).** The list-preview "avg rank" badge averaged item *positions* — ~(N+1)/2 for any fully-ranked list, identical across same-size lists — and referenced a non-existent `ranking` field, presenting a confident but meaningless number. Removed the badge (no real metric backs it) and rebalanced the stats row.

## Verification

| Gate | Before | After | Result |
|---|---|---|---|
| TypeScript | 53 | 53 | ✅ no regression |
| Tests | n/a | n/a | Playwright e2e only |
| Lint | blocked | blocked | ⚠️ pre-existing |

Each fix tsc-checked. (A pre-existing `BarShapeProps` recharts import error in RankingDistribution is part of the 53 baseline, on a line untouched by this wave.)

## Patterns established (catalogue item 19)

19. **A rank/stat is only meaningful against its true population.** Ranking a *requested subset* (and presenting it as a global figure), averaging positions (structurally ~(N+1)/2), or returning *zeroed* stats for "no data" all manufacture confident-looking numbers that are wrong. Rank against the real population, return null/empty for no-data (don't zero-fill), and don't surface a stat with no real metric behind it. Also: a display ceiling (cap at 50) silently desyncs a chart from the stat grid computed on full data.

## Deferred (documented)

- **list-preview #4 — thumbnails order by wrong table column:** `.order('ranking')` on a `list_items` query where `ranking` may live on the joined `items` table; the fix requires confirming the actual schema/column owner (can't verify the DB here). Tracked for a schema-informed pass.
- **collection toolbar filters (collection-panel #1):** architectural — already in `followups-2026-06-16.md` from Wave 2.

## What remains

- Non-critical themes: T5 a11y/reduced-motion, T3 non-atomic counters, T11 mobile + the deferred Wave-2 items + thumbnails-order (schema-dependent).
- Cumulative Waves 1–9: 38 functional findings closed + 4 security mitigated; TS held at 53 throughout; 0 regressions.
