# Match Session & Keyboard Control — Combined UI+Bug Scan
> Context: Orchestrates a ranking session — grid init, progress restore, keyboard navigation/quick-assign, undo/redo.
> Files scanned: 12 (+5 neighbors: grid-store, backlog actions-utils, orchestration GlobalOrchestrator, SimpleMatchGrid, SimpleCollectionPanel)
> Total: 5 (Critical: 1, High: 2, Medium: 2, Low: 0)

## 1. Quick-assign auto-advance re-selects the same placed item (available list never excludes used items)
- **Severity**: critical
- **Lens**: bug-hunter
- **Category**: state corruption / silent failure
- **File**: src/stores/session-store.ts:407 (and src/stores/match-store.ts:134, 144)
- **Scenario**: In keyboard mode, select an item and press a digit (or Enter) to assign it via `quickAssignToPosition`. The handler schedules `selectNextAvailableItem()` after a debounce. The user expects the cursor to advance to the *next unplaced* item.
- **Root cause**: `getAvailableBacklogItems()` returns `NormalizedOps.getAllItems(normalizedData)` — the full, unfiltered item set. The `used`/`matched` flag that grid assignment sets via `backlogStore.markItemAsUsed()` (grid-store.ts:864) is written to the **backlog-store** groups, NOT to `session-store.normalizedData`. The two stores never reconcile, so the session's "available" list always includes already-placed items. `selectNextAvailableItem()` then re-selects `availableItems[0]` (match-store.ts:139) — frequently the just-assigned item or position-0 item every time.
- **Impact**: Keyboard rapid-ranking re-targets stale/placed items; subsequent quick-assigns silently no-op (`canAddAtPosition` false) or land on wrong slots. Cursor never progresses correctly. Core promise of the context ("quick-assign shortcuts") is broken whenever it relies on availability filtering.
- **Fix sketch**: Filter `getAvailableBacklogItems()` to exclude items whose `used`/`matched` is true, reading the authoritative flag (reconcile session `normalizedData` with backlog-store `used`, or have match-store source the list from backlog-store's filtered selector). Also change `selectNextAvailableItem` to advance relative to the current cursor, not hardcode index 0.

## 2. handleKeyboardShortcut + keyboard navigation actions are never wired to any key event
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: dead code / latent failure (unwired feature)
- **File**: src/stores/match-store.ts:374 (also navigateBacklogItems:121, quickAssignSelected:171, smartPlaceToSuggested:225, saveMatchProgress:366)
- **Scenario**: A user reads the shortcuts hint and presses ArrowUp/Down, Enter, Space, `s` to save, `f` for smart-fill, `c` for compare, or digits while NOT in voice/command mode.
- **Root cause**: A repo-wide search shows no `window.addEventListener('keydown', …)` or `onKeyDown` dispatches to `handleKeyboardShortcut`. Only the orchestration layer (voice/command bus) reaches `setKeyboardMode` and `quickAssignToPosition` (GlobalOrchestrator.ts:597,608). The match flow's only real keydown listener is QuickSelect's `q` handler (SimpleCollectionPanel.tsx:120) and the undo hook. So the entire `handleKeyboardShortcut` switch (arrows, Enter/Space, 1–9/0, c/r/s/f/p) is unreachable from the keyboard.
- **Impact**: The advertised keyboard navigation/quick-assign/save/smart-fill shortcuts do nothing for keyboard users. `initializeMatchSession` (match-store.ts:247) is likewise never called — the page does its own init in page.tsx, so the store's guard/timeout/error path is dead. Maintenance hazard: future callers will wire a partially-correct dispatcher (see #1, #3).
- **Fix sketch**: Either wire `handleKeyboardShortcut` to a `keydown` listener in SimpleMatchGrid (guarding inputs as `useUndoKeyboard` does) or delete the unreachable navigation/dispatcher actions and the unused `initializeMatchSession` to remove the false surface area.

## 3. handleKeyboardShortcut consumes digit/Space keys without input-field or preventDefault guards
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: edge-case / event handling (manifests if #2 is fixed)
- **File**: src/stores/match-store.ts:382-416
- **Scenario**: Once a keydown listener dispatches to this handler (the intended design), a user types into the collection search box: typing a number triggers `quickAssignToPosition`, and pressing Space (`case ' '`) triggers `quickAssignSelected` and scrolls the page (no `preventDefault`).
- **Root cause**: The handler takes a bare `key: string` with no access to the event, so it cannot check `e.target` (INPUT/TEXTAREA/contentEditable) nor call `preventDefault()`. Contrast `use-undo-keyboard.ts:43-52`, which correctly skips inputs and prevents default. Digits and Space are valid text input, so assignment fires while the user is typing a search term or custom item name.
- **Impact**: Accidental grid placements and page-scroll jumps while typing; data corruption of the ranking the user didn't intend. Also blocks normal text entry of numbers in any focused field.
- **Fix sketch**: Pass the `KeyboardEvent` (or an "isTyping" flag + a `preventDefault` callback) into the handler; early-return when the target is an editable element, and call `e.preventDefault()` for handled keys (especially Space and digits).

## 4. Undo after item removal/session switch can re-execute against a stale store context
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: state corruption / stale reference
- **File**: src/stores/undo-store.ts:152,184
- **Scenario**: User assigns item A to position 3 (pushes an undo command capturing `context`/`result`), then removes A from the backlog (session-store.ts:330 deletes it + clears cursor) or switches lists. They press Ctrl+Z. `rollback(command.context, command.result, stores)` runs with a captured context referencing an item/position that no longer matches current grid state.
- **Root cause**: `UndoCommand` snapshots `DragContext` and `DragOperationResult` at execution time and replays them verbatim on undo/redo. The stack is never invalidated on `removeItemFromGroup`, `deleteSession`, `switchToSession`, or `loadSession` — only on full `resetMatchSession`/`clearGrid`. There is no guard that the captured position still holds the expected item.
- **Impact**: Undo/redo can rollback the wrong slot or resurrect a deleted item into the grid, desyncing grid-store vs. backlog `used` flags. Silent because `rollback` swallows nothing visible — the grid just changes unexpectedly.
- **Fix sketch**: Clear the undo/redo stacks on session switch and on backlog item removal (call `useUndoStore.getState().clear()` from `switchToSession`/`removeItemFromGroup`), or validate in `undo()`/`redo()` that the target position still contains the expected item before replaying.

## 5. Match keyboard shortcuts have no on-screen affordance, focus, or live-region feedback
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: accessibility / discoverability / missing state feedback
- **File**: src/stores/match-store.ts:108-141 (keyboardMode + selection model), src/app/(match)/goat/page.tsx
- **Scenario**: A keyboard or screen-reader user enters keyboard mode. Selection is tracked only as a `SelectionCursor.itemId` in a store; nothing moves DOM focus, sets `aria-activedescendant`, or announces "Selected <item>" / "Assigned to position N".
- **Root cause**: Selection is a pure data cursor (selection-cursor.ts) with no binding to roving `tabindex`, `aria-selected`, or an `aria-live` region. There is also no visible shortcuts legend on the match page (page.tsx renders only the grid), so the navigation/quick-assign keys are undiscoverable and the digit-1..0 mapping is unexplained.
- **Impact**: Keyboard navigation is invisible to assistive tech and undiscoverable to sighted keyboard users — selection changes produce no announced or focus feedback. WCAG 2.1.1 (keyboard) / 4.1.2 (name/role/value) gaps.
- **Fix sketch**: Bind the selection cursor to roving `tabindex`/`aria-selected` on backlog items with `aria-activedescendant` on the list container, add a polite `aria-live` region announcing selection and assignment outcomes, and surface a discoverable shortcuts legend (reusing the existing ShortcutsBar pattern) on the match page.
