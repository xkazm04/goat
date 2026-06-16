# Match Grid & Drag-Drop — Combined UI+Bug Scan
> Context: Core ranking grid — backlog→grid assign/move/swap/remove with physics drag overlay and "magnetic" drop zones.
> Files scanned: 16
> Total: 5 (Critical: 1, High: 2, Medium: 1, Low: 1)

## 1. Two divergent `handleDragEnd` engines disagree on occupied-slot drops (silent data divergence)
- **Severity**: critical
- **Lens**: bug-hunter
- **Category**: latent failure / dual source of truth
- **File**: src/stores/grid-store.ts:872 (and src/lib/dnd/operations/grid-plans.ts:182)
- **Scenario**: The live drag path used by the app is `SimpleMatchGrid.handleDragEnd` → `dragRouter.handleDragEnd` → `planAssign`/`executePlan` (SimpleMatchGrid.tsx:457). When a backlog item is dropped on an **occupied** slot, `planAssign` (grid-plans.ts:182-198) emits `[remove(pos), place(item,pos)]` and **displaces** the existing occupant back to the backlog. But `useGridStore.handleDragEnd` (grid-store.ts:872-996) is a second, fully-implemented assign engine that instead routes occupied targets through `ValidationAuthority.canTransfer`, which rejects with `TARGET_POSITION_ALREADY_OCCUPIED` (no displacement). The store's `assignItemToGrid` (grid-store.ts:586) also hard-rejects occupied slots.
- **Root cause**: The ownership contract comment (grid-store.ts:11-19) declares the store the "authoritative handler," yet the router was layered on top without removing the store's handler. Two code paths implement contradictory drop semantics; only one is wired, but both are maintained and tested as live.
- **Impact**: Behavior depends entirely on which path a caller happens to invoke. Any component still calling `useMatchGridState().handleDragEnd`/`useGridStore.getState().handleDragEnd` (as the doc instructs) silently gets the *non-displacing* reject semantics, so a drop onto an occupied podium slot becomes a no-op with a generic error toast — the opposite of the router's displace-and-rank behavior. Drift between the two is invisible until QA hits the wrong entry point.
- **Fix sketch**: Make `grid-store.handleDragEnd` delegate to `getGridDragRouter()`/`getStoreContext()` instead of reimplementing validation+assign, or delete it and update the doc comment. One assign algorithm, one displacement rule.

## 2. `assignItemToGrid` rejects displacement mid-sequence, leaving the displaced item lost from both grid and backlog
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: state corruption / partial-apply
- **File**: src/lib/dnd/operations/primitives.ts:173 (with src/stores/grid-store.ts:586)
- **Scenario**: `executeSequence` runs primitives one-by-one with **no transaction** (primitives.ts:192-199). `validateSequence` (primitives.ts:149) validated the *whole* plan against the pre-execution snapshot, and `place` validation only checks bounds (primitives.ts:70-81), never occupancy. For an assign-to-occupied slot the plan is `remove(pos)` then `place(item,pos)`; `executePrimitive('remove')` clears the slot and `markItemAsUsed(displaced,false)` is applied only *after* the whole sequence (grid-plans.ts:441-443). If any concurrent state change (e.g. a list `switchList`/resize at grid-store.ts:445, or a re-render that swapped `gridItems`) re-occupies `pos` between the two primitives, `assignItemToGrid` silently `return state`s on the occupied check (grid-store.ts:586-589) — the `place` is dropped but `remove` already happened and `markItemAsUsed(newItem,true)` still fires (grid-plans.ts:441).
- **Root cause**: Plan validation is time-of-check; execution is time-of-use over a sequence of independent `set()` calls. The primitives assume each step succeeds, but the store's guard clauses make `place` a silent no-op rather than a thrown error, so the surrounding `try/catch` (grid-plans.ts:460) never fires.
- **Impact**: The new item is marked "used" (removed from backlog) but never lands in the grid, and the displaced item was already returned — net result: a slot that should be filled is empty and an item has vanished from the visible pool until reload. Success theater: the operation reports `success:true`.
- **Fix sketch**: Have `assignItemToGrid` (or the `place` primitive) throw on unexpected occupancy so the catch path can roll back, or re-validate each primitive against live state inside `executeSequence` and abort+revert the already-applied `remove` on failure.

