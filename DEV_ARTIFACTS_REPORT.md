# Development Artifacts Report

Systematic sweep of `src/` for dev-only code paths. Generated 2026-03-19.

---

## 1. console.log / console.debug (non-error, non-warn)

**High Priority — remove or replace with structured logger**

| # | File | Line | Statement |
|---|------|------|-----------|
| 1 | `src/providers/prefetch-provider.tsx` | 64 | `console.log('[PrefetchProvider] Initialized')` |
| 2 | `src/providers/BacklogProvider.tsx` | 38 | `console.log('🌐 Network status: ...')` |
| 3 | `src/providers/BacklogProvider.tsx` | 51 | `console.log('💾 BacklogProvider: Persisting ...')` |
| 4 | `src/providers/BacklogProvider.tsx` | 68 | `console.log('🔄 BacklogProvider: Found cached data ...')` |
| 5 | `src/providers/BacklogProvider.tsx` | 77 | `console.log('📊 BacklogProvider: Total cached groups ...')` |
| 6 | `src/providers/BacklogProvider.tsx` | 96 | `console.log('🌐 App is online - syncing data')` |
| 7 | `src/providers/BacklogProvider.tsx` | 110 | `console.log('🌐 App is offline - using cached data')` |
| 8 | `src/providers/BacklogProvider.tsx` | 127 | `console.log('📊 BacklogCoalescer Stats:', ...)` |
| 9 | `src/providers/BacklogProvider.tsx` | 163 | `console.log('🔄 BacklogProvider: User returned ...')` |
| 10 | `src/lib/virtual/ScrollPositionManager.ts` | 154 | `console.log('[ScrollPositionManager]', ...args)` |
| 11 | `src/lib/utils/request-coalescer.ts` | 239 | `console.log('[...logPrefix] ...')` |
| 12 | `src/lib/providers/gemini.ts` | 46 | `console.log('[Gemini] recommendation_complete', ...)` |
| 13 | `src/lib/storage/indexed-db-storage.ts` | 30 | `console.log('IndexedDB not available ...')` |
| 14 | `src/lib/personalization/useABTesting.ts` | 209 | `console.log('[A/B Test] Impression: ...')` |
| 15 | `src/lib/personalization/useABTesting.ts` | 223 | `console.log('[A/B Test] Conversion: ...')` |
| 16 | `src/lib/personalization/useABTesting.ts` | 289 | `console.log('[A/B Test] Override: ...')` |
| 17 | `src/lib/stores/lazy-store-accessor.ts` | 69 | `console.log('✅ LazyStoreAccessor: ... initialized')` |
| 18 | `src/components/app/ProgressMain.tsx` | 31 | `console.log('Progress calculation:', ...)` |
| 19 | `src/lib/cache/query-cache-config.ts` | 94 | `console.log('[QueryCache] ✅ ...')` |
| 20 | `src/lib/cache/query-cache-config.ts` | 112 | `console.log('[MutationCache] ✅ ...')` |
| 21 | `src/lib/cache/query-cache-config.ts` | 206 | `console.log('[QueryCache] Invalidated by event ...')` |
| 22 | `src/lib/cache/query-cache-config.ts` | 227 | `console.log('[QueryCache] Invalidated by tags ...')` |
| 23 | `src/lib/cache/query-cache-config.ts` | 246 | `console.log('[QueryCache] Invalidated by prefix ...')` |
| 24 | `src/lib/cache/query-cache-config.ts` | 266 | `console.log('[Coalescing] Reusing in-flight ...')` |
| 25 | `src/stores/dev-sync-assertions.ts` | 162 | `console.log('[Store Sync] Dev-mode drift assertions enabled')` |
| 26 | `src/lib/prefetch/PrefetchManager.ts` | 145 | `console.log('[PrefetchManager]', ...args)` |
| 27 | `src/lib/prefetch/HoverPrefetcher.ts` | 209 | `console.log('[HoverPrefetcher] Slow prefetch trigger ...')` |
| 28 | `src/app/goat/page.tsx` | 79 | `console.log('✅ Using cached list ...')` |
| 29 | `src/app/goat/page.tsx` | 102 | `console.log('✅ Using fresh list data ...')` |
| 30 | `src/app/goat/page.tsx` | 129 | `console.log('✅ Synced with backend ...')` |
| 31 | `src/lib/orchestration/GlobalOrchestrator.ts` | 676 | `console.log('🔄 Rolled back transaction ...')` |
| 32 | `src/lib/orchestration/GlobalOrchestrator.ts` | 921 | `console.log('🎯 Command: ...')` |
| 33 | `src/lib/orchestration/GlobalOrchestrator.ts` | 927 | `console.log('✅ Success: ...')` |
| 34 | `src/lib/orchestration/GlobalOrchestrator.ts` | 929 | `console.log('❌ Failed: ...')` |
| 35 | `src/lib/api/CircuitBreaker.ts` | 424 | `console.log('[CircuitBreaker] ...')` (gated by dev check) |
| 36 | `src/lib/api/wiki-images.ts` | 56,82,91,95 | Multiple `console.log('⚠️/✅ Wikipedia ...')` |
| 37 | `src/lib/api/request-timing.ts` | 55 | `console.log(...)` request timing |
| 38 | `src/lib/errors/error-notification-store.ts` | 142,188 | `console.log('📢 Suppressed ...')` / notification log |
| 39 | `src/lib/errors/error-analytics.ts` | 145 | `console.log('📊 Error tracked:', ...)` |
| 40 | `src/lib/errors/api-error-handler.ts` | 127 | `console.log('ℹ️ API Info:', ...)` |
| 41 | `src/lib/offline/` (multiple files) | various | ~30 `console.log` calls across OfflineStorage, NetworkMonitor, SyncEngine, QuotaManager, sessionStoreIntegration |
| 42 | `src/lib/embed/WidgetAnalytics.ts` | 245 | `console.log('[Widget Analytics]', event)` |
| 43 | `src/app/features/Awards/AwardList.tsx` | 144,170 | `console.log('🏆 Awarding ...')` / `console.log('📋 Added ...')` |
| 44 | `src/app/features/Match/components/ResultImageDownload.tsx` | 150 | `console.log('Embedding metadata:', meta)` |
| 45 | `src/app/features/Match/sub_MatchGrid/components/TierListView.tsx` | 404 | `console.log('Open item detail:', ...)` |
| 46 | `src/app/features/FilterBuilder/index.tsx` | 88 | `console.log('Applied filter config:', ...)` |
| 47 | `src/app/features/Match/lib/resultCache.ts` | 47,58,103,130,132,174,208,232 | Multiple ResultCache log calls |
| 48 | `src/hooks/use-item-groups.ts` | 247-248 | `console.log('Sync groups/items - to be implemented')` |
| 49 | `src/hooks/useScreenCapture.ts` | 91 | `console.log('Screenshot saved as ...')` |
| 50 | `src/lib/hooks/useLoadingStateMachine.ts` | 224,310 | State transition and progress debug logs |
| 51 | `src/lib/dnd/operations/DragResultHandler.ts` | 254 | `console.log(notification)` |
| 52 | `src/lib/logger/debug-config.ts` | 143-252 | ~15 console.log calls (debug system itself) |
| 53 | `src/components/theme/theme-provider.tsx` | 27,37 | `console.info(...)` theme logs |
| 54 | `src/lib/enrichment/EnrichmentPipeline.ts` | 236,280 | `console.log('[EnrichmentPipeline] ...')` |

