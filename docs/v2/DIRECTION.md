# GOAT v2: direction log

A running record of the v2 redirection, built up in rounds of questions and
prototypes. Each round adds a section; earlier decisions are only changed with
a dated note saying why.

## Where v1 stands (audit, 2026-10-09)

- **Core loop:** pick or create a list (preset, blueprint, or AI-generated in
  Studio), drag items from a backlog into a Top-N grid (podium, tier, bracket
  and other views), then share an image or link that others can fork.
- **Size:** about 1,067 TS files, 232k LOC, 35 store modules and a heavy
  governance layer (`.ai/`, the findings ledger, ratchets, doc coupling) for
  what is basically a drag-to-rank app.
- **Built but disconnected:** challenges, badges, personalization, the
  collaboration engine, the Universal ELO graph, the public API/widget, AI
  result images and achievements (which run on mock data).
- **Trust problem:** consensus and activity endpoints fabricate data with
  `Math.random` when real data is thin.
- **Weak spots:** no reason to come back; ranking 10–50 items by drag is
  tedious; content is thin and skewed to games; the real engine (Studio's
  AI generation) sits off the main path.
- **Worth porting:** the enrichment fetchers (TMDB/IGDB/Spotify/Wikipedia),
  the Gemini client and Studio generation, the debate provider, share codes
  with OG/oEmbed, guest-to-account merge, and parts of the tier/bracket
  logic.

## Round 1: framing

| Question | Decision |
|---|---|
| What success means | A portfolio showcase and a fun personal playground. Growth and revenue are not goals. |
| How radical | Rebuild the same Top-N concept |
| Platform | Desktop web |
| Capacity | Solo plus AI agents |

## Round 2: product shape

| Question | Decision |
|---|---|
| Core loop | **Curator's canvas.** The ranking is a crafted, publishable artifact with write-ups and rich media, rather than a quiz. |
| Signature features | **Creative, strong ranking UX** (the user's own addition), **Taste DNA**, cinematic sharing |
| Content | **Anything via AI.** Any topic is generated and enriched by AI, with APIs used where they exist. |
| Codebase | **Slim rebuild in this repo.** Build a new v2 shell, port the proven libraries, and delete dead features and most of the governance tooling. |

## Round 3: craft

| Question | Decision |
|---|---|
| Interaction metaphor | **Undecided.** Prototype all four first (see below). |
| Art direction | **Cinematic dark glass** |
| Taste DNA | **AI taste persona**, an **attribute fingerprint**, and **recommendations** drawn from past preferences ("what you'd love next") |
| Share outputs | **Social cards and embeds** (dynamic OG images, story cards, an embeddable widget) |

### Interaction studies: `docs/v2/prototypes/`

Four standalone HTML studies. All of them rank the same 16-item RPG list in
the same visual language (`shared.css`, `shared.js`), so only the metaphor
changes.

| Study | File | Idea |
|---|---|---|
| A: Editorial spread | `spread.html` | Edit the finished page directly. Typography-led, with inline notes and a Column/Magazine layout switch. |
| B: Infinite canvas | `canvas.html` | Height is greatness. Place items freely on a board; the Top 10 is derived live from vertical position. |
| C: Collector's shelf | `shelf.html` | Physical game cases with CSS 3D, picked up with velocity tilt and slotted spine-out onto a lit shelf. |
| D: Stage | `stage.html` | An awards-show podium. Dropping onto an occupied spot triggers a challenger face-off, and there's a #10→#1 reveal rehearsal. |

To open them locally, run `python3 -m http.server --directory docs/v2/prototypes`.

## Round 4: AI and Taste DNA

| Question | Decision |
|---|---|
| How a list begins | **Prompt → candidate pool.** Type a topic; AI proposes about 30 candidates with art and metadata; prune, then rank. |
| AI while curating | **Critic / debate** (revive the v1 debate engine), **gap spotter** ("you might be missing..."), **art director** (generated covers and list hero art) |
| AI provider | **Claude for everything**, with web search for grounding. The Gemini client gets retired. |
| Fingerprint visual | Prototyped four ways in study E, `dna.html`; picked in round 5. |

| Study | File | Idea |
|---|---|---|
| E: Taste DNA | `dna.html` | One fingerprint computed live from the ranking and drawn four ways: E1 constellation, E2 spectrum barcode, E3 generative orb, E4 radar plus a persona trading card. |

## Round 5: verdicts on the studies — modes evolve, not replace

v1 had five view modes (`ViewSwitcher.tsx`: podium, goat, rushmore, bracket,
tierlist) plus a separate Awards page. v2 keeps the idea of several rating
experiences, but each old mode evolves into one of the new metaphors.

| v1 mode | v2 successor | How it carries over |
|---|---|---|
| Tier list (S/A/B/C, all items) | **Canvas** (study B) | The height bands *are* the tiers (GOAT / Essential / Great / Fine). The sideways axis is free for clustering, and the exact order comes from height inside each band. |
| Awards (categories with nominees) | **Editorial spread** (study A) | Each award category is a section of the ceremony programme: the winner as the hero entry, the nominees under it, and write-ups inline. |
| Bracket (tournament) | **Stage tournament** (study D) | A bracket runs as a series of staged face-offs under twin spotlights. The finals land on the podium, and the reveal plays the result. |
| Podium (3), G.O.A.T. (3), Mt. Rushmore (4) | **Stage presets** (study D) | Layout presets on the same stage and face-off engine: Podium, Rushmore (four carved heads), and a single GOAT throne. |
| — | ~~Collector's shelf~~ (study C) | **Dropped.** Three modes (Canvas, Spread, Stage) are enough. |

So v2 ships **three modes**: Canvas, Spread and Stage.

| Question | Decision |
|---|---|
| Taste DNA visual | **E4: radar plus persona trading card.** E1–E3 are retired. |
| Where E4 lives | **Profile centrepiece.** The big holographic card at the top of the profile, updated as you rank. |

## Round 6: the fourth mode and the one-list model

| Question | Decision |
|---|---|
| Owner of the long Top-N (10–50) | **A new mode, evolved from v1's Top-50 grid.** |
| Mode switching | **One list, all modes.** There is one ordered list underneath. Each mode is a projection of it, and switching mid-ranking keeps your work. |
| Next rounds | 1) a unified mode prototype, 2) the technical package design |

