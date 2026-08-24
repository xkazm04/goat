-- Create ranking_activities table
-- Tracks item-level ranking events: when items are added, ranked, moved, removed
-- Used by the Item Activity Timeline feature in ItemInspector and ItemDetailPopup

CREATE TABLE IF NOT EXISTS ranking_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  list_id UUID REFERENCES lists(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Event type: assign, move, swap, remove, rank_change
  action TEXT NOT NULL CHECK (action IN ('assign', 'move', 'swap', 'remove', 'rank_change')),

  -- Position tracking
  position_before INTEGER,          -- Previous position (null for new assignments)
  position_after INTEGER,           -- New position (null for removals)

  -- Context
  list_title TEXT,                  -- Denormalized for display without joins
  metadata JSONB DEFAULT '{}',      -- Extra context (swap partner, etc.)

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX idx_ranking_activities_item_id ON ranking_activities(item_id);
CREATE INDEX idx_ranking_activities_user_id ON ranking_activities(user_id);
CREATE INDEX idx_ranking_activities_created_at ON ranking_activities(created_at DESC);
CREATE INDEX idx_ranking_activities_item_created ON ranking_activities(item_id, created_at DESC);

COMMENT ON TABLE ranking_activities IS 'Tracks per-item ranking events for the activity timeline feature';
COMMENT ON COLUMN ranking_activities.action IS 'Event type: assign (backlog→grid), move (grid→grid), swap (exchange), remove (grid→backlog), rank_change (position saved)';
COMMENT ON COLUMN ranking_activities.metadata IS 'Extra context like swap partner item_id, source (mobile/desktop), etc.';
