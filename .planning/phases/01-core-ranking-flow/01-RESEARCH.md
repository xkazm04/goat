# Phase 1: Core Ranking Flow - Research

**Researched:** 2026-03-14
**Domain:** Next.js Zustand multi-store state management, @dnd-kit drag-and-drop, localStorage persistence, backlog item loading
**Confidence:** HIGH

## Summary

Phase 1 fixes the broken end-to-end ranking experience. The codebase already has all major components built -- grid store, session store, match store, drag-and-drop system, completion modal, landing page with featured lists. The work is primarily debugging and fixing the broken item loading pipeline, adding a hydration readiness gate between stores, implementing LRU eviction for localStorage persistence, wiring up the CompletionModal to show on grid completion, and cleaning up legacy dead code.

The core technical risk is the broken backlog item loading (root cause unknown -- needs investigation at the start of the phase). The store synchronization fragility (grid-store calling session-store.getState() before hydration) is a known issue documented in CONCERNS.md. The CompletionModal component exists but its action buttons are stubs. The landing page browse/search infrastructure exists and needs category threshold logic.

**Primary recommendation:** Start with a debugging investigation of the broken item loading pipeline (BacklogProvider -> backlog-store -> API endpoints), then fix store hydration ordering, then wire up completion flow, then handle landing page browse, and finally clean up legacy code.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Auto-show CompletionModal when all grid positions are filled
- Modal offers 4 actions: Download result image, Share link, Keep editing (dismiss modal), Start new ranking (return to landing)
- "Download result image" and "Share link" buttons should be present but may be stubs in Phase 1 (actual implementation is Phase 4) -- they should be visually present to validate the flow
- "Keep editing" dismisses the modal and returns to the grid for rearranging
- "Start new ranking" navigates back to landing page
- Featured + browse layout: hero section with featured/popular lists, then categorized browse sections below
- Categories with insufficient items shown but disabled with "Coming soon" tag (not hidden)
- Minimum item threshold for "active" category to be determined by Claude based on database audit
- Search via existing GlobalSearchBar should work for finding specific lists
- Clean up deprecated code as part of fixing the core flow
- Remove deprecated TransferProtocol class (~500 lines of dead code in transfer-protocol.ts)
- Remove or consolidate matching/ vs Match/ duplicate features
- Clean up deprecated ListIntent compat helpers if they block the fix
- Add NODE_ENV !== 'production' guard to match-test debug page (don't delete, keep for dev use)
- Add LRU eviction to listGridCache -- keep last 10-20 lists, evict oldest before persisting
- Prevents localStorage quota exhaustion for power users
- Add readiness gate: grid-store waits for session-store hydration before allowing drag operations
- Prevents silent sync failures when stores hydrate out of order

### Claude's Discretion
- Exact debugging approach for broken item loading (root cause unknown -- needs investigation)
- LRU cache size (10 vs 20 lists)
- Minimum item threshold for showing categories as "active" vs "Coming soon"
- Loading skeleton design during backlog item loading
- Error state handling when item loading fails

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FLOW-01 | User can select a list and see all backlog items loaded correctly in the collection panel | Debug broken item loading pipeline: BacklogProvider -> backlog-store -> /api/top/groups endpoints |
| FLOW-02 | User can drag items from backlog to grid positions without errors | Fix store hydration readiness gate; grid-store -> session-store sync |
| FLOW-03 | User can complete a full ranking and see a completion state | Wire CompletionModal auto-show when gridStatistics.isComplete is true |
| FLOW-04 | Drag-and-drop feels smooth with no lag or visual glitches | Already uses @dnd-kit with DragOperationRouter; verify after FLOW-01/02 fixes |
| FLOW-05 | User can save progress and resume after closing browser | Fix LRU eviction on listGridCache; fix session-store hydration ordering |
| FLOW-06 | User can browse available lists by category on the landing page | FeaturedListsSection exists; add category browse with "Coming soon" thresholds |
| FLOW-07 | User can search for specific lists from the landing page | GlobalSearchBar exists (deleted in working tree -- investigate); verify search works |
</phase_requirements>

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| Next.js | ^16.1.3 | App Router framework | Installed |
| Zustand | ^5.0.5 | Multi-store state management with persist middleware | Installed |
| @dnd-kit/core | ^6.3.1 | Drag-and-drop primitives | Installed |
| @dnd-kit/sortable | ^10.0.0 | Sortable presets | Installed |
| @dnd-kit/modifiers | ^9.0.0 | DnD behavior modifiers | Installed |
| TanStack Query | ^5.80.3 | Server state / caching | Installed |
| Framer Motion | ^12.23.24 | Animations (CompletionModal) | Installed |
| Supabase JS | ^2.76.1 | Database client | Installed |

### Supporting
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| Playwright | ^1.57.0 | E2E testing | Installed (devDep) |
| Vitest | - | Unit testing | NOT INSTALLED -- needed for Wave 0 |

**No new dependencies needed for Phase 1.** All required libraries are already in the project. Vitest would be needed only if unit tests are added (see Validation Architecture).

## Architecture Patterns

### Store Dependency Graph (Critical)
```
comparison-store (independent)
session-store (independent, persisted to localStorage)
backlog-store (independent, persisted to IndexedDB)
validation-notification-store (independent)
    |
grid-store --> session-store (direct import)
           --> backlog-store (lazy accessor, retries 5x @ 20ms)
           --> validation-notification-store (lazy accessor)
    |
match-store --> session-store, grid-store, comparison-store
```

**Initialization order (from registry.ts):** comparison -> session -> backlog -> validation-notification -> grid -> match

### Pattern 1: Store Hydration Readiness Gate
**What:** Grid-store must NOT process drag operations until session-store has hydrated from localStorage. Currently there is no gate -- grid-store calls `useSessionStore.getState().updateSessionGridItems()` which silently fails if session-store is not yet hydrated.
**When to use:** Every drag operation that syncs to session-store.
**Implementation approach:**
```typescript
// In session-store: add hydration flag
interface SessionStoreState {
  _hydrated: boolean;
  // ... existing fields
}

// In persist config:
onRehydrateStorage: () => (state) => {
  if (state) {
    state._hydrated = true;
  }
}

// In grid-store: check before sync
const sessionStore = useSessionStore.getState();
if (!sessionStore._hydrated) {
  gridLogger.warn('Session store not yet hydrated, deferring sync');
  return;
}
sessionStore.updateSessionGridItems(newGridItems);
```

### Pattern 2: LRU Cache Eviction for listGridCache
**What:** `listGridCache` in grid-store grows unboundedly. Need LRU with configurable max (recommend 15 lists).
**Implementation approach:**
```typescript
// Track access order
listGridCacheOrder: string[]; // most recent at end

function evictOldestCacheEntries(
  cache: Record<string, GridCacheEntry>,
  order: string[],
  maxSize: number
): { cache: Record<string, GridCacheEntry>; order: string[] } {
  const newOrder = [...order];
  const newCache = { ...cache };
  while (newOrder.length > maxSize) {
    const oldest = newOrder.shift()!;
    delete newCache[oldest];
  }
  return { cache: newCache, order: newOrder };
}
```

### Pattern 3: Completion Detection
**What:** Auto-show CompletionModal when `gridStatistics.isComplete` transitions to `true`.
**Where:** The `computeGridStatistics` function already calculates `isComplete` (matchedCount === total && total > 0). Need a React effect or Zustand subscription that watches this flag.
**Implementation approach:**
```typescript
// In the Match page component:
const isComplete = useGridStore(state => state.gridStatistics.isComplete);
const [showCompletionModal, setShowCompletionModal] = useState(false);

useEffect(() => {
  if (isComplete) {
    setShowCompletionModal(true);
  }
}, [isComplete]);
```

### Pattern 4: Item Loading Debug Chain
**What:** The item loading pipeline flows: User selects list -> `match-store.initializeMatchSession()` -> `sessionStore.syncWithList(listId, category)` -> `BacklogProvider` / `backlog-store` loads groups via API -> items appear in collection panel.
**Key investigation points:**
1. `useListStore.getState().currentList` -- is it populated when initializeMatchSession runs?
2. `sessionStore.syncWithList()` -- does it trigger backlog loading?
3. `backlog-store.fetchGroupsForCategory()` -- does the API call succeed?
4. `/api/top/groups` and `/api/top/groups/[id]/items` -- do they return data?
5. Are items being marked as "used" incorrectly, filtering them from available items?

### Anti-Patterns to Avoid
- **Calling getState() on unhydrated stores:** Always check `_hydrated` flag before cross-store writes
- **Unbounded cache growth:** Always pair persist with eviction strategy
- **Synchronous store mutation inside React render:** Use effects or event handlers, never inline
- **Direct require() for circular deps without lazy accessor:** Use `createLazyStoreAccessor` pattern

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop | Custom mouse event handling | @dnd-kit (already installed) | Accessibility, touch support, keyboard, pointer events |
| Grid ID parsing | String splitting on IDs | `extractGridPosition()`, `isGridReceiverId()`, `createGridReceiverId()` from transfer-protocol.ts | Already battle-tested utilities |
| Grid statistics | Manual counting in components | `computeGridStatistics()` in grid-store | Single source of truth, auto-computed on every grid change |
| Session persistence | Manual localStorage calls | Zustand persist middleware (already configured) | Handles serialization, hydration, migration |
| Store circular deps | Direct require() | `createLazyStoreAccessor` from `src/lib/stores/lazy-store-accessor.ts` | Retry logic, error handling, debug logging |

## Common Pitfalls

### Pitfall 1: Store Hydration Race Condition
**What goes wrong:** User drags an item immediately after page load. Grid-store processes the drag and calls `sessionStore.updateSessionGridItems()`, but session-store has not yet hydrated from localStorage. The sync silently fails, and the grid state is lost on next page load.
**Why it happens:** Zustand persist middleware hydrates asynchronously. Grid-store has no way to know if session-store is ready.
**How to avoid:** Add `_hydrated` flag to session-store, set it in `onRehydrateStorage`. Grid-store checks flag before syncing. If not hydrated, either defer or queue the sync.
**Warning signs:** Grid items appear after drag but disappear on page reload.

### Pitfall 2: localStorage Quota Exhaustion
**What goes wrong:** `listGridCache` grows with every list the user opens. After 50-100 lists, localStorage hits 5-10MB quota. Zustand persist silently fails to save. All subsequent session saves are lost.
**Why it happens:** No eviction policy on `listGridCache`.
**How to avoid:** Implement LRU eviction (15 entries). Check `navigator.storage.estimate()` as a warning threshold.
**Warning signs:** Console errors about storage quota; session data silently not persisting.

### Pitfall 3: GlobalSearchBar Deletion
**What goes wrong:** Git status shows `src/app/features/Landing/GlobalSearchBar.tsx` is DELETED in the working tree. If this was intentional, search (FLOW-07) needs an alternative. If accidental, it needs to be restored.
**Why it happens:** Likely part of a cleanup that went too far, or refactored into CommandPalette.
**How to avoid:** Check if search functionality was moved to CommandPalette (`src/app/features/CommandPalette/UniversalSearch.tsx`). If so, ensure it's accessible from the landing page.
**Warning signs:** No search bar visible on landing page.

### Pitfall 4: CompletionModal Action Button Mismatch
**What goes wrong:** The existing CompletionModal has 3 actions (Tweet, Export, Save). The user decided on 4 actions (Download result image, Share link, Keep editing, Start new ranking). The modal needs to be rewired.
**Why it happens:** The modal was built with different actions than what the phase requires.
**How to avoid:** Replace the current 3-action grid with the 4 specified actions. "Download" and "Share" can be visual stubs (disabled or showing "Coming in Phase 4").
**Warning signs:** Modal shows wrong buttons or missing "Keep editing" / "Start new ranking" options.

### Pitfall 5: TransferProtocol Already Cleaned Up
**What goes wrong:** The CONTEXT.md says "Remove deprecated TransferProtocol class (~500 lines of dead code)." But the current file is only 212 lines. The cleanup may have already happened in the working tree.
**Why it happens:** The working tree has uncommitted changes (git status shows `M src/lib/dnd/transfer-protocol.ts`).
**How to avoid:** Verify the current state of the file before planning cleanup tasks. Don't plan work that's already done.
**Warning signs:** Planning tasks for code that doesn't exist anymore.

### Pitfall 6: matching/ Directory Already Removed
**What goes wrong:** The CONTEXT.md mentions consolidating `matching/` vs `Match/`. But `src/app/features/matching/` does not exist.
**Why it happens:** May have been removed in uncommitted changes.
**How to avoid:** Verify before planning. Only plan cleanup for code that actually exists.

## Code Examples

### Grid Completion Detection (from grid-store.ts)
```typescript
// Source: src/stores/grid-store.ts
function computeGridStatistics(gridItems: GridItemType[]): GridStatistics {
  const matchedCount = gridItems.filter(item => item.matched).length;
  const total = gridItems.length;
  return {
    matchedCount,
    emptyCount: total - matchedCount,
    total,
    percentage: total > 0 ? Math.round((matchedCount / total) * 100) : 0,
    isComplete: matchedCount === total && total > 0,
  };
}
```

### Session Sync Path (from grid-store.ts)
```typescript
// Source: src/stores/grid-store.ts - every grid mutation calls this
const sessionStore = useSessionStore.getState();
sessionStore.updateSessionGridItems(newGridItems);
```

### Match Session Initialization (from match-store.ts)
```typescript
// Source: src/stores/match-store.ts lines 261-307
initializeMatchSession: async () => {
  set({ isLoading: true });
  try {
    const listStore = useListStore.getState();
    const sessionStore = useSessionStore.getState();
    const gridStore = useGridStore.getState();
    const currentList = listStore.currentList;

    if (!currentList) {
      matchLogger.warn('No current list available');
      return;
    }

    sessionStore.syncWithList(currentList.id, currentList.category);

    const activeSession = sessionStore.getActiveSession();
    if (activeSession && activeSession.gridItems.length > 0) {
      gridStore.loadFromSession(activeSession.gridItems, currentList.size);
    } else {
      gridStore.initializeGrid(currentList.size, currentList.id, currentList.category);
    }
  } catch (error) {
    matchLogger.error('Failed to initialize match session:', error);
  } finally {
    set({ isLoading: false });
  }
}
```

### Existing CompletionModal Actions (needs rewiring)
```typescript
// Source: src/components/app/modals/completion/CompletionModalActions.tsx
// Current: Tweet, Export (image), Save (stub)
// Needed: Download result image (stub), Share link (stub), Keep editing, Start new ranking
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| TransferProtocol class (657 lines) | Utility functions only (212 lines) | In working tree (uncommitted) | Cleanup already partially done |
| matching/ + Match/ dual directories | Match/ only | In working tree (uncommitted) | matching/ already removed |
| Unbounded listGridCache | Needs LRU eviction (this phase) | Phase 1 | Prevents localStorage quota failure |
| No hydration readiness gate | Needs _hydrated flag (this phase) | Phase 1 | Prevents silent sync failures |

## Open Questions

1. **Root cause of broken item loading**
   - What we know: Items do not load correctly into grid (STATE.md blocker). The pipeline is: list selection -> match-store.initializeMatchSession() -> sessionStore.syncWithList() -> backlog-store loads groups -> items appear in collection panel.
   - What's unclear: Where exactly the pipeline breaks. Could be API returning empty data, backlog-store not triggering fetch, items being filtered incorrectly, or hydration timing issue.
   - Recommendation: First task should be a diagnostic investigation with logging at each pipeline step.

2. **GlobalSearchBar status**
   - What we know: `GlobalSearchBar.tsx` shows as DELETED in git status. CommandPalette/UniversalSearch exists.
   - What's unclear: Whether search was intentionally moved to CommandPalette or accidentally deleted.
   - Recommendation: Check if CommandPaletteTrigger on the landing page provides search. If yes, FLOW-07 may already be covered. If no, restore or rewire.

3. **Category population counts**
   - What we know: Need a minimum item threshold for "active" vs "Coming soon" categories.
   - What's unclear: How many items each category currently has in the database.
   - Recommendation: Run a diagnostic query against `/api/top/groups` to count items per category before setting threshold.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright ^1.57.0 (E2E only; no unit test runner installed) |
| Config file | `playwright.config.ts` |
| Quick run command | `npx playwright test --project=chromium --grep "PATTERN"` |
| Full suite command | `npx playwright test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FLOW-01 | Backlog items load in collection panel | E2E | `npx playwright test e2e/list-play-journey.spec.ts -x` | Partial (file exists, may not cover this specifically) |
| FLOW-02 | Drag from backlog to grid works | E2E | `npx playwright test e2e/drag-drop-ranking.spec.ts -x` | Partial (file exists) |
| FLOW-03 | Completion modal shows when grid full | E2E | `npx playwright test e2e/ranking-completion.spec.ts -x` | No -- Wave 0 |
| FLOW-04 | Drag feels smooth (no lag/glitches) | manual-only | N/A -- visual/performance check | N/A |
| FLOW-05 | Save/resume after browser close | E2E | `npx playwright test e2e/session-persistence.spec.ts -x` | No -- Wave 0 |
| FLOW-06 | Browse lists by category | E2E | `npx playwright test e2e/list-play-journey.spec.ts -x` | Partial |
| FLOW-07 | Search for lists | E2E | `npx playwright test e2e/list-search.spec.ts -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx playwright test e2e/drag-drop-ranking.spec.ts e2e/list-play-journey.spec.ts -x`
- **Per wave merge:** `npx playwright test`
- **Phase gate:** Full Playwright suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `e2e/ranking-completion.spec.ts` -- covers FLOW-03 (completion modal shows, actions work)
- [ ] `e2e/session-persistence.spec.ts` -- covers FLOW-05 (save, reload, resume)
- [ ] Existing `e2e/drag-drop-ranking.spec.ts` and `e2e/list-play-journey.spec.ts` may need updates after fixes

*(Unit test infrastructure (Vitest) is NOT installed. Given coarse granularity mode and that existing E2E tests are the established pattern, recommend staying with E2E tests for Phase 1 validation. Unit tests are a Phase 5 requirement (PROD-01).)*

## Sources

### Primary (HIGH confidence)
- `src/stores/grid-store.ts` (1060 lines) -- grid state, drag-and-drop, persistence, statistics
- `src/stores/session-store.ts` (500 lines) -- session persistence, backlog management
- `src/stores/match-store.ts` (473 lines) -- match session orchestration
- `src/stores/registry.ts` -- store dependency graph and initialization order
- `src/stores/backlog/store.ts` -- backlog store with IndexedDB persistence
- `src/providers/BacklogProvider.tsx` -- backlog initialization and network sync
- `src/components/app/modals/completion/` -- existing CompletionModal components
- `src/app/features/Landing/` -- landing page components
- `.planning/codebase/CONCERNS.md` -- documented tech debt and known bugs
- `.planning/codebase/ARCHITECTURE.md` -- documented architecture and data flow
- `.planning/codebase/TESTING.md` -- documented test patterns and gaps

### Secondary (MEDIUM confidence)
- `.planning/codebase/STACK.md` -- technology versions and configuration

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries are already installed and in use, verified from package.json and source code
- Architecture: HIGH -- multi-store pattern, dependency graph, and data flow fully documented in codebase analysis and verified in source
- Pitfalls: HIGH -- store hydration race, localStorage quota, and broken item loading are documented in CONCERNS.md and verified in source code
- Completion flow: HIGH -- CompletionModal exists, gridStatistics.isComplete already computed, just needs wiring
- Landing page: MEDIUM -- FeaturedListsSection and search components exist but GlobalSearchBar deletion status needs verification

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable -- all findings based on existing codebase)
