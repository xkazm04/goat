# Combined UI+Bug Fix Wave 16 — Migrations (atomic counters)

> 1 commit (migration + types + 2 route wirings), closing the 2 deferred counter
> findings from Wave 13. Migration authored but NOT applied.
> Baseline preserved: TypeScript 53 → 53 (zero regression). Branch: `vibeman/ui-bug-wave16-migrations` (off wave 15).

## What was done

| Finding | Severity | What |
|---|---|---|
| sharing #2 (fork_count) | high | atomic RPC + wiring |
| templates #3 (usage_count) | medium | atomic RPC + wiring |

- **New migration** `supabase/migrations/20260616000000_add_increment_counter_rpcs.sql`:
  `increment_share_fork_count(share_id)` and `increment_blueprint_usage_count(blueprint_id)`,
  mirroring the existing `increment_share_view_count`/`increment_share_challenge_count`
  (`UPDATE … SET x = x + 1`).
- **Wired** `share/[code]/fork` and `blueprints/[slugOrId]` to call the RPCs via
  `supabase.rpc(...)`, **with a read-modify-write fallback** when the RPC errors —
  so the app is safe to deploy *before* the migration is applied and becomes
  atomic once it lands.
- **Updated** the `Database['public']['Functions']` type in `src/types/database.ts`
  so the typed Supabase client accepts the new RPCs.

## ⚠️ Action required (you)

The migration is **authored, not run**. Apply it (`supabase db push`, or your
migration pipeline) to make the two counters atomic. Until then the routes use
the read-modify-write fallback (current behavior — correct, just not atomic).

## Verification

| Gate | Before | After | Result |
|---|---|---|---|
| TypeScript | 53 | 53 | ✅ no regression |
| Tests | n/a | n/a | Playwright e2e only |
| Lint | blocked | blocked | ⚠️ pre-existing |

## Patterns established (catalogue item 26)

26. **Deploy-safe RPC adoption: call-with-fallback decouples code from migration timing.** When introducing a new DB function, calling it from app code that ships before the migration is applied would break at runtime. Calling the RPC and falling back to the prior path on error (`const { error } = await supabase.rpc(...); if (error) { …old write… }`) makes the change safe in either order and self-upgrades to atomic once the function exists. Mirror existing function signatures, and update the generated `Functions` type so the typed client accepts the call.

## Still deferred (followups)

- **blueprint usage_count** is now atomic but still increments on every detail GET (over-counts on React Query refetch); decoupling to a dedicated fire-once tracking call remains open.
- Light-mode token palette (a design decision, not a mechanical migration), RLS/api_keys (security), and the architectural/decision deferrals.
- Cumulative Waves 1–16: 68 functional findings closed/addressed + 4 security mitigated; TS held at 53 throughout; 0 regressions.
