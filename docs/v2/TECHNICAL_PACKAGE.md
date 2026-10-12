# GOAT v2: technical package

Status: **draft for review** (2026-10-09; round 8 decisions applied). Product decisions live in
[`DIRECTION.md`](./DIRECTION.md); this document turns them into an
architecture, a data model, an AI layer, a port/delete plan and milestones.
Facts about v1 come from a read-only inventory of this tree on the same date.

---

## 1. What v2 is, technically

v2 is a slim app layer on the same platform: Next 16 App Router plus
Supabase (Postgres, Auth, Storage) on Vercel. It is built at `/v2` beside
v1, then swapped in.

| Built | Not built |
|---|---|
| One list document, projected into four modes: Mosaic, Canvas, Spread, Stage | Feeds, follows, comments, notifications |
| AI list creation (prompt → candidate pool), critic, gap spotter, art director, all on Claude | Challenges, badges, achievements, consensus averages |
| Taste DNA: traits per item, fingerprint, persona card (E4), recommendations | Public API/SDK, collaboration, PWA/offline, audio |
| Publishing: public list page, OG card, embed, oEmbed | Image-generation models, 3D/three.js |
| Lean CI: typecheck, lint, vitest, Playwright smoke | Ratchet, findings ledger, structural backlog, doc coupling |

**Scale of the change.** v1 is 232k LOC of TS in `src/`, with 91 API routes
and 35 store modules. About 12–15k LOC is worth porting. About 42k LOC is dead
engines, and the rest is v1 UI that the v2 shell replaces. The realistic end
state is **under 30k LOC**.

---

## 2. Architecture

```
src/
  app/
    v2/                      ← route group for the parallel build (moves to / at swap)
      layout.tsx             dark-glass shell, fonts, providers
      page.tsx               home: your lists + "start a list" prompt
      new/page.tsx           prompt → candidate pool → prune
      l/[id]/page.tsx        the editor: one list, four modes
      p/[slug]/page.tsx      public published list (SSR, read-only, any mode)
      me/page.tsx            profile: E4 persona card + recommendations
      embed/[slug]/page.tsx  embeddable widget (own CSP: frame-ancestors *)
    api/v2/
      pool/route.ts          POST: stream candidates (NDJSON)
      critic/route.ts        POST: stream critic chat
      gaps/route.ts          POST: gap-spotter suggestions
      dna/route.ts           POST: recompute fingerprint + persona
      recs/route.ts          GET/POST: recommendations
      og/[slug]/route.tsx    OG image (node runtime, anon key + public RLS)
      oembed/route.ts
  v2/                        ← all v2 domain code; v1 must not import it and it must not import v1
    list/                    ListDoc type, commands, reducer, projections, undo
    modes/                   mosaic/ canvas/ spread/ stage/ (UI per mode)
    covers/                  ArtDirection type + <Cover/> renderer (CSS/SVG) + OG variant
    dna/                     trait math, axes, persona types, <PersonaCard/> (E4)
    ai/                      Claude client, task modules, schemas, prompts
    enrichment/              ported fetchers (TMDB, IGDB, Spotify, Wikipedia, OpenLibrary)
    db/                      supabase clients, generated types, queries
    ui/                      glass primitives, tokens (from docs/v2/prototypes/shared.css)
```

**The isolation rule.** An eslint `no-restricted-imports` rule enforces it in
both directions: `src/v2/**` and `src/app/v2/**` may not import from v1 paths,
and v1 may not import from `src/v2/**`. A module is ported by moving or
copying it into `src/v2/`, never by importing it across. At swap time the
route group moves to the root and v1 is deleted as whole directories.

### 2.1 The list document: one state model, four projections

This is the core design decision. Study F (`docs/v2/prototypes/modes.html`)
proves it in the browser.

```ts
type ListDoc = {
  id: string;
  title: string;
  topic: string;               // free text ("90s sci-fi films"), not an enum
  kind: "ranking" | "awards";
  size: 10 | 25 | 50;
  order: ItemId[];             // canonical ranking; index 0 = #1
  pool: ItemId[];              // candidates not ranked yet
  tiers: { name: string; until: number }[]; // cut lines by rank: GOAT ≤3, Essential ≤10, ...
  canvasX: Record<ItemId, number>; // Canvas-only horizontal placement (0..1)
  notes: Record<ItemId, string>;
  stagePreset: "podium" | "rushmore" | "throne";
  categories?: { id: string; name: string; order: ItemId[] }[]; // awards only
  heroArt?: ArtDirection;
};
```

- **Every edit is a command.** The commands are `insert(id, at)`,
  `move(id, to)`, `remove(id)`, `setTierCut(i, until)`, `setX(id, x)`,
  `setNote(id, text)`, `resolveFaceoff(winner, loser)`,
  `applyTournament(order8)`, `setPreset(p)` and `setSize(n)`. A pure reducer
  applies them, so every mode shares the same undo stack and the same tests.
- **Modes are pure projections.** `projectMosaic(doc)`, `projectCanvas(doc)`,
  `projectSpread(doc)` and `projectStage(doc)` return layout boxes, and the
  mode components render those boxes. Tiers mean the same thing everywhere:
  Canvas bands, Mosaic section headers, Spread dividers. Stage shows the
  preset's spots plus an ensemble.
