# Registry conformance — software-engineering

contributor: mkdol-dev-box · audited: 2026-08-24 · repo: goat @ main (post-merge, 179 remote commits)

Bundle: `ai-registry/knowledge/software-engineering`. Subjects selected against this
repo's real surfaces: a Next 16 / React 19 / zustand 5 app whose core is a
drag-and-drop ranking grid over ~24 client stores, with Playwright e2e, no unit
runner, and no CI.

A `deviation` here is a finding, not a verdict on anyone. Several were fixed in
the same session — those rows read `fixed` and cite the new location.

| subject | technique | status | evidence |
|---|---|---|---|
| client-state | store-dependency-topology | fixed | was: `src/stores/registry.ts` had zero importers, so its load-time cycle assert had never run. Now imported by `src/providers/DeferredProviders.tsx:12` (root layout, every startup path); dev throws, prod reports |
| client-state | store-dependency-topology | fixed | was: `getStoreInitializationOrder` sorted by dependency *count* and called it a topological sort. Now Kahn's algorithm, `registry.ts:180-211`; seeded cycle + dangling edge both proven to throw |
| client-state | store-dependency-topology | fixed | manifest covered 15 of 24 stores and declared a phantom `heatmap-store` with no module. Now all 24 declared with real edges incl. deferred `require()` ones; `validateManifest()` rejects an edge to an undeclared name |
| client-state | singleton-lifecycle | partial | `createLazyStoreAccessor` now has a `reset()` hatch (`src/lib/stores/lazy-store-accessor.ts:135`), but stores themselves have no test-reset: only `collection-store.ts:364` and `session-store.ts:492` expose `resetStore` |
| client-state | persistence-and-migration | deviation | 12 stores use `persist` + `partialize`, none declares `version:`/`migrate:`. `grid-store.ts:1152` hand-rolls shape migration inside `onRehydrateStorage` — real, but not a versioned chain, so a payload cannot say what version it is or have a step appended |
| client-state | rehydration-narrowing | partial | `grid-store.ts:1149-1180` recomputes statistics and back-fills the `context` envelope on rehydrate — good narrowing. No store validates a persisted value against today's vocabulary; a corrupt key is not isolated from its siblings |
| client-state | store-slicing | partial | `drop-zone-highlight-store.ts:1-14` documents a real migration off a context that re-rendered 50+ consumers; `slices/grid-slice.ts` exists. But `match-store` reaches 9 other stores via `getState()`, which is coupling the slicing was meant to prevent |
| client-state | status-fsms | deviation | request state is boolean flags (`isLoading`/`isError`) throughout. The `'idle' \| …` unions that exist are domain machines, not request state (`patterns/drag-drop/types.ts:83`, `lib/debate/types.ts:88`) |
| client-state | async-race-guards | partial | TanStack Query supplies dedupe/cancellation for fetches. `useVisibleCollectionItems.ts:119` guards its own re-entrancy with a stable id-string compare; `undo-store.ts:106` guards undo/redo re-entrancy |
| client-state | optimistic-write-path | deviation | `hooks/useOptimisticMutation.ts:140-184` is the naive recipe the technique names: whole-query snapshot, **unconditional** restore in `onError` — no compare-and-swap on the patched fields, no per-entity mutex, so two rapid actions on one entity corrupt each other's rollback. It does cancel in-flight refetches (`:150`), which is the one guard present. The drag path does not use it at all; `CollectionsDashboard.tsx:151` swallows a rejected reorder with `console.error` and never reverts |
| client-state | identity-scoped-eviction | n/a | no multi-account switching surface; auth is single-session Clerk with no cache keyed per identity |
| client-state | invalidation-strategy | followed | TanStack Query with centralized keys (`src/lib/query-keys/collection.ts`); refetch-on-invalidate rather than event patching |
| drag-drop | drag-lifecycle | deviation | **no `DndContext` passes `onDragCancel`** — all four (`SimpleMatchGrid.tsx:499`, `CollectionView.tsx:478`, `AwardList.tsx:316`, `StudioItemsView.tsx:171`) wire `onDragEnd` only. On Escape the cleanup at `SimpleMatchGrid.tsx:446-450` never runs, so `isDragging`/`hoveredPosition` stay set and all 50 slots remain lit while the overlay vanishes |
| drag-drop | drag-lifecycle | partial | click-vs-drag is distinguished, but with four different thresholds and no shared constant: 2px (`SimpleMatchGrid.tsx:365`), 5px, 6px, 8px. The 2px grid threshold coexists with click-to-place on the same cards |
| drag-drop | keyboard-alternatives | deviation | no `KeyboardSensor` anywhere, yet `SimpleMatchGrid.tsx:153` reads out *"press Space or Enter… use arrow keys to move"* to screen readers. A separate quick-select path exists (`useQuickSelect.ts:195-247`, `q` then digits) and tier mode is genuinely complete (`useTierKeyboardNavigation.ts:29-51`) — but the grid announces an interaction it does not implement |
| drag-drop | drop-affordances | partial | invalid-target refusal is well built (`SimpleDropZone.tsx:226-251`, crossed-circle + 600ms pulse, auto-cleared at `drop-zone-highlight-store.ts:118-130`). Two gaps: grid cards carry no `cursor-grab`/grip (`DropZoneCard.tsx:73`) though backlog items do (`ItemCard.tsx:64`), and refusal is only shown *after* the drop — `showValidDropZoneHighlight` is hardcoded `false` (`SimpleDropZone.tsx:135`) |
| drag-drop | payload-and-identity | deviation | the payload carries identity *and* position (`lib/dnd/type-guards.ts:418-425`), but mutation is index-keyed: `grid-store.ts:750-799` splices by index and **rewrites the item's dnd id** to `createGridReceiverId(toPosition)` (`:782`, `:793`). An item's identity is a function of its slot, which breaks React key stability. Ranks are dense integers, defensible for a fixed 50-slot grid |
| drag-drop | ownership-boundaries | partial | the client owns the arrangement outright (localStorage persist, `grid-store.ts:394`) and there is no per-drop server write, so there is nothing to snap back — a legitimate choice. But `OfflinePersistence.ts:365-375` drops a permanently-`failed` sync op silently: local state keeps an arrangement the server rejected, with no reconciliation and no user-visible signal |
| drag-drop | cross-surface-handoff | partial | backlog→grid handoff is real and routed (`DragOperationRouter.ts`). The haunting the technique warns about is present: on cancel one surface cleans up (`PortalDragOverlay.tsx:93-95` handles `onDragCancel` via `useDndMonitor`) while the grid does not — a visibly half-cancelled UI |
| undo-history | undo-model-selection | followed | inverse-command, not snapshot (`undo-store.ts:31-42`, rollback at `:152`, re-execute at `:184`). Correct choice for a 50-slot grid; memory-light |
| undo-history | stack-policy | followed | depth 50, trimmed from the front on push (`undo-store.ts:101`, `:114-119`); `setMaxDepth` re-trims (`:225-232`) |
| undo-history | redo-semantics | followed | divergence truncates — `push` clears `redoStack` (`undo-store.ts:120-124`); re-entrancy latched by `isUndoRedoInProgress` with `finally` release (`:149`, `:165`, `:181`, `:216`) |
| undo-history | gesture-coalescing | deviation | none. Every router operation pushes one command (`DragOperationRouter.ts:500-507`) with no time window or same-item merge, so arranging six items costs six Ctrl+Z presses |
| undo-history | undo-scope | deviation | four grid mutations bypass the stack entirely: the per-slot X button (`SimpleMatchGrid.tsx:468-475`), keyboard placement (`useQuickSelect.ts:179`), mobile swipe-to-rank (`grid-store.ts:623-662`), and the view-mode `clearGrid()` + bulk re-assign (`SimpleMatchGrid.tsx:243-257`) — the most destructive action in the app. Tier ops are conditionally undoable (`DragOperationRouter.ts:605`), so Ctrl+Z can fail *after* the press (`undo-store.ts:142-147`) |
| undo-history | checkpoint-restore | n/a | no restore-to-checkpoint surface; the stack is cleared wholesale on session reset (`match-store.ts:361`) |
| async-ui-states | state-model | deviation | derived from boolean flags, not a discriminated model. No `AsyncState` union exists for requests anywhere in `src/` |
| async-ui-states | failure-states | deviation | `SavedListsSection.tsx:230-240` destructures `useBookmarks` without taking `error` (which `use-bookmarks.ts:269` returns), then `:287` returns `null` on empty — **a failed fetch deletes the whole Saved Lists section**, indistinguishable from having no bookmarks. Repeated at `:415` |
| async-ui-states | empty-state-design | partial | `components/ui/list-grid.tsx:100-143` checks error *before* empty — correct precedence, and the one place it is done right. `CollectionPanel.tsx:236` gates the data branch on both flags. Elsewhere the precedence is absent |
| async-ui-states | placeholder-design | partial | shape-matched shared skeletons exist (`list-grid.tsx:79-97`, `StudioSkeleton.tsx`). Two contract misses: no delay window — the skeleton renders on the first `isLoading` frame, so warm and cached loads flash; and the skeleton container carries `aria-live="polite"` + `aria-busy` (`:84-85`), so the placeholder announces itself rather than being hidden from the accessibility tree |
| async-ui-states | action-busy-states | partial | per-control busy states exist in forms. The technique's testable core — a **synchronous** disarm inside the activation event — is not in evidence anywhere; the drag/placement path has no double-press guard |
| table | client-server-split | partial | list fetch is server-paged (`api/lists/route.ts:44-53`), while sort/filter of the loaded collection is client-side (`useCollection.ts:328-353`) — a defensible split at current sizes, undocumented as a decision |
| table | sorting | deviation | no stable tiebreak in any comparator, and absent values are coerced rather than placed: `useCollection.ts:333` `a.ranking ?? 0` makes unranked indistinguishable from worst-ranked and flips them to the top under `asc`; `:341` dates missing → epoch; `:346` popularity → 0. `CreatorAnalyticsDashboard.tsx:204-212` sorts a derived array **in place**, mutating memo input. `CollectionView.tsx:265-273` is the one careful sort (`MAX_SAFE_INTEGER` sentinel, intent documented) |
| table | pagination | partial | offset-based with the limit correctly clamped (`api/lists/route.ts:45`). Offset drift is unmitigated — an insert between page fetches shifts or repeats rows. `api/challenges/[id]/leaderboard/route.ts:26` takes `limit` with no offset or cursor at all |
| table | loading-and-empty-states | followed | `components/ui/list-grid.tsx:79-144` — ordered `isLoading` → `error` → empty → data, with an optional `onRetry`; consumed with `refetch` at `UserListsSection.tsx:91-98` |
| table | performance | followed | windowing where it matters (`VirtualizedCollectionGrid.tsx:86-90`, `@tanstack/react-virtual`, overscan 3) and copy-on-write grid updates that clone only touched indices (`grid-store.ts:602`, `:689`, `:802`) |
| accessibility | keyboard-navigation-models | deviation | see drag-drop/keyboard-alternatives. Tier mode has a real model; the primary grid does not, and advertises one |
| accessibility | live-region-architecture | partial | a genuine polite/assertive pair with clear-after-delay (`ScreenReaderAnnouncer.tsx:18-56`) and an assertive path for refusals (`SimpleMatchGrid.tsx:497`). Two contract misses: `:28` reads only `announcements[length-1]`, so a burst loses all but the last — there is no serial drain queue; and the provider is mounted inside the Match tree rather than the app shell, with other regions declared ad hoc elsewhere (`list-grid.tsx:84`), so announcement writers are not enumerable |
| accessibility | preference-respect | partial | `prefers-reduced-motion` is honoured in ~5 components and a `ReducedMotionProvider` exists (`components/3d/ReducedMotionProvider.tsx`), but as per-component media checks rather than one signal read at one boundary — the shape the technique names as "exactly how the tenth screen gets missed". No contrast gate at the token definition site; `layout.tsx` documents that the light theme was **removed** because `design-tokens.css` had no light values, which is an honest deletion rather than a silent broken state |
| accessibility | primitive-level-a11y | partial | a real shared catalog exists (`components/ui/`, `components/patterns/`) and `ItemCard.tsx:64` shows the affordance handled at the primitive. But nothing makes an accessible name structurally required, and near-primitives are hand-rolled outside the door — `DropZoneCard.tsx:73` is an interactive `motion.div` with no role, name, or grab affordance. With jsx-a11y wholly downgraded to `warn` (`eslint.config.mjs:46-50`), the catalog has no enforcement backing it |
| accessibility | a11y-verification | deviation | `eslint.config.mjs:46-50` programmatically downgrades **every** jsx-a11y error to `warn` (`severity === "error" ? "warn" : severity`), and nothing runs the linter in CI. `@storybook/addon-a11y` is installed but panel-only — no `test-runner`, no `a11y: { test: 'error' }`, and one story exists repo-wide. No assertion anywhere states what a screen reader would hear |
| accessibility | name-and-description-wiring | partial | dnd-kit supplies `role`/`aria-roledescription` on draggables and the root layout has a real skip link (`layout.tsx`, `focus:not-sr-only`). Hand-written naming is sparse — one aria label on a slot (`SimpleDropZone.tsx:199`) |
| quality-gates | gate-liveness | partial (was dead) | `"lint": "next lint"` had been inoperative since the Next 16 upgrade — Next 16 removed the subcommand, so it parsed `lint` as a directory and exited 1 having linted **zero files** while `eslint.config.mjs` was never executed by any script: a zero-population walk reported as a failure nobody read. Now `"lint": "eslint src"`, verified over a real population (750 warnings, 0 errors, exit 0). Still short of the contract: no could-not-run exit code distinct from fail, and no seeded violation can prove it red while every rule is `warn` |
| quality-gates | gate-liveness | fixed | added `npm run docs:store-graph -- --check`, and proved it both ways: green when current, exit 1 when a store is added to the manifest without regenerating. Its byte comparison is line-ending-normalized so autocrlf cannot make it permanently red |
| quality-gates | severity-by-construction | deviation | nothing this repo configures can fail. Every custom rule is `warn` by explicit design (`eslint.config.mjs:10`, `:53-55`, `:58-70`), including `react-hooks/rules-of-hooks` (`:59`) — an unconditional-correctness rule |
| quality-gates | blocking-by-input-determinism | deviation | no check blocks anything: no `.github/`, no `.husky/`, no `lint-staged`, and `.git/hooks/` holds only `.sample` files. Every command is manual-invocation-only |
| quality-gates | hook-hygiene | n/a | no commit hooks exist to have hygiene |
| quality-gates | false-positive-economics | partial | the all-`warn` posture is a defensible response to a large existing violation count — but 750 warnings with no ratchet is a number nobody will ever drive to zero |
| quality-gates | ratchet-design | deviation | no ratchet on any metric. Typecheck sits at 29 errors with nothing pinning it; a 30th would pass unnoticed (this audit had to measure the baseline by stashing to tell its own error from the inherited ones) |
| quality-gates | policy-projection | partial | `.ai/manifest.yaml` was the second place gate policy was stated and disagreed with reality (`lint` advertised against a broken command). Corrected this session, with a `capabilityNotes` block stating what a green run actually means |
| test-harness | negative-control-tests | deviation | **no unit-test runner exists** — no vitest/jest config, no dep, no script. Three files look like tests and are not: `src/lib/tiers/boundary.test.ts:4` is a hand-run `tsx` script, `visual-components.test.tsx:7-8` states outright that compiling *is* the test, `useCollection.test.example.tsx:2` is a reference sample. Nothing licenses a refactor |
| test-harness | suite-partitioning | deviation | 13 of 39 e2e tests (33%) are hard-skipped, and three entire specs are TODO stubs with zero assertions: `e2e/list-search.spec.ts`, `e2e/ranking-completion.spec.ts`, `e2e/session-persistence.spec.ts`. `docs/E2E_BROWSER_TESTING.md:239-244` lists them in a coverage table with behavioural descriptions |
| test-harness | platform-quirk-absorption | deviation | a run that executes nothing exits green rather than fatal: `exploratory-smoke.spec.ts:286-289`, `:319-322` and `drag-drop-ranking.spec.ts:240-243` call `test.skip()` when fixture data is absent, so against an empty database the suite is green and empty. There is no launcher that owns environment preconditions and no named diagnostic for a zero-executed run |
| test-harness | isolation-lanes | partial | one chromium project, `fullyParallel: true`, `reuseExistingServer` on (`playwright.config.ts:32-45`). `webServer` runs `npm run dev` — the suite has never touched a production bundle, which is where module-evaluation-order defects surface |
| test-harness | flake-lifecycle | deviation | `retries: 0` locally (`playwright.config.ts:14`, CI-gated and no CI exists), and the quarantine has no expiry or review — the three stub specs have been empty since they were written |
| test-harness | live-app-harness | followed | Playwright drives the real app with `data-testid` locators rather than styling-coupled selectors |
| docs-sync | dated-corrections | fixed | `docs/lazy-loading-implementation.md` was headed `Status: ✅ Complete` / "production-ready, fully tested" while quoting a 36-line integration block that was never in `CollectionPanel.tsx` and naming two files that do not exist. Now carries a dated correction table, and the Performance and Testing sections are marked projected/planned rather than measured |
| docs-sync | doc-rot-detection | fixed (partly) | `docs/STORE_DEPENDENCY_GRAPH.md` claimed 17 stores, named four that never existed (`tier-store`, `filter-store`, `heatmap-store`, `task-store`) and omitted eleven real ones. It is now generated from `src/stores/registry.ts` with a `--check` mode. Every other doc remains uncheckable |
| docs-sync | source-doc-mapping | deviation | exactly one coupling is declared and enforced (registry → store graph). 74 files in `docs/` have no mapping to the source they describe; nothing knows which doc a change owes |
| docs-sync | same-change-enforcement | deviation | no gate reads a change record. Nothing would have caught any of the drift above at the commit that caused it |
| docs-sync | coupled-surface-inventory | deviation | the store count was stated in three places — `STORE_DEPENDENCY_GRAPH.md` (17), `CLAUDE.md` (7), the manifest (15) — and all three disagreed with the code (24). Two are now pointers to the one authority; the inventory itself is still undeclared |
| docs-sync | checked-vs-skipped-denominators | partial | the new `--check` reports the count it verified (`24 declared stores`), so a green run says what it looked at. No other check reports a denominator |
| dead-code | instrument-per-orphan-class | deviation | the only instrument is `eslint-plugin-unused-imports` (`eslint.config.mjs:80`), which sees unused **imports and locals** and never unused **exports** — precisely the class that let `shouldUseVirtualization`, `LazyLoadTrigger` and `src/lib/virtual/` sit orphaned. No knip, ts-prune, depcheck or madge. `src/lib/virtual/index.ts` is the shadow-declaration shape exactly: a barrel re-exporting its five dead siblings, so any reference-counting instrument would certify each of them alive |
| dead-code | quarantine-vs-delete | deviation | dead code is tracked by hand-written snapshots that never expire: `docs/UNUSED_COMPONENTS.md`, `docs/analysis/unused-components-integration-analysis.md`, `docs/unused/unused-code-scan-2025-11-06T20-45-41.md` — the last ~9 months stale. Nothing on those lists is ever promoted to deletion or cleared |
| dead-code | carrying-cost-economics | deviation | two substantial libraries carry cost with no consumer and no decision recorded: `src/lib/virtual/` (6 modules, ~2,100 lines, **zero importers**) and `src/lib/orchestration/` (5 modules, zero importers outside itself). Recorded in the backlog below rather than deleted unilaterally |
| dead-code | deletion-protocols | n/a | no deletion has been shipped to have a protocol |
| codebase-scanning | dead-code-detection | deviation | no automated reachability instrument (see above). Every orphan in this audit was found by hand-grepping importers |
| codebase-scanning | rule-precision-discipline | partial | the new manifest validator was written against a seeded violation before being trusted — both a dangling edge and a cycle were injected and observed to throw. No other rule in the repo has been shown to match anything |
| codebase-scanning | finding-lifecycle | deviation | findings live in dated markdown snapshots with no dedup key and no notion of "fixed"; `docs/harness/ui-bug-combined-2026-06-16/` is 63 files of exactly this |
| module-design | locality-and-leverage | deviation | the same capability is implemented repeatedly with no shared seam: lazy-load ladders **twice** (now one), Ctrl+Z handlers **three times** (`use-undo-keyboard.ts:36`, `useOrchestrator.ts:481`, `useMatchupKeyboard.ts:46` — all window-level, all firing together if two surfaces mount), drag-state machines **three times** (`SimpleMatchGrid`, the unused `DragStateManager.tsx`, the unused `use-drag-sync.ts`), and virtualization twice |
| module-design | module-depth | partial | `grid-store.ts` is deep in the good sense — a wide surface over one owned domain. `match-store` reaching nine stores is the opposite: a thin orchestrator with a very wide dependency footprint |
| module-design | seams-and-adapters | partial | `createLazyStoreAccessor` is a real seam for the deferred edges, and improved this session. `src/lib/orchestration/` was built as the seam for cross-store coordination and never adopted, so the coupling it was meant to absorb is still direct `getState()` |
| module-design | structural-improvement-loop | deviation | `STORE_DEPENDENCY_GRAPH.md` carried a four-phase migration plan whose "Success Criteria" checkboxes were ticked for work that had not landed (`dragHandlers.ts` was listed as shipped and does not exist). A plan that marks itself complete is not a loop |
| repo-manifest-standard | capability-not-tool-vocabulary | followed | `.ai/manifest.yaml` keys on capabilities (`lint`, `typecheck`, `test`) mapped to commands, not tool names — it survived the `next lint` → `eslint` swap as a one-line edit |
| repo-manifest-standard | generated-from-provenance | partial | `generatedFrom` listed `context_map.json`, deleted in 2026-03, gitignored, with no generator — provenance naming an input that did not exist. Removed this session along with the dangling `paths.contextMap`. The deeper gap stands: the manifest is hand-written while carrying a `generatedFrom` field, no generator exists, and there is no re-synthesize-and-compare drift check, so nothing can tell drift from could-not-synthesize |
| repo-manifest-standard | pointers-not-embeds | followed | `paths:` points at subsystems rather than embedding them; extended this session with `storeTopology` and `conformance` pointers |
| repo-manifest-standard | must-ignore-unknown | followed | stated in the file's own header comment and honoured — the new `capabilityNotes` and `verifiedAt` keys are additive |
| repo-manifest-standard | spec-ships-with-artifact | partial | the contract's rules are stated as comments inside the artifact, which makes it self-describing offline, but there is no versioned spec to conform to beyond `schemaVersion: 0.1.0` |

