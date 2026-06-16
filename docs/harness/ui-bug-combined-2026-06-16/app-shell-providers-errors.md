# App Shell, Providers & Errors — Combined UI+Bug Scan
> Context: Root layout, provider hierarchy, structured logging, and error boundaries/fallback pages wrapping the whole app.
> Files scanned: 16
> Total: 5 (Critical: 0, High: 2, Medium: 2, Low: 1)

## 1. ErrorBoundary analytics tracking silently no-ops because the tracker is never installed on the critical path
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: silent failure / error theater
- **File**: src/lib/errors/ErrorBoundary.tsx:99
- **Scenario**: A component throws and `ErrorBoundary.trackError` runs. It only fires analytics if `window.__GOAT_ERROR_TRACKER__` exists. That global is installed by `ErrorAnalytics.exposeGlobalTracker()` (error-analytics.ts:295), which only runs when `error-analytics.ts` is imported. That module is NOT imported by `layout.tsx`, `query-provider.tsx`, `DeferredProviders.tsx`, or any always-loaded shell file — it is only pulled in lazily by feature files (e.g. `CommandPalette.tsx`, `useCollection.ts`). If an error occurs before any of those features mount (e.g. an early render crash), `__GOAT_ERROR_TRACKER__` is undefined and the `if` guard quietly skips tracking.
- **Root cause**: The boundary depends on a side-effect global that is registered only as a transitive import of optional feature modules, not eagerly on app boot.
- **Impact**: Errors that happen on cold load / before feature hydration are caught and shown to the user but never recorded — the analytics dashboard under-counts exactly the most severe (early-boot) failures, giving false confidence in error rates.
- **Fix sketch**: Import `getErrorAnalytics()` once in the app shell (e.g. top of `layout.tsx` or `QueryProvider`) so the tracker is installed before any boundary can fire, or have `ErrorBoundary.trackError` call `trackError(...)` directly instead of probing a window global.

## 2. Route-level `error.tsx` never reports to analytics and duplicates a divergent fallback design
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: error handling / observability gap
- **File**: src/app/error.tsx:13
- **Scenario**: The App Router segment error boundary (`error.tsx`) calls only `Sentry.captureException(error)` and `console.error`. It does NOT call `trackError`/`__GOAT_ERROR_TRACKER__`, so segment-level render errors bypass the in-app `ErrorAnalytics` metrics entirely. Meanwhile the page also ships a parallel `global-error.tsx` with a different look (two buttons "Try again" + "Go Home", inline styles) versus `error.tsx`'s single "Try again" button using Tailwind tokens. The two fallbacks are inconsistent and `error.tsx` lacks a "Go Home" escape, so a user stuck on a route that keeps throwing on `reset()` has no navigation out.
- **Root cause**: Two independently authored fallbacks with no shared component, and analytics reporting wired only into Sentry rather than the project's own `ErrorAnalytics` pipeline.
- **Impact**: Split-brain error reporting (Sentry-only for routes, in-app analytics for components) makes `getErrorMetrics()` unreliable; users hitting a persistent route error can be trapped with no Home action.
- **Fix sketch**: In `error.tsx` also call `trackError({ code: 'CLIENT_UNKNOWN_ERROR', ... })`, add a "Go Home" link mirroring `global-error.tsx`, and extract one shared fallback component so both surfaces stay on-brand.

## 3. `DeferredProviders` requestAnimationFrame fallback leaks a timer and has a dead cleanup
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: edge-case / resource cleanup
- **File**: src/providers/DeferredProviders.tsx:33
- **Scenario**: On browsers without `requestIdleCallback` (Safari historically, some embedded webviews), the `else` branch schedules a `requestAnimationFrame` whose callback creates a `setTimeout` and `return`s a cleanup function. That returned function is swallowed by rAF (rAF ignores callback return values), so the inner `setTimeout` is never cleared. The effect's actual cleanup only does `cancelAnimationFrame(raf)`, which is a no-op once the rAF has already fired. If the component unmounts in the window between rAF firing and the 0ms timeout, `setReady(true)` runs on an unmounted component.
- **Root cause**: Misplaced cleanup `return` inside the rAF callback instead of from the `useEffect`; conflation of two scheduling primitives.
- **Impact**: Minor React "set state on unmounted component" warning and a small leaked timer on non-`requestIdleCallback` browsers; deferred providers may mount after navigation away.
- **Fix sketch**: Capture both ids in outer-scope variables and clear both from the single effect cleanup: `let raf, timer; raf = requestAnimationFrame(() => { timer = setTimeout(() => setReady(true), 0); }); return () => { cancelAnimationFrame(raf); clearTimeout(timer); };`.

## 4. Auth-error fallback "Sign In" sends users to the home page instead of authentication
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: misleading UX / broken affordance
- **File**: src/lib/errors/ErrorBoundary.tsx:420
- **Scenario**: When an authentication-category error is caught, `AuthRetryAction` renders a prominent gradient "Sign In" button. Clicking it runs `window.location.href = '/'` — it navigates to the landing page, not to a sign-in flow or modal. A user who hit a 401/session-expired error clicks "Sign In", lands on home still signed out, and must hunt for the auth entry point themselves. The `handleGoHome` action in the same file also points to `/`, so "Sign In" and "Go Home" are functionally identical despite different labels/styling.
- **Root cause**: Placeholder navigation (`/`) used as a stand-in for an actual auth trigger; the button label promises an action the handler doesn't perform.
- **Impact**: Auth recovery is a dead end — the highest-intent recovery button doesn't recover. Two visually distinct buttons do the same thing, eroding trust in the error UI.
- **Fix sketch**: Wire "Sign In" to the real auth entry (open the auth modal used by `AuthHeader`, or navigate to the sign-in route with a `?next=` return URL) so the label matches behavior.

## 5. Trace IDs and analytics sampling use `Math.random()` and unbounded in-memory event arrays
- **Severity**: low
- **Lens**: bug-hunter
- **Category**: data integrity / minor robustness
- **File**: src/lib/errors/GoatError.ts:120
- **Scenario**: `generateTraceId()` builds IDs from `Date.now()` + `Math.random().toString(36)` (8 chars). Under a burst of errors in the same millisecond (e.g. a render loop firing the boundary repeatedly, or a fan-out of failed prefetches in `PrefetchProvider`), collisions are statistically possible, making trace IDs non-unique for correlation. Separately, `error-analytics.ts` keeps events in a plain array trimmed to `maxEvents` (1000) but `flush()` filters by `includes()` over object identity (error-analytics.ts:258), an O(n²) scan, and the `setInterval` flush timer (error-analytics.ts:290) is never cleared on teardown since the singleton lives for the page lifetime.
- **Root cause**: Non-cryptographic ID generation and an identity-based array filter chosen for simplicity; singleton timer with no disposal path.
- **Impact**: Occasional duplicate trace IDs weaken debugging correlation; flush filtering degrades under high error volume. Low real-world severity given typical error counts.
- **Fix sketch**: Use `crypto.randomUUID()` (with a `Math.random` fallback) for trace IDs, and track flushed events by index/count or splice the sent slice rather than `includes()` over object references.
