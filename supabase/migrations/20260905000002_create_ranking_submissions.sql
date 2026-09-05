-- ranking_submissions: the table the public v1 API has written to since the
-- routes shipped, and which no SQL in this tree created until now.
--
-- src/app/api/v1/rankings/submit/route.ts inserts a row per submission;
-- src/app/api/v1/rankings/aggregate/route.ts reads `rankings` by category and
-- optional widget_id. Both cast the client to `any` with the comment "new
-- table not yet in the generated DB types". Against a database built from
-- this tree every submit answered 500 and every aggregate answered an empty
-- consensus. Column shapes are taken from the insert in submit/route.ts.
--
-- Access: the server talks to Postgres with the ANON key
-- (src/lib/supabase/server.ts), so RLS binds on these routes too. The API key
-- gate (validateApiKey) is application-level; the policies below grant what
-- the two routes need and no more (no UPDATE, no DELETE), following the
-- convention of the sibling anon-written tables (shared_rankings). Tightening
-- this to a role predicate is an auth-model decision, recorded in the sweep
-- backlog rather than taken here.
--
-- Pinned by supabase/migrations/chain.test.ts ("every table the application
-- queries is created by SQL in the tree").

CREATE TABLE IF NOT EXISTS public.ranking_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  rankings JSONB NOT NULL DEFAULT '[]'::jsonb,
  session_id TEXT,
  widget_id TEXT,
  api_key_id TEXT,
  source_origin TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ranking_submissions_category
  ON public.ranking_submissions(category);
CREATE INDEX IF NOT EXISTS idx_ranking_submissions_widget_id
  ON public.ranking_submissions(widget_id) WHERE widget_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ranking_submissions_created_at
  ON public.ranking_submissions(created_at DESC);

ALTER TABLE public.ranking_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ranking_submissions_select" ON public.ranking_submissions;
CREATE POLICY "ranking_submissions_select"
  ON public.ranking_submissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "ranking_submissions_insert" ON public.ranking_submissions;
CREATE POLICY "ranking_submissions_insert"
  ON public.ranking_submissions FOR INSERT WITH CHECK (true);

COMMENT ON TABLE public.ranking_submissions IS
  'One row per /api/v1/rankings/submit call; aggregated by /api/v1/rankings/aggregate. Created 2026-09-05 — the routes predate the table.';
COMMENT ON COLUMN public.ranking_submissions.rankings IS
  'JSONB array of {itemId, rank} as validated by the submit route (max 100).';
