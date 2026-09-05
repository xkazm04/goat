# Search & Command Palette — Combined UI+Bug Scan
> Context: Fuzzy search across lists/items plus a keyboard-driven command palette for navigation and list discovery.
> Files scanned: 12
> Total: 5 (Critical: 0, High: 3, Medium: 2, Low: 0)

## 1. Escape in command palette can never just clear the category filter — it always closes
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: keyboard-nav / event-conflict
- **File**: src/app/features/CommandPalette/useCommandPalette.ts:44
- **Scenario**: Open palette (Cmd/Ctrl+K), with an empty query click a category chip (e.g. "Sports") to set `categoryFilter`, then press Escape expecting the filter to clear while the palette stays open.
- **Root cause**: Two independent Escape handlers exist. The component's `handleKeyDown` (CommandPalette.tsx:417-424) is designed to clear `categoryFilter` first and only close on a second Escape. But the global `document`-level listener in `useCommandPaletteKeyboard` (useCommandPalette.ts:44-48) also fires on the same keydown and unconditionally calls `close()`. The input's handler calls `e.preventDefault()` but not `stopPropagation()`, so the event still bubbles to `document` and the global handler closes the palette.
- **Impact**: The "Escape clears filter, then closes" affordance is dead code; users lose their whole palette session when they only meant to drop a filter. Confusing and unrecoverable without re-opening.
- **Fix sketch**: Have the global listener ignore Escape when the palette is open (let the component own it), or call `e.stopPropagation()` in the component's Escape branch so the document-level handler doesn't also run.

## 2. Keyboard selection can land on empty-state example rows that Enter ignores
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: keyboard-nav / index-desync
- **File**: src/app/features/CommandPalette/CommandPalette.tsx:440
- **Scenario**: Open the palette with an empty query (so recent lists / history / "Quick Actions" examples render). Press ArrowDown past the recent + history rows onto a highlighted "Create <example>" row, then press Enter.
- **Root cause**: `totalItems` (line 255) counts `recentLists.length + history.length + getExampleQueries().length + Object.keys(CATEGORY_CONFIG).length`, letting `selectedIndex` advance across the example range. But the empty-query Enter branch (lines 440-449) only handles indices inside `recentLists` and `history` — there is no `else` mapping `selectedIndex` to an example, and `setQuery("new …")` is wired only to the row's `onClick` (line 1002). So Enter on a visually highlighted example does nothing. The same memo also overcounts: examples are sliced to 4 in render (line 997) but counted at full length (7), and the `CATEGORY_CONFIG` term has no corresponding selectable rows in the empty state at all, so selection can scroll into pure void rows.
- **Impact**: Keyboard-only users see a highlighted action that silently no-ops on Enter, and can arrow into invisible/non-existent rows — a broken core interaction for a "keyboard-driven" palette.
- **Fix sketch**: Make `totalItems` for the empty state equal exactly the rendered rows (`recentLists + history.slice(0,5) + examples.slice(0,4)`), and add an Enter branch that, for an index in the example range, runs `setQuery("new " + example)` (mirroring the click handler).

## 3. Result list flickers / mis-targets while API search debounces because fallback toggles on `hasApiResults`
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: async-timing / race
- **File**: src/app/features/CommandPalette/CommandPalette.tsx:213
- **Scenario**: Type a query that has matches (e.g. "batman"). While `useQuickSearch` is still debouncing/fetching, `apiResults` is empty.
- **Root cause**: `useApiSearch = filterDomain || (searchQuery.trim() && hasApiResults)` where `hasApiResults = apiResults.length > 0`. Because it depends on results being non-empty rather than on loading state, the UI first renders the **client-side** `filteredLists` branch (lists only), then snaps to the **API** branch once results arrive — a visible content swap on every keystroke pause. Worse, `selectedIndex`/Enter routing (lines 433-439) and `totalItems` (lines 250-253) are computed from `useApiSearch`, so an Enter pressed in the brief window can fire `handleNavigateToList(filteredLists[selectedIndex])` against the wrong (about-to-be-replaced) result set. When the API genuinely returns zero, it also silently shows client-side list results instead of the API "No results" empty state.
- **Impact**: Janky result swapping on a fast input, and a timing window where Enter navigates to the wrong destination — exactly the kind of silent mis-action that erodes trust in a command palette.
- **Fix sketch**: Drive the branch off intent + loading, not result count: e.g. `useApiSearch = !!filterDomain || (!!searchQuery.trim() && (isSearchLoading || hasApiResults))`, and keep a single stable list source for the active render so keyboard routing always matches what is shown.

## 4. `parseDomainFilter` strips the prefix from the raw query, mismatching its lowercased match
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: edge-case / string-handling
- **File**: src/app/features/CommandPalette/CommandPalette.tsx:106
- **Scenario**: Type a domain filter with surrounding/leading whitespace or mixed case plus leading spaces, e.g. `"  /List batman"` or `"/LIST  batman"`.
- **Root cause**: The match is done on `lowerQuery = query.toLowerCase().trim()` (line 103) but the slice that produces `cleanQuery` operates on the **un-trimmed** original `query` (line 109: `query.slice(prefix.length)`). When the original has leading whitespace, `query.slice(prefix.length)` cuts at the wrong offset (it removes the first N raw chars, which include leading spaces, not the prefix), so the prefix text leaks into the search query or the wrong characters are dropped. Also typing just `/list` (no trailing space) sets `filterDomain` but yields an empty `cleanQuery`, so `useQuickSearch` is disabled (searchQuery length 0) yet `useApiSearch` is `true` via `filterDomain` — the panel shows the "Filtering by" chip with no results and no guidance.
- **Impact**: Whitespace/case variants of the documented `/list` syntax silently produce garbage queries or an empty filtered-but-resultless state, undermining the advertised type-filtering feature.
- **Fix sketch**: Slice from the trimmed/normalized string (track the matched prefix length against `lowerQuery` and re-derive the remainder), and when `filterDomain` is set but `cleanQuery` is empty, render a "Type to search <domain>" placeholder row instead of a blank panel.

## 5. Fuzzy word-start matching can emit duplicate/incorrect highlight indices on repeated words
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: algorithm / data-correctness
- **File**: src/lib/search/fuzzy.ts:63
- **Scenario**: Search a title containing a repeated leading word, e.g. pattern `"to"` against `"top top tens"`, or any text where the same word appears twice.
- **Root cause**: In the word-start loop, `wordStart` is found with `tLower.indexOf(word, charOffset)` but `charOffset` is advanced by `word.length + 1` regardless of whether the current `word` actually matched the pattern word `pw`. When a word repeats, `indexOf(word, charOffset)` can resolve to the wrong occurrence (or the same occurrence twice across pattern words), pushing duplicate or misaligned indices into `wordMatchedIndices`. Those indices feed `highlightMatches` (line 155), and `wordMatchScore` also accumulates `0.3` per matching word with no dedupe, inflating the score for repetitive titles. The single-space assumption (`+1`) is also wrong for titles split on `/\s+/` containing multi-space or tab separators.
- **Impact**: Mis-highlighted characters in result titles and slightly skewed ranking favoring repetitive/whitespace-heavy titles — subtle correctness drift in the core fuzzy ranker shared by the palette, API route, and SearchFilterBar.
- **Fix sketch**: Track a running cursor that advances only when a match is consumed, dedupe indices via a `Set` before returning, and compute word offsets from the actual matched span rather than assuming single-space joins.
