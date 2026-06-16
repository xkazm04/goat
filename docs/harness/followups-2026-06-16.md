# Vibeman follow-ups — 2026-06-16 (combined UI+Bug scan, Wave 2)

Items deliberately deferred from Wave 2 (built-but-unwired) because they are
architectural changes, not mechanical wiring, and the repo has **no unit tests**
(Playwright e2e only) + a **broken eslint config** — so a risky refactor can't be
safely verified beyond `tsc`. Documented here so a future session resumes them
deliberately instead of re-discovering or shipping a half-fix.

## 1. Collection toolbar filters → grid (collection-panel-item-cards #1) — DEFERRED
**Why deferred:** `useCollectionFilterState` is a *component-local* hook — every
caller (e.g. `CollectionToolbar`) gets its own isolated `config`. The grid is
driven by `useCollection().filteredItems`, which only filters by
`selectedGroupIds`/`searchTerm`/`sortBy` and never reads the toolbar's config.
Connecting them requires a single shared filter state across the tree and
running `FilterEngine.apply(items, config, sortConfig)` inside (or downstream of)
`useCollection`. That spans `CollectionPanel`, `CollectionToolbar`,
`useCollection`, and likely `CollectionFiltersContext` / `FilterIntegrationProvider`.

**Recommended approach (next session):**
1. Pick ONE owner of filter state — either lift `useCollectionFilterState()` into
   `CollectionPanel` and pass `config`+actions down, or adopt the existing
   `FilterIntegrationProvider` the hook's own docs point to.
2. Feed `config`/`sortConfig` into `useCollection` (new optional args) and apply
   `FilterEngine.apply` after the group/sort filtering in the `filteredItems` memo.
3. Pass the real `displayItems` as the `items` prop to `CollectionToolbar` so facet
   counts and smart suggestions compute against actual data (currently `[]`).
4. Verify `FilterEngine` field accessors match the collection item shape
   (`item.metadata?.*`, `ranking`, etc.) before trusting the result.

**Risk if rushed:** a wrong FilterEngine field mapping silently hides items —
strictly worse than today's "filters do nothing." Needs manual verification.

## 2. Collections reorder + "Add List" picker (bookmarks #2/#3 remainder) — DEFERRED
Wave 2 landed list **removal** and fixed the **ordering source-of-truth**
(`CollectionView` now re-syncs order on collection switch and renders the
ordered+filtered list). Still open:
- **Drag-to-reorder:** `CollectionView` has **no `DndContext`** at all — the grip
  handle is decorative and `handleReorder` is never invoked. Enabling it needs a
  `DndContext` + `SortableContext` + `useSortable` on the cards, then wiring
  `onReorderLists` from `CollectionsDashboard` to `reorderLists({collectionId, listIds})`.
- **"Add List" picker:** `onAddList` needs a new modal listing the user's lists
  not yet in the collection (click-to-add via `addLists({collectionId, listIds})`).
Both were left unset rather than surfaced as dead controls.

## 3. Comparison engine — DECISION NEEDED (item-comparison #1)
`compareItems`/`ComparisonExporter`/`AttributeRow`/`DiffIndicator` have zero
consumers; the shipped `ComparisonModal` is a criteria-scoring UI. Either wire a
real "Diff" view + export toolbar into `ComparisonModal`, OR delete the orphaned
engine if scoring is the intended product. This is a product call, not a fix.

## 4. Clone API wiring (templates #4) — defer to security wave
"Use template" never calls the clone route, so `clone_count` is always 0. But the
clone route trusts `body.userId` with no auth (IDOR). Wire the UI call only
together with hardening the route to derive `user_id` from the session — bundle
with the gated Security wave.