- **The mode switch morph.** Each item renders with a framer-motion
  `layoutId={itemId}`, so switching modes animates the same objects between
  layouts (shared-element transition) with no hand-written FLIP. Under
  `prefers-reduced-motion` the switch is instant.
- **Drag.**
  - Mosaic, Spread and Stage use `@dnd-kit/core`. It gives keyboard and
    screen-reader sensors and collision detection.
  - Canvas uses a small custom pointer handler (free 2D placement, where
    height maps to rank), because sortable semantics don't fit it.
  - Velocity tilt, held-card shadows and spring snaps are shared motion
    presets lifted from the prototypes.
- **Store.** One zustand store holds `ListDoc` and the undo stack.
  - A command log is persisted to IndexedDB, so a reload restores work.
  - A debounced sync writes to Supabase. Last-write-wins per list is enough:
    there is no collaboration.
  - TanStack Query covers server reads only (home, public pages,
    recommendations).
  - This replaces v1's grid, session, item, backlog, match, ranking and undo
    stores (about 8k LOC).
- **Awards** are a `ListDoc` with `categories`. Each category is a small
  ranking that can open in any mode. Spread is the default presentation for
  awards: the ceremony programme.

### 2.2 Generative covers (the art director's canvas)

Claude can't make images, so every item carries an **ArtDirection**:

```ts
type ArtDirection = {
  hues: [number, number];          // 0–360
  motif: "sun" | "rings" | "grid" | "slash" | "moon" | "shard" | /* grows over time */ string;
  composition: "centered" | "horizon" | "diagonal" | "scatter";
  type: { case: "upper" | "title"; weight: 700 | 800 | 900; tracking: number };
  mood: string;                    // one line, for alt text + debugging
};
```

- `<Cover art={…} title year />` renders it with CSS and SVG, in the house
  style proven in `shared.css`.
- An OG-safe variant renders through `next/og` (Satori). It may use only
  linear and radial gradients plus SVG motifs: Satori has no
  `conic-gradient`, `mask` or blend modes.
- **Real art first** (decided in round 8). When enrichment finds artwork
  (TMDB, IGDB, Spotify, Wikipedia, OpenLibrary), `<Cover/>` shows it, with
  the item's ArtDirection hues still driving glows and backdrops. The
  generative cover is the fallback, and is also used in the OG card when
  the image can't be fetched.
- **Image handling.** Images are copied into Supabase Storage at enrichment
  time rather than hotlinked, so pages and OG renders don't depend on
  third-party uptime.
- **Attribution.** Sources that require it (TMDB, for example) get a
  credit on the public page.

---

## 3. Data model: a fresh baseline

The v1 schema cannot be rebuilt from this repo:
- It is split between `db/*.sql` and `supabase/migrations/`.
- `public.users`, `category_enum` and `rerank_list_items()` exist in
  production but nowhere in the tree.
- `types/database.ts` is hand-written, with Clerk-era columns.

**So v2 starts a fresh migration baseline under `supabase/migrations/`, with
generated types (`supabase gen types --schema goat_v2`).**

- **Where it lives.** Per round 8, v2 shares the existing Supabase project
  but lives in its own Postgres schema, `goat_v2`, which must be added to the
  API's exposed schemas. The supabase-js clients use
  `{ db: { schema: "goat_v2" } }`.
- **v1 stays untouched.** v1 tables in `public` are left alone until the
  swap.
- **At the swap,** either keep the schema or move the tables to `public`.

```sql
-- identity: Supabase Auth only. Guests use anonymous sign-in; signing up later
-- links the identity, so the user id never changes (replaces v1's localStorage
-- UUIDs + /api/auth/merge-guest).
profiles      (id uuid pk → auth.users, handle text unique, display_name text, created_at)

-- catalog: any topic, so no category enum. Dedup by normalized title+year+creator within a topic.
items         (id uuid pk, topic text, title text, year int, creator text,
               external_ids jsonb, image_url text, art jsonb /* ArtDirection */,
               traits text[], trait_weights jsonb, created_by uuid, created_at)

lists         (id uuid pk, owner_id uuid → auth.users, title text, topic text,
               kind text check (kind in ('ranking','awards')), size int check (size in (10,25,50)),
               tiers jsonb, stage_preset text, hero_art jsonb, parent_id uuid → lists /* award categories */,
               visibility text check (visibility in ('private','unlisted','public')),
               slug text unique, published_at timestamptz, updated_at timestamptz)

list_entries  (list_id uuid → lists on delete cascade, item_id uuid → items,
               position int null  /* null = in pool */, canvas_x real, note text,
               primary key (list_id, item_id),
               unique (list_id, position) deferrable initially deferred)

taste_profiles(user_id uuid pk → auth.users, traits jsonb, axes jsonb,
               persona jsonb /* {name, tagline, evidence[]} */, card_no int,
               source_lists uuid[], computed_at timestamptz)

recommendations(user_id uuid, item_id uuid, score real, reason text, created_at,
               primary key (user_id, item_id))

ai_usage      (id bigserial, user_id uuid, task text, input_tokens int, output_tokens int,
               cache_read_tokens int, created_at)   -- quotas + cost visibility
```

- **RLS.**
  - Owners read and write their own rows.
  - Anyone reads `lists` and `list_entries` where
    `visibility <> 'private' AND published_at IS NOT NULL`.
  - `items` are readable by everyone.
  - Writes to `items` go through server routes.
  - The service-role key never ships to edge or client code. Today v1 uses it
    in 7 files.
