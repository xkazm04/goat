-- Atomic counter-increment RPCs (mirror the existing increment_share_view_count /
-- increment_share_challenge_count functions from 20251205100000).
--
-- These let the API replace client-side read-modify-write increments
-- (`update x = x + 1` computed in JS) with atomic DB updates, so concurrent
-- requests don't lose increments. The app calls these via supabase.rpc(...) and
-- falls back to read-modify-write if the function isn't present yet, so deploying
-- the app before applying this migration is safe.

-- Atomically increment a shared ranking's fork_count.
CREATE OR REPLACE FUNCTION increment_share_fork_count(share_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.shared_rankings
  SET fork_count = fork_count + 1,
      updated_at = NOW()
  WHERE id = share_id;
END;
$$ LANGUAGE plpgsql;

-- Atomically increment a blueprint's usage_count.
CREATE OR REPLACE FUNCTION increment_blueprint_usage_count(blueprint_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.blueprints
  SET usage_count = usage_count + 1
  WHERE id = blueprint_id;
END;
$$ LANGUAGE plpgsql;
