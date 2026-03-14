# Phase 1: Core Ranking Flow - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the broken end-to-end ranking experience so users can pick a list, see backlog items load correctly, drag items to grid positions, complete a ranking, and save/resume progress. This phase also cleans up legacy code that blocks or complicates the core flow.

</domain>

<decisions>
## Implementation Decisions

### Completion Experience
- Auto-show CompletionModal when all grid positions are filled
- Modal offers 4 actions: Download result image, Share link, Keep editing (dismiss modal), Start new ranking (return to landing)
- "Download result image" and "Share link" buttons should be present but may be stubs in Phase 1 (actual implementation is Phase 4) — they should be visually present to validate the flow
- "Keep editing" dismisses the modal and returns to the grid for rearranging
- "Start new ranking" navigates back to landing page

### Landing Page Browse
- Featured + browse layout: hero section with featured/popular lists, then categorized browse sections below
- Categories with insufficient items shown but disabled with "Coming soon" tag (not hidden)
- Minimum item threshold for "active" category to be determined by Claude based on database audit
- Search via existing GlobalSearchBar should work for finding specific lists

### Legacy Code Cleanup
- Clean up deprecated code as part of fixing the core flow
- Remove deprecated TransferProtocol class (~500 lines of dead code in transfer-protocol.ts)
- Remove or consolidate matching/ vs Match/ duplicate features
- Clean up deprecated ListIntent compat helpers if they block the fix
- Add NODE_ENV !== 'production' guard to match-test debug page (don't delete, keep for dev use)

### Session Persistence
- Add LRU eviction to listGridCache — keep last 10-20 lists, evict oldest before persisting
- Prevents localStorage quota exhaustion for power users
- Add readiness gate: grid-store waits for session-store hydration before allowing drag operations
- Prevents silent sync failures when stores hydrate out of order

### Claude's Discretion
- Exact debugging approach for broken item loading (root cause unknown — needs investigation)
- LRU cache size (10 vs 20 lists)
- Minimum item threshold for showing categories as "active" vs "Coming soon"
- Loading skeleton design during backlog item loading
- Error state handling when item loading fails

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CompletionModal` (`src/components/app/modals/completion/`) — exists but action buttons are stubs, needs wiring
- `GlobalSearchBar` — exists in Landing feature, search works
- `LandingLayout` / `LandingMain` — existing landing page components to extend
- `createCategoryLogger` — use for debugging item loading issues
- `useHydrationSafe` hook — for SSR safety with persisted stores
- `ErrorBoundary` / `AsyncBoundary` — existing error boundary components

### Established Patterns
- Zustand stores with `persist` middleware for localStorage/IndexedDB
- Cross-store access via `useXStore.getState()` pattern
- Lazy store accessors (`createLazyStoreAccessor`) for circular deps
- `withErrorHandler` wrapper for all API routes
- `data-testid` attributes on interactive elements

### Integration Points
- `match-store.initializeMatchSession()` — entry point for the ranking flow
- `grid-store.handleDragEnd()` → `session-store.updateSessionGridItems()` — core sync path
- `BacklogProvider` → backlog-store — backlog item loading chain
- `/api/top/groups` and `/api/top/groups/[id]/items` — API endpoints for loading category items
- `stores/registry.ts` — store initialization order (must respect for readiness gate)

</code_context>

<specifics>
## Specific Ideas

- CompletionModal should feel celebratory — user just finished ranking, acknowledge that
- "Coming soon" disabled categories should build anticipation, not frustration
- Featured lists in the hero section should showcase the best-populated categories to give a strong first impression

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-core-ranking-flow*
*Context gathered: 2026-03-14*
