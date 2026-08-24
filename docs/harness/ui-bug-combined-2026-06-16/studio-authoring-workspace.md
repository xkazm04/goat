# Studio Authoring Workspace — Combined UI+Bug Scan
> Context: Creator studio for building, editing, arranging, and publishing custom ranking lists.
> Files scanned: 15
> Total: 5 (Critical: 1, High: 2, Medium: 1, Low: 1)

## 1. Duplicate item titles collide on React keys + DnD ids, corrupting the grid
- **Severity**: critical
- **Lens**: bug-hunter
- **Category**: state-integrity / data-loss
- **File**: src/app/features/Studio/components/StudioItemsView.tsx:179 (and :44–45)
- **Scenario**: Add "Halo" via AddItemForm twice (manual add does not dedup — `addItem` just appends, studio-store.ts:521), OR inline-edit one item's title to equal another's (StudioItemCard.tsx:49–55), OR generate items that the DB matcher does not de-key. Two items now share the same `title`.
- **Root cause**: Both identity systems key on `title`. The AnimatePresence map uses `key={item.title}` (line 179) and `sortableIds` is `item-${item.db_item_id || item.title}` (line 44–45). Only the generation stream dedups by title (studio-store.ts:324–326); manual add, inline edit, and template seeding do not. React requires unique keys; dnd-kit requires unique sortable ids.
- **Impact**: Duplicate React keys cause one card to vanish/flicker and removals to delete the wrong card. In DnD, `sortableIds.indexOf()` (StudioItemsView.tsx:52–53) returns the FIRST match, so dragging the 2nd duplicate reorders the 1st — silent data corruption of the published list order.
- **Fix sketch**: Give each `EnrichedItem` a stable client-generated `uid` (e.g. `crypto.randomUUID()`) at creation/seed/add time and use it as both the React `key` and the sortable id. Dedup or suffix on manual add and inline-edit so titles are never the identity source.

## 2. Items grid renders 4+ columns on phones, making cards and titles unusable
- **Severity**: high
- **Lens**: ui-perfectionist
- **Category**: responsiveness
- **File**: src/app/features/Studio/components/StudioItemsView.tsx:26
- **Scenario**: Open the studio with generated items on a 360–390px phone. `DEFAULT_GRID_CLASS` starts at `grid-cols-4` with no smaller base, so a ~360px viewport (minus container padding `px-4` + tab `p-4`) yields four `aspect-3/4` cards under ~70px wide each.
- **Root cause**: The grid scales UP (sm:5 md:6 lg:8 xl:10) but never scales DOWN below 4. The base column count assumes desktop. At that width the bottom title (`text-sm`, StudioItemCard.tsx:204) truncates to 2–3 glyphs, the hover-only remove/drag affordances are untappable, and the DB badge overlaps the title.
- **Impact**: On the primary touch form-factor the authoring grid is effectively unreadable and not actionable — users cannot identify, edit, or remove items.
- **Fix sketch**: Start the base at `grid-cols-2` (or `grid-cols-3`) and let it scale up: `grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10`. The hero/loading skeleton (line 142) uses the same class and benefits too.

## 3. "Publish as Template" sends an empty listId — the action is silently broken
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: broken-behavior / latent-failure
- **File**: src/app/features/Studio/components/MetadataPanel.tsx:325
- **Scenario**: After publishing readiness is met, click "Publish as Template". The mutation is called with `listId: ''` and a trailing comment "Will be set by the API from source context" — but the studio has no source list context yet (the list is only created in `handlePublish`, and the user may template-publish without ever clicking Publish List).
- **Root cause**: The template-publish payload depends on a server-side "source context" that does not exist in the studio authoring flow; the empty `listId` is a placeholder that was never wired to the freshly created `publishedListId`.
- **Impact**: Either the API rejects the empty id (user sees a generic failure toast) or it creates a malformed/orphaned template. Best case the button shows success and silently produces an invalid template; worst case it errors every time. Either way a surfaced feature does not work.
- **Fix sketch**: Gate the button behind a successful list publish and pass the real `publishedListId`, or change the API contract to accept the inline item set directly without a `listId`. Disable the button until a valid id is available and show why.

## 4. Inline title edit + removal index drift during live streaming generation
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: race-condition / timing
- **File**: src/app/features/Studio/components/StudioItemCard.tsx:51–54, 134–137
- **Scenario**: Click "Generate More" (TopicInputForm.tsx:273) while inline-editing or hovering an existing card's remove button. The stream appends items via rAF batches (studio-store.ts:329–346), re-indexing the array; cards are memoized and keyed by `title`, but the `index` prop and the captured `onRemove(index)` closure update on each append.
- **Root cause**: Item identity and mutation are index-based (`updateItem(index)`, `removeItem(index)`), while the underlying array mutates mid-interaction. Appends are safe (indices of existing items are stable), but combined with title-keyed identity (finding #1) any title equality during the window can re-target edits/removals; the edit input also keeps a stale `editTitle` snapshot taken at click time.
- **Impact**: A remove or title-save committed during an active stream can land on the wrong item, or an in-progress edit silently reverts. Edge-case but reproducible and produces wrong published content.
- **Fix sketch**: Move to id-based mutations (`removeItem(uid)`, `updateItem(uid, …)`) per finding #1, and either disable inline edit/remove while `isGenerating`, or rebase the edit buffer when the underlying item changes.

## 5. "Save Draft" is a placebo button with a misleading toast
- **Severity**: low
- **Lens**: ui-perfectionist
- **Category**: missing-polish / honest-feedback
- **File**: src/app/features/Studio/components/MetadataPanel.tsx:65–75
- **Scenario**: Click "Save Draft". A green "Saved!" state and a toast "N items saved locally. You can close and return later." appear.
- **Root cause**: The handler does no work — its own comment says state is "already in memory" and "In a full implementation, persist middleware would handle localStorage." The zustand `persist` middleware (studio-store.ts:657–669) already auto-persists on every change, so the button is purely cosmetic and the toast implies an explicit save action that never happens.
- **Impact**: Users believe drafts are saved by this button. The persisted partialize set omits `listSize`, `allowCustomItems`, and `showSuccess`, so a returning user silently loses list-size choice — directly contradicting the "return later" promise.
- **Fix sketch**: Either remove the button (persistence is automatic) and show a passive "Auto-saved" indicator, or make it explicitly flush all draft fields (add `listSize`/`allowCustomItems` to `partialize`) so the promise is truthful.
