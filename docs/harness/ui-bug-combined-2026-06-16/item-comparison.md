# Item Comparison — Combined UI+Bug Scan
> Context: Side-by-side comparison of two items with attribute diffing and exportable comparison output to help users decide relative ranking.
> Files scanned: 11
> Total: 5 (Critical: 0, High: 3, Medium: 2, Low: 0)

## 1. Attribute-diffing engine and export pipeline are entirely unwired (dead feature)
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: component-architecture gap / built-but-unwired
- **File**: src/app/features/Match/ComparisonModal.tsx:1 (and src/lib/comparison/attribute-comparators.ts, src/lib/export/ComparisonExporter.ts, src/app/features/Match/sub_ItemBadges/AttributeRow.tsx)
- **Scenario**: A user opens the comparison UI expecting the advertised "attribute diffing and exportable comparison output." The in-scope `ComparisonModal` only renders a criteria-*scoring* grid — it never calls `compareItems()`, never renders `AttributeRow`/`DiffIndicator`, and exposes no export/copy/share button.
- **Root cause**: `compareItems`, `getComparisonSummary`, `generateComparisonText`, `downloadComparisonImage`, `copyComparisonAsText`, `shareComparison`, and `AttributeRow` have zero consumers across the codebase (grep-verified). The shipped modal solves a different problem (weighted criteria scoring) than the context's stated purpose.
- **Impact**: The entire core promise of this context — attribute diffing + exportable output — is non-functional in the UI. Substantial code is shipped (and bundled) but unreachable, so users cannot diff or export at all.
- **Fix sketch**: Wire a "Diff" view mode into `ComparisonModal` that runs `compareItems(items)` and maps results onto `<AttributeRow variant="detailed" />`, plus an export toolbar calling `downloadComparisonImage`/`copyComparisonAsText`. Alternatively delete the orphaned engine if scoring is the real intent.

## 2. Numeric tie among 3+ items can produce a false winner
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: edge-case / silent logic error
- **File**: src/lib/comparison/attribute-comparators.ts:179
- **Scenario**: Compare 3 items where the best value is shared by exactly the first item only as the `reduce` seed, but a different pair ties. Concretely: tie detection at line 191 counts items whose value equals the *reduce-selected* winner's value. If two NON-winning items tie at the second-best value (e.g. values `[10, 5, 5]`, higher-better), `winnerValue=10`, `tieCount=1`, so item 0 wins correctly — but for `[10,10,5]` reduce keeps the first `10` and `tieCount=2` → correctly a tie. However, with strict `>` the reduce never swaps on equality, so for descending input `[10,10,5]` vs ascending `[5,10,10]` the *winnerIndex* differs by input order even though both should tie; tie detection saves the first but the per-attribute `winnerIndex` used by `AttributeRow`/`generateComparisonText` (line 137) is computed independently and is order-dependent.
- **Root cause**: Winner selection (`reduce` with strict `>`/`<`) and tie detection (count of equals) are two separate passes; equality handling is inconsistent and order-sensitive. `compareNumeric` always returns `winnerId: null` (line 197) so winner is only ever conveyed via `winnerIndex`, doubling the surface for order bugs.
- **Impact**: Diff highlighting and exported "[#N wins]" markers can crown the wrong item or flip with input reordering, undermining the ranking-decision purpose.
- **Fix sketch**: Compute the max/min value first, then derive `tieCount` and `winnerIndex` from that single source of truth; return a winner only when exactly one item holds the extreme value.

## 3. Persisted `items` desync from criteria modal feeds a stale/empty comparison
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: state-management / persistence drift
- **File**: src/stores/comparison-store.ts:248
- **Scenario**: `partialize` persists `items` and `comparisonHistory` but NOT `selectedForComparison` or `isOpen`. After a reload, `items` is repopulated from localStorage while `selectedForComparison` resets to `[]`. `getSelectedItems()` (line 239) then returns `[]`, `canCompare()` is false, and `useComparisonHistory.historyWithDetails` marks entries `hasAllItems:false` because `loadHistoryComparison` (line 210) filters against `items` that may no longer contain those ids.
- **Root cause**: Asymmetric persistence — pinned `items` survive but the selection that drives every derived value does not. History stores only ids/titles, so reloaded history can never resolve item details once pinned items change.
- **Impact**: After refresh the comparison drawer can show pinned cards while the floating selector and "Compare" CTA behave as if nothing is selected; history entries silently render as incomplete. Confusing, non-reproducible-looking bug for users.
- **Fix sketch**: Either persist `selectedForComparison` alongside `items`, or on rehydrate re-derive `selectedForComparison` from persisted `items`. Store a lightweight item snapshot in history entries so detail resolution does not depend on current `items`.

## 4. Pin button disabled state is non-reactive to live selection count (stale closure)
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: race/timing / selector subscription
- **File**: src/app/features/Match/components/ComparisonDrawer.tsx:267
- **Scenario**: `ComparisonPinButton` subscribes to `canAddMore` via `s.selectedForComparison.length < MAX`. But the drawer/selector add items through `toggleItem`, which can mutate `items` without changing `selectedForComparison` (e.g. `selectMultipleItems` sets selection; `assignItemToGrid` path calls `removeItem`). `isInComparison` is checked against `items` (line 266) while `canAddMore` is checked against `selectedForComparison`. When these two arrays diverge (see finding 3), the Pin button can show "full"/disabled while the drawer shows fewer than MAX cards, or allow pinning a 5th visual item.
- **Root cause**: Two different arrays (`items` vs `selectedForComparison`) are used as the source of truth for "is pinned" vs "can add more," and they are not kept in lockstep by all mutations (`addItemToComparison` in comparison-manager.ts only touches `items`).
- **Impact**: Pin affordance disables/enables incorrectly at the MAX_COMPARISON_ITEMS boundary, blocking legitimate pins or permitting over-pinning. Hard for users to reason about.
- **Fix sketch**: Pick one canonical array for capacity (use `items.length` everywhere, or guarantee every mutation updates both), and make `isInComparison`/`canAddMore` read from the same source.

## 5. Comparison drawer image has no error/broken-image fallback and no focus-visible affordance on actions
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: missing states / focus & error polish
- **File**: src/app/features/Match/components/ComparisonDrawer.tsx:182
- **Scenario**: A pinned item with a valid-but-dead `image_url` renders a broken-image glyph (the `No image` fallback only triggers when `image_url` is falsy, not on load error). Separately, the remove ("Unpin") button is `opacity-0 group-hover:opacity-100` (line 203) with no focus-visible override, so keyboard users tabbing to it see no visible focus and cannot tell it exists; the same hover-only reveal pattern appears on the ComparisonItemChip remove button (ComparisonSelector.tsx:218).
- **Root cause**: Image element has no `onError` handler, and hover-gated controls were styled for pointer users only, omitting `:focus-visible` reveal — a recurring design-system drift in this context (the modal cards use `focus-ring`, the drawer/selector do not).
- **Impact**: Broken thumbnails look like an app bug; keyboard/AT users effectively cannot unpin items from the drawer or the floating selector. Accessibility regression plus visual inconsistency with the rest of the comparison UI.
- **Fix sketch**: Add `onError` to swap to the `No image` placeholder, and add `group-focus-within:opacity-100 focus-visible:opacity-100` (or always-visible at reduced opacity) to the unpin buttons so they are reachable and visible via keyboard.