## Deviations backlog

Ranked by value. Items 1-5 are cheap and unambiguous; 6-9 need an owner's judgement.

1. **`onDragCancel` is unhandled on all four `DndContext`s.** Escape mid-drag leaves
   `isDragging` and `hoveredPosition` set, so all 50 drop zones stay lit while the
   drag overlay disappears — a visibly half-cancelled UI. Fix is to share
   `handleDragEnd`'s cleanup block (`SimpleMatchGrid.tsx:446-450`) with a new
   `onDragCancel` at `:499`, and the same at `CollectionView.tsx:478`,
   `AwardList.tsx:316`, `StudioItemsView.tsx:171`. *(drag-drop/drag-lifecycle)*

2. **A failed bookmarks fetch deletes the Saved Lists section.**
   `SavedListsSection.tsx:230-240` never destructures `error`, and `:287` returns
   `null` when the list is empty. Take `error` (already returned by
   `use-bookmarks.ts:269`) and render a failure state distinct from empty. Same at
   `:415`. *(async-ui-states/failure-states)*

3. **Screen readers are told about a keyboard drag that does not exist.**
   `SimpleMatchGrid.tsx:153` promises Space/Enter + arrows; there is no
   `KeyboardSensor`. Either register one, or replace the instructions with the
   quick-select path that does work (`q` then digits, `useQuickSelect.ts:195-247`)
   and make that discoverable from the grid. *(drag-drop/keyboard-alternatives,
   accessibility/keyboard-navigation-models)*

