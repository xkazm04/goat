# supabase/migrations

The ordered schema chain the Supabase CLI applies to the project database,
one file per step, in filename order, each step once (the CLI keeps the
ledger in `supabase_migrations.schema_migrations`). Every statement a step
has shipped is history: fix a shipped step by appending a corrective one, not
by editing it — the two edits of 2026-09-05 (guards in `20260315000002`,
`author_id TEXT` in `20251205000000`) are the documented exception, each a
no-op on a database that already ran the step.

## What the chain assumes is already there

This chain does **not** bootstrap the database. Step one
(`20250124000000_create_challenges_system.sql`) already references
`public.lists`, and nothing here creates it. A database has to carry these
before the chain can start:

| object | where it is defined |
| --- | --- |
| `lists`, `items`, `item_groups`, `list_items` | `db/*.sql` (hand-exported DDL, not a migration) |
| `db/migrations/001_add_list_type.sql` | `lists.type`, `lists.description` |
| `users` | nowhere in this tree — created outside the lane; `lists.user_id` references it |
| `category_enum`, `extensions.uuid_generate_v4()` | nowhere in this tree |
| `update_updated_at_column()`, `rerank_list_items()` | `db/*.sql` triggers name them; only the first is defined in-tree (step one) |
| `auth.users`, `auth.uid()`, `auth.role()` | Supabase's own schema |

There is no `supabase/config.toml`, so `supabase db reset` is not configured
for this repo. A fresh database is currently built by hand: `db/*.sql`, then
`db/migrations`, then this chain.

## Two roads, one schema

`db/*.sql` and this chain are two authorities for the schema. Production got
its base tables from the first road and everything else from the second;
a fresh environment has to walk both. Where the two disagree, production
wins and the chain is corrected to converge on it — that is what the
`chain.test.ts` predicates below hold.

## What `chain.test.ts` pins

`npm test` runs `supabase/migrations/chain.test.ts`, a static read of every
step in order (there is no Postgres in the test environment). It refuses:

- a policy or trigger name re-created on a table without a `DROP … IF EXISTS`
  in between (a fresh replay aborts at that step — measured 4 on 2026-09-05);
- two `CREATE TABLE IF NOT EXISTS` definitions of one table that disagree on a
  column (whichever step ran first decides the shape — measured 1);
- a `SELECT *` view whose base table gained a column after the view was
  created (the view does not have it — measured 2, `/api/search` group search
  returned `[]` on the error);
- a table the application `.from()`s that no SQL in the tree creates
  (measured 1: `ranking_submissions`, written by the public v1 API);
- a `SECURITY DEFINER` function without `SET search_path` and an explicit
  `REVOKE … FROM PUBLIC` (measured 1: `replace_list_items`, callable by anon).

The instrument this test stands in for is a real replay: build a database
from `db/*.sql` + this chain and diff its schema against production. That
needs a Postgres (docker, `supabase start`, or `psql`) and is the next step
for this directory; see the sweep backlog.

## Access model, so nobody "fixes" it by accident

The server reaches Postgres with the **anon key** and the caller's cookies
(`src/lib/supabase/server.ts`), so row-level security binds on every API
route, and most callers carry no Supabase session (`auth.uid()` is NULL).
That is why so many policies read `USING (true)`: they are what lets the app
write at all. Replacing them with `auth.uid()` predicates is not a hardening
step, it is an authentication-model change (see `user_preferences`, whose
`auth.uid()::text` policies make it unreachable for the app as it stands).

## Objects with no caller in the tree (measured 2026-09-05)

Tables: `challenges`, `challenge_entries`, `user_stats`, `user_preferences`,
`ai_generated_images`, `ranking_aggregates` — created, never queried by
`src/`. Functions: `get_or_create_user_preferences`,
`increment_ai_image_download_count`, `increment_ai_image_share_count`
(`update_challenge_ranks` has no caller in `src/` but is PERFORMed by the
`award_badges_for_entry` trigger). Dropping any of them deletes data or a possible
out-of-tree caller, so that is a human decision, not a sweep's.