- **Publishing.** Publishing sets `slug`, `visibility` and `published_at`. A
  public page reads the live list, so v1's `shared_rankings` snapshot table
  isn't needed. Forking copies the list.
- **Kept from v1 as ideas, not tables:** the award sub-lists
  (`parent_id`), the deferrable `(list_id, position)` uniqueness, and the
  `replace_list_items` RPC pattern for atomic reorders.

---

## 4. The AI layer (Claude)

Code lives in `src/v2/ai/` with one `new Anthropic()` client (from
`@anthropic-ai/sdk`). It runs server-side only, in route handlers on the
Node runtime.

- **Model:** `claude-opus-5-5` for every task. Depth is tuned per task with
  `output_config.effort`. Opus 5.5 defaults to `medium`, so set it
  explicitly.
- **Price:** $4 / $20 per MTok, cache reads $0.20.
- **Thinking:** always on (adaptive); it cannot be disabled on this model.
- **Fallbacks:** every request sends `fallbacks: "default"` with the beta
  `server-side-fallback-2026-07-01`. A safety-classifier refusal (for
  example, a list topic like "most dangerous chemicals") is then retried on a
  suitable model instead of failing. Responses are checked for
  `stop_reason === "refusal"` before reading content.

| Task | Trigger | Shape | Effort | Tools | Notes |
|---|---|---|---|---|---|
| **Candidate pool** | "Start a list" prompt | Agentic loop with one strict client tool, `propose_candidate({title, year, creator, why, traits[3], art})`, called once per candidate; the route streams each one to the UI as NDJSON as it arrives | `medium` | `web_search_20260209` (grounding), `propose_candidate` (`strict: true`, `eager_input_streaming: true`) | ~30 candidates. Also returns list `heroArt`. Traits and ArtDirection come in the same call, so the art director and trait tagger cost nothing extra here. Ported from v1's `api/studio/generate` (prompt and NDJSON pattern), with Gemini removed. |
| **Enrichment** | after pool | Deterministic fetchers (ported) | — | — | TMDB, IGDB, Spotify, Wikipedia and OpenLibrary fill ids, years and image_url. No LLM unless matching is ambiguous. |
| **Critic / debate** | "Challenge me" in the editor | Streaming chat | `low`–`medium` | none | The system prompt plus list snapshot is cached (`cache_control`). When the list changes mid-chat, append a `role: "system"` message with the diff instead of rewriting the prefix, so the cache holds. Ported from v1's `lib/debate` with the client swapped. |
| **Gap spotter** | on demand, or after 10 placements | Single call, structured output (`output_config.format`, zod) → `{title, year, why}[]` (up to 5) | `medium` | `web_search_20260209` (optional) | Suggestions land in the pool, never in the ranking. |
| **Trait tagging** (custom or imported items) | item added outside the pool flow | **Message Batches API** (50% cost, async) | `low` | none | Pool candidates already carry traits; batches cover the rest. |
| **Persona writer** | after publish, or on demand from the profile | Single call, structured output → `{name, tagline, evidence[3]}` | `high` | none | Input: the fingerprint (traits, axes) plus the top items as evidence. Output is stored in `taste_profiles.persona`, and `card_no` increments per regeneration. |
| **Recommendations** | profile load (cached for 24h) | Single call, structured output → `{title, year, creator, reason, traits}[]` (up to 10) | `medium` | `web_search_20260209` | Scored locally by trait overlap (cosine over trait weights) before display, so the match % is ours rather than the model's. |

**Guardrails.**
- **Quotas:** per-user daily limits on each task, kept in `ai_usage`
  (Postgres, so they hold across serverless instances). v1's in-memory
  limiter covered only 5 routes.
- **Caching:** stable system prompts per task, kept free of timestamps and
  ids so prompt caching actually hits. Hits are verified with
  `usage.cache_read_input_tokens` in the `ai_usage` log.
- **Errors:** the SDK's typed errors map to one slim API error helper, a
  ported and trimmed version of `lib/errors/api-error-handler.ts`.
- **Cost knob (your call, not assumed):** a cheaper model for bulk trait
  tagging (e.g. `claude-haiku-5-5`) is an option once tagging volume is
  real. v2 starts on Opus 5.5 everywhere.

---

## 5. Taste DNA

This is pure, tested math in `src/v2/dna/`, ported from the study E
prototype:

1. **Trait weights.** For each published list, rank weight
   `w = (size + 1 − rank) / size`. A recency decay favours newer lists. Sum
   `w` per trait across items, then normalise to 0–1. Keep the top 8, and
   treat the rest as minor.
2. **Axes.**
   - Classic ↔ modern: the weighted mean year.
   - Mainstream ↔ obscure: the inverse of popularity. Popularity comes from
     enrichment sources (TMDB popularity, IGDB rating count), with Claude's
     estimate as a fallback.
3. **Persona.** The Claude task above.
4. **Card.** `<PersonaCard/>` (E4) is the profile centrepiece. It has an SVG
   radar of the top 6 traits, a CSS holographic sheen, and a card number that
   increments on each regeneration.
5. **Recommendations.** The Claude task above, then local scoring.

The Universal ELO engine (`lib/ranking-graph/UniversalRatingEngine.ts`, 280
LOC, pure) is ported for later. It can turn many users' face-offs into
item strength, but v2 doesn't depend on it.

