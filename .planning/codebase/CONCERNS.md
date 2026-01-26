# Codebase Concerns

**Analysis Date:** 2026-01-26

## Tech Debt

**Multiple Coordinated Zustand Stores Without Strict Sync Protocol:**
- Issue: The application uses 7+ coordinated Zustand stores (match-store, grid-store, session-store, comparison-store, use-list-store, item-store, backlog-store) that cross-reference each other using `getState()`. There is no formal transaction system ensuring all stores stay synchronized atomically.
- Files: `src/stores/match-store.ts`, `src/stores/grid-store.ts`, `src/stores/session-store.ts`, `src/stores/comparison-store.ts`
- Impact: If a drag-and-drop operation fails mid-way (e.g., after grid-store updates but before session-store syncs), the stores can become inconsistent. No rollback mechanism exists. The GridOrchestrator exists but is not universally used.
- Fix approach:
  1. Enforce transaction wrapper for all multi-store mutations
  2. Document store dependency graph in centralalized registry (`src/stores/registry.ts`)
  3. Add pre/post-sync validation hooks to catch inconsistencies early
  4. Consider event sourcing pattern for non-critical mutations

**Lazy Imports With Circular Dependency Workarounds:**
- Issue: Multiple stores use `createLazyStoreAccessor()` and `require()` at runtime to avoid circular dependencies (grid-store loading backlog-store, GlobalOrchestrator loading all stores). This is a code smell indicating the store architecture has tight coupling.
- Files: `src/stores/grid-store.ts` (lines 48-50), `src/lib/orchestration/GlobalOrchestrator.ts` (lines 50-70)
- Impact: Runtime module loading is error-prone and difficult to reason about. If a lazy-loaded store fails to load, the error may only surface when that action is triggered, not at app startup.
- Fix approach:
  1. Restructure stores into layers: UI stores (match, grid, comparison) → Session stores (session, item) → Data stores (backlog)
  2. Use explicit dependency injection instead of lazy loading
  3. Create store factory that initializes in correct order at app root

**Uncleared Timers and Intervals Throughout Codebase:**
- Issue: `setInterval` and `setTimeout` are used extensively but cleanup logic is inconsistent. Multiple locations use intervals without proper ref tracking or cleanup.
- Files: `src/providers/BacklogProvider.tsx` (line 119, 122), `src/stores/activity-store.ts` (line 145), `src/stores/task-store.ts` (line 443), `src/lib/offline/SyncEngine.ts` (line 397), `src/components/RichItemCard/MiniGallery.tsx` (line 62)
- Impact: Memory leaks accumulate over long sessions. Background sync, analytics, and auto-advance features may pile up multiple interval instances if components remount.
- Fix approach:
  1. Create `useInterval` hook with automatic cleanup
  2. Audit all `setInterval` calls and replace with hook
  3. Use `AbortController` for fetch-based polls
  4. Add memory profiling test to catch interval leaks

**Deprecated APIs and Legacy Code Patterns:**
- Issue: Multiple deprecated wrappers exist for backward compatibility (`transfer-validator.ts`, `composition-to-api.ts`, `collection.ts`, several type transformers). These are technical debt that complicates the codebase.
- Files: `src/lib/grid/transfer-validator.ts`, `src/types/list-intent-transformers.ts`, `src/lib/api/collection.ts`
- Impact: New developers are confused about which API to use. Maintenance burden increases with duplicated logic.
- Fix approach:
  1. Create deprecation timeline (e.g., remove in next major version)
  2. Add deprecation warnings to console in development
  3. Systematically migrate usages from deprecated to new API
  4. Remove deprecated code once migration is complete

## Known Bugs

**Race Condition in Item Assignment (Double-Drag):**
- Symptoms: Rapid double-clicking drag operations can cause the same item to be assigned to multiple grid positions if the first `markItemAsUsed()` call hasn't completed before the second drag starts.
- Files: `src/stores/grid-store.ts` (lines 68-87 define itemsBeingAssigned lock, but usage may not cover all race windows)
- Trigger: User performs quick consecutive drag operations on the same item while connection is slow
- Workaround: Lock is in place but needs verification that it covers the entire validation-assignment window
- Fix: Add integration tests for rapid drag sequences; verify itemLock acquisition timing

