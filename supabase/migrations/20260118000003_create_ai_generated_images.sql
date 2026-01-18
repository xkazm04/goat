-- Migration: Create ai_generated_images table
-- Purpose: Store AI-generated ranking images for Direction 3 (AI Results)

CREATE TABLE IF NOT EXISTS ai_generated_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Context
  list_id UUID REFERENCES lists(id) ON DELETE SET NULL,
  user_id VARCHAR(255),
  list_title VARCHAR(255) NOT NULL,
  category VARCHAR(100),

  -- Generation config
  style_preset VARCHAR(50) NOT NULL,
  custom_prompt TEXT,
  provider VARCHAR(20) DEFAULT 'leonardo' CHECK (provider IN ('leonardo', 'replicate', 'openai', 'mock')),
  model_id VARCHAR(100),

  -- Image data
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  width INTEGER DEFAULT 1200,
  height INTEGER DEFAULT 675,

  -- Cache key (hash of items for deduplication)
  items_hash VARCHAR(64) NOT NULL,
  items_snapshot JSONB NOT NULL,

  -- Generation metrics
  generation_time_ms INTEGER,
  prompt_used TEXT,

  -- User interaction
  is_favorited BOOLEAN DEFAULT FALSE,
  download_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_ai_images_user ON ai_generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_images_list ON ai_generated_images(list_id);
CREATE INDEX IF NOT EXISTS idx_ai_images_hash ON ai_generated_images(items_hash);
CREATE INDEX IF NOT EXISTS idx_ai_images_created ON ai_generated_images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_images_favorited ON ai_generated_images(user_id, is_favorited) WHERE is_favorited = TRUE;

-- Unique index for cache (same items + style = same image)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_images_cache ON ai_generated_images(items_hash, style_preset);

-- Function to increment download count
CREATE OR REPLACE FUNCTION increment_ai_image_download_count(image_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE ai_generated_images
  SET download_count = download_count + 1
  WHERE id = image_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment share count
CREATE OR REPLACE FUNCTION increment_ai_image_share_count(image_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE ai_generated_images
  SET share_count = share_count + 1
  WHERE id = image_id;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE ai_generated_images ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read images (public sharing)
CREATE POLICY "ai_generated_images_select_policy" ON ai_generated_images
  FOR SELECT USING (true);

-- Policy: Anyone can create images
CREATE POLICY "ai_generated_images_insert_policy" ON ai_generated_images
  FOR INSERT WITH CHECK (true);

-- Policy: Users can update their own images (favorite, etc.)
CREATE POLICY "ai_generated_images_update_policy" ON ai_generated_images
  FOR UPDATE USING (user_id = auth.uid()::text OR auth.role() = 'service_role');

-- Policy: Users can delete their own images
CREATE POLICY "ai_generated_images_delete_policy" ON ai_generated_images
  FOR DELETE USING (user_id = auth.uid()::text OR auth.role() = 'service_role');

COMMENT ON TABLE ai_generated_images IS 'AI-generated ranking list images using Leonardo AI';
COMMENT ON COLUMN ai_generated_images.items_hash IS 'SHA-256 hash of sorted item IDs for cache lookup';
COMMENT ON COLUMN ai_generated_images.items_snapshot IS 'JSONB snapshot of items at generation time';
COMMENT ON COLUMN ai_generated_images.expires_at IS 'Auto-cleanup after 30 days if not favorited';