**Server-side API route logs (lower priority — not visible to users but noisy):**

| # | File | Line | Statement |
|---|------|------|-----------|
| 55 | `src/app/api/studio/generate/route.ts` | 168,205,223,242,254,298,384,419,505,584 | ~10 structured log calls |
| 56 | `src/app/api/studio/match-items/route.ts` | 75,96,99,105 | Match result logging |
| 57 | `src/app/api/studio/save-items/route.ts` | 63 | Results summary |
| 58 | `src/app/api/studio/find-youtube/route.ts` | 110 | Completion log |
| 59 | `src/app/api/studio/find-image/route.ts` | 40,84,108,152,166 | Image search logging |
| 60 | `src/app/api/lists/featured/route.ts` | 146 | JSON log |
| 61 | `src/app/api/embed/analytics/route.ts` | 36 | Analytics event log |
| 62 | `src/app/api/consensus/submit/route.ts` | 67 | Ranking submission log |
| 63 | `src/app/api/sync/route.ts` | 56,59 | Sync output logs |
| 64 | `src/app/api/batch/route.ts` | 506 | Batch log |
| 65 | `src/app/api/admin/search-image/route.ts` | 23,32 | Search/result logs |

---

## 2. console.warn (review — some are legitimate runtime warnings)

| # | File | Line | Notes |
|---|------|------|-------|
| 1 | `src/lib/dnd/unified-protocol.ts` | 331,352 | Legacy grid ID warnings (dev-gated ✓) |
| 2 | `src/lib/dnd/transfer-protocol.ts` | 206 | Dev-gated ✓ |
| 3 | `src/lib/validation/validation-authority.ts` | 563 | Unconditional warn |
| 4 | `src/lib/personalization/usePersonalization.ts` | 80 | Error fallback (keep) |
| 5 | `src/lib/personalization/InterestTracker.ts` | 125,274,379 | Error fallbacks (keep) |
| 6 | `src/lib/perf/perfTimer.ts` | 30 | Slow perf warning (keep/gate) |
| 7 | `src/stores/dev-sync-assertions.ts` | 56,75,121 | Dev-only assertions (gated ✓) |
| 8 | `src/lib/api/client.ts` | 48,191 | API client warnings |
| 9 | `src/lib/api/goat-api.ts` | 215 | Circuit breaker warn |
| 10 | `src/lib/cache/query-cache-config.ts` | 192 | Missing invalidation rules |
| 11 | `src/app/api/generate-ai-image/route.ts` | 234,322 | **"falling back to mock"** — see §6 |

