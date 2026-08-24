# Bookmarks, Saved Lists & Collections — Combined UI+Bug Scan
> Context: Bookmark lists, resume in-progress rankings, and organize lists into named collections via dashboard + quick switcher.
> Files scanned: 16
> Total: 5 (Critical: 1, High: 2, Medium: 2, Low: 0)

## 1. Bookmarks API trusts client-supplied user_id — IDOR / cross-user data access
- **Severity**: critical
- **Lens**: bug-hunter
- **Category**: security / authorization
- **File**: src/app/api/bookmarks/route.ts:21 (GET), :86 (POST), :154 (DELETE), :195 (PATCH)
- **Scenario**: Any client calls `GET /api/bookmarks?user_id=<victimId>` or `DELETE` with `{type:'bookmark', user_id:'<victimId>', list_id}`. The handler never calls `requireAuth()` (compare `src/app/api/collections/route.ts:221`, which does `const auth = await requireAuth(); ... body.user_id = auth.userId`). It filters/mutates purely on the `user_id` in the request.
- **Root cause**: The bookmarks route was written before the auth hardening applied to the collections route; it assumes the `user_id` from the temp-user hook is trustworthy, but it is fully client-controlled.
- **Impact**: Read any user's bookmark library; delete or re-folder another user's bookmarks; folder DELETE (`:160`) and folder PATCH (`:201`) don't even require `user_id`, so any caller who knows/guesses a `folder_id` can delete or rename arbitrary folders and orphan all bookmarks inside (`update folder_id=null` at :164). Classic IDOR with data-loss potential.
- **Fix sketch**: Add `const auth = await requireAuth(); if (auth.error) return auth.error;` to all four handlers and derive `user_id` from `auth.userId` instead of the body/query. Scope folder DELETE/PATCH with `.eq('user_id', auth.userId)` so ownership is enforced server-side.

## 2. Collection dashboard never wires Add/Remove/Reorder — core management actions are dead
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: broken behavior / missing wiring
- **File**: src/app/features/Collections/CollectionsDashboard.tsx:138-152
- **Scenario**: Open `/my-collections`, select a collection. `CollectionView` is rendered without `onAddList`, `onRemoveList`, or `onReorderLists` props. Because `CollectionView` gates every management affordance behind those callbacks (`{onAddList && ...}` at :326/:360, `onRemove={onRemoveList ? ... : undefined}` at :383/:390, `showDragHandle={!!onReorderLists}` at :384), the "Add List" button, per-list remove control, and drag handles are all hidden. The `useCollectionOperations` hook exposes `addLists`/`removeList`/`reorderLists`, but the dashboard destructures only `create/update/remove`.
- **Root cause**: Dashboard wiring was left incomplete — the props are optional, so omitting them silently disables the feature instead of failing.
- **Impact**: Users can create/edit/delete collections but cannot add lists to, remove lists from, or reorder a collection from the primary dashboard. The collection-contents feature is effectively non-functional. Worse, `listsInCollection` (CollectionsDashboard.tsx:59) filters `userLists` by `selectedCollection.listIds`, so an empty/unpopulated collection always renders the empty state with no way to populate it.
- **Fix sketch**: Wire the three callbacks in `CollectionsDashboard` to `addLists`/`removeList`/`reorderLists` from `useCollectionOperations`, passing `collectionId: selectedCollection.id`. Provide an "Add List" picker for `onAddList`.

## 3. CollectionView ignores its own reorder state, so search + reorder both break
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: state management / stale state
- **File**: src/app/features/Collections/components/CollectionView.tsx:162-190 & 226/378
- **Scenario**: `orderedListIds` is initialized from `collection?.listIds` *once* via `useState` (:162). When the user selects a different collection, the prop changes but `orderedListIds` is never re-synced (no `useEffect`/`key` reset), so `orderedLists` (:185) is computed from a stale id list. Separately, the render at :226 and :378 maps over `filteredLists`, never `orderedLists` — so `handleReorder`/`orderedLists` are dead code and any drag reorder has no visible effect.
- **Root cause**: Two parallel list pipelines (`filteredLists` for display, `orderedLists` for ordering) were built but never reconciled, and the ordering state isn't derived from props.
- **Impact**: Switching collections can render the wrong/previous ordering; reordering produces no UI change; search filtering and ordering can't coexist. Combined with finding #2, the reorder path is entirely inert today, but the latent stale-state bug will surface the moment drag handles are wired.
- **Fix sketch**: Derive ordering from props (e.g. reset `orderedListIds` in a `useEffect` keyed on `collection?.id`/`listIds`, or remount via `key={collection?.id}`), and render the merged result (`filteredLists` applied over `orderedLists`) so ordering, search, and reorder share one source of truth.

## 4. Optimistic bookmark add desyncs UI when list is already bookmarked elsewhere
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: race condition / optimistic-update mismatch
- **File**: src/hooks/use-bookmarks.ts:95-128 ; src/app/api/bookmarks/route.ts:136-139
- **Scenario**: A list already bookmarked in another tab/device (cache not yet refreshed). User clicks bookmark; `onMutate` prepends a `temp-<listId>` entry and shows nothing wrong, but the server hits the unique constraint and returns `{ alreadyExists: true }` with a 200 (`route.ts:138`). `onSuccess` still fires `toast({title:'Saved', description:'List bookmarked!'})` (:126) even though nothing new was created, and the optimistic temp row persists until `onSettled` invalidation (:122) reconciles. If two rapid toggles race, `bookmarkedListIds` is derived from the optimistic list, so a quick add→remove can leave a `temp-` id that never resolves to a real row.
- **Root cause**: The success path doesn't inspect the `alreadyExists` response; optimistic insert assumes every POST creates a new bookmark.
- **Impact**: Misleading "Saved" toast on no-op, brief duplicate/temp rows, and possible flicker of the amber bookmark state. Low data risk but visibly inconsistent under multi-tab use.
- **Fix sketch**: In `onSuccess`, branch on `data.alreadyExists` to suppress the toast (or say "Already saved"); ensure the optimistic temp row is replaced/removed when the response indicates no insert, and rely on `onSettled` invalidation to be the source of truth.

## 5. SavedListsSection promises folder drag-and-drop that doesn't exist; no per-card folder action
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: missing affordance / misleading empty state
- **File**: src/app/features/Landing/sub_LandingLists/SavedListsSection.tsx:414-423 (and SavedListCard :62-135)
- **Scenario**: The folder feature exists (`useBookmarks.moveToFolder`, `bookmarksByFolder`), and the empty-folder state literally says "Drag bookmarks here or save new lists to this folder" (:420). But `SavedListCard` has no drag source, no drop target, and no menu to assign a folder — its only actions are Play (whole card) and Remove (X on hover, :104). There is no UI path to put a bookmark into a folder, so every non-"all"/"unsorted" folder is permanently empty and the instructional copy is false.
- **Root cause**: The data layer (`moveToFolder`) and grouping were built, but the move/assign UI was never added; the empty-state copy describes intended-but-unbuilt behavior.
- **Impact**: Users create folders that can never be filled, see misleading guidance, and the FolderTab counts always read 0 — a polished surface advertising a capability that silently does nothing.
- **Fix sketch**: Either implement a folder-assign affordance on `SavedListCard` (a small folder/menu button calling `moveToFolder({bookmarkId, folderId})`, or DnD onto FolderTabs), or, short-term, change the empty-folder copy to not promise drag-and-drop until the action exists.
