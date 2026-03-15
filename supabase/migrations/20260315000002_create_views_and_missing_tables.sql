-- ============================================================================
-- Fix missing database objects that API routes depend on
-- ============================================================================

-- 1. Create views for legacy table names
--    Several API routes (/api/search, /api/consensus, /api/v1/*) reference
--    "top_items" and "top_groups" which are legacy names for "items" and
--    "item_groups". Create views so these queries work without code changes.

CREATE OR REPLACE VIEW public.top_items AS
  SELECT * FROM public.items;

CREATE OR REPLACE VIEW public.top_groups AS
  SELECT * FROM public.item_groups;

-- 2. Create shared_rankings table (required by /api/share/*, /api/og/*)
--    Migration file existed but was never applied to the database.

CREATE TABLE IF NOT EXISTS public.shared_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES public.lists(id) ON DELETE SET NULL,
  user_id UUID,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  time_period TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  share_code TEXT UNIQUE NOT NULL,
  og_image_url TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  challenge_count INTEGER NOT NULL DEFAULT 0,
  parent_share_id UUID REFERENCES public.shared_rankings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_rankings_share_code ON public.shared_rankings(share_code);
CREATE INDEX IF NOT EXISTS idx_shared_rankings_user_id ON public.shared_rankings(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_rankings_list_id ON public.shared_rankings(list_id);
CREATE INDEX IF NOT EXISTS idx_shared_rankings_parent_share_id ON public.shared_rankings(parent_share_id);
CREATE INDEX IF NOT EXISTS idx_shared_rankings_created_at ON public.shared_rankings(created_at DESC);

CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_share_view_count(share_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.shared_rankings
  SET view_count = view_count + 1, updated_at = NOW()
  WHERE id = share_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_shared_rankings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_shared_rankings_updated_at ON public.shared_rankings;
CREATE TRIGGER trigger_update_shared_rankings_updated_at
BEFORE UPDATE ON public.shared_rankings
FOR EACH ROW EXECUTE FUNCTION update_shared_rankings_updated_at();

ALTER TABLE public.shared_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shared rankings are viewable by everyone"
  ON public.shared_rankings FOR SELECT USING (true);
CREATE POLICY "Anyone can create shared rankings"
  ON public.shared_rankings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update shared rankings"
  ON public.shared_rankings FOR UPDATE USING (true);

-- 3. Create blueprints table (required by /api/blueprints/*, /api/search)
--    Migration file existed but was never applied to the database.
--    NOTE: author_id FK to auth.users removed since app uses temp users,
--    not Supabase Auth. Stored as TEXT to match existing user_id patterns.

CREATE TABLE IF NOT EXISTS public.blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  size INTEGER NOT NULL DEFAULT 10,
  time_period TEXT NOT NULL DEFAULT 'all-time',
  description TEXT,
  author TEXT,
  author_id TEXT,
  color_primary TEXT NOT NULL DEFAULT '#f59e0b',
  color_secondary TEXT NOT NULL DEFAULT '#d97706',
  color_accent TEXT NOT NULL DEFAULT '#fbbf24',
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  usage_count INTEGER NOT NULL DEFAULT 0,
  clone_count INTEGER NOT NULL DEFAULT 0,
  source_list_id UUID REFERENCES public.lists(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blueprints_slug ON public.blueprints(slug);
CREATE INDEX IF NOT EXISTS idx_blueprints_category ON public.blueprints(category);
CREATE INDEX IF NOT EXISTS idx_blueprints_is_featured ON public.blueprints(is_featured) WHERE is_featured = TRUE;

CREATE OR REPLACE FUNCTION update_blueprints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blueprints_updated_at
  BEFORE UPDATE ON public.blueprints
  FOR EACH ROW EXECUTE FUNCTION update_blueprints_updated_at();

ALTER TABLE public.blueprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Blueprints are viewable by everyone"
  ON public.blueprints FOR SELECT USING (true);
CREATE POLICY "Anyone can create blueprints"
  ON public.blueprints FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update blueprints"
  ON public.blueprints FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete blueprints"
  ON public.blueprints FOR DELETE USING (true);

-- Seed system blueprints
INSERT INTO public.blueprints (slug, title, category, subcategory, size, time_period, description, author, color_primary, color_secondary, color_accent, is_system, is_featured)
VALUES
  ('top-50-nba-players-system-1', 'Top 50 NBA Players', 'Sports', 'basketball', 50, 'all-time', 'never lost in finals', '@mbj', '#f59e0b', '#d97706', '#fbbf24', TRUE, TRUE),
  ('best-pc-games-to-play-system-2', 'Best PC Games to play', 'Games', 'video-games', 50, 'all-time', 'timeless classics that changed everything', '@gamer_pro', '#8b5cf6', '#7c3aed', '#a78bfa', TRUE, TRUE),
  ('top-hip-hop-tracks-system-3', 'Top Hip-Hop Tracks', 'Music', 'hip-hop', 50, 'all-time', 'beats that defined generations', '@music_head', '#ef4444', '#dc2626', '#f87171', TRUE, TRUE),
  ('sci-fi-masterpieces-system-4', 'Sci-Fi Masterpieces', 'Stories', 'sci-fi', 50, 'all-time', 'mind-bending cinema at its finest', '@film_buff', '#06b6d4', '#0891b2', '#22d3ee', TRUE, TRUE),
  ('fantasy-novels-system-5', 'Fantasy Novels', 'Stories', 'fantasy', 50, 'all-time', 'worlds beyond imagination', '@book_worm', '#10b981', '#059669', '#34d399', TRUE, TRUE)
ON CONFLICT (slug) DO NOTHING;