## 3. Mobile tap-to-place double-marks displaced item, then loses the tap if the slot re-renders empty
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: race / event-ordering (touch path)
- **File**: src/stores/grid-store.ts:852
- **Scenario**: `handleMobileTapSlot` snapshots `state` at line 820, then for an occupied target calls `get().removeItemFromGrid(position)` + `markItemAsUsed(displaced,false)` (lines 853-858), then `get().assignItemToGrid(gridItem, position)`. `assignItemToGrid` re-reads fresh state via its own `set(state => …)` and rejects if `state.gridItems[position].context.matched` is still true. Because `removeItemFromGrid` and `assignItemToGrid` are two separate `set` calls, a subscriber (e.g. `derived-session-sync`, the LRU cache writer, or a concurrent drag finishing) firing between them can leave `position` non-empty — the assign then silently no-ops while `markItemAsUsed(item.id, true)` (line 864) still runs. The tapped item is consumed but not placed.
- **Root cause**: Tap-to-place was built as three sequential store mutations rather than one atomic transition, and unlike the drag path it has **no lock** (`acquireItemLock` is only used in `handleDragEnd`, grid-store.ts:927). A user double-tapping two slots quickly, or tapping while a drag-end is settling, interleaves.
- **Impact**: On touch devices (the primary tap-to-place audience) an item silently disappears from the backlog without filling a slot; repeated taps can mark multiple items used while filling fewer slots. Mobile is exactly where this flow is the main interaction.
- **Fix sketch**: Wrap displace+place into a single `set()` that computes the next `gridItems` in one pass, and guard with the same `itemsBeingAssigned` lock used by the drag path; only `markItemAsUsed` after confirming the slot actually changed.

## 4. "Magnetic drop zones" hook is dead — feature advertised in the grid is never wired
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: component-architecture gap / missing polish
- **File**: src/app/features/Match/sub_DropZone/hooks/useMagneticSnap.ts:62
- **Scenario**: The context description promises "magnetic drop zones," and the store exposes `magneticState`/`updateMagneticState` (drop-zone-highlight-store.ts:112) plus `getClosestDropZones` (line 169). But a project-wide search shows `sub_DropZone/hooks/useMagneticSnap` is only re-exported from `sub_DropZone/index.ts:14` and consumed by **no** `.tsx` component. `SimpleDropZone` never imports it, never reads `magneticState`, and `updateMagneticState` is never called anywhere in the live path — so `getMagneticGlowStyles` and the whole proximity-pull effect render nothing.
- **Root cause**: The magnetic system was extracted into a hook/store slice but the wiring into `SimpleDropZone`/`DropZoneCard` was never completed (a "built-but-unwired" surface). The drop-zone glow you actually see is just the binary `isOver` scale in DropZoneCard.tsx:93, not proximity-based magnetism.
- **Impact**: Users get none of the promised tactile "snap toward nearest slot" feedback; the codebase carries a fully-tested-looking subsystem (rect caching, strength math, store slice) that is inert, misleading future maintainers and inflating the surface they must reason about.
- **Fix sketch**: Either consume `useMagneticSnap` in `SimpleDropZone` (feed `cursorPositionRef`, push result via `updateMagneticState`, render `getMagneticGlowStyles`) to deliver the feature, or delete the dead hook + `magneticState` slice and drop the claim from the context description.

## 5. Drag overlay & error feedback have no visible target/error state during keyboard or touch-without-pointer drags
- **Severity**: low
- **Lens**: ui-perfectionist
- **Category**: missing states (focus/error) / accessibility-adjacent polish
- **File**: src/app/features/Match/sub_MatchGrid/components/PortalDragOverlay.tsx:62
- **Scenario**: `PortalDragOverlay` positions the floating item exclusively from native `pointermove` events (lines 62-73, 99-111) and the initial `activatorEvent instanceof PointerEvent|MouseEvent` (line 81). A `KeyboardSensor`-style drag (and dnd-kit keyboard moves generally) emit no `pointermove`, so the overlay either never mounts a position or freezes at the activator coordinate while the actual focus target advances slot-to-slot. The position badge (`#{targetPosition+1}`) only updates from `handleDragMove`'s `event.over` (SimpleMatchGrid.tsx:418-434), which does fire, but the overlay glyph itself stays put — visually decoupling the "where am I" indicator from the real target. (Note: `DndContext` here registers only Pointer+Touch sensors, SimpleMatchGrid.tsx:365-377, so keyboard DnD isn't enabled today — but the overlay is the blocker if it ever is.)
- **Root cause**: The overlay was optimized for raw pointer tracking (bypassing React for 60fps) and assumes a pointer is always the source of truth, with no fallback to dnd-kit's own transform/`over` rect for non-pointer modalities.
- **Impact**: Any future keyboard-accessible ranking (a reasonable a11y goal for a ranking app) ships with a broken/stale drag overlay; today it means touch flows that briefly lose pointer capture can leave the overlay lagging until the next move.
- **Fix sketch**: Add a fallback in `PortalDragOverlay` to position from `useDndMonitor`'s drag-move/`over` rect when no `pointermove` has arrived recently, so the overlay tracks the active drop target regardless of input modality.
