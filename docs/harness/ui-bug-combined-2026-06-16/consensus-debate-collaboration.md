# Consensus, Debate & Collaboration — Combined UI+Bug Scan
> Context: Community-ranking consensus/controversy heatmaps, AI debate threads, and multi-user collaborative ranking sessions.
> Files scanned: 16
> Total: 5 (Critical: 1, High: 2, Medium: 2, Low: 0)

## 1. Heatmap loses all interactivity (hover/click/tooltip/badges) once a list exceeds 100 items
- **Severity**: high
- **Lens**: ui-perfectionist
- **Category**: component-architecture / silent feature loss
- **File**: src/lib/consensus/HeatmapRenderer.tsx:394
- **Scenario**: A category with >100 items renders. `const useCanvas = cells.length > 100;` flips the renderer from `HeatmapOverlay` (CSS, interactive) to `HeatmapCanvas`. The canvas is `pointer-events-none` (line 137) and never receives `onCellHover`/`onCellClick`. The `HeatmapTooltip` is driven by `hoveredCell`, which the canvas never sets.
- **Root cause**: Two divergent render paths with no parity contract. The canvas path was built for performance but silently drops every interaction affordance (hover tooltip, click-to-debate, badges, intensity labels), which the smaller-list path provides.
- **Impact**: For exactly the large, dense lists where the heatmap is most valuable, users get a static color wash with no labels, no badges, no tooltips, and no click target — and there is no visible indication anything is missing. Click-to-open-debate becomes unreachable.
- **Fix sketch**: Render an invisible interactive hit-grid `<div>` layer over the canvas (or keep the overlay's pointer handlers in a sibling layer) so hover/click and the tooltip work identically in both modes; at minimum render badges/labels in the canvas path too.

## 2. Heatmap cells collide and overflow the grid because `position` is a rounded average, not a grid index
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: edge-case / rendering correctness
- **File**: src/lib/consensus/ConsensusDataService.ts:423 (consumed at HeatmapRenderer.tsx:92-96 and 174-178)
- **Scenario**: `generateHeatmapCells` sets `position: Math.round(item.averagePosition)`. Both renderers then compute grid coordinates as `row = Math.floor(cell.position / columns)` and `col = cell.position % columns`. Because `averagePosition` is a *community average* (e.g. two items can both average ~3.2 → both round to 3) and is not a unique 0..N index, multiple cells stack on the same coordinate, while items whose average exceeds the cell count render outside `gridWidth/gridHeight`.
- **Root cause**: Conflation of "semantic rank position" with "layout slot index." The grid layout assumes `position` is a dense unique 0-based index; the data layer supplies a non-unique, possibly out-of-range average.
- **Impact**: Overlapping/hidden cells (some items invisible), cells drawn off-canvas, and a tooltip showing `Position #{cell.position + 1}` that disagrees with where the cell actually sits. CSS-overlay keys also collide via `key={cell.itemId || cell.position}` when `itemId` is empty.
- **Fix sketch**: Assign each cell a stable layout index (its sort order in `community.items`) separate from the displayed rank, and use that index for `row/col`; clamp/guard indices against `columns * rows`.

## 3. `createCommunityRanking` produces `NaN` totalRankings on an empty list (divide-by-zero)
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: divide-by-zero / empty-input
- **File**: src/lib/consensus/ConsensusDataService.ts:199
- **Scenario**: A list/category with zero aggregated items (new category, all rankings filtered out) reaches `createCommunityRanking(...)`. `overallConsensus`, `mostControversial`, and `mostAgreed` are guarded for the empty case, but `totalRankings: items.reduce((sum,item)=>sum+item.sampleSize,0) / items.length` divides by `items.length === 0`, yielding `NaN`. The same pattern repeats in the mock route at `[listId]/route.ts:100`.
- **Root cause**: `totalRankings` is computed as a per-item *average* of sample sizes (already a questionable metric) without the zero-length guard applied to its siblings.
- **Impact**: `NaN` propagates to the API response and to `totalUsers` reduction in `consensus/route.ts:51-52`; UI fields like sample-size counts render `NaN`, and any `< / >` comparison on it silently fails. Empty consensus is a normal cold-start state, so this fires in practice.
- **Fix sketch**: Guard: `totalRankings: items.length > 0 ? items.reduce(...)/items.length : 0`. Separately reconsider whether `totalRankings` should be a sum, not an average, of sample sizes.

## 4. `fetchConsensus` global in-flight lock silently drops a second category's fetch
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: race condition / state management
- **File**: src/stores/consensus-store.ts:104
- **Scenario**: User opens category A (fetch starts, `isLoading=true`), then quickly switches to category B before A resolves. The guard `if (isLoading) return;` aborts B's fetch entirely. When A resolves it sets `currentCategory='A'`; B never refetches because nothing re-triggers it, and the 5-minute cache check at line 95 keys on `currentCategory`. `consensusData` now shows A's data while the UI is on B.
- **Root cause**: A single boolean `isLoading` is used as a global mutex across *all* categories to prevent an N+1 mount storm, but it cannot distinguish "same category in flight" (legitimately skip) from "different category requested" (must queue/replace).
- **Impact**: Stale/mismatched consensus overlay after a fast category switch, with no error and no spinner — `isContested`, sorting, and the heatmap all read the wrong category's data until a full cache expiry or manual refetch.
- **Fix sketch**: Track the in-flight category (e.g. `loadingCategory`) and only skip when it equals the requested category; otherwise let the new request proceed and reconcile by discarding responses whose category no longer matches `currentCategory`.

## 5. Debate quick-reply buttons fire without an in-flight guard, allowing duplicate/overlapping submissions
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: race condition / double-submit
- **File**: src/app/features/Match/sub_MatchGrid/components/Debate/DebatePanel.tsx:163-165
- **Scenario**: The quick-reply buttons (`Push back` / `Concede` / `Compare`) call `onReply(...)` directly. They are only rendered when `!isLoading`, but `onReply` → `replyToDebate` is async (use-debate.ts:104) and sets loading state a tick later. A fast double-click, or clicking a quick-reply at the same moment as the typed `handleSubmit`, queues two `addUserMessage`/`fetchDebateChallenge` calls against the same thread. The typed `handleSubmit` (line 62) *does* guard on `isLoading`; the quick-reply buttons do not, and neither is debounced.
- **Root cause**: Loading state is React-async and used only for conditional rendering, not as a hard re-entrancy guard at the call site; two independent submit entry points share one thread with no lock.
- **Impact**: Duplicate user turns appended to the thread, two concurrent Gemini calls (wasted tokens), and out-of-order AI responses overwriting `challengeStrength`/`controversyScore`/`isHotTake` (each `addAIMessage` blindly sets them). The thread can end visually inconsistent.
- **Fix sketch**: Gate every submit path through a single guarded handler that checks `isLoading`/active-thread loading and ignores re-entry; disable the quick-reply buttons (not just hide them) while a reply is pending.
