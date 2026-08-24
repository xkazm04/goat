-- Add allow_custom_items flag to lists table
-- Controls whether users can add custom items to a list's backlog during ranking
ALTER TABLE lists ADD COLUMN IF NOT EXISTS allow_custom_items boolean NOT NULL DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN lists.allow_custom_items IS 'When true, signed-in users can add custom items to the backlog during ranking';