**Grid Position Indexing Off-by-One in UI Display:**
- Symptoms: Grid positions sometimes display as 0-based internally but 1-based in UI, causing confusion in validation messages and position display.
- Files: `src/stores/grid-store.ts`, `src/app/features/Match/` components
- Trigger: Occurs when position validation messages are logged or when custom position setters bypass the conversion layer
- Workaround: Comments in grid-store acknowledge this (lines 166-167)
- Fix: Create strict position abstraction that handles conversion at boundaries only

**Backlog Group Search Not Respecting Real-Time Updates:**
- Symptoms: When backlog groups are updated in one store, the local search in session-store doesn't reflect changes until full re-sync.
- Files: `src/stores/session-store.ts` (searchGroups function), `src/stores/backlog/actions-data.ts`
- Trigger: User adds new items to a group while maintaining search filter - results remain filtered on old data
- Workaround: Pressing refresh or switching lists forces re-sync
- Fix: Add watchers between backlog-store updates and session-store search cache invalidation

## Security Considerations

**Service Role Key Exposed in Client Code:**
- Risk: `SUPABASE_SERVICE_ROLE_KEY` is used directly in some API routes like `src/app/api/og/[listId]/route.tsx` (line 37) and `src/app/share/[code]/layout.tsx` (line 12). While these are server routes, any accidental client-side import could leak admin database access.
- Files: `src/app/api/og/[listId]/route.tsx`, `src/app/share/[code]/layout.tsx`, `src/app/share/[code]/page.tsx`
- Current mitigation: Routes are marked as server-only via `route.tsx`, but no build-time check prevents client-side usage
- Recommendations:
  1. Add lint rule to block `SUPABASE_SERVICE_ROLE_KEY` in `src/` directory (except API routes)
  2. Use environment variable prefixing to separate server-only vars (`SERVER_ONLY_*`)
  3. Document that service role keys must ONLY be used in `src/app/api/` routes
  4. Add secret scanning to CI/CD pipeline

**API Key Validation Mocked in Production:**
- Risk: `validateApiKey()` function in `src/lib/api/public-api.ts` (line 230) is a mock that always returns true with hardcoded keys. This means public API endpoints have no actual authentication.
- Files: `src/lib/api/public-api.ts` (lines 230-244)
- Impact: Any request with a header matching hardcoded API keys will be accepted. No rate limiting. Public endpoints are exposed to abuse.
- Recommendations:
  1. Implement real database-backed API key validation
  2. Add rate limiting with Redis or similar
  3. Add request signing/HMAC validation
  4. Log all API key usage for audit trails
  5. Rotate keys regularly