---

## 6. Publishing surface

- **`/p/[slug]`:** an SSR read-only page that renders the list in the
  owner's chosen mode, with a mode switcher for visitors. It has a fork
  button and the owner's persona chip.
- **OG card:** `next/og` on the **Node** runtime with the anon key and public
  RLS. v1 ran it on Edge with the service-role key, and it threw at module
  load when env vars were missing. Layout: title, the top 5 as generative
  covers, and a mini persona chip.
- **Embed:** `/embed/[slug]`, a compact Mosaic or Spread.
  - v1 sends `X-Frame-Options: DENY` on every route in `next.config.js`, which
    blocks every embed. v2 scopes it: `frame-ancestors *` for `/embed/*`
    only, and DENY elsewhere.
  - v1's embed route served mock data, so this is a rewrite.
- **oEmbed:** ported, with real metadata. v1's `fetchListMetadata` was a
  placeholder.
- **Share codes:** replaced by slugs. v1's codes didn't agree (TS made 12
  characters, SQL made 8).

---

## 7. Port and delete plan

### Port into `src/v2/` (about 12–15k LOC)

| v1 module | LOC | Action |
|---|---|---|
| `src/lib/enrichment/` (pipeline, router, TMDB/IGDB/Spotify/Wikipedia fetchers) | 4,093 | Port with changes: relabel the `gemini` source, cut the `category-config` → `lucide-react` import, fold in `lib/api/wiki-images.ts` (151), add OpenLibrary. |
| `lib/supabase/client.ts`, `server.ts`, `middleware.ts` | ~190 | Port as-is. `middleware.ts` → `proxy.ts` (Next 16). Regenerate types. |
| `Match/sub_MatchBracket/lib/seedingEngine.ts` + `bracketGenerator.ts` | 1,311 | Port as-is into Stage tournament logic. Drop the `consensus` seeding strategy. |
| `lib/tiers/boundary.ts` (+ one calculator) | ~400 | Port into the tier cuts used by Canvas and Mosaic. Presets are duplicated three ways, so keep one. |
| `lib/debate/` | 360 | Port with the client swapped to Claude, and add a rate limit. |
| `api/studio/generate/route.ts` | 513 | Rewrite on Claude. Keep the prompt ideas, NDJSON streaming and the DB title-match logic. |
| `lib/errors/api-error-handler.ts` | 460 | Trim into one helper. |
| `lib/api/client.ts` | 413 | Port fetch + request-id. Drop `goat-api.ts` (853) and `CircuitBreaker` (453). |
| `lib/ranking-graph/UniversalRatingEngine.ts` | 280 | Port, parked for later. |
| `api/oembed/route.ts` | 149 | Port with real metadata. |
| `undo-store` concept (+ `lib/undo`) | ~1,100 | Re-implement as the command log, not a port. |

### Delete at swap (dead engines, about 42k LOC)

| Area | LOC | Why |
|---|---|---|
| AI image generation: `lib/image-gen`, `generate-ai-image`, result-image, `leonardo.ts` | 5,795 | No live UI caller; image models are out of scope |
| Consensus (lib, api, store, overlays) | 4,272 | **Fabricates data with `Math.random`** |
| Challenges | 3,518 | No UI |
| Personalization | 3,429 | Replaced by Taste DNA |
| Achievements + badges | 3,256 | Mock data |
| Public v1 API/SDK/widget | 3,049 | Hard-coded demo keys |
| `lib/sharing` platforms/managers | 2,889 | Replaced by slugs + OG |
| Offline/PWA/sync | 2,647 | Out of scope |
| Unused OG layouts, cache, `share/og-image` | 1,787 | Dead |
| Feedback pipeline | 1,744 | Replaced by the slim error helper |
| Touch gestures | 1,648 | Desktop-first |
| Ranking-graph (minus the engine), `lib/ranking/` | ~2,780 | No importers |
| Agent-bridge | 1,357 | Out of scope |
| Activities | 1,085 | **Fake usernames** |
| Audio, `components/3d`, collaboration, analytics | ~2,985 | Unused or out of scope |

After v2 reaches parity, all v1 UI goes too (Match 34.5k, Collection 9.6k,
Landing 8.5k, Collections 3.1k, CommandPalette 2.4k, filters and faceted
search 13.6k, `lib/layout` 5.8k), along with every v1 store except what
was ported.

### Dependencies

| Change | Packages |
|---|---|
| **Add** | `@anthropic-ai/sdk` |
| **Keep** | next, react, `@supabase/ssr`, supabase-js, `@tanstack/react-query`, zustand, zod, `@dnd-kit/core` and sortable, framer-motion, tailwind, clsx, tailwind-merge, cva, lucide-react, `@zumer/snapdom` (client PNG export), vitest, playwright, typescript, eslint, tsx; `@sentry/nextjs` optional (below) |
| **Drop** | `@google/genai`, three, `@react-three/*`, `@types/three`, html2canvas, recharts (the radar is SVG), Storybook (7 packages + loaders, for 1 story), next-themes (dark-only), `@dnd-kit/modifiers`, zod-to-json-schema, react-virtual, fuse.js, immer, uuid (`crypto.randomUUID`), pg and better-sqlite3 |

---

## 8. Quality gates and tooling (lean core)

