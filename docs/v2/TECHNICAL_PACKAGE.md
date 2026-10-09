# GOAT v2: technical package

Status: **draft for review** (2026-10-09). Product decisions live in
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
- Real artwork (TMDB, IGDB, Spotify, Wikipedia) is fetched for metadata and
  stored as `items.image_url` when found. Whether it is ever *shown* is an
  open decision (§9).

---

## 3. Data model: a fresh baseline

The v1 schema cannot be rebuilt from this repo:
- It is split between `db/*.sql` and `supabase/migrations/`.
- `public.users`, `category_enum` and `rerank_list_items()` exist in
  production but nowhere in the tree.
- `types/database.ts` is hand-written, with Clerk-era columns.

**So v2 starts a fresh migration baseline under `supabase/migrations/`, with
generated types (`supabase gen types`).** v1 tables are left alone until the
swap.

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
| 2 | The v1 schema can't be rebuilt from the repo | High | Fresh v2 baseline (§3). Decide below whether that's a new Supabase project. |
| 3 | `X-Frame-Options: DENY` everywhere blocks embeds | Medium | A route-scoped CSP in v2 |
| 4 | v1 RLS policies are `USING (true)` because guests had no session | Medium | Anonymous auth gives every guest a real `auth.uid()` |
| 5 | The service-role key is used in 7 files, including edge OG | Medium | Server-only module; OG uses anon + RLS |
| 6 | AI cost runaway | Medium | `ai_usage` quotas, caching, batches for bulk work |
| 7 | Satori can't render every cover effect | Low | An OG-safe cover variant (§2.2) |
| 8 | Repo junk: `CUsersmkdoldollagoattemp_items.json` (190 KB), `database/goals.db` | Low | Delete in M0 |

### Open decisions

1. **Supabase project for v2: new or shared?** I recommend **new**: a clean
   baseline, no inherited `users` table or leaked credentials, and v1 keeps
   running untouched until the swap. The cost is a one-off import if any v1
   lists should survive.
2. **Should real artwork ever be shown?** The decision was generative covers.
   The open question is whether a "real art" toggle uses `image_url` when
   enrichment finds one.
3. **A cheaper model for bulk tagging** (§4), once volume is known.
4. **v1 data:** import the seeded game lists into v2, or start empty and let
   the AI pool flow fill the catalog?

---

## 10. Milestones

Each milestone ends with a demoable `/v2` and green CI. Rough sizes assume
one developer plus agents.

| # | Milestone | Scope | Exit criteria |
|---|---|---|---|
| **M0** | Ground | `src/v2` + `/v2` route group, isolation lint rule, design tokens from `shared.css`, the v2 Supabase baseline + generated types, anonymous auth, lean CI workflow, repo junk removed | `/v2` renders the glass shell for an anonymous user. CI is three green jobs. |
| **M1** | List core | `ListDoc`, commands, reducer, undo, IndexedDB log, Supabase sync; **Spread** and **Mosaic**; `<Cover/>` | Rank a fixture list of 25 in Spread and Mosaic, reload, undo. Reducer and projection tests pass. |
| **M2** | All four modes | **Canvas** (tier bands), **Stage** (presets, face-off, tournament on the ported bracket engine), the `layoutId` mode morph, keyboard paths | The Study F behaviours work in React. The Playwright smoke ranks in every mode. |
| **M3** | AI creation | Claude client, `/api/v2/pool` (web search + `propose_candidate` streaming), ported enrichment, `/v2/new` prune UI, quotas, fixture provider for CI | Prompt "GOAT 90s sci-fi films" yields about 30 candidates with art and traits in under about 30s, streaming, and ranking can start. |
| **M4** | Co-curator | Critic chat (cached and streaming), gap spotter, Batches tagging for custom items | Critic responds to live list changes without cache misses. Gaps land in the pool. |
| **M5** | Taste DNA | DNA math, `taste_profiles`, persona task, **E4 `<PersonaCard/>`** on `/v2/me`, recommendations | Publishing two lists produces a persona card and five recommendations with reasons. |
| **M6** | Publish | `/p/[slug]`, fork, OG card, embed with scoped CSP, oEmbed | A shared link unfurls with the card, and the embed works in a third-party page. |
| **M7** | Swap | Move `/v2` to `/`, delete v1 directories, deps and governance tooling (§7–8), new CLAUDE.md | The tree is under about 30k LOC. Every v2 gate is green, and no v1 path remains. |

Order matters: M1–M2 prove the core with fixture data before any AI spend,
which matches the prototypes-first approach of the direction rounds.
