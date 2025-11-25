-- Create challenges table
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'scheduled')),
  prize_description TEXT,
  entry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create challenge_entries table
CREATE TABLE IF NOT EXISTS public.challenge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  list_id UUID NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  score NUMERIC(10, 2) NOT NULL DEFAULT 0,
  completion_time INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(challenge_id, user_id)
);

-- Create badges table
CREATE TABLE IF NOT EXISTS public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL CHECK (badge_type IN (
    'first_place', 'top_10', 'speed_master', 'consistency_king',
    'category_expert', 'challenge_veteran', 'perfect_score',
    'early_bird', 'comeback_kid', 'streak_master'
  )),
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE SET NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_stats table
CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_challenges INTEGER NOT NULL DEFAULT 0,
  challenges_won INTEGER NOT NULL DEFAULT 0,
  total_entries INTEGER NOT NULL DEFAULT 0,
  average_score NUMERIC(10, 2) NOT NULL DEFAULT 0,
  best_rank INTEGER,
  current_streak INTEGER NOT NULL DEFAULT 0,
  last_entry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_challenges_category ON public.challenges(category);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON public.challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenges_start_date ON public.challenges(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_challenge_entries_challenge_id ON public.challenge_entries(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_entries_user_id ON public.challenge_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_entries_score ON public.challenge_entries(score DESC);
CREATE INDEX IF NOT EXISTS idx_badges_user_id ON public.badges(user_id);
CREATE INDEX IF NOT EXISTS idx_badges_badge_type ON public.badges(badge_type);

-- Create function to update challenge entry count
CREATE OR REPLACE FUNCTION update_challenge_entry_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.challenges
    SET entry_count = entry_count + 1,
        updated_at = NOW()
    WHERE id = NEW.challenge_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.challenges
    SET entry_count = entry_count - 1,
        updated_at = NOW()
    WHERE id = OLD.challenge_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for challenge entry count
DROP TRIGGER IF EXISTS trigger_update_challenge_entry_count ON public.challenge_entries;
CREATE TRIGGER trigger_update_challenge_entry_count
AFTER INSERT OR DELETE ON public.challenge_entries
FOR EACH ROW EXECUTE FUNCTION update_challenge_entry_count();

-- Create function to update user stats
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update user stats
  INSERT INTO public.user_stats (user_id, total_entries, last_entry_date)
  VALUES (NEW.user_id, 1, CURRENT_DATE)
  ON CONFLICT (user_id) DO UPDATE
  SET total_entries = user_stats.total_entries + 1,
      last_entry_date = CURRENT_DATE,
      -- Update streak
      current_streak = CASE
        WHEN user_stats.last_entry_date = CURRENT_DATE - INTERVAL '1 day' THEN user_stats.current_streak + 1
        WHEN user_stats.last_entry_date = CURRENT_DATE THEN user_stats.current_streak
        ELSE 1
      END,
      updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user stats
DROP TRIGGER IF EXISTS trigger_update_user_stats ON public.challenge_entries;
CREATE TRIGGER trigger_update_user_stats
AFTER INSERT ON public.challenge_entries
FOR EACH ROW EXECUTE FUNCTION update_user_stats();

-- Create function to calculate and update ranks
CREATE OR REPLACE FUNCTION update_challenge_ranks(challenge_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.challenge_entries
  SET rank = subquery.row_num
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY score DESC, completion_time ASC) as row_num
    FROM public.challenge_entries
    WHERE challenge_id = challenge_uuid
  ) AS subquery
  WHERE challenge_entries.id = subquery.id
    AND challenge_entries.challenge_id = challenge_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create function to award badges based on performance
CREATE OR REPLACE FUNCTION award_badges_for_entry()
RETURNS TRIGGER AS $$
DECLARE
  user_entry_count INTEGER;
  perfect_score_threshold NUMERIC := 100.0;
BEGIN
  -- Calculate ranks first
  PERFORM update_challenge_ranks(NEW.challenge_id);

  -- Refresh NEW.rank
  SELECT rank INTO NEW.rank
  FROM public.challenge_entries
  WHERE id = NEW.id;

  -- Award first place badge
  IF NEW.rank = 1 THEN
    INSERT INTO public.badges (user_id, badge_type, challenge_id, metadata)
    VALUES (NEW.user_id, 'first_place', NEW.challenge_id, jsonb_build_object('score', NEW.score, 'challenge_title', (SELECT title FROM public.challenges WHERE id = NEW.challenge_id)))
    ON CONFLICT DO NOTHING;
  END IF;

  -- Award top 10 badge
  IF NEW.rank <= 10 THEN
    INSERT INTO public.badges (user_id, badge_type, challenge_id, metadata)
    VALUES (NEW.user_id, 'top_10', NEW.challenge_id, jsonb_build_object('rank', NEW.rank))
    ON CONFLICT DO NOTHING;
  END IF;

  -- Award perfect score badge
  IF NEW.score >= perfect_score_threshold THEN
    INSERT INTO public.badges (user_id, badge_type, challenge_id, metadata)
    VALUES (NEW.user_id, 'perfect_score', NEW.challenge_id, jsonb_build_object('score', NEW.score))
    ON CONFLICT DO NOTHING;
  END IF;

  -- Award speed master badge (top 10% completion time)
  IF NEW.completion_time <= (
    SELECT PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY completion_time)
    FROM public.challenge_entries
    WHERE challenge_id = NEW.challenge_id
  ) THEN
    INSERT INTO public.badges (user_id, badge_type, challenge_id, metadata)
    VALUES (NEW.user_id, 'speed_master', NEW.challenge_id, jsonb_build_object('time', NEW.completion_time))
    ON CONFLICT DO NOTHING;
  END IF;

  -- Award challenge veteran badge (10+ challenge entries)
  SELECT COUNT(*) INTO user_entry_count
  FROM public.challenge_entries
  WHERE user_id = NEW.user_id;

  IF user_entry_count >= 10 THEN
    INSERT INTO public.badges (user_id, badge_type, metadata)
    VALUES (NEW.user_id, 'challenge_veteran', jsonb_build_object('entry_count', user_entry_count))
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to award badges
DROP TRIGGER IF EXISTS trigger_award_badges ON public.challenge_entries;
CREATE TRIGGER trigger_award_badges
AFTER INSERT ON public.challenge_entries
FOR EACH ROW EXECUTE FUNCTION award_badges_for_entry();

-- Enable Row Level Security
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for challenges (public read, admin write)
CREATE POLICY "Challenges are viewable by everyone"
  ON public.challenges FOR SELECT
  USING (true);

CREATE POLICY "Challenges can be created by authenticated users"
  ON public.challenges FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for challenge_entries
CREATE POLICY "Challenge entries are viewable by everyone"
  ON public.challenge_entries FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own challenge entries"
  ON public.challenge_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenge entries"
  ON public.challenge_entries FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for badges
CREATE POLICY "Badges are viewable by everyone"
  ON public.badges FOR SELECT
  USING (true);

CREATE POLICY "Only system can create badges"
  ON public.badges FOR INSERT
  WITH CHECK (false);  -- Badges are only created via triggers

-- RLS Policies for user_stats
CREATE POLICY "User stats are viewable by everyone"
  ON public.user_stats FOR SELECT
  USING (true);

CREATE POLICY "User stats are managed by system"
  ON public.user_stats FOR INSERT
  WITH CHECK (false);  -- Stats are only updated via triggers

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_challenges_updated_at
BEFORE UPDATE ON public.challenges
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at
BEFORE UPDATE ON public.user_stats
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
