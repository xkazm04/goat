-- Migration: Create user_preferences table
-- Purpose: Store user display and feature preferences for all three directions

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id VARCHAR(255) PRIMARY KEY,

  -- Direction 1: Community Wisdom preferences
  show_consensus_badges BOOLEAN DEFAULT TRUE,
  consensus_overlay_enabled BOOLEAN DEFAULT FALSE,
  consensus_overlay_opacity DECIMAL(3,2) DEFAULT 0.70,

  -- Direction 2: Smart Seeding preferences
  default_seeding_strategy VARCHAR(30) DEFAULT 'random' CHECK (default_seeding_strategy IN ('random', 'alphabetical', 'year', 'consensus', 'reverse-alphabetical')),
  default_arrange_mode VARCHAR(30) DEFAULT 'auto' CHECK (default_arrange_mode IN ('auto', 'shuffle', 'compress', 'spread', 'reverse', 'tier-sort')),
  preserve_podium BOOLEAN DEFAULT TRUE,

  -- Direction 3: AI Results preferences
  default_ai_style VARCHAR(50) DEFAULT 'Dynamic',
  ai_history_enabled BOOLEAN DEFAULT TRUE,
  preferred_ai_provider VARCHAR(20) DEFAULT 'leonardo',

  -- General UI preferences
  default_view_mode VARCHAR(20) DEFAULT 'podium' CHECK (default_view_mode IN ('podium', 'goat', 'rushmore', 'bracket', 'tierlist')),
  show_tutorial_hints BOOLEAN DEFAULT TRUE,
  items_per_page INTEGER DEFAULT 50,
  theme VARCHAR(20) DEFAULT 'dark',

  -- Feature flags (for A/B testing)
  feature_flags JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER trigger_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

-- Enable Row Level Security
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own preferences
CREATE POLICY "user_preferences_select_policy" ON user_preferences
  FOR SELECT USING (user_id = auth.uid()::text OR auth.role() = 'service_role');

-- Policy: Users can insert their own preferences
CREATE POLICY "user_preferences_insert_policy" ON user_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid()::text OR auth.role() = 'service_role');

-- Policy: Users can update their own preferences
CREATE POLICY "user_preferences_update_policy" ON user_preferences
  FOR UPDATE USING (user_id = auth.uid()::text OR auth.role() = 'service_role');

-- Policy: Users can delete their own preferences
CREATE POLICY "user_preferences_delete_policy" ON user_preferences
  FOR DELETE USING (user_id = auth.uid()::text OR auth.role() = 'service_role');

-- Function to get or create user preferences with defaults
CREATE OR REPLACE FUNCTION get_or_create_user_preferences(p_user_id VARCHAR(255))
RETURNS user_preferences AS $$
DECLARE
  result user_preferences;
BEGIN
  SELECT * INTO result FROM user_preferences WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO user_preferences (user_id) VALUES (p_user_id)
    RETURNING * INTO result;
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE user_preferences IS 'User display and feature preferences';
COMMENT ON COLUMN user_preferences.feature_flags IS 'JSONB for A/B testing feature toggles';
