-- Migration: Create atomic replace_list_items RPC function
-- Purpose: Prevent data loss during sync by wrapping delete+insert in a transaction
-- Fix for: Non-atomic delete+insert in sync API that could lose rankings on partial failure

CREATE OR REPLACE FUNCTION replace_list_items(
  target_list_id UUID,
  new_items JSONB DEFAULT '[]'::JSONB
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_ts TIMESTAMPTZ;
BEGIN
  -- Delete existing list items for this list
  DELETE FROM list_items WHERE list_id = target_list_id;

  -- Insert new items if any provided
  IF jsonb_array_length(new_items) > 0 THEN
    INSERT INTO list_items (list_id, item_id, ranking)
    SELECT
      target_list_id,
      (elem->>'item_id')::UUID,
      (elem->>'ranking')::INTEGER
    FROM jsonb_array_elements(new_items) AS elem;
  END IF;

  -- Update the list timestamp
  UPDATE lists
  SET updated_at = NOW()
  WHERE id = target_list_id
  RETURNING updated_at INTO updated_ts;

  RETURN updated_ts;
END;
$$;

COMMENT ON FUNCTION replace_list_items IS
  'Atomically replaces all list_items for a given list within a single transaction. '
  'Prevents data loss from partial sync failures where delete succeeds but insert fails.';
