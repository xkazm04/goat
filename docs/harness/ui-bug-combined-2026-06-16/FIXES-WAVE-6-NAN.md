# Combined UI+Bug Fix Wave 6 — NaN / divide-by-zero math (T4)

> 5 commits, 5 findings closed (2 high + 2 medium + 1 low). All self-contained guard fixes.
> Baseline preserved: TypeScript 53 → 53 (zero regression). Branch: `vibeman/ui-bug-wave6-nan` (off wave 5).

## Commits

| # | Commit | Finding | Severity | Files |
|---|---|---|---|---|
| 1 | `3f5fde2` | achievements #4 — NaN% completion on empty showcase | medium | `AchievementShowcase.tsx` |
| 2 | `74b5627` | consensus #3 — NaN totalRankings on empty consensus | medium | `ConsensusDataService.ts`, `consensus/[listId]/route.ts` |
| 3 | `2033508` | ranking-engine #2 — tier percentile goes negative | high | `TierCalculator.ts` |
| 4 | `0124e19` | result-image #4 — center-of-mass NaN | medium | `BalanceOptimizer.ts`, `LayoutEngine.ts` |
| 5 | `f381886` | creator-analytics #5 — fake 100% agreement | low | `analytics/route.ts`, `ListAnalyticsCard.tsx`, `top-lists.ts` |

## What was fixed

1. **Achievements NaN% completion.** `completionPercent = unlocked / showcase.achievements.length` was unguarded, so an empty achievements list (0/0) rendered "NaN%" on the public, shareable showcase. Guarded the divisor (→0%) and clamped the locked-card progress bar against a zero target.

2. **Consensus NaN totalRankings.** `createCommunityRanking` computed `totalRankings` as `sum(sampleSize) / items.length` without the zero-length guard its siblings had, so an empty consensus (cold-start, all filtered) yielded NaN that propagated to the API response, the `totalUsers` reduction, and UI counts. Guarded both the service and the mock `[listId]` route.

3. **Tier percentile negative (high).** Percentile used `((total - item.position - 1) / total)` where `total` = filled count but `item.position` = absolute grid slot. In partially-filled lists the slot exceeds the filled count, producing wildly negative percentiles (slot 49 of 5 filled → −900th). Now derived from the item's rank index within the sorted filled set.

4. **Center-of-mass NaN.** Both `BalanceOptimizer.calculateCenterOfMass` and `LayoutEngine.calculateVisualBalance` guarded only the empty-collection case, not all-zero-weight (degenerate zero-area cell), so `totalWeight === 0` gave 0/0 = NaN that leaked into composition metadata and the Gemini prompt ("Center of Mass: (NaN, NaN)"). Added `totalWeight === 0` guards (canvas center / neutral balance).

5. **Fake 100% agreement.** `agreement_rate` fell through to `1` when `varianceCount === 0` (no item ranked by 2+ users) or `list.size === 0`, so new/low-traffic lists showed a confident emerald "Agreement 100%". Now returns `null` in that case (`CreatorListAnalytics.agreement_rate: number | null`); the card renders a neutral "Not enough data".

## Verification

| Gate | Before | After | Result |
|---|---|---|---|
| TypeScript | 53 | 53 | ✅ no regression |
| Tests | n/a | n/a | Playwright e2e only |
| Lint | blocked | blocked | ⚠️ pre-existing |

Each fix tsc-checked before commit. (Fix #5 required widening `agreement_rate` to `number | null` in `top-lists.ts`, caught and resolved during the per-task tsc.)

## Patterns established (catalogue item 16)

16. **The empty-collection guard is not the zero-total guard.** A `length === 0` check does NOT cover an all-zero-weight / all-zero-count collection (`length > 0`, sum `=== 0`) — that still divides 0/0 → NaN. Guard the *denominator*, not just the array length. And distinguish "no data" from a real value: defaulting a rate to 1/100% on empty input fabricates a misleading metric (fake "100% agreement") — return null and render a neutral "not enough data".

## What remains

- Non-critical themes: T5 a11y/reduced-motion, T3 non-atomic counters, T8 wrong-data-source, T10 theming, T11 mobile, T12 leaks + the deferred Wave-2 items.
- Cumulative Waves 1–6: 24 functional findings closed + 4 security mitigated; TS held at 53 throughout; 0 regressions.
