-- Migration: Create item_consensus_cache table
-- Purpose: Cache community consensus statistics per item for Direction 1 (Community Wisdom)

CREATE TABLE IF NOT EXISTS item_consensus_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,

  -- Statistics
  total_rankings INTEGER DEFAULT 0,
  average_position DECIMAL(6,2),
  median_position INTEGER,
  position_std_dev DECIMAL(6,2),
  volatility DECIMAL(5,2),
  confidence DECIMAL(5,4),

  -- Distribution (position -> count as JSONB)
  distribution JSONB DEFAULT '{}',
  percentiles JSONB DEFAULT '{"p25": null, "p50": null, "p75": null}',

  -- Classification
  consensus_level VARCHAR(20) CHECK (consensus_level IN ('unanimous', 'strong', 'moderate', 'mixed', 'controversial')),

  -- TTL management
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 day'),
  last_calculated TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_item_category_consensus UNIQUE (item_id, category)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_consensus_item ON item_consensus_cache(item_id);
CREATE INDEX IF NOT EXISTS idx_consensus_category ON item_consensus_cache(category);
CREATE INDEX IF NOT EXISTS idx_consensus_expires ON item_consensus_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_consensus_level ON item_consensus_cache(consensus_level);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_item_consensus_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_item_consensus_cache_updated_at ON item_consensus_cache;
CREATE TRIGGER trigger_item_consensus_cache_updated_at
  BEFORE UPDATE ON item_consensus_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_item_consensus_cache_updated_at();

-- Enable Row Level Security
ALTER TABLE item_consensus_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read consensus data (public)
CREATE POLICY "item_consensus_cache_select_policy" ON item_consensus_cache
  FOR SELECT USING (true);

-- Policy: Only system (service role) can insert/update/delete
CREATE POLICY "item_consensus_cache_insert_policy" ON item_consensus_cache
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "item_consensus_cache_update_policy" ON item_consensus_cache
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "item_consensus_cache_delete_policy" ON item_consensus_cache
  FOR DELETE USING (auth.role() = 'service_role');

COMMENT ON TABLE item_consensus_cache IS 'Cached community consensus statistics per item, refreshed hourly by batch job';
COMMENT ON COLUMN item_consensus_cache.consensus_level IS 'Classification: unanimous (>90% agree), strong (70-90%), moderate (50-70%), mixed (30-50%), controversial (<30%)';
COMMENT ON COLUMN item_consensus_cache.volatility IS 'Measure of ranking spread (0-1), higher = more disagreement';
COMMENT ON COLUMN item_consensus_cache.confidence IS 'Statistical confidence based on sample size (0-1)';
