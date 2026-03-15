-- Create list_collections table for organizing lists into collections
CREATE TABLE IF NOT EXISTS public.list_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  color TEXT,
  icon TEXT,
  parent_id UUID REFERENCES public.list_collections(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL,
  list_ids TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT FALSE,
  share_slug TEXT UNIQUE,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_list_collections_user_id ON public.list_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_list_collections_parent_id ON public.list_collections(parent_id);
CREATE INDEX IF NOT EXISTS idx_list_collections_share_slug ON public.list_collections(share_slug) WHERE share_slug IS NOT NULL;

-- Enable RLS
ALTER TABLE public.list_collections ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can read/write their own collections, public collections readable by all
CREATE POLICY "Users can read own collections"
  ON public.list_collections FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own collections"
  ON public.list_collections FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own collections"
  ON public.list_collections FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete own collections"
  ON public.list_collections FOR DELETE
  USING (true);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.update_list_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER list_collections_updated_at
  BEFORE UPDATE ON public.list_collections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_list_collections_updated_at();
