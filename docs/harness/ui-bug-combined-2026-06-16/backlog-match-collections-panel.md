# Backlog & Match Collections Panel — Combined UI+Bug Scan
> Context: Sidebar/bottom-sheet panel holding unranked backlog items in a virtualized, searchable grid users drag from, with mobile + resizable layouts.
> Files scanned: 17
> Total: 5 (Critical: 1, High: 2, Medium: 2, Low: 0)

## 1. Mobile swipe-to-rank bypasses the item-assignment lock — same item can land in two grid slots
- **Severity**: critical
- **Lens**: bug-hunter
- **Category**: race-condition / data-integrity
- **File**: src/app/features/Match/sub_MatchCollections/components/MobileBacklogPanel.tsx:204
- **Scenario**: User flick-swipes two backlog cards left in quick succession (the swipe-out spring is 300ms, `stiffness:500`, so two `onComplete` callbacks can fire back-to-back before React re-renders the list with `used=true`). Each `handleSwipeAssign` independently calls `useGridStore.getState()`, scans `gridItems` for the first slot where `!context.matched`, and both find the *same* empty index, then both call `assignItemToGrid(item, position)` + `markItemAsUsed`.
- **Root cause**: The desktop drag path (`grid-store.handleDragEnd`, line 927) deliberately wraps validation+assign+mark in `acquireItemLock`/`releaseItemLock` to make the operation atomic, explicitly to stop "double-click drag placing same item in two grid positions." The mobile swipe path reimplements assignment from scratch and never acquires that lock, nor does it call `canReceiveAtPosition`/`canTransfer`. `assignItemToGrid` guards against overwriting a *filled* slot (line 586), so the second write to the same slot is rejected silently — but the first item is still the only one placed while the second card already animated away as if accepted, and the second item is left in an inconsistent "swiped but not placed, not marked used" state.
- **Impact**: Lost placements / phantom successes on the primary mobile interaction. A card visually flies off-screen confirming a rank, but the item silently stays in the backlog (or worse, the loser of the slot race never gets re-offered cleanly). Corrupts the user's mental model of their ranking on the most-used mobile gesture.
- **Fix sketch**: Route mobile swipe-assign through the same locked grid-store action used by drag (acquire `itemsBeingAssigned` lock, validate via `canReceiveAtPosition`, assign, mark, release in `finally`) instead of hand-rolling the slot scan in the component; or expose a single `assignToNextOpenSlot(itemId)` store action that owns the lock and slot search atomically.

## 2. `usePanelResize` document listeners never detach if the component unmounts mid-drag
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: memory-leak / latent-failure
- **File**: src/app/features/Match/sub_MatchCollections/hooks/usePanelResize.ts:81
- **Scenario**: User starts dragging the resize handle, then the panel unmounts before mouseup — e.g. the breakpoint flips to mobile (`isMobileBreakpoint` switches `SimpleCollectionPanel` to render `MobileBacklogPanel` instead, line 141), the route changes, or the match ends. The four `document` listeners (`mousemove`/`mouseup`/`touchmove`/`touchend`) are added inside `handleResizeStart` and only removed inside `handleEnd`, which fires on mouseup. There is no `useEffect` cleanup that removes them on unmount.
- **Root cause**: Listeners are registered imperatively on `document` from inside a callback, with teardown bound solely to the end event rather than to component lifecycle. If the end event never reaches this handler (component gone), the closures leak and `handleMove` keeps calling `setPanelHeight` on an unmounted component, and `touchmove` was registered with `{ passive: false }` so it actively `preventDefault()`s real page scrolls.
- **Impact**: Memory leak plus "page won't scroll / ghost resize" until reload, specifically when resizing right as the layout responsively collapses to mobile — a plausible tablet-rotation or window-shrink sequence. React will also warn about state updates on an unmounted component.
- **Fix sketch**: Track the active listeners/`isResizing` in a ref and add a `useEffect(() => () => handleEnd(), [])` cleanup (or move the listener add/remove into an effect keyed on `isResizing`) so a drag in progress is torn down on unmount.

