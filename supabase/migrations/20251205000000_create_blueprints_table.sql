-- Create blueprints table
-- Blueprints are shareable list configurations that can be created by users,
-- shared via URL, stored in the database, and loaded dynamically

CREATE TABLE IF NOT EXISTS blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  size INTEGER NOT NULL DEFAULT 10,
  time_period TEXT NOT NULL DEFAULT 'all-time',
  description TEXT,
  author TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Color scheme
  color_primary TEXT NOT NULL DEFAULT '#f59e0b',
  color_secondary TEXT NOT NULL DEFAULT '#d97706',
  color_accent TEXT NOT NULL DEFAULT '#fbbf24',

  -- Flags
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,

  -- Analytics
  usage_count INTEGER NOT NULL DEFAULT 0,
  clone_count INTEGER NOT NULL DEFAULT 0,

  -- Source reference (if cloned from existing list)
  source_list_id UUID REFERENCES lists(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_blueprints_slug ON blueprints(slug);
CREATE INDEX IF NOT EXISTS idx_blueprints_category ON blueprints(category);
CREATE INDEX IF NOT EXISTS idx_blueprints_author_id ON blueprints(author_id);
CREATE INDEX IF NOT EXISTS idx_blueprints_is_featured ON blueprints(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_blueprints_usage_count ON blueprints(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_blueprints_clone_count ON blueprints(clone_count DESC);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_blueprints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blueprints_updated_at
  BEFORE UPDATE ON blueprints
  FOR EACH ROW
  EXECUTE FUNCTION update_blueprints_updated_at();

-- Row Level Security (RLS)
ALTER TABLE blueprints ENABLE ROW LEVEL SECURITY;

-- Everyone can read blueprints
CREATE POLICY "Blueprints are viewable by everyone"
  ON blueprints FOR SELECT
  USING (true);

-- Authenticated users can create blueprints
CREATE POLICY "Authenticated users can create blueprints"
  ON blueprints FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL OR is_system = FALSE);

-- Users can update their own blueprints (non-system)
CREATE POLICY "Users can update own blueprints"
  ON blueprints FOR UPDATE
  USING (
    auth.uid() = author_id
    AND is_system = FALSE
  );

-- Users can delete their own blueprints (non-system)
CREATE POLICY "Users can delete own blueprints"
  ON blueprints FOR DELETE
  USING (
    auth.uid() = author_id
    AND is_system = FALSE
  );

-- Insert system blueprints from hardcoded showcase data
INSERT INTO blueprints (id, slug, title, category, subcategory, size, time_period, description, author, color_primary, color_secondary, color_accent, is_system, is_featured)
VALUES
  (
    gen_random_uuid(),
    'top-50-nba-players-system-1',
    'Top 50 NBA Players',
    'Sports',
    'basketball',
    50,
    'all-time',
    'never lost in finals',
    '@mbj',
    '#f59e0b',
    '#d97706',
    '#fbbf24',
    TRUE,
    TRUE
  ),
  (
    gen_random_uuid(),
    'best-pc-games-to-play-system-2',
    'Best PC Games to play',
    'Games',
    'video-games',
    50,
    'all-time',
    'timeless classics that changed everything',
    '@gamer_pro',
    '#8b5cf6',
    '#7c3aed',
    '#a78bfa',
    TRUE,
    TRUE
  ),
  (
    gen_random_uuid(),
    'top-hip-hop-tracks-system-3',
    'Top Hip-Hop Tracks',
    'Music',
    'hip-hop',
    50,
    'all-time',
    'beats that defined generations',
    '@music_head',
    '#ef4444',
    '#dc2626',
    '#f87171',
    TRUE,
    TRUE
  ),
  (
    gen_random_uuid(),
    'sci-fi-masterpieces-system-4',
    'Sci-Fi Masterpieces',
    'Stories',
    'sci-fi',
    50,
    'all-time',
    'mind-bending cinema at its finest',
    '@film_buff',
    '#06b6d4',
    '#0891b2',
    '#22d3ee',
    TRUE,
    TRUE
  ),
  (
    gen_random_uuid(),
    'fantasy-novels-system-5',
    'Fantasy Novels',
    'Stories',
    'fantasy',
    50,
    'all-time',
    'worlds beyond imagination',
    '@book_worm',
    '#10b981',
    '#059669',
    '#34d399',
    TRUE,
    TRUE
  )
ON CONFLICT (slug) DO NOTHING;
