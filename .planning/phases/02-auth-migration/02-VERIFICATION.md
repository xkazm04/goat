---
phase: 02-auth-migration
verified: 2026-03-14T23:00:00Z
status: human_needed
score: 5/5 must-haves verified (automated checks pass)
human_verification:
  - test: "Google OAuth sign-in completes end-to-end"
    expected: "Clicking 'Continue with Google' in AuthModal redirects to Google, completes OAuth, returns to app with session established, and triggers the 'Welcome! Your rankings are saved.' toast"
    why_human: "Real Google OAuth cannot be verified programmatically — requires a browser, Google credentials, and a configured Supabase OAuth provider"
  - test: "Session persists across browser refresh"
    expected: "After signing in via Google OAuth, refreshing the page keeps the user authenticated (avatar still visible in header, no redirect to guest state)"
    why_human: "Cookie-based session persistence requires a running server and real browser environment to verify"
  - test: "Guest-to-user merge on sign-up"
    expected: "Rankings completed as a guest are accessible after signing up — rows in lists, shared_rankings, list_collections tables updated to new user.id"
    why_human: "Merge correctness requires real Supabase DB access and an actual OAuth sign-in transition"
  - test: "Guest can rank without any auth gate"
    expected: "New incognito session can open the app, select a list, drag items to grid, and complete a ranking — no sign-in required at any step"
    why_human: "AUTH-01 guest mode end-to-end requires browser flow; middleware configuration has no route protection but this needs visual confirmation"
---

# Phase 2: Auth Migration Verification Report

**Phase Goal:** Supabase Auth replaces Clerk so user identity is correct before any data ownership is assigned
**Verified:** 2026-03-14T23:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | useAuthUser() returns a userId for both guests and authenticated users | VERIFIED | Hook exists at `src/hooks/use-auth-user.ts` (100 lines). `userId = user?.id ?? tempUserId` — always defined. Imports `useSupabaseAuth` and `useTempUser`. Returns userId, isAuthenticated, isGuest, isLoading, signInWithGoogle, signOut. |
| 2 | Supabase middleware refreshes session tokens without blocking guest access | VERIFIED | `src/middleware.ts` uses `createServerClient` from `@supabase/ssr`, calls `supabase.auth.getUser()` for token refresh. No route protection — all requests pass through. Matcher excludes static assets correctly. |
| 3 | OAuth callback route exchanges code for session successfully | VERIFIED | `src/app/auth/callback/route.ts` exists with GET export. Reads `code` param, calls `exchangeCodeForSession(code)`, redirects to `next` param on success, `/?auth_error=true` on failure. |
| 4 | No Clerk imports remain anywhere in the codebase | VERIFIED | Grep for `clerk\|@clerk\|svix` across `src/**/*.ts` and `src/**/*.tsx` returns zero functional import matches. Only `clerk_id` column name literals in `src/types/database.ts` (mirror of live DB schema — documented decision). `use-clerk-user.ts` and `api/webhooks/clerk/route.ts` both deleted. Root-level `middleware.ts` (Clerk) deleted. `@clerk/nextjs` and `svix` uninstalled from package.json. |
| 5 | User sees a sign-in modal and UserMenu wired into the app | VERIFIED | `AuthHeader`, `AuthModal`, `UserMenu`, `AuthPrompt`, `Toaster` all exist in `src/components/auth/`. `src/app/layout.tsx` imports `AuthHeader` and `Toaster` from `@/components/auth` and renders them at root. AuthPrompt wired into `SimpleMatchGrid.tsx` — shows after ranking completion when `isGuest` is true. |

