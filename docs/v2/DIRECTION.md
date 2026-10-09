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
| Fingerprint visual | **Undecided.** Prototype all four first: study E, `dna.html`. |

| Study | File | Idea |
|---|---|---|
| E: Taste DNA | `dna.html` | One fingerprint computed live from the ranking and drawn four ways: E1 constellation, E2 spectrum barcode, E3 generative orb, E4 radar plus a persona trading card. |

## Open threads (next rounds)

- Pick or blend the interaction metaphor after trying the studies.
- Pick the fingerprint visual. Decide how traits are extracted (AI-tagged
  per item at enrichment time?) and where recommendations show up.
- The publish surface: the public list page, card templates and the embed
  widget.
- Technical package: the v2 data model, what to port and delete, store
  consolidation, and how much of the quality-gate machinery to keep.
