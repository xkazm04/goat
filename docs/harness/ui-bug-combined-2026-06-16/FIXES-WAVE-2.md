# Combined UI+Bug Fix Wave 2 — Built-but-unwired (T2)

> 4 commits, 4 findings closed (1 high + 3 high/UX) + 1 partial. 1 finding deferred (architectural).
> Baseline preserved: TypeScript 53 → 53 (zero regression). Tests: Playwright e2e only (not run). Lint: still blocked (`eslint-plugin-storybook` missing).
> Branch: `vibeman/ui-bug-wave2` (off `vibeman/ui-bug-wave1`).

## Commits

| # | Commit | Finding closed | Severity | Files |
|---|---|---|---|---|
| 1 | `9360aad` | templates-blueprints #1 — rating click opens modal | high | `CommunityTemplateCard.tsx` |
| 2 | `abed65f` | wiki-images #2 — branded ImageFallback never wired | high | `progressive-image.tsx`, `ItemCardImage.tsx` |
| 3 | `1cdf571` | achievements-awards #1 — Award Share button dead | high | `AwardList.tsx` |
| 4 | `e984de9` | bookmarks #2 (remove) + #3 (ordering) — collections CRUD | high | `CollectionsDashboard.tsx`, `CollectionView.tsx` |

## What was fixed

1. **Template rating opened the modal.** The whole community card has `onClick={onUseTemplate}` and `StarRating` never stopped propagation, so every star tap bubbled up and yanked the user into the composition modal — rating was unusable from the grid. Wrapped the interactive `StarRating` in a `stopPropagation` span (local to the card; `StarRating` behavior unchanged elsewhere).

2. **Branded ImageFallback never wired.** `ProgressiveImage`'s default fallback rendered plain "No Image" text on a flat square; the polished category-aware `ImageFallback` (gradient + initials) existed but was never used. `ProgressiveImage` now renders `ImageFallback` by default (still overridable via `fallbackComponent`) and accepts an optional `category`; `ItemCardImage` threads it through. Fixes every consumer, not just the studio path. Additive props, no caller churn.

3. **Award Share button dead.** `AwardItem` fully built a Share button gated on optional `onShare`, but `AwardList` never passed it — so TypeScript stayed quiet and the affordance was inert. `AwardList` now passes a handler that shares "<winner> won <category>" via the Web Share API, falling back to clipboard copy.

4. **Collections list-removal + ordering.** `CollectionsDashboard` rendered `CollectionView` with no `onRemoveList`, hiding the remove control and leaving collection contents unmanageable; wired it to `useCollectionOperations.removeList`. Separately `CollectionView` initialized `orderedListIds` once (never re-synced on collection switch) and rendered the *unordered* `filteredLists` while a parallel `orderedLists` memo went unused — saved order ignored, stale order on switch. Order now re-syncs via a `useEffect` keyed on collection id + membership, and a single `displayedLists` memo renders the search-filtered set sorted by saved order.

## Deferred (see `docs/harness/followups-2026-06-16.md`)

- **collection-panel-item-cards #1 — toolbar filters → grid:** architectural. `useCollectionFilterState` is component-local; bridging the toolbar config into `useCollection().filteredItems` (via shared state + `FilterEngine.apply`) spans 4+ files with no tests to catch a regression that could silently hide items. Deferred to a dedicated session — shipping a half-refactor is worse than today's no-op filters.
- **collections reorder + Add-List picker:** `CollectionView` has no `DndContext` (grip handle is decorative) and there is no picker UI. Left `onReorderLists`/`onAddList` unset rather than surfacing dead controls. Needs net-new DnD + a picker modal.
- **comparison engine (item-comparison #1):** product decision — wire a diff view or delete the orphaned engine.
- **clone API wiring (templates #4):** bundle with the Security wave (clone route is an unauthenticated IDOR).

## Verification

| Gate | Before | After | Result |
|---|---|---|---|
| TypeScript | 53 | 53 | ✅ no regression |
| Tests | n/a | n/a | Playwright e2e only |
| Lint | blocked | blocked | ⚠️ pre-existing (`eslint-plugin-storybook`) |

Each fix tsc-checked before commit; count never left 53.

## Patterns established (catalogue items 7–9)

7. **Optional prop = silent dead feature.** A child gating an affordance on an *optional* callback (`{onX && ...}`) that the parent forgets to pass compiles clean but ships an invisible/inert control. Audit optional-callback gates when a feature "doesn't appear." (Award Share, collections CRUD.)
8. **Default to the rich fallback, not the bare one.** When a polished shared component exists (ImageFallback) but consumers must opt in, make it the *default* in the shared primitive so every call site benefits; keep the override for special cases.
9. **Don't surface a control you can't back.** When wiring is partial (remove works, reorder/add don't), leave the unbacked props unset rather than rendering dead buttons — the same "built-but-unwired" anti-pattern this wave exists to kill. Track the gap as an explicit follow-up.

## What remains

Per INDEX: T2 still has the deferred items above + other unwired surfaces (magnetic-snap hook, MiniTrajectoryChart, RankingProgressLayer, DebatePanel, Save Draft). Other themes (T1 security gated, T3 counters, T4 NaN, T5 a11y, T7 silent-failures, T8 wrong-source, T9 timezone, T10 theming, T11 mobile, T12 leaks) untouched. Criticals: 6/16 closed (Wave 1); Wave 2 closed high-severity findings only.