4. **Sorts coerce absent values instead of placing them, and have no tiebreak.**
   `useCollection.ts:333-347` — `ranking ?? 0`, `popularity ?? 0`, missing date →
   epoch. Unranked reads as worst-ranked and jumps to the top under `asc`. Add a
   fixed null position and `a.id` as a stable secondary key; copy the sentinel
   pattern already used at `CollectionView.tsx:265-273`. Separately,
   `CreatorAnalyticsDashboard.tsx:204-212` sorts in place — clone first.
   *(table/sorting)*

5. **Three Ctrl+Z handlers are bound at `window` simultaneously.**
   `use-undo-keyboard.ts:36`, `useOrchestrator.ts:481`, `useMatchupKeyboard.ts:46`.
   If bracket mode and the grid ever mount together, one keypress fires all three.
   Pick one owner. *(module-design/locality-and-leverage)*

6. **`src/lib/virtual/` is dead: 6 modules, ~2,100 lines, zero importers.**
   `VirtualCollectionList`, `InfiniteLoader`, `ScrollPositionManager`,
   `SkeletonLoader`, `PerformanceMonitor`. It is a second, more complete answer to
   the lazy-loading problem `docs/lazy-loading-implementation.md` describes, and is
   equally unwired. Decide: adopt it as tier 3 of the ladder, or delete it. Not
   deleted here — a removal of this size is an owner's call, not a side effect of a
   conformance pass. *(dead-code/carrying-cost-economics, quarantine-vs-delete)*

