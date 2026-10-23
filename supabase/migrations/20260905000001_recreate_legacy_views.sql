-- Re-create the two legacy-name views so they carry every column their base
-- tables have TODAY.
--
-- Postgres expands `SELECT *` when a view is CREATED, not when it is read.
-- 20260315000002 created top_items / top_groups over items / item_groups;
-- 20260322000001 then added items.tags and item_groups.item_count. Neither
-- view saw those columns, so `/api/search` selecting `item_count` through
-- top_groups (src/app/api/search/route.ts) fails on every group search and
-- the route's `if (error) return []` turns the failure into an empty result.
--
-- CREATE OR REPLACE VIEW may only append columns, which is exactly what
-- re-expanding `*` does here. Replay-safe: the statement is idempotent.
-- Pinned by supabase/migrations/chain.test.ts ("a SELECT * view is re-created
-- after its base table last gained a column"): any future ADD COLUMN on items
-- or item_groups without a later re-creation of its view goes red.

CREATE OR REPLACE VIEW public.top_items AS
  SELECT * FROM public.items;

CREATE OR REPLACE VIEW public.top_groups AS
  SELECT * FROM public.item_groups;
