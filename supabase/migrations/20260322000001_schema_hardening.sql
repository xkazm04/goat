-- Migration: Schema Hardening
-- Addresses critical data integrity, missing columns, indexes, and constraints

-- =============================================================================
-- 1. Add missing `tags` column to items table
--    Referenced by 44+ files in the codebase but never created in DB
-- =============================================================================
ALTER TABLE items ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_items_tags ON items USING GIN (tags);

-- =============================================================================
-- 2. Add missing index on lists.parent_list_id
--    Required for consensus aggregation queries (WHERE parent_list_id = $1)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_lists_parent_list_id ON lists(parent_list_id);

-- =============================================================================
-- 3. Prevent duplicate user forks of the same predefined list
--    Without this, a user can create multiple copies, skewing consensus
-- =============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_lists_user_parent_unique
  ON lists(user_id, parent_list_id)
  WHERE parent_list_id IS NOT NULL AND user_id IS NOT NULL;

-- =============================================================================
-- 4. Add missing index on ranking_activities.list_id
--    Required for fetching all activity for a specific list
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_ranking_activities_list_id ON ranking_activities(list_id);

-- =============================================================================
-- 5. Make selection_count and view_count NOT NULL with default 0
--    NULL counters are semantically wrong — 0 means "never counted"
-- =============================================================================
UPDATE items SET selection_count = 0 WHERE selection_count IS NULL;
UPDATE items SET view_count = 0 WHERE view_count IS NULL;
ALTER TABLE items ALTER COLUMN selection_count SET NOT NULL;
ALTER TABLE items ALTER COLUMN selection_count SET DEFAULT 0;
ALTER TABLE items ALTER COLUMN view_count SET NOT NULL;
ALTER TABLE items ALTER COLUMN view_count SET DEFAULT 0;

-- =============================================================================
-- 6. Make lists.predefined NOT NULL with default false
--    NULL predefined flag is ambiguous
-- =============================================================================
UPDATE lists SET predefined = false WHERE predefined IS NULL;
ALTER TABLE lists ALTER COLUMN predefined SET NOT NULL;
ALTER TABLE lists ALTER COLUMN predefined SET DEFAULT false;

-- =============================================================================
-- 7. Add RLS to ranking_activities
--    Without RLS, any authenticated user can read all users' activity
-- =============================================================================
ALTER TABLE ranking_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ranking_activities_select_own" ON ranking_activities
  FOR SELECT USING (
    user_id = auth.uid()
    OR auth.role() = 'service_role'
    OR user_id IS NULL
  );

CREATE POLICY "ranking_activities_insert_own" ON ranking_activities
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR auth.role() = 'service_role'
  );

CREATE POLICY "ranking_activities_service_all" ON ranking_activities
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- 8. Change list_items → items FK from CASCADE to RESTRICT
--    Prevents accidentally deleting a shared item from removing it from
--    every user's personal ranking silently
-- =============================================================================
ALTER TABLE list_items DROP CONSTRAINT IF EXISTS list_items_item_id_fkey;
ALTER TABLE list_items ADD CONSTRAINT list_items_item_id_fkey
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT;

-- =============================================================================
-- 9. Make unique_ranking_per_list deferrable
--    Allows the rerank_list_items trigger to shift rankings within a
--    transaction without hitting intermediate uniqueness violations
-- =============================================================================
ALTER TABLE list_items DROP CONSTRAINT IF EXISTS unique_ranking_per_list;
ALTER TABLE list_items ADD CONSTRAINT unique_ranking_per_list
  UNIQUE (list_id, ranking) DEFERRABLE INITIALLY DEFERRED;

-- =============================================================================
-- 10. Add item_count to item_groups (materialized count)
-- =============================================================================
ALTER TABLE item_groups ADD COLUMN IF NOT EXISTS item_count INTEGER DEFAULT 0;

-- Populate item_count from actual data
UPDATE item_groups SET item_count = sub.cnt
FROM (
  SELECT group_id, COUNT(*) as cnt
  FROM items
  WHERE group_id IS NOT NULL
  GROUP BY group_id
) sub
WHERE item_groups.id = sub.group_id;

-- Trigger to keep item_count in sync
CREATE OR REPLACE FUNCTION update_item_group_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.group_id IS NOT NULL THEN
      UPDATE item_groups SET item_count = (
        SELECT COUNT(*) FROM items WHERE group_id = NEW.group_id
      ) WHERE id = NEW.group_id;
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.group_id IS NOT NULL AND OLD.group_id != NEW.group_id THEN
      UPDATE item_groups SET item_count = (
        SELECT COUNT(*) FROM items WHERE group_id = OLD.group_id
      ) WHERE id = OLD.group_id;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF OLD.group_id IS NOT NULL THEN
      UPDATE item_groups SET item_count = (
        SELECT COUNT(*) FROM items WHERE group_id = OLD.group_id
      ) WHERE id = OLD.group_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_item_group_count ON items;
CREATE TRIGGER trigger_update_item_group_count
  AFTER INSERT OR UPDATE OF group_id OR DELETE ON items
  FOR EACH ROW EXECUTE FUNCTION update_item_group_count();
