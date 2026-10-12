# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**G.O.A.T. (Greatest of All Time)** is a Next.js app for ranking anything. You name a topic, Claude fills a pool of candidates, and you rank them in four modes (Mosaic, Canvas, Spread, Stage) over one list document. Lists can be published to a public page, an embed and a social card, and your ranked lists feed a taste profile with a persona card and recommendations.

- **Product decisions:** `docs/v2/DIRECTION.md`.
- **Architecture, milestones and what each one changed:** `docs/v2/TECHNICAL_PACKAGE.md`.
- **Interactive studies the UI follows:** `docs/v2/prototypes/`.
- **Domain code and its rules:** `src/v2/README.md`.

v1 was deleted at the M7 swap. Its history is in git (the parent of the swap commit is the last tree that still had it).

## Commands

```bash
npm run dev          # http://localhost:3000
npm run build
npm run typecheck    # tsc --noEmit, blocking in CI
npm run lint         # eslint src e2e
npm test             # vitest over src/, scripts/ and supabase/; zero files executed is a failure
npm run test:e2e     # Playwright smoke: starts its own dev server, no database, fixture AI provider
npm run seed:v2      # dry run of importing v1's seed lists into goat_v2 (add `-- --apply` to write)
npm run copy:check   # the English copy gate (needs the linked native-copy skill)
```

CI (`.github/workflows/gates.yml`) runs typecheck and lint, unit tests, and the smoke suite as three jobs.

## Architecture

- **Routes:** `src/app/` is thin. `/` home, `/l/[id]` the editor (`/l/demo` needs no database), `/new` pool builder, `/me` taste profile, `/p/[slug]` published list with its social card, `/embed/[slug]` iframe view, and `/api/*` for the AI and oEmbed routes.
- **Domain code:** `src/v2/` (the name is historical). `list/` is the document, reducer, undo and sync; `editor/` the four modes; `ai/` the Claude layer; `dna/` taste math and `/me`; `publish/` sharing; `covers/`, `db/`, `auth/`, `ui/`.
- **One list document:** every edit is a `Command` through the pure reducer in `src/v2/list/reducer.ts`, and the four modes are projections of it. Add behaviour as a command, not as mode-local state.
- **Database:** Supabase, schema `goat_v2` (`supabase/migrations/20261009000000_goat_v2_baseline.sql`). Guests get anonymous sessions, so every visitor has a real `auth.uid()`. Row-level security decides visibility; `items` rows are written only by server routes with the service role.
- **AI engine switch:** `V2_AI_PROVIDER` is `fixture` (canned, no model), `cli` (the local Claude Code CLI, haiku at low effort, development only) or `claude` (the API). Unset, the API is used when `ANTHROPIC_API_KEY` is set and fixtures otherwise. CI always uses fixtures.
- **Headers:** `next.config.js` sends `X-Frame-Options: DENY` everywhere except `/embed/*`, which sends `frame-ancestors *`. Keep it that way.

## Working rules

- **Path alias:** `@/*` maps to `src/*`.
- **Env:** see `.env.example`. `SUPABASE_SERVICE_ROLE_KEY` is read only in `src/v2/ai/server.ts`; never import that module from client code.
- **Docs move with code:** the milestone notes in `docs/v2/TECHNICAL_PACKAGE.md` and the layout table in `src/v2/README.md` are the maintained records. Update them when you change what a module owns.
- **Known gaps** are listed under each milestone's "What M# changed" section in the technical package. Read them before assuming a feature is finished: the Claude API request shapes have not been run against the live API, and enrichment and hero art are not built.

## Git policy (harness-enforced)

**Commit on the current branch; never push.** The owner pushes after reading the log. Do not push, force-push, or open a pull request unless this session's prompt asks for it. This line exists because the harness's own default for an unattended session is to push and open a draft PR when the file says nothing (measured 2026-09-08: without such a line the agent pushed; with it the agent stopped at the commit). The gate bypass is denied to agents at the permission layer (`.claude/settings.json` `permissions.deny`: `--no-verify`, force-push) - do not work around it; if a gate is red, fix the tree.
