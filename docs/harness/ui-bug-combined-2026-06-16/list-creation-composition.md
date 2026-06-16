# List Creation & Composition — Combined UI+Bug Scan
> Context: The flow that turns a user's topic/composition intent into a created ranked list (size, items, metadata).
> Files scanned: 16
> Total: 5 (Critical: 1, High: 2, Medium: 2, Low: 0)

## 1. Created lists are always orphaned — `user_id` never reaches the API
- **Severity**: critical
- **Lens**: bug-hunter
- **Category**: data-integrity / contract-mismatch
- **File**: src/types/list-intent-transformers.ts:103 (and src/app/api/lists/create-with-user/route.ts:25)
- **Scenario**: Any user creates a list via the modal (predefined or custom). `listIntentToCreateRequest` builds the request body with only `user: { email, name }` and no `user_id`. The route at `route.ts:25` reads `body.user_id`, finds it `undefined`, and falls into the `if (!userId)` branch that sets `userId = null`. Every list is inserted with `user_id: null`.
- **Root cause**: The transformer was written to pass a temp-user *descriptor* (email/name) while the API contract expects a resolved `user_id`. The `tempUserId` available to the service (`createList` receives `userId`) is folded only into a synthetic email string (`temp-${tempUserId}@goat.app`), never the `user_id` field. The route also has no code path that resolves/creates a user from the email, so the descriptor is silently dropped.
- **Impact**: All newly created lists are owned by nobody. `useListStore.getUserLists()` (use-list-store.ts:263-267) filters by `l.user_id === currentUser?.id`, so a user's freshly created list never shows up in "My Lists"; ownership-scoped features (edit, analytics, clone-by-user) break. Silent — no error surfaces.
- **Fix sketch**: Add `user_id` to `CreateListRequest` and set it from the `tempUserId` in `listIntentToCreateRequest`, then insert it server-side; OR have the route resolve/create a user from `body.user` (email) before inserting. Either way the inserted `user_id` must be non-null for authenticated/temp users.

## 2. `createListMutation` is wired into disabled/guard logic but never fires for predefined creation
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: latent failure / state-desync
- **File**: src/app/features/Landing/sub_CreateList/CompositionModal.tsx:56 (used at :94, :272 and ListCreateButton.tsx:61,178)
- **Scenario**: The predefined "quick create" path (`handleCreatePredefined`, line 130) and the expanded `ListCreateButton` path (`handleCreate`, line 93) both call `listCreationService.createList(...)` directly. They never call `createListMutation.mutateAsync`. Yet `createListMutation.isPending` is passed as the header's `isCreating` prop (:272), is part of `ListCreateButton`'s `isButtonDisabled`/`isPending` (:61,178), and gates `handleClose` (:94).
- **Root cause**: Two parallel creation mechanisms (the TanStack mutation and the service singleton) coexist after a refactor; the UI guards still reference the mutation that the active code path bypasses. `isPending` therefore stays `false` for the entire real request.
- **Impact**: The header create affordance never shows its in-flight/disabled state from `isCreating`; the backdrop/Escape close guard at line 94 leans only on `isCreatingRef`/`creationStep`, so the secondary signal is dead weight; in `ListCreateButton`, `createListMutation.isPending` contributes nothing to disabling, leaving `creationStep`/`isLoaded` as the only real guards. Confusing state and a fragile single point of guard.
- **Fix sketch**: Pick one mechanism. Either route creation through `createListMutation.mutateAsync` (so `isPending` is real) or drop the mutation from this component and derive `isCreating` from `creationStep !== null` consistently across header, button, and close guard.

## 3. Double-submit race in `ListCreateButton` — guard is derived state, not a synchronous ref
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: race condition / timing
- **File**: src/app/features/Landing/sub_CreateList/ListCreateButton.tsx:69-96
- **Scenario**: In the expanded modal the user double-clicks START quickly. `handleCreate` guards only on `isButtonDisabled` (line 71), which is derived from `createListMutation.isPending` (always false, see #2) and `creationStep` — but `creationStep` is React state set asynchronously inside the `onProgress` callback, which only runs after `createList` reaches its first `setProgress('validating')` await boundary. Between the two synchronous click handlers, `creationStep` is still `null`, so both invocations pass the guard and two lists are created.
- **Root cause**: The sibling `handleCreatePredefined` in CompositionModal correctly uses a synchronous `isCreatingRef` (line 114) to close this window; `ListCreateButton` has no such ref and trusts async-updated state for re-entrancy protection.
- **Impact**: Duplicate list creation, double navigation/`router.push`, two success toasts, doubled confetti — and with #1, two orphaned rows. Most likely on slow networks / fast clicks.
- **Fix sketch**: Add an `isCreatingRef = useRef(false)` set synchronously at the top of `handleCreate` (bail if already true; reset in a `finally`), mirroring `handleCreatePredefined`.

## 4. `ListCreateButton` never clears `creationStep` on success → permanently disabled / stuck progress on failed navigation
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: silent failure / state cleanup
- **File**: src/app/features/Landing/sub_CreateList/ListCreateButton.tsx:98-142
- **Scenario**: On success the code shows the celebration, waits, toasts, calls `onSuccess`/`onClose`, then `router.push`. It never sets `creationStep` back to `null` on the success branch (only the error branch at line 145 does). If the modal is reused without unmounting, or if `router.push`/`onClose` fails or is cancelled (e.g. navigation blocked, error in `onSuccess`), the button stays disabled (`creationStep !== null` ⇒ `isButtonDisabled`) and the progress indicator (line 282) stays visible with a spinner forever.
- **Root cause**: Success cleanup is assumed to be handled implicitly by unmount-on-navigate; there is no explicit reset, so any path that keeps the component mounted leaves it in a terminal "creating" UI state.
- **Impact**: Stuck "creating" UI, dead create button, no recovery without a full modal reset. The `complete` step also never renders because the service emits `complete` but the component overwrites with the success animation timing.
- **Fix sketch**: After the success flow (or in a `finally`), explicitly `setCreationStep(null)` / reset `showSuccess`, so the component is recoverable regardless of navigation outcome.

## 5. Mode-aware modal title/comment but the create path ignores template/clone/blueprint items and metadata
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: feature/flow gap (UX–behavior mismatch)
- **File**: src/app/features/Landing/sub_CreateList/CompositionModal.tsx:210-227 (vs create path :130 and transformer src/types/list-intent-transformers.ts:103)
- **Scenario**: The modal advertises four modes via `getModalTitle()`/`getComment()` ("Clone List", "Create from Template", "From Blueprint") and shows a mode indicator card (:317-356). But creation always goes through `listIntentToCreateRequest`, which only carries category/subcategory/size/time_period/title/description/color. A `ListTemplate`/`TopList`/`Blueprint` may define explicit *items*, ranking criteria, or `sourceId`, none of which are sent. The create-with-user route inserts an empty list either way.
- **Root cause**: The intent type is a thin metadata spec with no `items`/`sourceId` payload in the API request; transformers stash `sourceId` on the intent but `listIntentToCreateRequest` drops it. The UI promises "Cloning X" / "Using Template Y" but the backend cannot honor item carry-over.
- **Impact**: Users selecting Clone/Template/Blueprint expect the source's items/config; they get a blank list with only the title, a confusing mismatch between the modal's strong mode framing and the result. Erodes trust in the template/blueprint feature.
- **Fix sketch**: Either (a) propagate `sourceId`/`source` (and items where applicable) through `listIntentToCreateRequest` and have the route seed items from the source, or (b) soften the UI copy so it does not imply item-level cloning until backend support exists.