| Keep | Retire at swap |
|---|---|
| `tsc --noEmit` (blocking) | `scripts/ratchet.mjs` + `.ai/ratchet-baseline.json` |
| eslint, including the v1↔v2 isolation rule | `scripts/findings.mjs` + `.ai/findings.json` + `docs/harness/` (62 files) |
| vitest with `passWithNoTests: false`. Required coverage: the list reducer, projections, DNA math and AI schema parsing | `scripts/structural-backlog.mjs`, `scripts/doc-coupling.mjs`, the store-graph generator, `src/stores/registry.ts` |
| Playwright smoke: create a list from fixtures, rank in each mode, publish, open the public page. AI calls are stubbed by a recorded-fixture provider, so CI never calls Claude. | `context/`, `context-map.json`, most of `.ai/` |
| A short, accurate CLAUDE.md for v2 | v1 CLAUDE.md sections describing retired gates |

CI drops to one workflow with three jobs (typecheck+lint, unit, smoke). The
current e2e job expects Clerk secrets, but the app uses Supabase auth.

**Sentry.**
- v1's client init lives in `sentry.client.config.ts`, with no
  `instrumentation-client.ts`, so it likely never runs under Turbopack.
- `next.config.js` carries webpack-only options and a hard-coded org.

Either fix it properly in v2 (`instrumentation.ts` +
`instrumentation-client.ts`) or drop it; it's optional for a showcase.

---

## 9. Risks and actions

| # | Item | Severity | Action |
|---|---|---|---|
| 1 | Commit `4d4c14c` ("Games seed") contains a Supabase pooler URL **with its password** (project `pvfwxilvzjzzjhdcpucu`). `db/README.md` already says it must be rotated. | **High** | **You:** confirm the database password was rotated in the Supabase dashboard. Rewriting git history is optional once the secret is dead. |
| 2 | The v1 schema can't be rebuilt from the repo | High | Fresh v2 baseline in the `goat_v2` schema (§3) |
| 3 | `X-Frame-Options: DENY` everywhere blocks embeds | Medium | A route-scoped CSP in v2 |
| 4 | v1 RLS policies are `USING (true)` because guests had no session | Medium | Anonymous auth gives every guest a real `auth.uid()` |
| 5 | The service-role key is used in 7 files, including edge OG | Medium | Server-only module; OG uses anon + RLS |
| 6 | AI cost runaway | Medium | `ai_usage` quotas, caching, batches for bulk work |
| 7 | Satori can't render every cover effect | Low | An OG-safe cover variant (§2.2) |
| 8 | Repo junk: `database/goals.db` | Low | Deleted in M0. (`CUsersmkdoldollagoattemp_items.json` turned out to be an untracked local file, not repo content.) |

### Open decisions

Decided in round 8:
- Same project, `goat_v2` schema.
- Real art first.
- Import the v1 seed lists. This adds `scripts/v2/import-v1-seeds.ts` to M1:
  it reads v1 `lists`, `items` and `list_items` (plus the awards event's
  `parent_list_id` children) and writes `goat_v2` rows with ArtDirection
  generated in one Claude batch.

Still open:
1. **A cheaper model for bulk tagging** (§4), once volume is known.

---

## 10. Milestones

### What M7 changed from the plan above

- **Routes.** `/v2` became `/`: `/`, `/l/[id]`, `/new`, `/me`. The AI routes
  moved from `/api/v2/*` to `/api/*`. `/p/[slug]` and `/embed/[slug]` were
  already at the root. `src/v2` keeps its name as the domain-code folder.
- **Deleted.** All of v1's `src` (1,079 files: the Match, Collection, Landing
  and Collections features, every v1 store, hook, lib and component, the v1
  API routes, Clerk-era auth and providers, the offline/PWA files, the
  middleware and the Sentry config), the v1 `e2e` suite and its Playwright
  config, Storybook, Tailwind and PostCSS, `db/` (the seed SQL and scripts,
  including the file that held a leaked pooler URL), `public/` (77 v1 assets),
  every `scripts/` file except the seed importer, `docs/` except `v2` and
  `i18n`, `context/`, `context-map.json`, `knip.json`, the custom eslint rule,
  and a stray junk file in the repo root.
- **Gates retired:** the lint ratchet and its baseline, the findings ledger,
  the structural backlog, doc coupling, the store graph generator and the
  v1/v2 isolation rule and its test. Their baselines under `.ai/` are gone.
- **Kept:** typecheck, eslint (now `core-web-vitals`, jsx-a11y, unused-imports
  and import order, with 0 findings), vitest (130 tests, plus the migration
  chain test) and the Playwright smoke suite, now `e2e/` with
  `playwright.config.ts`. CI is one workflow with three jobs.
- **Dependencies.** 62 packages declared became 22 (10 runtime, 12 dev),
  chosen from what the code imports. Not carried over from the plan's keep
  list because nothing imports them: `@tanstack/react-query`, `lucide-react`,
  `@zumer/snapdom`, `@dnd-kit/sortable`, clsx, tailwind-merge and cva. Add
  them back when a feature needs them.
- **No Tailwind.** v1's preflight was resetting the page under v2's styles, so
  `src/v2/ui/base.css` carries the subset v2 relies on. Before and after
  screenshots of the home page, the editor in Mosaic and Spread, the critic,
  the pool builder and the profile differ only by a 2px placeholder shift and
  by v1's floating button, which is gone.