---

## 3. console.debug

| # | File | Line |
|---|------|------|
| 1 | `src/lib/dnd/operations/SwapOperation.ts` | 64 |
| 2 | `src/lib/dnd/operations/MoveOperation.ts` | 67 |
| 3 | `src/lib/dnd/operations/DragOperationRouter.ts` | 408, 440 |
| 4 | `src/lib/dnd/operations/AssignOperation.ts` | 259 |
| 5 | `src/lib/perf/perfTimer.ts` | 32 |
| 6 | `src/lib/filters/SmartQueryParser.ts` | 318 (dev-gated ✓) |
| 7 | `src/app/features/Collection/hooks/useCollection.ts` | 41 |

---

## 4. @ts-ignore / @ts-expect-error

| # | File | Line | Reason |
|---|------|------|--------|
| 1 | `src/lib/virtual/PerformanceMonitor.tsx` | 216,218 | Chrome memory API |
| 2 | `src/app/features/Collection/lib/adaptiveLoader.ts` | 148,159,202,252 | Browser-specific APIs (deviceMemory, WebGL, Network Info, Memory) |
| 3 | `src/lib/layout/constants.ts` | 298 | IE msMaxTouchPoints |

**Assessment:** All 7 are for non-standard browser APIs — acceptable but could be improved with proper type augmentations.

---

## 5. localhost / hardcoded URLs

| # | File | Line | Code |
|---|------|------|------|
| 1 | `src/app/achievement/[code]/page.tsx` | 15 | `process.env.NEXT_PUBLIC_APP_URL \|\| 'http://localhost:3000'` |
| 2 | `src/app/api/achievement/share/route.ts` | 21 | `process.env.NEXT_PUBLIC_APP_URL \|\| 'http://localhost:3000'` |
| 3 | `src/app/achievement/[code]/embed/page.tsx` | 34 | `process.env.NEXT_PUBLIC_APP_URL \|\| 'http://localhost:3000'` |

**Risk:** If `NEXT_PUBLIC_APP_URL` is not set in production, these silently fall back to localhost.

---

## 6. Mock / fallback to mock in production

