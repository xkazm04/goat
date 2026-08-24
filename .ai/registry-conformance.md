# Registry conformance — software-engineering

contributor: mkdol-dev-box · audited: 2026-08-24 · repo: goat @ main (post-merge, 179 remote commits)
· **wave 2 drained: 2026-08-24** — see `## Drained 2026-08-24` at the bottom for
what moved and the commit that moved it.

Bundle: `ai-registry/knowledge/software-engineering`. Subjects selected against this
repo's real surfaces: a Next 16 / React 19 / zustand 5 app whose core is a
drag-and-drop ranking grid over ~24 client stores.

At audit time (wave 1) there was no unit runner and no CI. Both exist as of
wave 2: vitest on `npm test` (177 tests) and `.github/workflows/gates.yml`
(unit, lint, ratchet and the generated store-graph all blocking).

A `deviation` here is a finding, not a verdict on anyone. Rows that read
`followed` or `fixed` say what they were before, so the history stays legible
rather than being quietly overwritten by the fix.

| subject | technique | status | evidence |
|---|---|---|---|
| client-state | store-dependency-topology | fixed | was: `src/stores/registry.ts` had zero importers, so its load-time cycle assert had never run. Now imported by `src/providers/DeferredProviders.tsx:12` (root layout, every startup path); dev throws, prod reports |
| client-state | store-dependency-topology | fixed | was: `getStoreInitializationOrder` sorted by dependency *count* and called it a topological sort. Now Kahn's algorithm, `registry.ts:180-211`; seeded cycle + dangling edge both proven to throw |
| client-state | store-dependency-topology | fixed | manifest covered 15 of 24 stores and declared a phantom `heatmap-store` with no module. Now all 24 declared with real edges incl. deferred `require()` ones; `validateManifest()` rejects an edge to an undeclared name |
| client-state | singleton-lifecycle | partial | `createLazyStoreAccessor` now has a `reset()` hatch (`src/lib/stores/lazy-store-accessor.ts:135`), but stores themselves have no test-reset: only `collection-store.ts:364` and `session-store.ts:492` expose `resetStore` |
| client-state | persistence-and-migration | partial | was: 12 stores persist with `partialize`, none declared `version:`/`migrate:`. `grid-store` now has a real chain — `version: 1` + `migrate` routing through `src/stores/grid-store-migrations.ts`: append-only, each step total over its input version, preserve-and-default on a future payload, never throws, 27 tests. The other 11 stores are still unversioned. WAS: 12 stores use `persist` + `partialize`, none declares `version:`/`migrate:`. `grid-store.ts:1152` hand-rolls shape migration inside `onRehydrateStorage` — real, but not a versioned chain, so a payload cannot say what version it is or have a step appended |
| client-state | rehydration-narrowing | partial | `grid-store`'s `onRehydrateStorage` is now narrowing ONLY — recompute derived statistics, resolve `currentListId` against the cache it references; all shape work moved to the versioned chain, and hostile input falls to defaults with a diagnostic rather than throwing (6 test cases). Was: it recomputed statistics and back-filled the `context` envelope on rehydrate — good narrowing. No store validates a persisted value against today's vocabulary; a corrupt key is not isolated from its siblings |
| client-state | store-slicing | partial | `drop-zone-highlight-store.ts:1-14` documents a real migration off a context that re-rendered 50+ consumers; `slices/grid-slice.ts` exists. But `match-store` reaches 9 other stores via `getState()`, which is coupling the slicing was meant to prevent |
| client-state | status-fsms | deviation | request state is boolean flags (`isLoading`/`isError`) throughout. The `'idle' \| …` unions that exist are domain machines, not request state (`patterns/drag-drop/types.ts:83`, `lib/debate/types.ts:88`) |
| client-state | async-race-guards | partial | TanStack Query supplies dedupe/cancellation for fetches. `useVisibleCollectionItems.ts:119` guards its own re-entrancy with a stable id-string compare; `undo-store.ts:106` guards undo/redo re-entrancy |
| client-state | optimistic-write-path | deviation | `hooks/useOptimisticMutation.ts:140-184` is the naive recipe the technique names: whole-query snapshot, **unconditional** restore in `onError` — no compare-and-swap on the patched fields, no per-entity mutex, so two rapid actions on one entity corrupt each other's rollback. It does cancel in-flight refetches (`:150`), which is the one guard present. The drag path does not use it at all; `CollectionsDashboard.tsx:151` swallows a rejected reorder with `console.error` and never reverts |
| client-state | identity-scoped-eviction | n/a | no multi-account switching surface; auth is single-session Clerk with no cache keyed per identity |
| client-state | invalidation-strategy | followed | TanStack Query with centralized keys (`src/lib/query-keys/collection.ts`); refetch-on-invalidate rather than event patching |
| drag-drop | drag-lifecycle | followed | FIXED. `SimpleMatchGrid` and `AwardList` each have ONE named `resetDragState` reaper called from every exit — commit, Escape, drop-on-nothing, unmount — wired through `onDragCancel`. `CollectionView`/`StudioItemsView` hold no drag state of their own and now say so at the site. Was: **no `DndContext` passed `onDragCancel`** — all four (`SimpleMatchGrid.tsx:499`, `CollectionView.tsx:478`, `AwardList.tsx:316`, `StudioItemsView.tsx:171`) wire `onDragEnd` only. On Escape the cleanup at `SimpleMatchGrid.tsx:446-450` never runs, so `isDragging`/`hoveredPosition` stay set and all 50 slots remain lit while the overlay vanishes |
| drag-drop | drag-lifecycle | followed | FIXED. One `DRAG_ACTIVATION_DISTANCE_PX = 6` in `src/lib/dnd/activation.ts`, read by all four surfaces. The grid's 2px was raised, not merely renamed: its cards are also click-to-place targets, where 2px turns ordinary clicks into micro-drags. Was: four different thresholds and no shared constant — 2px (`SimpleMatchGrid.tsx:365`), 5px, 6px, 8px. The 2px grid threshold coexists with click-to-place on the same cards |
| drag-drop | keyboard-alternatives | followed | FIXED. All four surfaces register a `KeyboardSensor`; the grid uses a stepwise coordinate getter (`src/lib/dnd/keyboard-coordinates.ts`, 25 tests) that moves between real drop targets rather than dnd-kit's fixed 25px translate, with a `closestCenter` fallback without which the keyboard drag would move and never be able to drop. The announcement also names the quick-select accelerator. Was: no `KeyboardSensor` anywhere, yet `SimpleMatchGrid.tsx:153` reads out *"press Space or Enter… use arrow keys to move"* to screen readers. A separate quick-select path exists (`useQuickSelect.ts:195-247`, `q` then digits) and tier mode is genuinely complete (`useTierKeyboardNavigation.ts:29-51`) — but the grid announces an interaction it does not implement |
| drag-drop | drop-affordances | partial | invalid-target refusal is well built (`SimpleDropZone.tsx:226-251`, crossed-circle + 600ms pulse, auto-cleared at `drop-zone-highlight-store.ts:118-130`). Two gaps: grid cards carry no `cursor-grab`/grip (`DropZoneCard.tsx:73`) though backlog items do (`ItemCard.tsx:64`), and refusal is only shown *after* the drop — `showValidDropZoneHighlight` is hardcoded `false` (`SimpleDropZone.tsx:135`) |
| drag-drop | payload-and-identity | deviation | the payload carries identity *and* position (`lib/dnd/type-guards.ts:418-425`), but mutation is index-keyed: `grid-store.ts:750-799` splices by index and **rewrites the item's dnd id** to `createGridReceiverId(toPosition)` (`:782`, `:793`). An item's identity is a function of its slot, which breaks React key stability. Ranks are dense integers, defensible for a fixed 50-slot grid |
| drag-drop | ownership-boundaries | partial | the client owns the arrangement outright (localStorage persist, `grid-store.ts:394`) and there is no per-drop server write, so there is nothing to snap back — a legitimate choice. But `OfflinePersistence.ts:365-375` drops a permanently-`failed` sync op silently: local state keeps an arrangement the server rejected, with no reconciliation and no user-visible signal |
| drag-drop | cross-surface-handoff | followed | backlog→grid handoff is real and routed (`DragOperationRouter.ts`), and the haunting is gone — `PortalDragOverlay` and the grid now both tear down on cancel, through the grid's single reaper. Was: on cancel one surface cleans up (`PortalDragOverlay.tsx:93-95` handles `onDragCancel` via `useDndMonitor`) while the grid does not — a visibly half-cancelled UI |
| undo-history | undo-model-selection | followed | inverse-command, not snapshot (`undo-store.ts:31-42`, rollback at `:152`, re-execute at `:184`). Correct choice for a 50-slot grid; memory-light |
| undo-history | stack-policy | followed | depth 50, trimmed from the front on push (`undo-store.ts:101`, `:114-119`); `setMaxDepth` re-trims (`:225-232`) |
| undo-history | redo-semantics | followed | divergence truncates — `push` clears `redoStack` (`undo-store.ts:120-124`); re-entrancy latched by `isUndoRedoInProgress` with `finally` release (`:149`, `:165`, `:181`, `:216`) |
| undo-history | gesture-coalescing | deviation | none. Every router operation pushes one command (`DragOperationRouter.ts:500-507`) with no time window or same-item merge, so arranging six items costs six Ctrl+Z presses |
| undo-history | undo-scope | deviation | STILL OPEN, not attempted in wave 2: each hole needs an inverse command designed against product intent, and there is no e2e lane able to prove one. Four grid mutations bypass the stack entirely: the per-slot X button (`SimpleMatchGrid.tsx:468-475`), keyboard placement (`useQuickSelect.ts:179`), mobile swipe-to-rank (`grid-store.ts:623-662`), and the view-mode `clearGrid()` + bulk re-assign (`SimpleMatchGrid.tsx:243-257`) — the most destructive action in the app. Tier ops are conditionally undoable (`DragOperationRouter.ts:605`), so Ctrl+Z can fail *after* the press (`undo-store.ts:142-147`) |
| undo-history | checkpoint-restore | n/a | no restore-to-checkpoint surface; the stack is cleared wholesale on session reset (`match-store.ts:361`) |
| async-ui-states | state-model | deviation | derived from boolean flags, not a discriminated model. No `AsyncState` union exists for requests anywhere in `src/` |
| async-ui-states | failure-states | followed | FIXED. `SavedListsSection` now takes `error` and renders three distinct arms: a first-class failure state with a retry that reissues the same request; an ambient stale notice that KEEPS held content when a refresh fails; and an empty state gated on `!error`. `useBookmarks` newly exposes `refetch`. Was: it destructured `useBookmarks` without taking `error` (which `use-bookmarks.ts:269` returns), then `:287` returns `null` on empty — **a failed fetch deletes the whole Saved Lists section**, indistinguishable from having no bookmarks. Repeated at `:415` |
| async-ui-states | empty-state-design | partial | `components/ui/list-grid.tsx:100-143` and now `SavedListsSection` both order load → fail → empty → data. No audit of the remaining surfaces was done in wave 2. `CollectionPanel.tsx:236` gates the data branch on both flags. Elsewhere the precedence is absent |
| async-ui-states | placeholder-design | partial | shape-matched shared skeletons exist (`list-grid.tsx:79-97`, `StudioSkeleton.tsx`). Two contract misses: no delay window — the skeleton renders on the first `isLoading` frame, so warm and cached loads flash; and the skeleton container carries `aria-live="polite"` + `aria-busy` (`:84-85`), so the placeholder announces itself rather than being hidden from the accessibility tree |
| async-ui-states | action-busy-states | partial | per-control busy states exist in forms. The technique's testable core — a **synchronous** disarm inside the activation event — is not in evidence anywhere; the drag/placement path has no double-press guard |
| table | client-server-split | partial | list fetch is server-paged (`api/lists/route.ts:44-53`), while sort/filter of the loaded collection is client-side (`useCollection.ts:328-353`) — a defensible split at current sizes, undocumented as a decision |
| table | sorting | followed | FIXED. `src/lib/sorting/comparators.ts` is the one authority: absent values placed LAST in both directions (direction applied inside each comparator, so no outer negation can flip them), `withIdTiebreak` makes every order total, `sortedBy` copies, locale collation with numeric runs. 31 tests. Converted `useCollection.ts` and `CreatorAnalyticsDashboard.tsx`; `CollectionView.tsx:265` deliberately left alone, it was already correct. Was: no stable tiebreak in any comparator, and absent values are coerced rather than placed: `useCollection.ts:333` `a.ranking ?? 0` makes unranked indistinguishable from worst-ranked and flips them to the top under `asc`; `:341` dates missing → epoch; `:346` popularity → 0. `CreatorAnalyticsDashboard.tsx:204-212` sorts a derived array **in place**, mutating memo input. `CollectionView.tsx:265-273` is the one careful sort (`MAX_SAFE_INTEGER` sentinel, intent documented) |
| table | pagination | partial | offset-based with the limit correctly clamped (`api/lists/route.ts:45`). Offset drift is unmitigated — an insert between page fetches shifts or repeats rows. `api/challenges/[id]/leaderboard/route.ts:26` takes `limit` with no offset or cursor at all |
| table | loading-and-empty-states | followed | `components/ui/list-grid.tsx:79-144` — ordered `isLoading` → `error` → empty → data, with an optional `onRetry`; consumed with `refetch` at `UserListsSection.tsx:91-98` |
| table | performance | followed | windowing where it matters (`VirtualizedCollectionGrid.tsx:86-90`, `@tanstack/react-virtual`, overscan 3) and copy-on-write grid updates that clone only touched indices (`grid-store.ts:602`, `:689`, `:802`) |
| accessibility | keyboard-navigation-models | followed | see drag-drop/keyboard-alternatives — the grid now implements the grab/move/drop/cancel model it advertises, and arrow keys step between candidate positions rather than translating pixels |
| accessibility | live-region-architecture | partial | a genuine polite/assertive pair with clear-after-delay (`ScreenReaderAnnouncer.tsx:18-56`) and an assertive path for refusals (`SimpleMatchGrid.tsx:497`). Two contract misses: `:28` reads only `announcements[length-1]`, so a burst loses all but the last — there is no serial drain queue; and the provider is mounted inside the Match tree rather than the app shell, with other regions declared ad hoc elsewhere (`list-grid.tsx:84`), so announcement writers are not enumerable |
| accessibility | preference-respect | partial | `prefers-reduced-motion` is honoured in ~5 components and a `ReducedMotionProvider` exists (`components/3d/ReducedMotionProvider.tsx`), but as per-component media checks rather than one signal read at one boundary — the shape the technique names as "exactly how the tenth screen gets missed". No contrast gate at the token definition site; `layout.tsx` documents that the light theme was **removed** because `design-tokens.css` had no light values, which is an honest deletion rather than a silent broken state |
| accessibility | primitive-level-a11y | partial | a real shared catalog exists (`components/ui/`, `components/patterns/`) and `ItemCard.tsx:64` shows the affordance handled at the primitive. But nothing makes an accessible name structurally required, and near-primitives are hand-rolled outside the door — `DropZoneCard.tsx:73` is an interactive `motion.div` with no role, name, or grab affordance. With jsx-a11y wholly downgraded to `warn` (`eslint.config.mjs:46-50`), the catalog has no enforcement backing it |
| accessibility | a11y-verification | partial | the linter now runs in CI on every push and PR, and can fail. jsx-a11y rules are still all `warn` — each has a non-zero legacy population (43 `label-has-associated-control`, 23 `click-events-have-key-events`, 23 `no-static-element-interactions`, 11 `no-autofocus`), so none met the at-zero bar for promotion; all are now ratchet buckets that refuse a rise. Still no `test-runner`, no `a11y: { test: 'error' }`, and no assertion states what a screen reader would hear. Was: `eslint.config.mjs:46-50` programmatically downgraded **every** jsx-a11y error to `warn` (`severity === "error" ? "warn" : severity`), and nothing runs the linter in CI. `@storybook/addon-a11y` is installed but panel-only — no `test-runner`, no `a11y: { test: 'error' }`, and one story exists repo-wide. No assertion anywhere states what a screen reader would hear |
| accessibility | name-and-description-wiring | partial | dnd-kit supplies `role`/`aria-roledescription` on draggables and the root layout has a real skip link (`layout.tsx`, `focus:not-sr-only`). Hand-written naming is sparse — one aria label on a slot (`SimpleDropZone.tsx:199`) |
| quality-gates | gate-liveness | followed | `lint` runs over a real population AND can now fail — proved with a seeded file (conditional hook + duplicate key + invalid typeof → 3 errors, exit 1; removed → exit 0). `lint:ratchet` distinguishes could-not-run (exit 2, "nothing was measured") from a verdict (exit 1), and refuses any run walking under 80% of the source files. WAS: `"lint": "next lint"` had been inoperative since the Next 16 upgrade — Next 16 removed the subcommand, so it parsed `lint` as a directory and exited 1 having linted **zero files** while `eslint.config.mjs` was never executed by any script: a zero-population walk reported as a failure nobody read. Now `"lint": "eslint src"`, verified over a real population (750 warnings, 0 errors, exit 0). Still short of the contract: no could-not-run exit code distinct from fail, and no seeded violation can prove it red while every rule is `warn` |
| quality-gates | gate-liveness | fixed | added `npm run docs:store-graph -- --check`, and proved it both ways: green when current, exit 1 when a store is added to the manifest without regenerating. Its byte comparison is line-ending-normalized so autocrlf cannot make it permanently red |
| quality-gates | severity-by-construction | followed | 44 correctness rules are `error`, each MEASURED at 0 findings before promotion — including `react-hooks/rules-of-hooks` (13 real violations fixed first) and the eslint:recommended core, which was not `warn` here but absent entirely. `no-undef` deliberately not promoted (204 TS false positives); `tsc` is named as that class's authority and is itself a ratchet bucket. Both tiers and their reasons are stated in the config header. Was: nothing this repo configured could fail — Every custom rule is `warn` by explicit design (`eslint.config.mjs:10`, `:53-55`, `:58-70`), including `react-hooks/rules-of-hooks` (`:59`) — an unconditional-correctness rule |
| quality-gates | blocking-by-input-determinism | partial | `.github/workflows/gates.yml` runs on push to main and every PR; unit, lint, ratchet and store-graph BLOCK, typecheck reports. Each job states whether it blocks and why in terms of its INPUT, at the job. A supply-chain job is a stated absence, not an oversight. Still no git hooks and no lint-staged — the commit rung is unguarded, now dated in the manifest. Was: no check blocked anything — no `.github/`, no `.husky/`, no `lint-staged`, and `.git/hooks/` holds only `.sample` files. Every command is manual-invocation-only |
| quality-gates | hook-hygiene | n/a | still no commit hooks. Deliberate: CI covers the push rung; the unguarded commit rung is a dated gap in `.ai/manifest.yaml` rather than an oversight |
| quality-gates | false-positive-economics | followed | the 721 legacy warnings are bucketed PER RULE in `.ai/ratchet-baseline.json`, so each has an attributable owner and a refused direction rather than being one number nobody drives down. Rules already at zero graduated to `error` rather than staying advisory out of inertia |
| quality-gates | ratchet-design | followed | `scripts/ratchet.mjs` + `.ai/ratchet-baseline.json`: 26 buckets (22 eslint rules, 3 knip, 1 typecheck), committed and diffable, naming its own recompute command and carrying each count's predicate. SYMMETRIC — a drop is red too, with the three-causes decision printed — and never auto-updates. Proved red four ways. It caught 6 regressions from this wave's own commits (all fixed, not re-baselined) and caught the `typecheck:errors` counter measuring `.next/` generated output: 29 local vs 23 CI on the same commit. Was: no ratchet on any metric — Typecheck sits at 29 errors with nothing pinning it; a 30th would pass unnoticed (this audit had to measure the baseline by stashing to tell its own error from the inherited ones) |
| quality-gates | policy-projection | partial | `.ai/manifest.yaml` was the second place gate policy was stated and disagreed with reality (`lint` advertised against a broken command). Corrected this session, with a `capabilityNotes` block stating what a green run actually means |
| test-harness | negative-control-tests | followed | vitest wired to `npm test`, `passWithNoTests: false`. 177 tests over 8 files. EVERY suite carries a recorded negative control in its header naming the exact mutation and the MEASURED red count, and every one was actually run and restored. The three impersonating files were resolved per their nature (one rewritten as a real suite; one renamed `visual-exports.type-check.tsx`, honest and still enforced by typecheck, with its runtime claims covered by a new suite; one renamed `useCollection.usage-examples.tsx`). Was: **no unit-test runner existed** — no vitest/jest config, no dep, no script. Three files look like tests and are not: `src/lib/tiers/boundary.test.ts:4` is a hand-run `tsx` script, `visual-components.test.tsx:7-8` states outright that compiling *is* the test, `useCollection.test.example.tsx:2` is a reference sample. Nothing licenses a refactor |
| test-harness | suite-partitioning | partial | the three stub specs are deleted and `docs/E2E_BROWSER_TESTING.md` carries a dated correction plus an explicit "Not covered" table, so each gap is visible rather than implied by a file that exists and does nothing. 39 tests / 7 files / 13 skipped → 29 / 4 / 3. The two suites are also now genuinely separate machines with their own configs. Was: 13 of 39 e2e tests (33%) hard-skipped, and three entire specs are TODO stubs with zero assertions: `e2e/list-search.spec.ts`, `e2e/ranking-completion.spec.ts`, `e2e/session-persistence.spec.ts`. `docs/E2E_BROWSER_TESTING.md:239-244` lists them in a coverage table with behavioural descriptions |
| test-harness | platform-quirk-absorption | followed | `e2e/global-setup.ts` owns the precondition: one check before any worker, refusing the run with a greppable `E2E_PRECONDITION_FAILED` when the lists API returns zero, printing the population it verified on success, treating an unrecognised response shape as could-not-establish rather than as zero, and offering `E2E_ALLOW_EMPTY_DB=1` as an opt-out that says so in the output. It does not seed. The three in-test `test.skip()`s became assertions. Was: a run that executed nothing exited green rather than fatal — `exploratory-smoke.spec.ts:286-289`, `:319-322` and `drag-drop-ranking.spec.ts:240-243` call `test.skip()` when fixture data is absent, so against an empty database the suite is green and empty. There is no launcher that owns environment preconditions and no named diagnostic for a zero-executed run |
| test-harness | isolation-lanes | partial | UNCHANGED for e2e — `webServer` still runs `npm run dev` and the suite has still never touched a production bundle (backlog #13, not attempted: a second config that cannot be executed here would be an unverified claim). The UNIT lane is now properly isolated: own config, own `include`, node environment, per-file `@vitest-environment` opt-in so no file pays for a DOM it does not need. Was: one chromium project, `fullyParallel: true`, `reuseExistingServer` on (`playwright.config.ts:32-45`). `webServer` runs `npm run dev` — the suite has never touched a production bundle, which is where module-evaluation-order defects surface |
| test-harness | flake-lifecycle | partial | the never-reviewed quarantine is gone — the three permanently-empty specs were deleted rather than left to accumulate, and `retries: 2` on CI is now reachable because CI exists. No flake register or expiry policy yet. Was: `retries: 0` locally (`playwright.config.ts:14`, CI-gated and no CI exists), and the quarantine has no expiry or review — the three stub specs have been empty since they were written |
| test-harness | live-app-harness | followed | Playwright drives the real app with `data-testid` locators rather than styling-coupled selectors |
| docs-sync | dated-corrections | followed | the practice held across wave 2: `lazy-loading-implementation.md` gained a SECOND dated correction when the deletion it had deferred was actually made, and `E2E_BROWSER_TESTING.md`, `STORE_DEPENDENCY_GRAPH.md`, `Collection/README.md` and `useLazyLoad.ts` each got one rather than a silent edit. Originally: `docs/lazy-loading-implementation.md` was headed `Status: ✅ Complete` / "production-ready, fully tested" while quoting a 36-line integration block that was never in `CollectionPanel.tsx` and naming two files that do not exist. Now carries a dated correction table, and the Performance and Testing sections are marked projected/planned rather than measured |
| docs-sync | doc-rot-detection | fixed (partly) | `docs/STORE_DEPENDENCY_GRAPH.md` claimed 17 stores, named four that never existed (`tier-store`, `filter-store`, `heatmap-store`, `task-store`) and omitted eleven real ones. It is now generated from `src/stores/registry.ts` with a `--check` mode. Every other doc remains uncheckable |
| docs-sync | source-doc-mapping | deviation | exactly one coupling is declared and enforced (registry → store graph). 74 files in `docs/` have no mapping to the source they describe; nothing knows which doc a change owes |
| docs-sync | same-change-enforcement | deviation | no gate reads a change record. Nothing would have caught any of the drift above at the commit that caused it |
| docs-sync | coupled-surface-inventory | deviation | the store count was stated in three places — `STORE_DEPENDENCY_GRAPH.md` (17), `CLAUDE.md` (7), the manifest (15) — and all three disagreed with the code (24). Two are now pointers to the one authority; the inventory itself is still undeclared |
| docs-sync | checked-vs-skipped-denominators | partial | the new `--check` reports the count it verified (`24 declared stores`), so a green run says what it looked at. No other check reports a denominator |
| dead-code | instrument-per-orphan-class | followed | knip added (`knip.json`, `npm run scan:dead`), entry points declared rather than guessed, counts held as three ratchet buckets — a report with a baseline, not a bar to clear: 241 unused files is not a number anyone drives to zero soon, but the 242nd is refused (proved). The counter also refuses to report zero issues in a repo this size, since that means the entry globs stopped matching. Was: the only instrument was `eslint-plugin-unused-imports` (`eslint.config.mjs:80`), which sees unused **imports and locals** and never unused **exports** — precisely the class that let `shouldUseVirtualization`, `LazyLoadTrigger` and `src/lib/virtual/` sit orphaned. No knip, ts-prune, depcheck or madge. `src/lib/virtual/index.ts` is the shadow-declaration shape exactly: a barrel re-exporting its five dead siblings, so any reference-counting instrument would certify each of them alive |
| dead-code | quarantine-vs-delete | partial | the two largest quarantined islands were promoted to deletion (4,612 lines), and knip now recomputes the population on demand. The hand-written never-expiring snapshots still exist and are still stale: `docs/UNUSED_COMPONENTS.md`, `docs/analysis/unused-components-integration-analysis.md`, `docs/unused/unused-code-scan-2025-11-06T20-45-41.md` — the last ~9 months stale. Nothing on those lists is ever promoted to deletion or cleared |
| dead-code | carrying-cost-economics | followed | BOTH DELETED, each in its own revertible commit with the decision recorded. Was: two substantial libraries carried cost with no consumer and no decision recorded — `src/lib/virtual/` (6 modules, ~2,100 lines, **zero importers**) and `src/lib/orchestration/` (5 modules, zero importers outside itself). Recorded in the backlog below rather than deleted unilaterally |
| dead-code | deletion-protocols | followed | two deletions shipped under the protocol. Each: zero importers established four independent ways and re-verified at the moment of deletion (path grep, per-symbol grep, dynamic-`import(` string grep, knip); the three closure questions answered BEFORE the act (still-reachable none, newly-unreachable none, tests referencing none); one island per commit with nothing riding along; every downstream number attributed (knip 252→241 = exactly the 11 files); surviving code that shares vocabulary named so the next session does not "finish the job" on live code; and an autopsy left at the site for the deleted predicates, which read as protection |
| codebase-scanning | dead-code-detection | followed | knip is the reachability instrument, run by `npm run scan:dead` and enforced by three ratchet buckets. Was: no automated instrument; every orphan in the audit was found by hand-grepping importers |
| codebase-scanning | rule-precision-discipline | followed | EVERY check added in wave 2 was shown able to go red before being trusted: the lint gate (seeded 3-error file), the ratchet (seeded rise, tampered drop, broken instrument), the knip bucket (seeded orphan module), and all 8 test suites (each with a recorded mutation and measured red count). The wave also produced three worked examples of the FAILURE mode — three successive verifications of the same `npm ci` defect each shared a cause with the thing they verified (same OS, then a resolution-only flag, then the wrong npm major) and so could not have failed; recorded in the commit messages. Was: the manifest validator was written against a seeded violation before being trusted — both a dangling edge and a cycle were injected and observed to throw. No other rule in the repo has been shown to match anything |
| codebase-scanning | finding-lifecycle | deviation | findings live in dated markdown snapshots with no dedup key and no notion of "fixed"; `docs/harness/ui-bug-combined-2026-06-16/` is 63 files of exactly this |
| module-design | locality-and-leverage | deviation | the same capability is implemented repeatedly with no shared seam: lazy-load ladders **twice** (now one), Ctrl+Z handlers **three times** (`use-undo-keyboard.ts:36`, `useOrchestrator.ts:481`, `useMatchupKeyboard.ts:46` — all window-level, all firing together if two surfaces mount), drag-state machines **three times** (`SimpleMatchGrid`, the unused `DragStateManager.tsx`, the unused `use-drag-sync.ts`), and virtualization twice |
| module-design | module-depth | partial | `grid-store.ts` is deep in the good sense — a wide surface over one owned domain. `match-store` reaching nine stores is the opposite: a thin orchestrator with a very wide dependency footprint |
| module-design | seams-and-adapters | partial | `createLazyStoreAccessor` remains a real, adopted seam. The unadopted one is DELETED — which removes a structure that made the coupling look like it had an owner and does NOT repair the coupling: `match-store` still reaches nine stores through direct `getState()`. Was: `src/lib/orchestration/` was built as the seam for cross-store coordination and never adopted, so the coupling it was meant to absorb is still direct `getState()` |
| module-design | structural-improvement-loop | deviation | `STORE_DEPENDENCY_GRAPH.md` carried a four-phase migration plan whose "Success Criteria" checkboxes were ticked for work that had not landed (`dragHandlers.ts` was listed as shipped and does not exist). A plan that marks itself complete is not a loop |
| repo-manifest-standard | capability-not-tool-vocabulary | followed | `.ai/manifest.yaml` keys on capabilities (`lint`, `typecheck`, `test`) mapped to commands, not tool names — it survived the `next lint` → `eslint` swap as a one-line edit |
| repo-manifest-standard | generated-from-provenance | partial | `generatedFrom` listed `context_map.json`, deleted in 2026-03, gitignored, with no generator — provenance naming an input that did not exist. Removed this session along with the dangling `paths.contextMap`. The deeper gap stands: the manifest is hand-written while carrying a `generatedFrom` field, no generator exists, and there is no re-synthesize-and-compare drift check, so nothing can tell drift from could-not-synthesize |
| repo-manifest-standard | pointers-not-embeds | followed | `paths:` points at subsystems rather than embedding them; extended this session with `storeTopology` and `conformance` pointers |
| repo-manifest-standard | must-ignore-unknown | followed | stated in the file's own header comment and honoured — the new `capabilityNotes` and `verifiedAt` keys are additive |
| repo-manifest-standard | spec-ships-with-artifact | partial | the contract's rules are stated as comments inside the artifact, which makes it self-describing offline, but there is no versioned spec to conform to beyond `schemaVersion: 0.1.0` |

## Deviations backlog

Ranked by value. Everything above the `## Drained` heading is still open.

6. **`src/app/features/Collection/components/LazyLoadTrigger.tsx` has no
   consumer.** Kept when its two sibling predicates were deleted, because a
   component is a decision about UI rather than an obviously-inert helper. Wire
   it into `CollectionPanel` as tier 2 of the lazy-loading ladder, or delete it
   and drop the row from `docs/lazy-loading-implementation.md`. There is a
   second, also-unused `LazyLoadTrigger` in
   `src/components/patterns/virtualization/` — decide which one survives before
   wiring either. *(dead-code/quarantine-vs-delete)*

10b. **The other 11 persisted stores have no migration chain.** `grid-store` is
   now the worked exemplar (`src/stores/grid-store-migrations.ts`); copy its
   shape. Cheapest first step for each: add `version: 1` with an identity
   `migrate`, which strands nothing and gives the next shape change somewhere to
   land. *(client-state/persistence-and-migration)*

11. **Undo has holes the user can fall into.** Four grid mutations bypass the
   stack (per-slot X, keyboard placement, mobile swipe, and the view-mode
   `clearGrid()` + bulk re-assign — the most destructive action in the app), and
   tier ops are undoable only if the operation happens to carry a `rollback`, so
   Ctrl+Z can fail *after* the press. Also: `canUndo`/`undoDescription` are fully
   implemented (`undo-store.ts:234-245`) with zero consumers — there is no undo
   affordance in the UI at all.
   *Not attempted in wave 2*: each hole needs an inverse command designed
   against product intent, and there is no e2e lane able to prove one.
   *(undo-history/undo-scope)*

11b. **Gesture coalescing.** Every router operation pushes one command with no
   time window or same-item merge, so arranging six items costs six Ctrl+Z
   presses. Same blocker as 11 — the merge window is a product decision.
   *(undo-history/gesture-coalescing)*

13. **The e2e suite has never run against a production bundle** —
   `playwright.config.ts` starts `npm run dev`. Module-evaluation-order defects,
   the class the store topology work exists to prevent, only appear under
   production bundling.
   *Not attempted in wave 2*: a second config that cannot be executed here (no
   seeded database available) would be an unverified claim, which is the thing
   this whole wave has been removing. Needs an environment with fixtures.
   *(test-harness/isolation-lanes)*

14. **74 docs, two declared source couplings.** The store graph is generated and
   checked; everything else is prose nobody can verify. Declare couplings for the
   next-most-load-bearing documents (`CLAUDE.md`, `E2E_BROWSER_TESTING.md`,
   `Collection/README.md`) before adding more prose.
   *(docs-sync/source-doc-mapping, coupled-surface-inventory)*

15. **No gate reads a change record.** Nothing would catch doc drift at the
   commit that caused it. CI now exists, so there is somewhere for such a check
   to run — which is what made this actionable rather than theoretical.
   *(docs-sync/same-change-enforcement)*

16. **Findings still live in dated markdown snapshots with no dedup key and no
   notion of "fixed"** — `docs/harness/ui-bug-combined-2026-06-16/` is 63 files
   of exactly this, and `docs/UNUSED_COMPONENTS.md` and friends are ~9 months
   stale. knip now recomputes the dead-code population on demand, which makes
   those three snapshots deletable rather than merely wrong.
   *(codebase-scanning/finding-lifecycle, dead-code/quarantine-vs-delete)*

17. **`match-store` reaches nine other stores via `getState()`.** The seam built
   to absorb this was deleted in wave 2 as unadopted — which removed a structure
   that made the coupling look owned, and did not give it an owner. Any future
   seam must be adopted in the same change that introduces it.
   *(module-design/module-depth, seams-and-adapters, client-state/store-slicing)*

18. **`useOptimisticMutation.ts:140-184` is the naive recipe** — whole-query
   snapshot, unconditional restore in `onError`, no compare-and-swap and no
   per-entity mutex, so two rapid actions on one entity corrupt each other's
   rollback. The drag path does not use it at all;
   `CollectionsDashboard.tsx:151` swallows a rejected reorder with
   `console.error` and never reverts. *(client-state/optimistic-write-path)*

19. **Request state is boolean flags throughout.** No `AsyncState` discriminated
   union exists anywhere in `src/`; the `'idle' | …` unions that do exist are
   domain machines, not request state.
   *(client-state/status-fsms, async-ui-states/state-model)*

20. **Skeletons have no delay window and announce themselves.**
   `list-grid.tsx:79-97` renders on the first `isLoading` frame, so warm and
   cached loads flash, and the container carries `aria-live="polite"` +
   `aria-busy`, so the placeholder speaks instead of being hidden from the
   accessibility tree. *(async-ui-states/placeholder-design)*

21. **The live-region provider reads only the last announcement**
   (`ScreenReaderAnnouncer.tsx:28`), so a burst loses all but one — there is no
   serial drain queue — and it is mounted inside the Match tree rather than the
   app shell, with other regions declared ad hoc elsewhere.
   *(accessibility/live-region-architecture)*

22. **`prefers-reduced-motion` is read per-component in ~5 places** rather than
   once at a boundary — the shape the technique names as "exactly how the tenth
   screen gets missed". *(accessibility/preference-respect)*

23. **Offset pagination has unmitigated drift**, and
   `api/challenges/[id]/leaderboard/route.ts:26` takes `limit` with no offset or
   cursor at all. *(table/pagination)*

24. **`OfflinePersistence.ts:365-375` drops a permanently-failed sync op
   silently** — local state keeps an arrangement the server rejected, with no
   reconciliation and no user-visible signal.
   *(drag-drop/ownership-boundaries)*

25. **Grid item identity is a function of its slot.** `grid-store.ts:750-799`
   splices by index and rewrites the item's dnd id to
   `createGridReceiverId(toPosition)`, which breaks React key stability.
   *(drag-drop/payload-and-identity)*

26. **`showValidDropZoneHighlight` is hardcoded `false`**
   (`SimpleDropZone.tsx:135`), so refusal is only shown AFTER the drop; and grid
   cards carry no `cursor-grab`/grip though backlog items do.
   *(drag-drop/drop-affordances)*

27. **The manifest carries `generatedFrom` with no generator** and no
   re-synthesize-and-compare check, so nothing can tell drift from
   could-not-synthesize. *(repo-manifest-standard/generated-from-provenance)*

## Drained 2026-08-24

Wave 2. Each item is struck with the commit that fixed it. Gates after every
slice; full pass at the end.

| # | item | commit |
|---|---|---|
| ~~1~~ | ~~`onDragCancel` unhandled on all four `DndContext`s~~ | `80ccbd2` |
| ~~2~~ | ~~A failed bookmarks fetch deletes the Saved Lists section~~ | `8fd65ca` |
| ~~3~~ | ~~Screen readers told about a keyboard drag that does not exist~~ | `80ccbd2` |
| ~~4~~ | ~~Sorts coerce absent values and have no tiebreak~~ | `9d521c3` |
| ~~5~~ | ~~Three Ctrl+Z handlers bound at `window` simultaneously~~ | `16d04a4` (deleted the dead third) + `7ff078e` (scope ownership for the live two) |
| ~~6a~~ | ~~`src/lib/virtual/` — 6 modules, 2,118 lines, zero importers~~ | `615d25e` |
| ~~7~~ | ~~`src/lib/orchestration/` — 5 modules, 2,494 lines, never adopted~~ | `16d04a4` |
| ~~8~~ | ~~No unused-export instrument~~ | `5457f29` (knip + baseline) |
| ~~9~~ | ~~No gate blocks anything, and nowhere for one to run~~ | `d2aca91` (CI) + `2e2a10f` `4ad9190` `d084466` `a170252` `adcf668` `c4b7488` (making it actually green) |
| ~~10a~~ | ~~Persisted stores have no migration chain~~ (grid-store exemplar; 11 stores remain, now item 10b) | `1401ecd` |
| ~~12~~ | ~~Three e2e specs are empty stubs advertised as coverage~~ | `dc743e4` |
| — | eslint severity: 44 correctness rules promoted to `error` + ratchet | `a9e9a33` (13 hook fixes) + `b9b18ba` |
| — | No unit-test runner; three files impersonating tests | `f3a0a51` |

### What the new gates found on their own

Worth recording, because it is the argument for having them:

- The first CI run failed in 6 seconds on a `package.json` / `package-lock.json`
  drift that had been invisible for as long as nothing ran `npm ci`.
- Optional wasm dependencies (`@emnapi/*`) resolve differently per platform, so
  a Windows-generated lockfile is rejected by `npm ci` on Linux. Fixed by
  generating the lockfile in `node:24-bookworm-slim` via Docker, which produces
  the union both platforms accept.
- The ratchet refused an unexplained DROP (`typecheck:errors` 29 local, 23 CI,
  same commit) and thereby caught its own counter measuring `.next/` generated
  types — a population that depends on whether someone has run `next dev`. The
  predicate is now declared and both agree at 23.
- The ratchet caught 6 regressions introduced by this wave's own commits
  (3 `import/order`, 1 `exhaustive-deps`, 1 `react-hooks/refs`, 3
  `knip:unusedExports`). All were fixed rather than re-baselined.

### Verification standard applied

Every check added in this wave was shown able to go red before being trusted,
and every test suite carries a recorded negative control with the exact mutation
and the measured red count. Three of my own verifications of the `npm ci`
failure were themselves invalid — each shared a cause with the thing it was
verifying (same OS, then a resolution-only flag, then the wrong npm major) and
so could not have failed. They are recorded in the commit messages as the
finding they are.
