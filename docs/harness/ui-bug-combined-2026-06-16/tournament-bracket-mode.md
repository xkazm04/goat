# Tournament Bracket Mode — Combined UI+Bug Scan
> Context: Head-to-head tournament-bracket ranking flow (setup → seeded bracket → matchup voting → standings).
> Files scanned: 13 (10 in-scope + seedingEngine.ts, ranking-store.ts bracket actions, MatchupScreen sub-files)
> Total: 5 (Critical: 1, High: 1, Medium: 2, Low: 1)

## 1. Empty / under-filled bracket throws inside setTimeout and hangs the loader forever
- **Severity**: critical
- **Lens**: bug-hunter
- **Category**: silent failure / unhandled async exception
- **File**: src/app/features/Match/sub_MatchBracket/BracketView.tsx:157-167
- **Scenario**: User opens bracket setup when `availableItems.length` is 0 or 1 (all backlog items already placed in the grid, or only one left) and clicks **Start**. The Start button in `BracketSetup.tsx:269` is always enabled and never checks `itemCount`.
- **Root cause**: `handleSetupStart` flips `isInitializing` true, then 1500 ms later calls `storeInitializeBracket(availableItems, …)` inside a `setTimeout`. With 0 items `seedParticipants` returns `[]` and `seedBracket` (bracketGenerator.ts:208) throws `"Cannot seed a bracket with zero participants."`; the throw is uncaught inside the timer callback, so the very next line `setIsInitializing(false)` never runs.
- **Impact**: The branded `BracketDrawingLoader` spins forever, the app appears frozen, and there is no error surfaced to the user. App-level state is also left at `isInitializing: true` with no recovery path short of a full reload.
- **Fix sketch**: Disable the Start button (and show "Need at least 2 items") when `itemCount < 2` in `BracketSetup`, and wrap the `storeInitializeBracket` call in try/catch that resets `setIsInitializing(false)` and shows an error toast on failure. Reuse `validateItemsForBracket` (seedingEngine.ts:243) before initializing.

## 2. `recordMatchupResult` silently records participant2 when the winnerId matches neither participant
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: silent failure / state corruption
- **File**: src/app/features/Match/sub_MatchBracket/lib/bracketGenerator.ts:397-399
- **Scenario**: A `winnerId` is passed that does not equal `participant1.id` — e.g. a stale id from the 300 ms confirm delay in `MatchupScreen` after the matchup advanced/changed, or any caller bug. The ternary `target.participant1?.id === winnerId ? participant1 : participant2` falls through to `participant2` with no equality check on `participant2.id`.
- **Root cause**: The "else" branch assumes the only two possibilities are p1 or p2, so it never validates that the supplied id actually belongs to this matchup. There is no guard for "winnerId matches neither."
- **Impact**: A wrong/stale id silently crowns participant2 as winner, advancing the wrong item up the bracket and corrupting the final standings — with zero error and no way for the user to notice until the wrong champion appears.
- **Fix sketch**: Resolve the winner explicitly: `const winner = [target.participant1, target.participant2].find(p => p?.id === winnerId)`. If `winner` is undefined, return the bracket unchanged (or log) instead of defaulting to participant2.

## 3. Progress bar total/“left” counts include auto-completed BYE matchups the user never votes
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: edge-case / success-theater metric
- **File**: src/app/features/Match/sub_MatchBracket/lib/bracketGenerator.ts:809 (vs the correct logic at :682)
- **Scenario**: Any bracket with byes (e.g. 10 items in a 16-bracket → 6 byes). `deriveBracketData` — which feeds `BracketProgress` in BracketView.tsx:388 and the "Resume (N left)" / "Start Voting" button label — counts a matchup when `!p1.isBye || !p2.isBye` (OR), so every player-vs-BYE matchup is added to `totalMatchups` even though it is auto-completed and never votable.
- **Root cause**: `getBracketStats` (:682) uses `&&` ("both real"), but the newer single-pass `deriveBracketData` (:809) uses `||` ("not pure-bye"), so the two diverge. BracketView uses the `||` version.
- **Impact**: The user sees an inflated denominator (e.g. "Match 1 / 11" where only 5 are real) and a wrong "X left" count on the Resume button; progress percentage jumps by large amounts when a single real vote is cast next to several free byes. Misleading and inconsistent with the round-header counts in `BracketVisualization` (RoundHeader uses raw `matchups.length`).
- **Fix sketch**: Make `deriveBracketData`'s stats predicate match `getBracketStats`: count only when `!p1?.isBye && !p2?.isBye`. Extract the predicate into one shared helper so the two code paths cannot drift again.

## 4. `Tab` is `preventDefault`-ed unconditionally, breaking keyboard focus traversal in the voting overlay
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: accessibility / missing state
- **File**: src/app/features/Match/sub_MatchBracket/components/MatchupScreen/useMatchupKeyboard.ts:75-78
- **Scenario**: A keyboard user presses **Tab** while the full-screen `MatchupScreen` overlay is open. BracketView renders `MatchupScreen` without an `onSkip` prop (BracketView.tsx:450-465), but the handler still calls `e.preventDefault()` for `Tab` before checking `if (onSkip)`.
- **Root cause**: `preventDefault()` runs first, then the no-op `if (onSkip) onSkip()`. With no `onSkip`, Tab is swallowed and does nothing — focus never moves between the Close, Undo, Compare, participant cards, Change, and Confirm buttons.
- **Impact**: The overlay becomes a keyboard focus trap for the most common navigation key; users relying on Tab cannot reach the Confirm button or move between cards, defeating the otherwise-good keyboard support (1/2/Enter/Esc/C).
- **Fix sketch**: Only intercept Tab when a skip handler exists: `case 'Tab': if (onSkip) { e.preventDefault(); onSkip(); } break;` — otherwise let the browser perform native focus traversal.

## 5. Champion display can collide with / be clipped behind the bracket and lacks a no-image fallback
- **Severity**: low
- **Lens**: ui-perfectionist
- **Category**: visual layout / missing empty state
- **File**: src/app/features/Match/sub_MatchBracket/components/BracketVisualization.tsx:739-746 (ChampionDisplay at :215-248)
- **Scenario**: On bracket completion the `ChampionDisplay` is absolutely positioned at `left: lastRoundX + matchupWidth + roundGap, top: height/2 - 80`. The SVG canvas `width` only reserves `+180` px of slack (:379); on small/medium `useBracketDimensions` widths the champion block (≈140 px wide) can exceed the canvas and sit half outside the scrollable content, or overlap the final-round card. Separately, when `champion.item.image_url` is missing the image block (:237) is simply omitted, leaving an unbalanced title-only card (no initial-letter fallback like ParticipantCard/VoteCard provide).
- **Root cause**: Fixed `+180` horizontal padding and a hard-coded `top` offset rather than measuring the champion node; champion render path has no image-absent branch.
- **Impact**: On the tournament's payoff moment the champion can be clipped or require horizontal scrolling to see, and items without artwork show a bare title where every other surface renders a letter avatar — an inconsistent, lower-polish finish.
- **Fix sketch**: Add enough trailing width for the champion column (e.g. base it on `matchupWidth + championWidth`) and auto-scroll to reveal it on completion; add a letter-avatar fallback in `ChampionDisplay` mirroring `ParticipantCard.tsx:110-115`.
