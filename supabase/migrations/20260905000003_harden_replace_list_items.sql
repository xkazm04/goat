-- Harden the one SECURITY DEFINER function in the chain.
--
-- replace_list_items (20260317000001) runs as its owner and deletes then
-- re-inserts every list_items row for a list id it is handed. Two things were
-- missing:
--
--   1. SET search_path. A definer function resolves unqualified names
--      (list_items, lists) through the CALLER's search_path; pinning it to
--      public is the standard hardening for definer functions.
--   2. EXECUTE grants. Postgres grants EXECUTE on new functions to PUBLIC, and
--      PostgREST exposes every public-schema function as an RPC, so anyone
--      holding the browser-visible anon key could call
--      replace_list_items(<any list id>, '[]') and erase that list's
--      rankings. The only caller in the tree is /api/sync
--      (src/app/api/sync/route.ts), which runs behind requireAuth() and so
--      reaches Postgres as `authenticated`. anon and PUBLIC lose EXECUTE;
--      authenticated and service_role keep it.
--
-- Not done here, and recorded in the sweep backlog: the function still does
-- not check that the caller owns target_list_id (the sync route verifies the
-- list exists, not whose it is). lists.user_id references the app's users
-- table, and whether that id equals auth.uid() is the identity-mapping
-- question this tree does not answer; an ownership predicate written on a
-- guess would lock out every legitimate sync.
--
-- Pinned by supabase/migrations/chain.test.ts ("a SECURITY DEFINER function
-- pins search_path and revokes PUBLIC execute").

CREATE OR REPLACE FUNCTION replace_list_items(
  target_list_id UUID,
  new_items JSONB DEFAULT '[]'::JSONB
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_ts TIMESTAMPTZ;
BEGIN
  DELETE FROM list_items WHERE list_id = target_list_id;

  IF jsonb_array_length(new_items) > 0 THEN
    INSERT INTO list_items (list_id, item_id, ranking)
    SELECT
      target_list_id,
      (elem->>'item_id')::UUID,
      (elem->>'ranking')::INTEGER
    FROM jsonb_array_elements(new_items) AS elem;
  END IF;

  UPDATE lists
  SET updated_at = NOW()
  WHERE id = target_list_id
  RETURNING updated_at INTO updated_ts;

  RETURN updated_ts;
END;
$$;

REVOKE EXECUTE ON FUNCTION replace_list_items(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION replace_list_items(UUID, JSONB) TO authenticated, service_role;

COMMENT ON FUNCTION replace_list_items IS
  'Atomically replaces all list_items for a given list within a single transaction. '
  'Callable by authenticated and service_role only (2026-09-05); search_path pinned to public.';
