# Collection Panel & Item Cards — Combined UI+Bug Scan
> Context: In-match collection view, configurable item cards, stats, and custom-item add flow.
> Files scanned: 15
> Total: 5 (Critical: 0, High: 3, Medium: 2, Low: 0)

## 1. Quick filters / presets / smart suggestions are fully disconnected from the rendered grid
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: silent failure / dead feature
- **File**: src/app/features/Collection/components/CollectionToolbar.tsx:508 (and CollectionPanel.tsx:183-199)
- **Scenario**: User clicks a quick filter chip ("Unranked", "Top Rated"), applies a smart suggestion, loads a saved preset, or toggles AND/OR. The "N active" badge updates and the chip highlights, but the item grid never changes.
- **Root cause**: `CollectionToolbar` owns filter state via the *local* `useCollectionFilterState()` hook (line 508). The grid is driven entirely by `useCollection().filteredItems`, which only filters by `selectedGroupIds`, `searchTerm`, and sort (useCollection.ts:316-356). The two systems never meet — the toolbar's `filterStore.config` is never read by `useCollection`, and `CollectionPanel` never even passes the `items` prop to the toolbar (so facet counts and smart suggestions also compute against `[]`).
- **Impact**: An entire, prominently-displayed filtering subsystem (quick filters, presets, combinator, suggestion engine) is non-functional. Users get active-state feedback with zero effect — a trust-eroding silent failure.
- **Fix sketch**: Lift the filter config to the panel (or have `useCollection` consume `useCollectionFilterState`), apply `filterStore.config` inside the `filteredItems` memo via the existing condition-evaluation logic, and pass `displayItems` as the `items` prop to `CollectionToolbar` so facet counts/suggestions are real.

## 2. Duplicate React keys for items lacking a group_id
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: edge-case / reconciliation bug
- **File**: src/app/features/Collection/components/CollectionPanel.tsx:279 (and :298)
- **Scenario**: Two or more items have no `metadata.group_id` (e.g. freshly added items — the optimistic item in useCollection.ts:451-460 carries only `newItem.metadata`, and `useCollection` explicitly *includes* group-less items, line 322-324). Both render with `key={`-${item.id}`}` where `groupId` is `''`.
- **Root cause**: Key is composed as `` `${groupId}-${item.id}` `` with `groupId = (item.metadata?.group_id as string) || ''`. The fallback `''` is fine for uniqueness *only* because `item.id` is appended — but the real hazard is that the same `item.id` can appear under different `groupId` strings across renders (group_id arrives asynchronously after optimistic add / cache invalidation), causing the key to change for the *same* item. That remounts the card, dropping focus, drag state, and hover, and re-runs entry animations.
- **Impact**: Card remount mid-interaction: keyboard drag focus is lost, in-flight hover/spotlight tooltips vanish, and staggered animations replay — a jarring flicker right after adding an item or when stats hydrate.
- **Fix sketch**: Key by the stable identifier alone (`key={item.id}`); `item.id` is already unique across the collection, so the `groupId` prefix adds nothing but instability.

## 3. Pagination is button-only; LazyLoadTrigger / useQuickSelect / useIntersectionObserver are built but never rendered
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: component-architecture gap / dead code
- **File**: src/app/features/Collection/components/LazyLoadTrigger.tsx:60 (unused); CollectionPanel.tsx:318-340
- **Scenario**: With `enablePagination` the panel shows Previous/Next buttons inside a scrolling 600px-max dock. On a large collection the user must scroll to the bottom of each page, click Next, then scroll back up — there is no infinite scroll despite a complete `LazyLoadTrigger` + `useIntersectionObserver` implementation shipped in-feature. `useQuickSelect` (keyboard 1-9 assignment) and `goToPage` are likewise never wired.
- **Root cause**: The infinite-scroll/quick-select machinery was authored and exported from `index.ts` but never composed into `CollectionPanelInternal`; the panel fell back to manual page buttons.
- **Impact**: Degraded browse experience for large lists (the exact case pagination exists for), plus carrying dead code that drifts from the live component. The advertised keyboard quick-assign workflow is inaccessible.
- **Fix sketch**: Render `LazyLoadTrigger` at the end of the items area wired to `pagination.nextPage` with `enabled={pagination.hasMore}`/`isLoading={isFetching}` (or remove the unused trio and keep buttons). If keeping buttons, at least add numbered `goToPage` jumps.

## 4. AddItemModal: broken-image preview leaves a permanently hidden slot and stale category error
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: missing error/empty state
- **File**: src/app/features/Collection/components/AddItemModal.tsx:319-330 (and :130-136)
- **Scenario**: User pastes an image URL that 404s or is later corrected: `onError` sets `display:none` on the `<img>`, but the element never recovers when the URL is edited to a valid one (the inline style sticks because React keeps the same node and only re-runs `onError` on a new failure, not on success). Separately, if `category` is empty, `errors.category` is set on submit (line 131) but no field renders it (the category input is read-only with no error slot), so the user sees a silently disabled flow.
- **Root cause**: Imperative `e.currentTarget.style.display='none'` mutates DOM outside React state, so it isn't reset on URL change; and the validation writes an error key (`category`) that has no corresponding UI.
- **Impact**: A corrected image URL shows no preview (looks broken), and a missing category blocks creation with no visible reason — confusing dead-ends in the add flow.
- **Fix sketch**: Track `imageError` in state keyed off the URL (reset on `image_url` change), render a fallback placeholder instead of hiding; surface `errors.category` near the category field or as a toast.

## 5. Error state never recovers when the failure is the groups query, and shows no skeleton on refetch
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: error-recovery / loading-state gap
- **File**: src/app/features/Collection/components/CollectionPanel.tsx:218-233 (logic in useCollection.ts:613-615)
- **Scenario**: The groups request fails. The panel shows "Failed to load items" with a "Try Again" button calling `collection.invalidateCache()`. Invalidation refetches, but `isLoading` is `isLoadingGroups || isLoadingItems` and the error view stays mounted while `isFetching` is true — the user sees the error screen frozen during retry with no spinner, and if the retry succeeds the transition is abrupt with no skeleton.
- **Root cause**: The error branch is gated only on `isError` and gives no feedback for the in-flight retry (`isFetching` is exposed by the hook but unused in the panel). There is also no distinction between "groups failed" vs "items failed", though both collapse into one generic message.
- **Impact**: Retry feels unresponsive (button click appears to do nothing for the network round-trip), undermining confidence the action worked.
- **Fix sketch**: Disable the Try Again button and swap its label to a spinner while `collection.isFetching`, and/or render the skeleton grid during refetch after an error so the recovery path mirrors the initial load.
