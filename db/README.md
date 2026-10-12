# db/ — core-table DDL and the game-catalogue seed scripts

This directory is **not** the migrations lane. Schema evolution lives in
`supabase/migrations/` (18 files, applied by the Supabase CLI). What lives here:

| Path | What it is | Runs where |
| --- | --- | --- |
| `items.sql`, `item_groups.sql`, `lists.sql`, `list_items.sql` | Dashboard-style dumps of the four core tables as they stood before the migrations lane existed. The only in-tree DDL for these tables. | A fresh database, by hand — see prerequisites |
| `migrations/001_add_list_type.sql` | Adds `lists.type` (`top` \| `award`) and `lists.description`. Predates `supabase/migrations/`; **not** tracked by the CLI. | After the four core tables |
| `seeds/002_awards_seed.sql` | The "Game Awards 2025" parent list and five award child lists (fixed UUIDs, `ON CONFLICT (id) DO UPDATE`). | After `001_add_list_type.sql` |
| `scripts/seed-yearly-games.js` | 21 "Top 10 Games of <year>" lists (2005-2025), 630 items, default top-10 rankings, optional Wikipedia covers. Re-runnable. | Node, against a database |
| `scripts/seed-games-list.js` | Mock voters, three 50-item child lists and fabricated consensus/activity rows under one parent list. **Not re-runnable** (inserts users and lists unconditionally) and **destructive** (overwrites `view_count` on every games item with `RANDOM()`). | Node, against a database |
| `scripts/fetch-game-images.js` | Fills `items.image_url` from Wikipedia for games missing one. | Node, against a database |
| `scripts/update_games_images.sql` | Paints the 55 local covers in `public/games/` onto items by exact name. | psql |
| `scripts/connection.js` | The one door the three Node scripts use to reach a database (below). | — |

## Running the Node scripts

```bash
node --env-file=.env db/scripts/seed-yearly-games.js               # insert data only
node --env-file=.env db/scripts/seed-yearly-games.js --with-images # + Wikipedia covers
node --env-file=.env db/scripts/fetch-game-images.js [--lists-only]
node --env-file=.env db/scripts/seed-games-list.js
```

- `DATABASE_URL` (or `SUPABASE_DB_URL`) **must** be set. The scripts never embed
  a credential; until 2026-09-05 they did (removed in the sweep, commit
  `2b5d40a`; the exposed pooler password must be rotated in the Supabase
  dashboard — that is a human step this repo cannot take).
- A host other than `localhost` / `127.0.0.1` / `::1` is refused unless
  `DB_SCRIPTS_ALLOW_REMOTE=1` is set — the same guard as `npm run seed:e2e`
  (`E2E_SEED_ALLOW_REMOTE`). Every script here writes.
- `db/scripts/no-committed-credentials.test.ts` walks this directory and
  refuses any URL that carries a password in its userinfo; `db/scripts/connection.test.ts`
  pins both doors.

## Prerequisites the tree does not provide

`db/schema-prerequisites.test.ts` scans every `.sql` under `db/` and
`supabase/migrations/` and asserts that each referenced function, type and
table is defined in-tree **or** listed there with a reason. Today three are
external, so **a fresh database cannot be built from this tree alone**:

| Name | Needed by | Where it actually lives |
| --- | --- | --- |
| `category_enum` | `items`, `item_groups`, `lists` columns | Created in the Supabase dashboard; labels not recorded in-tree |
| `users` | `lists_user_id_fkey`, five migrations, both seeds | Auth-era table; `scripts/seed-e2e.ts` upserts `{ id, username, display_name, external_id, password }` into it |
| `rerank_list_items()` | `trigger_rerank_list_items` on `list_items` | The live database only; `20260322000001_schema_hardening.sql` mentions it in a comment |

`update_updated_at_column()` is defined by
`supabase/migrations/20250124000000_create_challenges_system.sql`, so the
apply order on an empty database is: that migration's function, the
prerequisites above, then `items.sql` → `item_groups.sql` → `lists.sql` →
`list_items.sql` → `migrations/001_add_list_type.sql` → the rest of
`supabase/migrations/` → `seeds/002_awards_seed.sql`.

`002_awards_seed.sql` also needs a `users` row with id
`00000000-0000-0000-0000-000000000000`; nothing creates it.

## Known divergences (recorded, not fixed here)

- `lists_size_check` allows `1..100`; the API enforces `GRID_LIMITS`
  `5..50` (`src/lib/grid/constants.ts`). Two authorities for one rule; the
  tighter one is the code's.
- Three seeded titles name two different games each — *God of War*
  (2005/2018), *Prey* (2006/2017), *Bayonetta* (2009/2010) — and collide on
  the `(name, category, subcategory)` key.
- Wikipedia cover fetching is implemented three times: here in
  `seed-yearly-games.js` and `fetch-game-images.js` (different endpoints), and
  in `src/lib/api/wiki-images.ts`.
- The scripts connect with `ssl: { rejectUnauthorized: false }`.