**No Input Sanitization on User-Generated Content:**
- Risk: Item titles, descriptions, and group names are stored and displayed without sanitization. XSS vulnerability possible if list items contain malicious HTML/JavaScript.
- Files: All API create/update endpoints (src/app/api/lists/*), collection components
- Current mitigation: React by default escapes text content, but rich text features may bypass this
- Recommendations:
  1. Validate and sanitize all string inputs with DOMPurify before storage
  2. Use Zod schemas with `.max()` and sanitization transforms
  3. Audit rich-text editor integrations for XSS vulnerabilities
  4. Add Content Security Policy headers

## Performance Bottlenecks

**1000+ Line Store Files (Grid and Ranking Stores):**
- Problem: `src/stores/grid-store.ts` (1008 lines), `src/stores/ranking-store.ts` (746 lines), `src/lib/orchestration/GlobalOrchestrator.ts` (1010 lines) are monolithic. Every action on these stores triggers re-renders of all subscribers.
- Files: `src/stores/grid-store.ts`, `src/stores/ranking-store.ts`, `src/lib/orchestration/GlobalOrchestrator.ts`
- Cause: No granular selector system. Components subscribe to entire store state, so any grid mutation (even unrelated items) causes re-render.
- Improvement path:
  1. Split stores by concern (grid + rendering, grid + persistence, grid + validation)
  2. Use Zustand's `subscribeWithSelector` to enable granular subscriptions
  3. Benchmark before/after: measure re-render counts and execution time
  4. Add React DevTools Profiler integration

**Inefficient Backlog Normalization/Denormalization:**
- Problem: Session-store maintains both normalized (`normalizedData`) and denormalized (`backlogGroups`) representations. Every denormalization is a full-tree traversal. Cache is single-entry.
- Files: `src/stores/session-store.ts` (lines 71-83), `src/stores/item-store/normalized-session.ts`
- Cause: Attempting to optimize storage while keeping UI-friendly format. Middle ground not achieved.
- Improvement path:
  1. Profile actual usage: how often is denormalization called?
  2. If frequent, implement multi-entry LRU cache
  3. If rare, just denormalize on demand (simpler code)
  4. Consider memoization at component level instead of store level

**No Pagination in Large Backlog Groups:**
- Problem: Collection components load entire backlog group (potentially 1000+ items) into VirtualizedCollectionGrid. No pagination or cursor-based loading.
- Files: `src/app/features/Collection/components/VirtualizedCollectionGrid.tsx`, `src/stores/backlog/actions-data.ts`
- Cause: Virtualization handles rendering but all items are in memory
- Improvement path:
  1. Implement cursor-based pagination in backlog API
  2. Load next batch only when user scrolls near end
  3. Keep max 3 batches in memory at once
  4. Add metrics to track batch load times

**Excessive useEffect Dependencies Causing Render Cascades:**
- Problem: Many useEffect hooks in backlog-related code use broad dependencies (`[state]`, `[backlogGroups]`) causing chain reactions of re-renders.
- Files: `src/providers/BacklogProvider.tsx`, `src/stores/backlog/store.ts`
- Cause: Defensive programming but overly broad
- Improvement path:
  1. Audit useEffect dependency arrays with ESLint plugin
  2. Extract stable dependencies into useCallback/useMemo
  3. Split effects into finer-grained dependencies

## Fragile Areas

**Drag & Drop State Management:**
- Files: `src/stores/grid-store.ts`, `src/app/features/Match/MatchGrid/lib/dragHandlers.ts`, `src/lib/dnd/`
- Why fragile: Multiple handlers (grid-store.handleDragEnd, dragHandlers, transfer-protocol) are loosely coordinated. The item lock mechanism (`itemsBeingAssigned`) is a Set in module scope without cleanup. Tests for edge cases (rapid drags, network failures during transfer) are minimal (34 test files total for 762 source files = ~4% coverage ratio).
- Safe modification:
  1. Add comprehensive drag-drop scenario tests before changing handlers
  2. Use state machine pattern for drag lifecycle (idle → dragging → validating → assigned)
  3. Document the full flow: DragEnd → grid-store.handleDragEnd → backlog-store.markItemAsUsed → session-store.updateSessionGridItems
- Test coverage gaps: No tests for concurrent drag operations, network timeouts during drag, or store inconsistency recovery

**Multi-Store Session Persistence:**
- Files: `src/stores/session-store.ts`, `src/lib/offline/OfflineStorage.ts`, `src/lib/offline/SyncEngine.ts`
- Why fragile: Session data is saved to IndexedDB and localStorage in separate operations. If app crashes between saves, different stores may be out of sync. IndexedDB quota can be silently exceeded.
- Safe modification:
  1. Add session integrity checks on app startup
  2. Implement transaction log for offline operations
  3. Monitor quota usage and gracefully degrade
- Test coverage gaps: No tests for quota exhaustion, IndexedDB corruption, or multi-tab sync conflicts

**Offline Mode Sync Queue:**
- Files: `src/stores/backlog/actions-offline.ts` (line 72 TODO), `src/lib/offline/SyncEngine.ts`
- Why fragile: TODO comment at line 72 indicates API calls to persist offline changes to backend are not implemented. Users think data is synced but it's only local.
- Safe modification:
  1. Complete the backend sync API
  2. Add confirmation UI when syncing offline queue
  3. Handle merge conflicts if local changes conflict with server state
- Test coverage gaps: No integration tests for offline-to-online transition

## Scaling Limits

**Grid Size Hard Cap at 50:**
- Current capacity: Max 50 positions per ranking (defined in grid-store.ts)
- Limit: Grid component uses fixed-size array. Renders all 50 slots even if user only wants top 10. Memory footprint grows linearly.
- Scaling path:
  1. Make grid size dynamic based on list configuration
  2. Only render visible slots (virtualization on grid itself, not just backlog)
  3. Lazy-load position data as user drags to new areas

**Image Loading Unbounded in Backlog:**
- Current capacity: All items in group loaded with image URLs, images loaded on-demand
- Limit: No image caching policy. Network requests spike on large groups. No CDN integration mentioned.
- Scaling path:
  1. Implement image request deduplication and caching
  2. Use adaptive image quality based on device/network (adaptive-loader.ts has infrastructure)
  3. Add CDN with image optimization (srcset generation)
  4. Implement progressive image loading (placeholder → low quality → high quality)

**Session Store Normalized Data Unbounded:**
- Current capacity: Entire backlog for all categories can be stored in normalized format
- Limit: No pruning strategy. Long-term sessions accumulate memory.
- Scaling path:
  1. Implement LRU cache with size limits on normalizedData
  2. Lazy-load categories on demand
  3. Periodically prune unused category data
  4. Monitor heap size and alert when approaching limits

## Dependencies at Risk

**Clerk Authentication (Planned Migration to Supabase Auth):**
- Risk: Project documentation mentions planned migration away from Clerk but code still uses Clerk extensively. Migration is incomplete.
- Impact: Dual authentication systems may exist in production. Clerk-specific code may become unmaintained.
- Migration plan:
  1. Audit all Clerk imports across codebase
  2. Create Supabase Auth equivalents for each Clerk endpoint
  3. Add feature flags to toggle auth providers
  4. Migrate users incrementally
  5. Remove Clerk code once all users migrated

**Next.js Image Optimization Disabled:**
- Risk: `next.config.js` has `images: { unoptimized: true }`. This disables Next.js Image component optimization, negating the benefit of using `<Image>` over `<img>`.
- Impact: No automatic WebP conversion, srcset generation, or lazy loading. Image payload is larger.
- Alternative: Use external image optimization service or re-enable Next.js optimization

**ESLint Disabled at Build Time:**
- Risk: `tsconfig.json` has `ignoreDuringBuilds: true` for ESLint. Linting errors don't fail the build.
- Impact: Lint violations can slip to production. CI/CD pipeline should catch these, but if CI is weak, technical debt accumulates.
- Recommendation: Re-enable ESLint in builds, fix violations, then enforce in CI

## Missing Critical Features

**No Data Validation Schema Enforcement:**
- Problem: API responses from Supabase are not validated against schemas. If backend schema changes, front-end can silently accept invalid data.
- Blocks: Confidence in data integrity, ability to detect schema drift early
- Implementation: Add Zod schemas for all API response types, validate at network boundary

**No Error Recovery UI:**
- Problem: When operations fail (failed drag, sync error, API timeout), error messages exist but no automatic retry or clear recovery path for users.
- Blocks: Users confused about whether data was saved, can't easily recover from failed operations
- Implementation: Add retry logic with exponential backoff, show retry button in error UI

**No Audit Trail for Rankings:**
- Problem: No record of when/how items were moved in grid. Users can't see history of changes.
- Blocks: Collaborative features, ability to revert changes, accountability
- Implementation: Add audit log store, log all grid mutations, provide UI to view/restore versions

## Test Coverage Gaps

**Drag & Drop System (Critical, High Risk):**
- What's not tested: Concurrent drag operations, drag during network failure, rapid drag/drop sequences, drag with invalid items
- Files: `src/stores/grid-store.ts`, `src/app/features/Match/MatchGrid/lib/dragHandlers.ts`
- Risk: The most complex user interaction has minimal test coverage. Race conditions or edge cases could corrupt grid state silently.
- Priority: **HIGH** - Add integration tests for drag scenarios before adding new drag features

**Multi-Store State Consistency (Critical):**
- What's not tested: Verifying that grid-store, session-store, backlog-store remain in sync after operations; rollback on partial failures
- Files: `src/stores/`, `src/lib/orchestration/`
- Risk: Store desynchronization could cause data loss or duplicate items
- Priority: **HIGH** - Add invariant checks and consistency tests

**Offline Mode (High):**
- What's not tested: Offline-to-online transitions, sync queue merging, conflict resolution, quota exhaustion
- Files: `src/lib/offline/`, `src/stores/backlog/actions-offline.ts`
- Risk: Users may lose data during offline transitions or sync failures
- Priority: **HIGH** - Add integration tests for offline scenarios

**Error Handling in API Routes (Medium):**
- What's not tested: API error responses, validation failures, service key leaks, malformed inputs
- Files: `src/app/api/`
- Risk: Silent failures or information leaks in error messages
- Priority: **MEDIUM** - Add API unit tests with error scenarios

**Performance & Memory (Medium):**
- What's not tested: Large backlog groups (1000+ items), long-running sessions, memory leak detection, timer cleanup
- Files: All stores, all components with setInterval/setTimeout
- Risk: Performance degradation in production, memory exhaustion
- Priority: **MEDIUM** - Add performance benchmarks and memory profiling tests

---

*Concerns audit: 2026-01-26*
