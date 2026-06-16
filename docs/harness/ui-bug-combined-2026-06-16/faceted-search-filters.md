# Faceted Search & Filters — Combined UI+Bug Scan
> Context: Faceted filtering/narrowing of large collections via extracted facets, breadcrumbs, presets, autocomplete, and mobile drawers.
> Files scanned: 14
> Total: 5 (Critical: 0, High: 3, Medium: 2, Low: 0)

## 1. Boolean facet selections silently break — URL round-trip and aggregator-vs-context filter logic disagree
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: silent failure / type-coercion edge case
- **File**: src/lib/faceted-search/FacetContext.tsx:449 (parse), src/lib/faceted-search/FacetContext.tsx:188, src/lib/faceted-search/FacetAggregator.ts:185
- **Scenario**: User selects the `used` boolean facet ("Status: Yes"). `toggleFacetValue` stores the real boolean `true` in the selection. The two filter code paths then diverge: (a) when `persistToUrl` is on, the selection is serialized to `facet_used=true`, and on reload `parseSelectionsFromUrl` only converts `'true'`/`'false'` to booleans for any facet — but the aggregator's inverted index keys boolean facets by the actual `Boolean(value)` (FacetExtractor.ts:233), while `computeFilteredIndices` looks up `facetIndex.get(value)` by strict identity. The provider's own `applyFacetFilters` (line 188) compares with `fieldValue === v` only when `typeof fieldValue === 'boolean'`, but the aggregator path at FacetAggregator.ts:185 does `facetIndex.get(value)` with NO string/boolean normalization, so a selection value of string `"true"` (which is what you get if any caller forgets the URL special-case, e.g. the boolean facet under a non-`range` definition) never matches the boolean index key `true`.
- **Root cause**: Boolean facet values flow through three serialization boundaries (selection state, URL string, inverted-index key) with inconsistent coercion. `parseSelectionsFromUrl` hardcodes `'true'/'false'` handling but the index keys are real booleans, and the fast index path does exact `Map.get` while the fallback path does `String()` comparison.
- **Impact**: Boolean (and number) facets filter correctly in one path and return zero matches in another, producing empty result sets or counts that disagree with the breadcrumb/selection state after a URL reload or when the index path is taken.
- **Fix sketch**: Normalize selection values to the facet's declared type at a single choke point (e.g. in `toggleFacetValue`/`parseSelectionsFromUrl` coerce by `definition.type`), and make `computeFilteredIndices` look up boolean/number keys via the same normalization the index uses, rather than relying on `Map.get` identity.

## 2. FacetPanel ignores controlled expand/collapse state — its own local copy desyncs from context and never resets
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: stale state / state ownership
- **File**: src/lib/faceted-search/components/FacetPanel.tsx:69-90
- **Scenario**: `FacetPanel` initializes a *local* `expandedFacets` set from `defaultExpanded` exactly once via `useState(() => …)`. The aggregator already computes `facet.isExpanded` (FacetAggregator.ts:299) and the context exposes `toggleFacetExpanded`, but the panel uses neither — it renders `isExpanded={expandedFacets.has(...)}` from its private state. When facets arrive asynchronously (initial render has `facets: []` because items load later, FacetContext.tsx:140), the lazy initializer runs against the empty array, so no facet is ever auto-expanded even though several definitions set `defaultExpanded: true`. Toggling here also does not propagate to `aggregate()`, which still recomputes `isExpanded` from the context's separate set.
- **Root cause**: Two independent sources of truth for expansion — the lazy local `useState` initializer (frozen at first render before data exists) and the context/aggregator `expandedFacets`. The local set is never reconciled when `facets` later populates.
- **Impact**: Default-expanded facets (Category, Subcategory, Status) render collapsed on first load; expand state set in a sidebar does not survive being mirrored into the mobile drawer (which mounts a fresh `FacetPanel` with its own state), so users re-expand everything per surface.
- **Fix sketch**: Make expansion controlled — accept `expandedFacets`/`onToggleExpanded` props (the context already provides them) and drop the local `useState`, or at minimum re-seed the local set in an effect when `facets` transitions from empty to populated.

