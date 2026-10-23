-- GOAT v2 baseline (docs/v2/TECHNICAL_PACKAGE.md §3).
--
-- v2 lives in its own schema, goat_v2, inside the shared project, so nothing
-- here touches a v1 table and v1 keeps running until the swap (M7). Unlike the
-- v1 lane this step bootstraps everything it needs: it depends only on
-- Supabase's own auth schema.
--
-- After applying, add goat_v2 to the project's exposed schemas
-- (Dashboard > Project Settings > API > Exposed schemas) and enable anonymous
-- sign-ins (Authentication > Providers > Anonymous). See src/v2/README.md.

CREATE SCHEMA IF NOT EXISTS goat_v2;

-- Identity. Guests use Supabase anonymous sign-in, so every visitor has a real
-- auth.uid() and RLS never needs USING (true). Signing up later links the
-- identity and the id never changes.
CREATE TABLE goat_v2.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  handle text UNIQUE CHECK (handle ~ '^[a-z0-9_]{3,24}$'),
  display_name text CHECK (char_length(display_name) <= 60),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Catalog. Any topic, so no category enum. image_url is real artwork when
-- enrichment finds one (real art first); art is the ArtDirection used for the
-- generative fallback cover and for colour glows.
CREATE TABLE goat_v2.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL CHECK (char_length(topic) BETWEEN 1 AND 120),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  year int CHECK (year BETWEEN -3000 AND 2200),
  creator text,
  external_ids jsonb NOT NULL DEFAULT '{}'::jsonb,
  image_url text,
  art jsonb,
  traits text[] NOT NULL DEFAULT '{}',
  trait_weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX items_topic_title_idx ON goat_v2.items (lower(topic), lower(title));

-- One list document. Award categories are child lists (parent_id).
CREATE TABLE goat_v2.lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  topic text NOT NULL CHECK (char_length(topic) BETWEEN 1 AND 120),
  kind text NOT NULL DEFAULT 'ranking' CHECK (kind IN ('ranking', 'awards')),
  size int NOT NULL DEFAULT 25 CHECK (size IN (10, 25, 50)),
  tiers jsonb NOT NULL DEFAULT '[{"name":"GOAT","until":3},{"name":"Essential","until":10},{"name":"Great","until":25},{"name":"Fine","until":50}]'::jsonb,
  stage_preset text NOT NULL DEFAULT 'podium' CHECK (stage_preset IN ('podium', 'rushmore', 'throne')),
  hero_art jsonb,
  parent_id uuid REFERENCES goat_v2.lists (id) ON DELETE CASCADE,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'unlisted', 'public')),
  slug text UNIQUE CHECK (slug ~ '^[a-z0-9-]{3,80}$'),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX lists_owner_idx ON goat_v2.lists (owner_id, updated_at DESC);

-- Entries. position NULL means the item sits in the pool, unranked.
CREATE TABLE goat_v2.list_entries (
  list_id uuid NOT NULL REFERENCES goat_v2.lists (id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES goat_v2.items (id) ON DELETE RESTRICT,
  position int CHECK (position >= 0),
  canvas_x real CHECK (canvas_x BETWEEN 0 AND 1),
  note text CHECK (char_length(note) <= 2000),
  PRIMARY KEY (list_id, item_id),
  CONSTRAINT list_entries_position_unique UNIQUE (list_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE goat_v2.taste_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  traits jsonb NOT NULL DEFAULT '{}'::jsonb,
  axes jsonb NOT NULL DEFAULT '{}'::jsonb,
  persona jsonb,
  card_no int NOT NULL DEFAULT 0,
  source_lists uuid[] NOT NULL DEFAULT '{}',
  computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE goat_v2.recommendations (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES goat_v2.items (id) ON DELETE CASCADE,
  score real NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);

-- Per-user AI quotas and cost visibility. Written by server routes only.
CREATE TABLE goat_v2.ai_usage (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  task text NOT NULL,
  input_tokens int NOT NULL DEFAULT 0,
  output_tokens int NOT NULL DEFAULT 0,
  cache_read_tokens int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_usage_user_day_idx ON goat_v2.ai_usage (user_id, created_at DESC);

-- updated_at on lists.
CREATE OR REPLACE FUNCTION goat_v2.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER lists_touch_updated_at BEFORE UPDATE ON goat_v2.lists
  FOR EACH ROW EXECUTE FUNCTION goat_v2.touch_updated_at();

-- A profile row for every auth user, anonymous ones included.
CREATE OR REPLACE FUNCTION goat_v2.handle_new_user() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO goat_v2.profiles (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION goat_v2.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER goat_v2_on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION goat_v2.handle_new_user();

-- Row level security: on for every table, owners write their own rows,
-- published lists are readable by anyone.
ALTER TABLE goat_v2.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE goat_v2.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE goat_v2.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE goat_v2.list_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE goat_v2.taste_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE goat_v2.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE goat_v2.ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles are public" ON goat_v2.profiles
  FOR SELECT USING (true);
CREATE POLICY "users update their own profile" ON goat_v2.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- The catalog is shared reading material. Inserts go through server routes
-- (enrichment, candidate pools), which use the service role and bypass RLS.
CREATE POLICY "items are public" ON goat_v2.items
  FOR SELECT USING (true);

CREATE POLICY "owners read their lists, anyone reads published ones" ON goat_v2.lists
  FOR SELECT USING (
    owner_id = auth.uid()
    OR (visibility <> 'private' AND published_at IS NOT NULL)
  );
CREATE POLICY "owners create lists" ON goat_v2.lists
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owners update lists" ON goat_v2.lists
  FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owners delete lists" ON goat_v2.lists
  FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY "entries follow their list's visibility" ON goat_v2.list_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM goat_v2.lists l
      WHERE l.id = list_id
        AND (l.owner_id = auth.uid() OR (l.visibility <> 'private' AND l.published_at IS NOT NULL))
    )
  );
CREATE POLICY "owners write entries" ON goat_v2.list_entries
  FOR ALL USING (
    EXISTS (SELECT 1 FROM goat_v2.lists l WHERE l.id = list_id AND l.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM goat_v2.lists l WHERE l.id = list_id AND l.owner_id = auth.uid())
  );

CREATE POLICY "users read their taste profile" ON goat_v2.taste_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users read their recommendations" ON goat_v2.recommendations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users read their ai usage" ON goat_v2.ai_usage
  FOR SELECT USING (user_id = auth.uid());

-- PostgREST access to the schema. RLS above decides which rows.
GRANT USAGE ON SCHEMA goat_v2 TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA goat_v2 TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA goat_v2 TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA goat_v2 TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA goat_v2 TO service_role;