**Score:** 5/5 truths verified (automated checks)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/hooks/use-auth-user.ts` | Unified auth hook combining Supabase auth + guest identity | VERIFIED | 100 lines. Exports `useAuthUser`. Imports `useSupabaseAuth` and `useTempUser`. Returns unified userId + signInWithGoogle + signOut. Guest merge logic on SIGNED_IN event. |
| `src/middleware.ts` | Supabase session refresh middleware | VERIFIED | 47 lines. Uses `createServerClient` from `@supabase/ssr`. Calls `getUser()` (not getSession). Correct matcher pattern. |
| `src/app/auth/callback/route.ts` | OAuth code exchange endpoint | VERIFIED | 30 lines. Exports `GET`. Reads `code` param, calls `exchangeCodeForSession`. Redirect logic correct. |
| `src/app/api/auth/merge-guest/route.ts` | Guest-to-user data merge endpoint | VERIFIED | 73 lines. Exports `POST`. Authenticates caller via `getUser()`. Updates `lists`, `shared_rankings`, `list_collections` tables. Returns `{ merged: true }`. |
| `src/components/auth/AuthModal.tsx` | Google OAuth modal overlay | VERIFIED | 152 lines (exceeds min_lines: 40). Google SVG icon, loading state, escape/backdrop dismiss, auto-close with welcome toast. |
| `src/components/auth/AuthPrompt.tsx` | Post-completion dismissible sign-up nudge | VERIFIED | 111 lines (exceeds min_lines: 20). sessionStorage dismissal tracking. Opens AuthModal on click. |
| `src/components/auth/UserMenu.tsx` | Avatar dropdown with sign-out | VERIFIED | 126 lines (exceeds min_lines: 25). Shows avatar or fallback initial. Dropdown with sign-out action. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/hooks/use-auth-user.ts` | `src/hooks/supabase-auth/` | `useSupabaseAuth` import | WIRED | Line 4: `import { useSupabaseAuth } from '@/hooks/supabase-auth'`. Used at line 20. |
| `src/hooks/use-auth-user.ts` | `src/hooks/use-temp-user.ts` | `useTempUser` import | WIRED | Line 5: `import { useTempUser } from '@/hooks/use-temp-user'`. Used at line 28. |
| `src/middleware.ts` | `@supabase/ssr` | `createServerClient` | WIRED | Line 1: `import { createServerClient } from '@supabase/ssr'`. Used at line 14. |
| `src/components/auth/AuthModal.tsx` | `src/hooks/use-auth-user.ts` | `signInWithGoogle` | WIRED | Line 6 import, `signInWithGoogle` called in `handleSignIn` callback at line 49. |
| `src/components/auth/AuthPrompt.tsx` | `src/components/auth/AuthModal.tsx` | Opens AuthModal on click | WIRED | Line 6 import, `AuthModal` rendered at line 108. |
| `src/components/auth/UserMenu.tsx` | `src/hooks/use-auth-user.ts` | `signOut` | WIRED | Line 6 import, `signOut` called in `handleSignOut` at line 32. |
| `src/app/layout.tsx` | `src/components/auth` | `AuthHeader` + `Toaster` | WIRED | Line 12 import, both rendered in layout body at lines 104 and 110. |
| `src/app/features/Match/sub_MatchGrid/SimpleMatchGrid.tsx` | `src/components/auth` | `AuthPrompt` + `useAuthUser` | WIRED | Lines 35-36 imports. `AuthPrompt` rendered at line 520 when `isComplete && isGuest`. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AUTH-01 | 02-01, 02-02 | User can start ranking without creating an account (guest mode) | VERIFIED | Middleware has no route protection. `useAuthUser` returns guest UUID for unauthenticated users. AuthHeader shows "Sign in" button without blocking. AuthPrompt only appears after completion, is dismissible. |
| AUTH-02 | 02-01 | User can sign up with email/password via Supabase Auth | VERIFIED (with override) | Explicitly overridden to Google-only per documented user decision in `02-CONTEXT.md`, `02-RESEARCH.md`, and `02-02-PLAN.md`. Google OAuth satisfies this requirement. `useSupabaseAuth` retains email/password capability in `actions.ts` but UI intentionally exposes only Google OAuth. NEEDS HUMAN to confirm Google OAuth works end-to-end. |
| AUTH-03 | 02-01, 02-02 | User can sign up with Google OAuth via Supabase Auth | VERIFIED (code) | `signInWithGoogle` calls `signInWithOAuth('google')` in `useAuthUser`. AuthModal wired to call it. `/auth/callback` route handles code exchange. NEEDS HUMAN to verify real OAuth flow. |
| AUTH-04 | 02-01, 02-02 | User session persists across browser refresh | VERIFIED (code) | `@supabase/ssr` middleware refreshes tokens on every request via cookie exchange. `useSupabaseAuth` calls `getSession()` on init. NEEDS HUMAN to verify across actual browser refresh. |
| AUTH-05 | 02-01, 02-02 | Guest rankings sync to user account after sign-up | VERIFIED (code) | `useAuthUser` calls `/api/auth/merge-guest` on `SIGNED_IN` event when `tempUserId !== user.id`. Merge endpoint updates `lists`, `shared_rankings`, `list_collections`. Then calls `upgradeToRegisteredUser(user.id)`. NEEDS HUMAN to verify actual data migration. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/api/share/analytics/route.ts` | 18 | `const shareEvents: ShareEvent[] = []` (in-memory store) | Info | Pre-existing — not introduced by this phase. Share analytics uses in-memory array, not DB. Does not affect auth correctness. |

No auth-specific anti-patterns found. No TODO/FIXME in any auth files. No stubs or placeholder returns. All handlers perform real work.

### Human Verification Required

#### 1. Google OAuth End-to-End

**Test:** Run `npm run dev`, open the app, click "Sign in" in the header, click "Continue with Google" in the modal, complete the Google OAuth flow in the browser.
**Expected:** Redirect back to app, "Welcome! Your rankings are saved." toast appears, avatar appears in header replacing the "Sign in" button.
**Why human:** Real Google OAuth requires browser, Google credentials, and configured Supabase OAuth provider in Supabase dashboard.

#### 2. Session Persistence

**Test:** After completing Google OAuth sign-in above, refresh the page (F5).
**Expected:** User remains authenticated — avatar still visible in header, no guest state flash.
**Why human:** Cookie-based session persistence requires real server + browser environment to verify.

#### 3. Guest-to-User Data Merge

**Test:** As a fresh guest (incognito), complete a ranking. Then click "Sign in" and complete Google OAuth. Check that the previously completed ranking now belongs to the signed-in account.
**Expected:** Data from guest session (lists, shared_rankings) is now owned by the authenticated user.
**Why human:** Requires real Supabase DB + real OAuth transition to verify row updates.

#### 4. Guest Mode End-to-End

**Test:** Open a fresh incognito window, navigate to the app, select a list, drag items to the grid, and complete the ranking — without signing in at any step.
**Expected:** Full ranking flow completes with no sign-in required. AuthPrompt appears after completion but is dismissible.
**Why human:** While middleware has no route protection and code confirms it, full flow confirmation requires browser.

### Gaps Summary

No implementation gaps were found. All automated checks pass.

The `human_needed` status reflects that four behaviors require a live browser + real Google OAuth credentials to confirm, which is standard for OAuth authentication systems. The code infrastructure is fully in place:

- Zero Clerk references in source (only legacy DB schema column names)
- All 4 infrastructure artifacts exist and are substantive
- All 3 UI components exist and are substantive
- All key links are wired (imports + usage verified)
- All challenge API routes (21 `getUser()` calls verified) use Supabase auth pattern
- AUTH-02 override is documented in 3 planning files — Google OAuth satisfies the requirement per explicit user decision

---
_Verified: 2026-03-14T23:00:00Z_
_Verifier: Claude (gsd-verifier)_
