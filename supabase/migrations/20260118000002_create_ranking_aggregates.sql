-- Migration: Create ranking_aggregates table
-- Purpose: Store aggregated consensus statistics per category for Direction 1 (Community Wisdom)

CREATE TABLE IF NOT EXISTS ranking_aggregates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),

  -- Aggregate statistics
  total_user_rankings INTEGER DEFAULT 0,
  overall_consensus_score DECIMAL(5,2),
  average_list_completion DECIMAL(5,2),
  last_calculated TIMESTAMPTZ DEFAULT NOW(),

  -- Top items by consensus (JSONB array of {item_id, rank, confidence})
  top_items JSONB DEFAULT '[]',

  -- Most controversial items (JSONB array of {item_id, volatility, spread})
  controversial_items JSONB DEFAULT '[]',

  -- Trend data (JSONB for week-over-week changes)
  trend_data JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_category_aggregate UNIQUE (category, subcategory)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_aggregates_category ON ranking_aggregates(category);
CREATE INDEX IF NOT EXISTS idx_aggregates_subcategory ON ranking_aggregates(category, subcategory);
CREATE INDEX IF NOT EXISTS idx_aggregates_updated ON ranking_aggregates(last_calculated);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_ranking_aggregates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ranking_aggregates_updated_at ON ranking_aggregates;
CREATE TRIGGER trigger_ranking_aggregates_updated_at
  BEFORE UPDATE ON ranking_aggregates
  FOR EACH ROW
  EXECUTE FUNCTION update_ranking_aggregates_updated_at();

-- Enable Row Level Security
ALTER TABLE ranking_aggregates ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read aggregates (public)
CREATE POLICY "ranking_aggregates_select_policy" ON ranking_aggregates
  FOR SELECT USING (true);

-- Policy: Only system can write
CREATE POLICY "ranking_aggregates_insert_policy" ON ranking_aggregates
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "ranking_aggregates_update_policy" ON ranking_aggregates
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "ranking_aggregates_delete_policy" ON ranking_aggregates
  FOR DELETE USING (auth.role() = 'service_role');

COMMENT ON TABLE ranking_aggregates IS 'Aggregated consensus statistics per category, refreshed hourly';
COMMENT ON COLUMN ranking_aggregates.top_items IS 'Array of top-ranked items with consensus data';
COMMENT ON COLUMN ranking_aggregates.controversial_items IS 'Items with highest ranking volatility';