7. **`src/lib/orchestration/` is dead the same way** — 5 modules, no importer
   outside itself, built to absorb the cross-store `getState()` coupling that is
   still direct. `dragHandlers.ts` was documented as shipped and was never written.
   Adopt or retire; half-adopted is what produced the doc drift.
   *(module-design/seams-and-adapters)*

8. **No unused-export instrument.** Add `knip` (or `ts-prune`) as a reporting
   script. Every orphan in this audit — items 6 and 7 included — was found by hand.
   Start it as a report with a recorded baseline, not a gate.
   *(dead-code/instrument-per-orphan-class)*

9. **No gate blocks anything, and there is nowhere for one to run.** No CI, no
   hooks. The cheapest honest first step is a workflow that runs
   `npm run typecheck` and `npm run docs:store-graph -- --check` and ratchets the
   typecheck count down from its measured 29 — not a green-from-day-one gate, a
   ratchet. Note `npm run lint` cannot fail by construction until some rule is
   promoted to `error`. *(quality-gates/ratchet-design, blocking-by-input-determinism)*

10. **Persisted stores have no migration chain.** 12 stores persist with
    `partialize` and none declares `version:`/`migrate:`. `grid-store.ts:1152`
    already hand-rolls a shape migration inside `onRehydrateStorage`, which proves
    the need. Convert that to a versioned chain before the next shape change.
    *(client-state/persistence-and-migration)*

