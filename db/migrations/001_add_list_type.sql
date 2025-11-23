-- Migration: Add type and description to lists table

-- Add type column with check constraint
ALTER TABLE lists 
ADD COLUMN type TEXT CHECK (type IN ('top', 'award')) DEFAULT 'top';

-- Add description column
ALTER TABLE lists 
ADD COLUMN description TEXT;

-- Create index for filtering by type
CREATE INDEX idx_lists_type ON lists(type);

-- Note: parent_list_id already exists in the schema
