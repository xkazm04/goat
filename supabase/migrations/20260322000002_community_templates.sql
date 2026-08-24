-- Community Template Marketplace
-- Extends blueprints table with community fields and adds ratings table

-- Add community template fields to blueprints
ALTER TABLE blueprints
  ADD COLUMN IF NOT EXISTS is_community BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completion_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS item_snapshot JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for community template browsing
CREATE INDEX IF NOT EXISTS idx_blueprints_is_community
  ON blueprints(is_community) WHERE is_community = TRUE;

CREATE INDEX IF NOT EXISTS idx_blueprints_avg_rating
  ON blueprints(avg_rating DESC) WHERE is_community = TRUE;

-- Blueprint ratings table
CREATE TABLE IF NOT EXISTS blueprint_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID NOT NULL REFERENCES blueprints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One rating per user per blueprint
  UNIQUE(blueprint_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_blueprint_ratings_blueprint
  ON blueprint_ratings(blueprint_id);

CREATE INDEX IF NOT EXISTS idx_blueprint_ratings_user
  ON blueprint_ratings(user_id);

-- Update timestamp trigger for ratings
CREATE OR REPLACE FUNCTION update_blueprint_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blueprint_ratings_updated_at
  BEFORE UPDATE ON blueprint_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_blueprint_ratings_updated_at();

-- RLS for blueprint_ratings
ALTER TABLE blueprint_ratings ENABLE ROW LEVEL SECURITY;

-- Everyone can read ratings
CREATE POLICY "Blueprint ratings are viewable by everyone"
  ON blueprint_ratings FOR SELECT
  USING (true);

-- Authenticated users can create/update their own ratings
CREATE POLICY "Users can create own ratings"
  ON blueprint_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings"
  ON blueprint_ratings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ratings"
  ON blueprint_ratings FOR DELETE
  USING (auth.uid() = user_id);

-- Function to recalculate blueprint rating stats
CREATE OR REPLACE FUNCTION recalculate_blueprint_rating()
RETURNS TRIGGER AS $$
DECLARE
  bp_id UUID;
BEGIN
  bp_id := COALESCE(NEW.blueprint_id, OLD.blueprint_id);

  UPDATE blueprints
  SET
    avg_rating = COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM blueprint_ratings
      WHERE blueprint_id = bp_id
    ), 0),
    rating_count = (
      SELECT COUNT(*)
      FROM blueprint_ratings
      WHERE blueprint_id = bp_id
    )
  WHERE id = bp_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blueprint_rating_recalculate
  AFTER INSERT OR UPDATE OR DELETE ON blueprint_ratings
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_blueprint_rating();