- **No middleware.** v1's session-refresh middleware is gone; the browser
  client refreshes its own guest session and the public pages read with the
  anon key and no cookies.
- **Build.** `next build` compiles with exactly these routes: `/`, `/l/[id]`,
  `/new`, `/me`, `/p/[slug]` (and its image), `/embed/[slug]` and the seven
  `/api/*` routes.
- **Left for you.**
  - `.ai/registry-map.json`, `.ai/registry-leads.jsonl` and the consult ledger
    still join the registry to v1 contexts. They need a rescan against the new
    tree; `context-map.json` was deleted per this plan.
  - `docs/i18n/copy-contract.json` now points at the v2 UI sources (131
    strings, 0 errors, 9 ellipsis warnings), and its baseline still lists 8
    entries the new tree no longer produces.
  - The leaked pooler password in an old commit must still be rotated (risk
    #1); deleting `db/` does not remove it from history.
  - Supabase sync, the seed import and every Claude API request shape remain
    unverified against real services.

### What M6 changed from the plan above

- **Publishing.** The editor's **Share** button (shown for your own list when
  signed in) pushes the list, then claims a slug from the title
  (`the-greatest-rpgs-ever-made`, with a random tail if taken) and sets
  `visibility` to `unlisted` or `public`. A list keeps its slug when it is
  republished or switched, so links survive; Unpublish returns it to private.
  The panel also gives the link and an iframe snippet for each embed mode.
- **`/p/<slug>`.** Server-rendered with the anon key (row-level security
  decides what a stranger sees), then the read-only editor with the mode
  switcher. "Make it mine" forks it for a signed-in visitor. Metadata carries
  the title, the top three, a `summary_large_image` card and an oEmbed
  discovery link. Unlisted pages are `noindex`.
- **Social card.** `opengraph-image.tsx` on the Node runtime with the anon
  key, using an OG-safe cover (a two-hue gradient with the rank and title)
  rather than the generative cover, which Satori cannot draw. A render of the
  demo list is a 1200 by 630 PNG.
- **Embed.** `/embed/<slug>` is a static, server-rendered compact Mosaic or
  Spread (`?mode=spread`), not the editor's components, which need drag and
  drop and a store. `next.config.js` now sends `X-Frame-Options: DENY` on
  everything except `/embed/*`, which gets `Content-Security-Policy:
  frame-ancestors *`.
- **oEmbed.** `GET /api/v2/oembed?url=` answers only for published lists on
  this site, with a `rich` response whose html is an escaped iframe, sizes
  clamped by `maxwidth` and `maxheight`.
- **Shell.** `/p` and `/embed` use the v2 shell (`V2Shell`) and skip v1's
  chrome through the same two seams as `/v2`; the isolation lint rule covers
  `src/app/p` and `src/app/embed`. These routes move with `/v2` at the swap.
- **Not built:** the owner's persona chip on `/p/<slug>`, because
  `taste_profiles` is readable only by its owner and a public read needs a
  policy or a server route that this slice does not add. The Taste DNA
  "published lists only" filter is also not applied, so every list with three
  ranked items still counts.
- **Unverified.** Nothing here has run against a real Supabase project: the
  publish, `/p/<slug>`, embed and oEmbed paths are covered by a fake client,
  static rendering tests and the 404 and framing checks. `e2e-v2/framing.spec.ts`
  is its own file because it must turn off Chrome's local-network checks.

### What M5 changed from the plan above

- **Where it lives.** `src/v2/dna/`: `dna.ts` (pure math, tested), `source.ts`
  (gathers lists), `cache.ts`, `PersonaCard.tsx`, `MeRoute.tsx`. The model
  side is `src/v2/ai/taste.ts` behind `POST /api/v2/persona` and
  `POST /api/v2/recommend`.
- **Which lists count.** The plan says published lists. Publishing is M6, so
  until then every list with at least three ranked items counts: the ones
  saved in this browser (including the demo once you edit it) and your own
  on the server. The card says how many lists it was built from.
- **Math.** Rank weight `(size + 1 - rank) / size`, a recency factor that
  halves each year with a floor of 0.3, per-trait sums normalised to the
  strongest, top 8 kept. The classic-to-modern axis is the weighted mean year
  mapped over 1950 to 2025.
- **Not built:** the mainstream-to-obscure axis. It needs popularity from
  enrichment sources, which are not ported yet, so the card shows the era
  axis only.
- **Match %.** Computed on the server as cosine similarity between the trait
  weights and the item's traits, and the list is ordered by it; the model
  only proposes items and reasons.
- **Card numbers.** Signed in, `taste_profiles.card_no` counts up per
  regeneration and the profile is stored. Without an account the browser's
  last number plus one is used. The persona and the recommendations are cached
  in this browser by taste fingerprint, and recommendations are reused for 24
  hours.
- **Over-long model text is clipped, not rejected.** The first live CLI run
  returned a 150-character tagline against a 140 limit and the whole persona
  failed to parse; the schema now clips at a word boundary.
- **Quotas.** `persona` 5 and `recommend` 10 per user per rolling 24 hours.
- **Unverified.** The Claude API calls use the same untested request shapes as
  M4; the CLI engine proves the prompts and parsing, not those shapes.

### What M4 changed from the plan above