11. **Undo has holes the user can fall into.** Four grid mutations bypass the stack
    (per-slot X, keyboard placement, mobile swipe, and the view-mode `clearGrid()` +
    bulk re-assign — the most destructive action in the app), and tier ops are
    undoable only if the operation happens to carry a `rollback`, so Ctrl+Z can fail
    after the press. Also: `canUndo`/`undoDescription` are fully implemented
    (`undo-store.ts:234-245`) with zero consumers — there is no undo affordance in
    the UI at all. *(undo-history/undo-scope)*

12. **Three e2e specs are empty stubs advertised as coverage.**
    `list-search`, `ranking-completion`, `session-persistence` — 10 tests, zero
    assertions, listed with behavioural descriptions at
    `docs/E2E_BROWSER_TESTING.md:239-244`. Either write them or delete them and
    correct the table; a quarantine nobody reviews is worse than an honest gap.
    Related: the runtime `test.skip()`s at `exploratory-smoke.spec.ts:286`,
    `:319` and `drag-drop-ranking.spec.ts:240` make the suite green against an empty
    database. *(test-harness/suite-partitioning, platform-quirk-absorption)*

13. **The e2e suite has never run against a production bundle** —
    `playwright.config.ts:40-45` starts `npm run dev`. Module-evaluation-order
    defects, the class the store topology work above exists to prevent, only appear
    under production bundling. *(test-harness/isolation-lanes)*

14. **74 docs, one declared source coupling.** Only the store graph is generated and
    checked. Declare couplings for the next-most-load-bearing documents
    (`CLAUDE.md`, `E2E_BROWSER_TESTING.md`, `Collection/README.md`) before adding
    more prose. *(docs-sync/source-doc-mapping)*