| # | File | Line | Issue |
|---|------|------|-------|
| 1 | `src/app/api/generate-ai-image/route.ts` | 234 | `console.warn('REPLICATE_API_TOKEN not set, falling back to mock')` |
| 2 | `src/app/api/generate-ai-image/route.ts` | 322 | `console.warn('OPENAI_API_KEY not set, falling back to mock')` |
| 3 | `src/types/ai-images.ts` | 10 | `AIProvider` type includes `'mock'` variant |
| 4 | `src/types/user-preferences.ts` | 62,97 | `preferred_ai_provider` includes `'mock'` |

**Risk:** Production can silently serve mock AI images if env vars are missing.

---

## 7. Dev-only files & modules

| # | File | Notes |
|---|------|-------|
| 1 | `src/app/dev-css-var-check.ts` | CSS variable contract check — dev-gated at import site ✓ |
| 2 | `src/stores/dev-sync-assertions.ts` | Store drift assertions — dev-gated ✓ |
| 3 | `src/components/dev/PrefetchAnalytics.tsx` | Dev analytics component — has runtime guard ✓ |
| 4 | `src/lib/logger/debug-config.ts` | Debug logging system — has production guard but exposes `window.goatDebug` |

---

## 8. process.env.NODE_ENV checks (potential dev leaks)

| # | File | Line | Pattern | Risk |
|---|------|------|---------|------|
| 1 | `src/providers/query-provider.tsx` | 14-18 | Lazy-loads ReactQueryDevtools in dev | **Low** — lazy import, tree-shaken in prod |
| 2 | `src/lib/cache/query-cache-config.ts` | 81 | `isDev` enables verbose cache logging | **Med** — logs run unconditionally if check fails |
| 3 | `src/stores/backlog/store.ts` | 229 | Exposes store on `window` in non-prod | **Med** — leaks internal state |
| 4 | `src/lib/hooks/useLoadingStateMachine.ts` | 209 | `DEBUG_STATE_TRANSITIONS` in dev | **Low** — gated correctly |
| 5 | `src/app/features/Collection/hooks/useCollection.ts` | 28 | `isDev` flag for debug logging | **Low** — gated correctly |
| 6 | `src/lib/errors/ErrorNotificationToast.tsx` | 118 | Shows extra error details in dev | **Low** — gated correctly |
| 7 | `src/stores/backlog/store.ts` | 146 | Non-prod console output | **Low** |
| 8 | `src/lib/filters/SmartQueryParser.ts` | 317 | Non-prod debug log | **Low** |

---

## 9. TODO / FIXME / stub implementations

| # | File | Line | Comment |
|---|------|------|---------|
| 1 | `src/hooks/use-item-groups.ts` | 245-248 | `syncGroups: async () => console.log('Sync groups - to be implemented')` |
| 2 | `src/app/features/Collection/components/CollectionErrorBoundary.tsx` | 74 | `// TODO: In production, send to monitoring service` |

---

## 10. ReactQueryDevtools

| # | File | Line | Notes |
|---|------|------|-------|
| 1 | `src/providers/query-provider.tsx` | 14-32 | Lazy-loaded in dev only — **previously fixed** per commit `ea00101` |

---

## Summary by priority

### P0 — Fix before production
- [ ] **Localhost fallbacks** (§5, 3 files) — will break in prod if env var missing
- [ ] **Mock fallbacks in AI image generation** (§6) — serves fake data in prod silently
- [ ] **Stub implementations** (§9 #1) — `syncGroups`/`syncItems` are no-ops logging to console

### P1 — Should fix
- [ ] **~60 unconditional console.log calls in client code** (§1 #1-54) — visible in user browser console
- [ ] **Store exposed on window in non-prod** (§8 #3) — dev convenience leaked
- [ ] **console.log in production error tracking** (§1 #38-40) — noisy, replace with proper telemetry

### P2 — Nice to clean up
- [ ] **~15 API route console.log calls** (§1 #55-65) — server-side only, replace with structured logger
- [ ] **console.debug calls** (§3) — 7 occurrences, harmless but noisy
- [ ] **console.warn review** (§2) — some legitimate, some should be error-tracked
- [ ] **@ts-ignore/@ts-expect-error** (§4) — 7 occurrences, all justified but could use type augmentations
- [ ] **TODO comments** (§9 #2) — monitoring integration reminder