## 3. Empty-backlog state is unreachable on desktop — used-up grid shows a misleading "wrong category" message
- **Severity**: high
- **Lens**: ui-perfectionist
- **Category**: empty-state / messaging
- **File**: src/app/features/Match/sub_MatchCollections/components/VirtualizedCollectionGrid.tsx:96
- **Scenario**: User drags/ranks every available item until the backlog is exhausted (`flatFilteredItems` becomes empty). `useCollectionFiltering` strips all `used` items, so `displayGroups` is empty and the grid hits its empty branch, which renders `CategoryEmptyState` + "No items available in this category" / "Try selecting a different category." But the cause is "you've ranked everything," not a bad category. Separately, when the *active group* empties, `SimpleCollectionPanel`'s effect resets `activeTab` to `'all'` (line 103-107) — so a per-category empty state is also rarely seen; the global "all done" case is the real terminal state and it has no tailored copy.
- **Root cause**: A single empty template serves two semantically different conditions (no matches for a filter vs. backlog fully consumed). The grid has no signal distinguishing "nothing left to rank" from "this filter excluded everything," and there is no celebratory/terminal completion affordance for finishing the backlog during a match.
- **Impact**: At the most satisfying moment (finishing ranking) the user is told to "try a different category," implying something is broken. Degrades the end-of-match experience and can prompt confused category-hunting.
- **Fix sketch**: Distinguish the two cases — if `totalItemCount === 0` (all items used) show a "All items ranked!" completion state; only show "Try a different category" when `totalItemCount > 0` but the active tab/search yields nothing. Pass `totalItemCount` (or an `isExhausted` flag) into the grid's empty branch.

## 4. View-mode toggle icons are swapped — "swipe" shows the list icon, "grid" shows the grid icon but defaults to swipe
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: design-system / affordance
- **File**: src/app/features/Match/sub_MatchCollections/components/MobileBacklogPanel.tsx:279
- **Scenario**: The panel opens in `viewMode = "swipe"` by default (line 98). The toggle renders the `List` icon for the swipe button and `LayoutGrid` for the grid button. The swipe view is actually a vertical *list* of cards, and the grid view is the multi-column thumbnail grid — so `List` for swipe is defensible, but the default-active control is the *first* (left) button while convention puts the default/primary view first and users scanning left-to-right expect the leftmost icon to represent what they currently see. More importantly, neither button carries an active/aria-pressed state for screen readers, and the swipe view's only discoverability cue is the one-line hint banner that is always shown (line 310), never dismissible.
- **Root cause**: Icon semantics and default selection were chosen independently; the toggle group lacks `aria-pressed`/`role="radiogroup"` and a persistent visual mapping between icon and resulting layout.
- **Impact**: Users can't tell at a glance which mode is active or which icon yields which layout; assistive-tech users get two unlabeled toggle states. Minor but it sits on the primary mobile control cluster.
- **Fix sketch**: Add `aria-pressed={viewMode === 'swipe'}`/`'grid'` to each button, group them as a radiogroup, and align icon-to-view mapping (or relabel) so the active layout's icon is unambiguous; consider persisting the chosen mode.

## 5. Search results can leave the panel showing a category that has zero matching items
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: edge-case / state-consistency
- **File**: src/app/features/Match/sub_MatchCollections/SimpleCollectionPanel.tsx:103
- **Scenario**: User selects a specific category tab, then types a search query that matches items only in *other* categories. The `activeTab`-reset effect only watches `groupAvailableCounts` (available, pre-search counts) — it fires when a group runs out of *available* items, but not when a group simply has no *search* matches. So with a non-empty group selected and a query that matches nothing in it, `displayGroups` for that tab is empty and the grid renders the "No items available in this category" empty state, even though the search clearly has hits visible as counts in the sidebar ("N items match" badges on other groups).
- **Root cause**: Two filtering dimensions (tab + search) are reconciled by an effect that only reacts to one of them. There's no auto-fallback to `'all'` (or to the first group with matches) when the current tab's *search-filtered* result is empty.
- **Impact**: Dead-end empty grid while the sidebar advertises matches elsewhere; user must manually realize they should click another category or "All Items." Confusing during active searching, which is exactly when categories get narrow.
- **Fix sketch**: When `searchQuery` is non-empty, `activeTab !== 'all'`, and `groupMatchCounts[activeTab] === 0` while other groups have matches, auto-switch to `'all'` (or surface an inline "no matches in this category — N elsewhere, view all" link in the empty state) so search never strands the user on a non-matching tab.
