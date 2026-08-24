# Combined UI+Bug Fix Wave 5 — Security (gated): safe partial hardening

> 4 commits, 4 security criticals **partially** hardened (stopgaps). The robust
> fixes need new infra (api_keys table), guest-token identity, and RLS migrations
> — escalated to the user, who chose "safe partial hardening only". Real fixes
> tracked in `followups-2026-06-16.md` (SECURITY section).
> Baseline preserved: TypeScript 53 → 53 (zero regression). Branch: `vibeman/ui-bug-wave5-sec` (off wave 4).

## Escalation (why these are stopgaps, not fixes)

All four criticals trace to two missing pieces: (a) **no `api_keys` table** (the
public-API key validator is an explicit mock; agent-bridge has no auth) and (b)
**guest identity = unverifiable client UUID** (the app trusts client `user_id`/
`guest_id` because guests have no server session), compounded by RLS `USING(true)`
on most tables. Robust remediation = migrations + a guest-token scheme + RLS — a
security design task, not a fix-wave, and not safe to attempt unverified (no
tests) in an automated sweep. The user approved app-layer stopgaps only.

## Commits

| # | Commit | Finding | Stopgap | Files |
|---|---|---|---|---|
| 1 | `491022e` | public-api #1 — mock key accepts any string | env-gated `GOAT_API_KEYS` allowlist | `public-api.ts` |
| 2 | `fbd974c` | bookmarks #1 — IDOR via trusted user_id | authed cross-user guard (guest-safe) | `bookmarks/route.ts` |
| 3 | `e81116b` | auth #1 — merge-guest trusts guest_id | UUID-format validation | `merge-guest/route.ts` |
| 4 | `2d2a43a` | public-api #2 — agent-bridge no auth | env-gated `AGENT_BRIDGE_SECRET` bearer | `require-secret.ts` + 3 routes |

## What each stopgap does (and doesn't)

1. **Public API key allowlist.** When `GOAT_API_KEYS` is set, only listed keys are
   accepted (`GOAT_API_KEYS_PRO` grants pro tier); unset → permissive dev fallback
   preserved. **Closes** accept-any-key in production *once configured*. **Doesn't**
   provide issuance/revocation/per-key tiers — needs an api_keys table.

2. **Bookmarks cross-user guard.** When a real Supabase session exists, the caller
   may only touch their own `user_id`, and folder/bookmark-id ops verify row
   ownership. **Closes** the IDOR for authenticated users. **Doesn't** protect the
   guest case (guests have no verifiable identity) — needs guest tokens + RLS.

3. **merge-guest UUID validation.** Rejects malformed/injection `guest_id`.
   **Doesn't** close the core IDOR (an authed user can still pass another guest's
   real UUID) — needs server-issued guest tokens.

4. **Agent-bridge bearer secret.** When `AGENT_BRIDGE_SECRET` is set, every
   agent-bridge endpoint requires `Authorization: Bearer <secret>`; unset →
   unchanged. **Closes** open access *once configured*. **Doesn't** give per-agent
   identity — shared secret only. (Note: the scan's "unbounded store / DoS" claim
   was overstated — `TaskMemoryManager` already enforces `maxTasks` + cleanup.)

## Verification

| Gate | Before | After | Result |
|---|---|---|---|
| TypeScript | 53 | 53 | ✅ no regression |
| Tests | n/a | n/a | Playwright e2e only |
| Lint | blocked | blocked | ⚠️ pre-existing |

All stopgaps are env-gated or session-conditional, so dev behavior and the guest
flow are unaffected; each is labeled a stopgap in-code with a pointer to the real
fix. **Production action required:** set `GOAT_API_KEYS` (+`_PRO`) and
`AGENT_BRIDGE_SECRET`, or those two surfaces keep permissive dev behavior.

## Patterns established (catalogue item 15)

15. **Gate, don't guess, on security.** When a vuln's real fix needs new infra
    (identity tables, RLS migrations) or an architectural decision (guest-trust
    model), escalate with options — never ship an unverified auth refactor in an
    automated sweep. Where a safe, behavior-preserving stopgap exists (env-gated
    allowlist, authed-only guard), land it labeled as a stopgap with the real fix
    tracked; a wrong "fix" either locks out legitimate users or fakes security.

## What remains

- The 4 security criticals are now **mitigated, not closed** — full remediation is
  the SECURITY section of `followups-2026-06-16.md`.
- Non-security: themes T4 NaN, T5 a11y, T3 counters, T8 wrong-source, T10 theming,
  T11 mobile, T12 leaks + the deferred Wave-2 items.
- Cumulative Waves 1–5: 19 functional findings closed + 4 security mitigated; TS held at 53 throughout; 0 regressions.
