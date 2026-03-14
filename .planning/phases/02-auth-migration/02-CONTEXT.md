# Phase 2: Auth Migration - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace Clerk with Supabase Auth so user identity is correct before any data ownership is assigned. Guest mode must work end-to-end. Users can rank without an account, sign up with Google OAuth, and have guest rankings automatically linked to their new account.

</domain>

<decisions>
## Implementation Decisions

### Guest-to-user transition
- Anonymous UUID stored in localStorage tracks guest identity
- On sign-up, all rows tagged with the guest UUID are silently auto-merged to the new Supabase user_id — no prompt, no friction
- Guests have full access — no limits, no sign-up gates. Sign-up is optional and only needed for future social/sharing features
- Single-device only — no cross-device recovery for guest rankings (cross-device sync is v2, SOCL-03)

### Sign-up/sign-in experience
- Auth UI is a modal overlay — user stays in context, can dismiss and continue as guest
- Sign-up prompt triggered after first completed ranking (dismissible nudge, not blocking)
- Plus a persistent sign-in button in the header/nav for user-initiated auth at any time
- Combined single form: enter email or click Google. Toggle between sign-in/sign-up modes within the same modal
- After successful sign-up: modal closes, "Welcome! Your rankings are saved." toast notification, user stays on same page

### Migration cutover strategy
- Big bang removal — abstract auth behind useAuthUser() hook first, then swap ClerkProvider for Supabase Auth in one go
- useAuthUser() hook is Supabase-aware — exposes Supabase session, tokens, and auth methods directly (no provider abstraction layer)
- Delete Clerk webhook route entirely
- Create user_id_mapping table to map old Clerk IDs to new Supabase IDs, with a migration script for existing data
- Complete removal of @clerk/nextjs, svix, and all Clerk-related imports across the codebase

### Auth providers & methods
- Google OAuth only — no email/password (overrides AUTH-02, simplifies auth to single provider)
- Custom-styled Google button matching app design language (Google icon + "Continue with Google" text)
- Simple sign-out via user avatar dropdown in header — signs out and returns to landing as guest, rankings stay in localStorage

### Claude's Discretion
- Exact middleware implementation for Supabase Auth session handling
- user_id_mapping table schema and migration script approach
- Toast notification implementation (use existing Radix toast or new approach)
- Auth modal component structure and animations
- How to handle edge cases (e.g., Google account already linked to different guest UUID)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hooks/useSupabaseAuth.ts` and `src/hooks/supabase-auth/` — partial Supabase Auth implementation already started
- `src/lib/supabase/client.ts` and `server.ts` — Supabase client already configured
- `src/hooks/use-clerk-user.ts` — current Clerk integration (to be replaced)
- `@radix-ui/react-toast` — already installed for toast notifications
- `src/hooks/use-temp-user.ts` — may contain guest/temp user logic to build on

### Established Patterns
- Zustand stores with `persist` middleware — auth state could follow same pattern
- Cross-store access via `useXStore.getState()` — useAuthUser() can use this
- `withErrorHandler` wrapper on all API routes — auth middleware should integrate with this
- Provider hierarchy in `layout.tsx`: ClerkProvider wraps everything (will become Supabase provider)

### Integration Points
- `src/app/layout.tsx` — ClerkProvider replacement point (root of app)
- `src/app/api/webhooks/clerk/route.ts` — to be deleted
- 20+ API routes reference userId/currentUser — all need auth source update
- `src/hooks/use-clerk-user.ts` — consumers need to switch to useAuthUser()
- `src/stores/session-store.ts` — guest UUID generation/storage could live here or new auth store

</code_context>

<specifics>
## Specific Ideas

- Auth modal should feel lightweight — not a full-page takeover. User just finished ranking something exciting, don't kill the momentum with a heavy sign-up form
- "Continue with Google" is the primary (and only) CTA — one button, minimal friction
- The post-completion nudge should feel like a suggestion, not a gate: "Sign up to save this to your profile" with easy dismiss

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-auth-migration*
*Context gathered: 2026-03-14*