- **Items now get uuid ids and rows (a fix to M3).** M3 named candidates with
  slugs and never wrote `goat_v2.items`, so an AI-made list could not sync.
  The server now assigns `itemUuid(topic, title, year)` (uuid v5, so the same
  item for the same topic is one row) and upserts the rows through the
  service role, because clients can read `items` but not write them.
- **Critic.** `POST /api/v2/critic` streams NDJSON `delta` events. The browser
  sends the list as it was at the first question, frozen, plus the chat; an
  edit between questions goes as a `change` turn that the server places as a
  `role: "system"` message after the next user turn (a system message must
  follow a user message). `buildCriticMessages` has a test that earlier
  messages stay byte-identical as the chat grows, which is what keeps the
  cache prefix valid. The cache read count comes back on `done` and is logged
  to `ai_usage`.
- **Gap spotter.** `POST /api/v2/gaps` makes one structured-output call
  (`output_config.format`, no web search in this slice) and drops anything
  already listed. The result is added with one `addToPool` command, so it is
  one undo step. It runs on demand from the pool; the automatic "after 10
  placements" trigger is not built.
- **Batch tagging.** `src/v2/ai/tagging.ts` and `/api/v2/tag` start and read a
  Message Batches job (`POST`, then `GET ?batch=`). Nothing in the editor
  calls it yet, because v2 has no way to add a custom item.
- **Quotas.** `critic` 60, `gaps` 20 and `tag` 10 per user per rolling 24
  hours, alongside `pool` 10.
- **Local engine without a key.** `V2_AI_PROVIDER=cli` runs the Claude Code
  CLI (`claude -p`, haiku, low effort, no tools, no settings, system prompt
  replaced, scratch working directory) behind the same pool, critic and gap
  providers. It is development only (refused when `NODE_ENV=production`) and
  is not metered. A short live run returned 6 pool candidates in 16s, a
  critic reply and 5 gap suggestions; the pool is parsed from one JSON
  object per line, the chat is flattened to a transcript, and nothing here
  exercises the API request shapes below.
- **Unverified.** As in M3, none of the Claude API paths have run against the
  API. In particular: mid-conversation `system` messages through
  `beta.messages.stream`, `output_config.format` with adaptive thinking, and
  batch requests carrying `output_config`.

### What M3 changed from the plan above

- **Route and files.** `src/app/api/v2/pool/route.ts` is the only route.
  `src/v2/ai/` holds `candidate.ts` (zod schema, JSON Schema for the tool,
  `docFromCandidates`), `events.ts` (NDJSON), `pool.ts` (system prompt,
  `claudeProvider`, `fixtureProvider`), `quota.ts`, `server.ts` (service-role
  access for `ai_usage`) and `client.ts` (the browser stream reader). The
  isolation lint rule now covers `src/app/api/v2/**` in both directions.
- **Provider choice.** `V2_AI_PROVIDER=fixture|claude` wins; otherwise the
  route uses Claude when `ANTHROPIC_API_KEY` is set and the fixture provider
  when it is not. The fixture provider needs no account and spends nothing,
  which is what CI and a fresh checkout use.
- **Quota.** 10 pool builds per user per rolling 24 hours, counted from
  `ai_usage`. Only the Claude provider is metered, and it needs a bearer
  token (a guest session is enough). When `SUPABASE_SERVICE_ROLE_KEY` is not
  set, accounting is skipped rather than failing the request.
- **New lists open from this browser first.** `/v2/new` saves the list to
  IndexedDB under a fresh UUID and opens `/v2/l/<id>`; the editor loads that
  copy when the server has none and syncs it as soon as a session exists.
  A candidate's one-sentence reason becomes the item's note.
- **Not in this slice:** enrichment (TMDB, IGDB, Spotify, Wikipedia,
  OpenLibrary) and list `heroArt` are not ported yet, so items carry no
  `imageUrl` and the generative cover shows. Prompt-cache hits are logged
  (`cache_read_tokens`) but not asserted anywhere.
- **Unverified.** `claudeProvider` typechecks against the SDK but has not
  run against the API: the model id, `fallbacks: "default"` with beta
  `server-side-fallback-2026-07-01`, and `eager_input_streaming` on a strict
  tool come from the vendor docs, not from a live response.

### What M2 changed from the plan above

- **The tournament is a new 80-line engine** (`src/v2/list/tournament.ts`),
  not a port of v1's 1,311-line bracket generator. A top-8 single
  elimination is all Stage needs. Seeding is 1v8, 4v5, 2v7, 3v6. The result
  ranks the champion, the runner-up, then each round's losers by seed.
- **Face-offs reuse `place`.** If the challenger wins it takes the spot; if
  the incumbent holds, the challenger lands right below. A tournament result
  is one `reorder` command, so it is a single undo step.
- **Canvas drops are one `place` command carrying `x`.** Height picks the
  rank (`rankIndexAt` over the tier bands), and sideways position is kept per
  item. While a tier line is dragged, the band layout is frozen at the start,
  so the line follows the pointer rather than the reflowing bands.
- **New document fields:** `canvasX` and `stagePreset`, stored in
  `list_entries.canvas_x` and `lists.stage_preset`. Saves from M1 are
  upgraded on load (`normalizeDoc`).
- **CI:** `v2-smoke` runs `npx playwright test -c playwright.v2.config.ts`
  with no database, because the demo list lives in the browser. Locally,
  set `PW_CHROMIUM_PATH` to use a browser that is already installed.