## 3. Search-then-filter pipeline desyncs `searchQuery` from the index, dropping results after fast clears
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: race condition / debounce timing
- **File**: src/lib/filters/CollectionFilterIntegration.tsx:287-315, 387-404
- **Scenario**: `setSearchQuery` debounces the committed `searchQuery` by `debounceMs` (default 150ms), while the items-index rebuild effect (line 287) keys off `items` only. If the parent passes a new `items` array (e.g. TanStack Query refetch) during the debounce window, the index rebuilds, but the in-flight `setTimeout` then commits a `searchQuery` captured against the *previous* closure and fires `searcherRef.current.search(searchTerm)` against the freshly rebuilt index. More concretely: `clearSearch` cancels the timer and resets state, but a `setSearchQuery(a)` immediately followed by `setSearchQuery('')` within 150ms leaves `isSearching=true` from the first call's `setIsSearching(true)` if the second call's timer resolves first — the booleans are set optimistically before the debounce resolves and there is no generation/sequence guard.
- **Root cause**: `isSearching` is toggled imperatively around a debounce with no request-sequence token; the committed query and the index lifecycle are independent effects with no ordering guarantee.
- **Impact**: Spinner can stick "on" (success theater / stuck loading state) or results briefly reflect a stale query after rapid typing-then-clearing, especially when item data refetches mid-type.
- **Fix sketch**: Add a monotonically increasing request id captured in the debounced closure; only apply `setSearchQueryState`/`setIsSearching(false)` if the id is still current, and clear `isSearching` in `clearSearch` unconditionally (already done) plus guard the trailing timer.

## 4. Recursive hierarchical nodes render but cannot be expanded or selected past depth 1
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: edge-case wilderness / dead interaction
- **File**: src/lib/faceted-search/components/FacetPanel.tsx:696-708
- **Scenario**: `HierarchicalNodeItem` recurses for children but hardcodes `isExpanded={false}` and `onToggleExpand={() => {}}` on every child (lines 700-701), and passes no `onDrillDown` down. So if a hierarchy ever has three or more levels, grandchildren are unreachable — their expand chevron is inert and clicking a grandchild label calls `onSelect(node.value)` with only the leaf value (not the full path), which the selection logic in `drillDown`/`toggleFacetValue` cannot resolve to a hierarchical path. Even at depth 1, child rows lose drill-down because `onDrillDown` is not threaded through the recursive call.
- **Root cause**: The recursive render treats children as always-collapsed leaves; expansion state is tracked only for top-level nodes in the parent's `expandedNodes` set, and `onDrillDown` is dropped at the recursion boundary.
- **Impact**: Multi-level category trees (the default `category → subcategory` is 2-level today, so impact is latent) are non-navigable below the first child row; selecting nested values produces selections whose value never matches the indexed `parent/child` key, yielding zero-count filters.
- **Fix sketch**: Track expanded child nodes in the same `expandedNodes` set (keyed by full path), thread `onToggleExpand`/`onDrillDown` through the recursive `HierarchicalNodeItem`, and pass the accumulated path rather than the bare `node.value`.

## 5. Mobile drawer drag-to-dismiss conflicts with inner scroll, and the breadcrumb "remove" maps to the wrong action
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: responsiveness gap / mobile interaction + interaction-correctness
- **File**: src/lib/faceted-search/components/MobileFacetDrawer.tsx:142-147, 179-188
- **Scenario**: The drawer sets `drag="y"` on the whole sheet with `dragConstraints={{ top: 0 }}` while the body is a `flex-1 overflow-y-auto` region (line 193). On touch devices, a downward swipe that begins inside the scrollable facet list is ambiguous: framer-motion's whole-panel drag competes with native scroll, so users attempting to scroll up through a long facet list can instead drag-dismiss the drawer (offset > 100 triggers `onClose`, line 103). Separately, the in-drawer `FacetBreadcrumbs` wires `onRemove={onToggleValue}` (line 183) — `onRemove` is documented as removing a single value, and `toggleFacetValue` happens to remove a selected value, but it will *re-add* the value if breadcrumb state and selection ever disagree (e.g. a value present in the breadcrumb but already cleared), since toggle is not idempotent-remove.
- **Root cause**: Drag is bound to the entire sheet rather than gated to the drag handle (the handle's `onPointerDown` starts `dragControls`, but `drag="y"` on the panel still makes the body draggable), and breadcrumb removal reuses a toggle action instead of an explicit remove.
- **Impact**: Frustrating accidental dismissals while scrolling filters on mobile (the primary use case for this context); a subtle correctness gap where "×" on a chip can add rather than remove a value.
- **Fix sketch**: Remove `drag="y"` from the panel and drive dismissal only via the handle's `dragControls` (or set `dragListener={false}` so only the handle initiates drag); give `FacetBreadcrumbs` a true remove callback (filter the value out) instead of reusing `toggleFacetValue`.
