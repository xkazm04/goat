# Authentication & User Accounts — Combined UI+Bug Scan
> Context: Supabase-backed auth (Google OAuth) with guest sessions, sign-in modal/menu, and guest→registered-user data merge.
> Files scanned: 16
> Total: 5 (Critical: 1, High: 2, Medium: 1, Low: 1)

## 1. merge-guest trusts an attacker-supplied guest_id — IDOR / data theft
- **Severity**: critical
- **Lens**: bug-hunter
- **Category**: authorization / broken trust boundary
- **File**: src/app/api/auth/merge-guest/route.ts:27-64
- **Scenario**: Any authenticated user POSTs `{ "guest_id": "<victim-uuid>" }`. The route verifies only that the *caller* is logged in (line 19-22); it never verifies the caller ever owned that guest UUID. It then runs `UPDATE ... SET user_id = <caller.id> WHERE user_id = <victim-uuid>` on `lists`, `shared_rankings`, and `list_collections`.
- **Root cause**: The guest identity is a client-held localStorage UUID with no server-side proof of ownership, yet the route treats any value the client sends as the caller's own prior guest id. RLS does not save it: `list_collections` policies are `USING (true)` / `WITH CHECK (true)` (migration 20260315000001:28-42) and `shared_rankings` UPDATE allows `user_id IS NULL OR user_id = auth.uid()` — so reassigning rows that currently belong to *another* guest (anon/NULL or arbitrary uuid) succeeds.
- **Impact**: A logged-in user can claim/steal another guest's lists, shared rankings, and collections, or scrape-and-reassign en masse. This is silent data theft and cross-account data loss for the victim.
- **Fix sketch**: Bind guest identity to something the server can verify — e.g. issue the guest UUID in a signed httpOnly cookie at creation and read `guest_id` from that cookie on the server instead of the request body, or require a short-lived signed guest token. At minimum, tighten RLS so UPDATE only matches rows whose `user_id` equals a server-verified prior identity, never an arbitrary client-supplied id.

## 2. Guest→user merge runs once per mount but localStorage upgrade is global — repeat sign-ins skip merge, and a fresh tab can lose data
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: race condition / state lifecycle
- **File**: src/hooks/use-auth-user.ts:45-71; src/hooks/use-temp-user.ts:43-53
- **Scenario**: On SIGNED_IN, `upgradeToRegisteredUser(user.id)` overwrites `temp_user_id` in localStorage with the real id and flips `is_temp_user=false` *unconditionally, even if the merge fetch failed* (line 64-66 comment says so explicitly). If the network/merge POST errors, the guest's original UUID is permanently destroyed in localStorage, so a retry is impossible and the guest rows stay orphaned forever. Separately, `hasMergedRef` is a per-component-instance ref; if a second tab/component already flipped the flag, `isTempUser` is false and the merge guard `if (!tempUserId || !isTempUser) return` (line 47) silently skips, but the user_id in localStorage now equals user.id so future guest rows created before sign-in are never reconciled.
- **Root cause**: Merge success and identity-upgrade are coupled the wrong way — identity is upgraded regardless of merge outcome, and there is no persisted "merge pending/failed" marker, so failures are unrecoverable.
- **Impact**: Permanent guest data loss on any merge failure (offline, 500, RLS denial); no retry path. This is the core promise ("Your guest rankings have been linked") quietly breaking.
- **Fix sketch**: Only call `upgradeToRegisteredUser` after the merge response is `ok`; on failure, keep the old guest UUID and a `merge_pending` flag, and retry on next load. Persist the merged-real-id check in localStorage rather than relying solely on an in-memory `hasMergedRef`.

## 3. AuthModal "success" toast and auto-close fire on ANY pre-existing session, not on a real sign-in
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: incorrect success signaling / UX correctness
- **File**: src/components/auth/AuthModal.tsx:37-47
- **Scenario**: The effect closes the modal and shows "Welcome! Your guest rankings have been linked to your account." whenever `isAuthenticated && wasOpenRef.current`. But OAuth is a full-page redirect (`signInWithOAuth`, actions.ts:148) — the modal never observes the transition in-page. Conversely, if an already-authenticated user's `AuthModal` ever mounts open (e.g. AuthPrompt path, or a transient re-auth), the toast claiming guest data was linked fires even though no merge happened. The displayed message is also a hard-coded claim of success that is decoupled from the actual merge result in finding #2.
- **Root cause**: Success is inferred from the boolean `isAuthenticated` rather than from an actual sign-in/merge event, and the OAuth redirect model makes the "completion" effect dead code on the happy path while misfiring on edge paths.
- **Impact**: Users see a false "rankings linked" confirmation that may be untrue (merge failed or never ran), eroding trust; the intended in-modal loading→success feedback never actually plays for Google OAuth.
- **Fix sketch**: Drive the toast off a real signal — detect the post-redirect landing (`?code` exchanged in callback, or a one-shot SIGNED_IN event flag) and report the actual merge result instead of asserting success unconditionally.

## 4. No error UI in the sign-in flow — OAuth failures and the callback `auth_error=true` redirect are silently dropped
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: missing error/feedback state
- **File**: src/components/auth/AuthModal.tsx:49-56; src/app/auth/callback/route.ts:30
- **Scenario**: `handleSignIn` catches the OAuth error and only resets `isSigningInRef` (line 53-55) — no message, no toast, the button just returns to idle. The callback route redirects failures to `/?auth_error=true`, but no in-scope component reads `auth_error` to surface anything. A user whose OAuth is cancelled or fails lands back on home with zero feedback and a modal that looks like nothing happened.
- **Root cause**: The auth surfaces only model loading and success states; the error branch of `useSupabaseAuth` (`error` in index.ts:57) is never consumed by the modal, and the `auth_error` query param has no handler.
- **Impact**: Failed/cancelled sign-ins are invisible; users retry blindly or assume the feature is broken. Common, high-traffic path with no recovery affordance.
- **Fix sketch**: Render an inline error row in AuthModal bound to the hook's `error` state, and on mount detect `?auth_error=true` (strip it from the URL) to show a toast like "Sign-in didn't complete — try again."

## 5. `isSigningInRef` is a ref, so "Redirecting…" label and disabled state never re-render
- **Severity**: low
- **Lens**: ui-perfectionist
- **Category**: state-management / loading-state polish
- **File**: src/components/auth/AuthModal.tsx:27,118,140
- **Scenario**: The button text (`isSigningInRef.current ? 'Redirecting...' : 'Continue with Google'`) and `disabled={isLoading || isSigningInRef.current}` read a `useRef`. Mutating `isSigningInRef.current = true` in `handleSignIn` does not trigger a re-render, so between the click and the actual browser redirect the button shows no "Redirecting…" feedback and is not visibly disabled, allowing a double-click that fires `signInWithOAuth` twice.
- **Root cause**: A value that must drive rendered output (label + disabled) was stored in a ref instead of `useState`, defeating React's render cycle.
- **Impact**: No visible loading affordance on the primary CTA; brief double-submit window. Minor but it's the app's main auth button.
- **Fix sketch**: Convert `isSigningInRef` to `useState` (`const [isSigningIn, setIsSigningIn] = useState(false)`) so the label, disabled state, and re-render stay in sync; keep the ref only if a non-rendering guard is also needed.