**Proposal: Mosaic** (the successor to the v1 grid; the name is a working title).
v1's grid is a pyramid of shrinking slots: a top-3/4 showcase, then "Elite
Tier" 4–10 (7 columns), "Core Roster" 11–20, "Rising Stars" 21–35 and
"Reserves" 36–50 (`GridRenderer.tsx`). Mosaic keeps that shape and makes it
continuous:

- Tile size decays with rank.
- Promoting an item grows it.
- The band boundaries are the same tier cut-lines Canvas uses.
- The whole Top 25 or Top 50 reads as one poster, which doubles as the
  share image.

### The four v2 modes, as projections of one list

| Mode | Shows the list as | Inherits v1 |
|---|---|---|
| **Mosaic** | a rank-scaled poster wall | Top-50 grid |
| **Canvas** | heights and tier bands on a free board | Tier list |
| **Spread** | an editorial column, Magazine layout, or award categories | Awards |
| **Stage** | the Podium / Rushmore / Throne presets plus a face-off tournament | Podium, G.O.A.T., Rushmore, Bracket |

## Round 7: technical forks

| Question | Decision |
|---|---|
| Art director (Claude can't generate images) | **Claude-directed generative art.** Claude picks palette, motif, composition and type per item; a parametric canvas/SVG renderer draws it, in the prototypes' house style. One provider, no cost per image. |
| Stack | **Keep Next 16 + Supabase** (Postgres, Auth, Storage) on Vercel. The rebuild is of the app layer, not the platform. |
| Quality gates | **Lean core:** typecheck, lint, vitest and a Playwright smoke test in CI. Retire the ratchet, findings ledger, structural backlog, doc-coupling and governance docs. |
| Cutover | **A parallel `/v2` route group, then swap.** Build v2 beside v1 in the same app; delete v1 when v2 reaches parity on what matters. |

## Round 8: package decisions

| Question | Decision |
|---|---|
| Supabase project | **Same project, new tables.** v2 lives in its own Postgres schema (`goat_v2`, exposed through the Supabase API settings), so `lists`/`items` don't clash with v1. |
| Real artwork | **Real art first.** Show posters, box art or album covers when enrichment finds them; generative covers are the fallback. ArtDirection is still generated for every item, for fallback covers and colour glows. |
| v1 content | **Import the seed lists.** A one-off script copies the seeded game lists and the awards event into v2 as starter content. |
| Next step | **Refine the prototypes first**, before any production code |

## Open threads (next rounds)

- Award lists carry *categories* (several small rankings), not one order.
  Is an awards list a set of sub-lists, each viewable in any mode?
- Trait extraction for Taste DNA (AI-tagged per item at enrichment time?)
  and where recommendations show up.
- The publish surface: the public list page, social cards and the embed
  widget.
- Technical package (next): the v2 data model, what to port and delete,
  store consolidation, Claude integration, how much quality-gate machinery
  to keep, and milestones.
