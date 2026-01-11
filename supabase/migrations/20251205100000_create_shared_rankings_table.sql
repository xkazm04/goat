-- Create shared_rankings table for social sharing
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shared_rankings_share_code ON public.shared_rankings(share_code);
CREATE INDEX IF NOT EXISTS idx_shared_rankings_user_id ON public.shared_rankings(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_rankings_list_id ON public.shared_rankings(list_id);
CREATE INDEX IF NOT EXISTS idx_shared_rankings_parent_share_id ON public.shared_rankings(parent_share_id);
CREATE INDEX IF NOT EXISTS idx_shared_rankings_created_at ON public.shared_rankings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_rankings_view_count ON public.shared_rankings(view_count DESC);

-- Create function to generate unique share code
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

-- Create function to increment view count
CREATE OR REPLACE FUNCTION increment_share_view_count(share_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.shared_rankings
  SET view_count = view_count + 1,
      updated_at = NOW()
  WHERE id = share_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to increment challenge count
CREATE OR REPLACE FUNCTION increment_share_challenge_count(share_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.shared_rankings
  SET challenge_count = challenge_count + 1,
      updated_at = NOW()
  WHERE id = share_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
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

-- Enable Row Level Security
ALTER TABLE public.shared_rankings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shared_rankings (public read, authenticated write)
CREATE POLICY "Shared rankings are viewable by everyone"
  ON public.shared_rankings FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create shared rankings"
  ON public.shared_rankings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own shared rankings"
  ON public.shared_rankings FOR UPDATE
  USING (user_id IS NULL OR user_id = auth.uid());
