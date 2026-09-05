# Combined UI+Bug Fix Wave 18 — Deferred decisions

> 3 commits resolving the 4 user-gated decisions left across the run.
> Baseline preserved: TypeScript 53 → 53 (zero regression). Branch: `vibeman/ui-bug-wave18-decisions` (off wave 17).

This wave is different from waves 1–17: every item here was a **deferred decision**, not a
straightforward fix. Each needed a product call (build / delete / keep / drop) because the
"right" fix wasn't unique. The user made all four calls; this wave executes them.

## Decisions & commits

| Decision | Choice | Commit | Files |
|---|---|---|---|
| StatsCard magic-string color coloring | **Drop** (explicit prop only) | `7e510e0` | `stats-card.tsx` |
| Orphaned comparison/diff engine | **Delete** | `57be022` | 4 files removed + `index.ts` |
| Collections reorder + Add-List picker | **Build** | `9349419` | `CollectionView.tsx`, `CollectionsDashboard.tsx`, `AddListModal.tsx` (new) |
| Light-mode palette | **Keep dark-only** | — (no-op by decision) | — |

## What was done

1. **StatsCard color (drop).** `StatItem` inferred a value's color from its human-readable
   label via `defaultColors[metric.label.toLowerCase()]` ("Active"→green, "Error"→red). That
   silently overrode caller intent for common English words and broke under any localization.
   Replaced with `const valueColor = metric.color || "text-gray-300"` — color now comes only
   from the explicit `color` prop. Also made the inline-layout colon conditional
   (`{metric.label}{layout === "inline" ? ":" : ""}`) so stacked/grid layouts don't show a
   stray colon. Callers already pass `color` where they care, so no visual regression.

2. **Comparison engine (delete).** `attribute-comparators.ts`, `ComparisonExporter.ts`,
   `AttributeRow.tsx`, and `DiffIndicator.tsx` (−981 lines) implemented an attribute-diff /
   export feature that nothing rendered — grep confirmed the only references were barrel
   re-exports in `sub_ItemBadges/index.ts`, with zero downstream importers. Removed the four
   files and their two exports; kept `ComparisonSelector` (which *is* used). Deleting dead code
   beats shipping a half-feature that implies a capability the UI doesn't deliver.

3. **Collections reorder + Add-List picker (build).** The collection-contents view
   (`CollectionView`) rendered drag handles and an "Add List" button that were never wired —
   reordering was inert and there was no path to add lists to a collection from this screen
   (findings #2, #3 in `bookmarks-saved-lists-collections.md`).
   - **Reorder:** wrapped the grid/rows in `@dnd-kit` `DndContext`/`SortableContext` with a
     `SortableCollectionItem` wrapper, `PointerSensor` (6px activation so taps still click
     through), and `arrayMove` → `onReorderLists`. Gated to `canReorder = !!onReorderLists &&
     !searchTerm.trim()` — dragging a *filtered* view would map indices to the wrong items, so
     reorder is disabled while a search is active and the plain `AnimatePresence` list renders
     instead.
   - **Add-List picker:** new `AddListModal` — a searchable multi-select over the user's lists
     that aren't already in the collection (`candidateLists`), click-to-toggle, "Add N",
     resets transient search/selection on every close. Wired in the dashboard:
     `onReorderLists → reorderLists({collectionId, listIds})`,
     `onAddList → open picker → addLists({collectionId, listIds})`.

4. **Light-mode palette (keep dark-only).** No code change by explicit decision. The app's
   surfaces, borders, and text tokens are all tuned for a dark canvas; a real light theme is a
   palette-system project (token duplication + per-component audit), not a wave-sized fix.
   Recorded as a closed decision, not an open follow-up.

## Verification

| Gate | Before | After | Result |
|---|---|---|---|
| TypeScript | 53 | 53 | ✅ no regression |
| Tests | n/a | n/a | Playwright e2e only |
| Lint | blocked | blocked | ⚠️ pre-existing |

Each commit tsc-checked at 53 before landing; no errors in any touched file.

## Pattern established (catalogue item 28)

28. **A deferred decision is closed by a choice, not just by code.** Three outcomes are all
    legitimate "fixes" for a built-but-unwired or ambiguous finding: *build* it (wire the inert
    affordance), *delete* it (remove the dead engine so it stops implying a capability), or
    *keep current behavior* and record the decision so it leaves the open-follow-up list. The
    anti-pattern is leaving it perpetually "deferred." Also: when wiring drag-reorder over a
    *filterable* list, gate reorder off while a filter is active — index-based `arrayMove` on a
    filtered view silently corrupts the persisted order.

## What remains

- **Infra/security deferrals (still open, need tooling/creds):** RLS + `api_keys` table +
  guest-token hardening (security wave shipped only env-gated stopgaps); the authored-but-
  unapplied counter-RPC migration `20260616000000_add_increment_counter_rpcs.sql` (blocked: no
  supabase CLI / psql / connection string in env).
- **Diminishing low-sev tail:** challenges streak timezone/DST math, faceted hierarchical
  depth, ai-item gemini schema, achievement looping-animation motion gating, blueprint
  usage_count GET-decouple.
- **Cumulative Waves 1–18:** 76 functional findings addressed + 4 security mitigated + 4
  decisions closed; TS held at 53 throughout; 0 regressions.