### What M1 changed from the plan above

- **Local persistence saves snapshots, not a command log.** IndexedDB stores
  the whole undo history (up to 100 states) plus the items. A document is a
  few kilobytes, so this is simpler than replaying commands, and a reload
  keeps undo.
- **ArtDirection is `{ hues, motif }` for now.** Composition, type and mood
  arrive with Claude's art director in M3. Until then `fallbackArt(title)`
  derives a stable cover, and real artwork is shown first when `image_url`
  is set.
- **The pool has no stored order in Supabase.** Pool rows carry a null
  position and load alphabetically.
- **Your own list opens from this browser's copy when one exists.** It is
  always at least as fresh as the server's, because every edit lands locally
  first. Edits made on another device can be overwritten
  (last write wins), which is acceptable while there is no collaboration.
- **Dragging uses `@dnd-kit/core`** (draggable covers, droppable ranks and
  pool) **plus framer-motion `layoutId`**, so covers travel between ranks and
  between modes. Spread and Mosaic share one `Card` component.
- **Seed import:** `npm run seed:v2` (a dry run) and `npm run seed:v2 --
  --apply`. Ids are kept, so a re-run updates in place. Lists are published
  as public starters owned by a seed curator account the script creates.


Each milestone ends with a demoable `/v2` and green CI. Rough sizes assume
one developer plus agents.

| # | Milestone | Scope | Exit criteria |
|---|---|---|---|
| **M0** ✅ | Ground | `src/v2` + `/v2` route, isolation lint rule (both directions, proved by `src/v2/isolation.test.ts`), design tokens + fonts, `goat_v2` baseline migration with RLS (guarded by `supabase/migrations/goat_v2_baseline.test.ts`), anonymous guest sessions, v1 chrome seam, repo junk removed | **Done 2026-10-09.** `/v2` renders the glass shell and its session state. Every existing CI gate is green. Lean CI: the existing `gates.yml` already runs typecheck, lint and vitest over `src/v2`. The heavier jobs (ratchet, findings, structure, doc coupling) stay until v1 is deleted at M7, because they guard v1 code. |
| **M1** ✅ | List core | `ListDoc`, commands, reducer, undo, local persistence, Supabase sync; **Spread** and **Mosaic**; `<Cover/>`; v1 seed import | **Done 2026-10-11.** `/v2/l/demo` ranks the 50-RPG demo in Mosaic and Spread with drag, keyboard and undo, and survives a reload with undo intact. Verified in Chromium (11 checks) plus 37 unit tests. Supabase sync and `npm run seed:v2` are written and unit-tested but **not yet run against a real database**. |
| **M2** ✅ | All four modes | **Canvas** (tier bands, draggable and renamable tier lines), **Stage** (Podium / Rushmore / Throne, face-off, tournament), the mode morph, keyboard paths | **Done 2026-10-11.** The Playwright smoke (`e2e-v2/smoke.spec.ts`, now the `v2-smoke` CI job) ranks in every mode, runs a face-off and a full 8-seed tournament, then reloads and undoes. |
| **M3** ✅ | AI creation | Claude client, `/api/v2/pool` (web search + `propose_candidate` streaming), ported enrichment, `/v2/new` prune UI, quotas, fixture provider for CI | **Built 2026-10-12, live Claude path not yet exercised.** `/v2/new` streams a pool, lets you drop candidates and opens the list in the editor; unit tests and the `v2-smoke` job run it on the fixture provider. Enrichment, hero art and the live model call are open, see "What M3 changed". |
| **M4** ✅ | Co-curator | Critic chat (cached and streaming), gap spotter, Batches tagging for custom items | **Built 2026-10-12, live Claude paths not yet exercised.** "Challenge me" streams a critic that is sent the list once and later edits as diffs; "Find gaps" adds up to five suggestions to the front of the pool. Batch tagging exists server-side only. See "What M4 changed". |
| **M5** ✅ | Taste DNA | DNA math, `taste_profiles`, persona task, **E4 `<PersonaCard/>`** on `/v2/me`, recommendations | **Built 2026-10-12, live Claude API path not yet exercised.** `/v2/me` reads the lists in this browser (and yours on the server), computes the fingerprint, writes a persona card and five recommendations with our own match %. Verified on the fixture provider in `v2-smoke` and on the CLI engine. Two differences from the plan: the lists need not be published, and the mainstream-to-obscure axis is not built. See "What M5 changed". |
| **M6** ✅ | Publish | `/p/[slug]`, fork, OG card, embed with scoped CSP, oEmbed | **Built 2026-10-12; not yet run against a real database.** Share panel in the editor, `/p/<slug>` (SSR, mode switcher, "Make it mine"), a rendered social card, `/embed/<slug>` and `/api/v2/oembed`. The framing rule is proved in a browser; the publish round trip is unit-tested with a fake client. See "What M6 changed". |
| **M7** ✅ | Swap | Move `/v2` to `/`, delete v1 directories, deps and governance tooling (§7–8), new CLAUDE.md | **Done 2026-10-12.** The app is at `/`, v1 and its tooling are deleted, the tree is about 9.8k lines of TypeScript and CSS across `src`, `e2e` and `scripts`, and the three CI jobs are green locally. See "What M7 changed". |

Order matters: M1–M2 prove the core with fixture data before any AI spend,
which matches the prototypes-first approach of the direction rounds.
