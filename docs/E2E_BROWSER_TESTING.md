# E2E Browser Testing with Claude Code + Playwright MCP

## Overview

This document describes the methodology for end-to-end browser testing of G.O.A.T. using **Claude Code CLI** with the **Playwright MCP Server**. This approach combines exploratory testing (Claude navigates the real app) with formal Playwright test generation.

## The suite's precondition — read this first

The browser suite **cannot run against an empty database**. Every journey starts
by clicking a list, so an unseeded run would execute nothing and report green.
Two things exist to stop that:

1. **`e2e/global-setup.ts` refuses the run.** One check before any worker, with
   a greppable `E2E_PRECONDITION_FAILED` diagnostic. It does *not* seed — a
   launcher that silently populated a database it found empty would hide the
   exact condition it exists to report.
2. **`npm run seed:e2e` writes deterministic fixtures**, added 2026-08-25. It is
   a command somebody runs on purpose, never a side effect of the suite.

```bash
npm run seed:e2e                 # write the fixtures
npm run seed:e2e -- --check      # verify without writing (safe anywhere)
npm run seed:e2e -- --teardown   # remove exactly what it wrote
```

### What the fixtures contain

| | |
|---|---|
| 1 user | `E2E Fixture User` |
| 2 lists | *E2E Fixture — Greatest Games* (games, size 10) and *— Greatest Athletes* (sports, size 5) |
| 18 items | 12 + 6, deterministic names and years |
| 15 rankings | the first 10 / first 5 of each list |

Two lists, because a suite that only ever sees one cannot tell "the first list"
from "the list I chose". Each list is ranked to its size but has **more items
than ranks**, so there are always unranked candidates to place — a fixture list
that is already complete cannot exercise placing anything.

### Why it is safe to point at a shared database

Every row carries a **fixed UUID in the `e2e00000-…` namespace**, every write is
an upsert on that id, and nothing outside the namespace is read, updated or
deleted. `--teardown` removes exactly the same namespace. A non-local target is
**refused** unless `E2E_SEED_ALLOW_REMOTE=1` records that the operator meant it.

Verified end to end against a live database on 2026-08-25 — 11 users / 35 lists
/ 1614 items / 421 rankings before, 12 / 37 / 1632 / 436 after, stable across
three consecutive seeds, and back to 11 / 35 / 1614 / 421 after teardown.

> **Found by that idempotence check, on the first re-run:** `list_items` carries
> a `trigger_rerank_list_items` BEFORE INSERT/UPDATE trigger, and a batch upsert
> makes it touch rows the same command already wrote — Postgres refuses with
> *"tuple to be updated was already modified by an operation triggered by the
> current command"*. The first run succeeded and the second failed. The seed now
> deletes-then-inserts its own namespaced rankings.

## Setup

### 1. Install Playwright MCP Server

Register the Playwright MCP server with Claude Code (persists in `~/.claude.json`):

```bash
claude mcp add playwright npx @playwright/mcp@latest
```

This gives Claude Code access to 25+ browser automation tools including:
- `browser_navigate`, `browser_click`, `browser_type` (core interactions)
- `browser_take_screenshot`, `browser_snapshot` (inspection)
- `browser_wait_for`, `browser_generate_playwright_test` (automation)
- `browser_drag` (drag-and-drop, critical for our ranking grid)

### 2. Ensure Dev Server is Running

```bash
npm run dev
# Server runs at http://localhost:3000
```

### 3. Verify Playwright is Installed

```bash
npx playwright install chromium
```

## Testing Methodology

### Phase 1: Exploratory Testing (Claude-Driven)

Claude Code navigates the live app via Playwright MCP, observing the real DOM and accessibility tree. This catches issues that static tests miss.

**How to invoke:**
```
# In Claude Code CLI, reference "playwright mcp" in your first request:
"Use playwright mcp to navigate to http://localhost:3000 and verify the landing page loads correctly"
```

**Key tip:** On the first request in a session, explicitly say "playwright mcp" so Claude uses the MCP tools instead of attempting Bash alternatives. After that, Claude infers the correct tool automatically.

**Authentication:** Since the browser window is visible (headed mode), you can log in manually while Claude observes. Cookies persist for the session duration.

### Phase 2: TestId-Driven Assertions

All interactive elements have `data-testid` attributes following this convention:

```
{feature}-{element-type}[-{qualifier}]
```

Examples:
- `landing-layout` - page-level container
- `featured-lists-section` - section wrapper
- `collection-search-input` - specific input
- `user-list-play-btn-{id}` - dynamic per-item

Claude Code can use these via:
```typescript
// In Playwright MCP
page.getByTestId("featured-lists-section")
page.locator('[data-testid^="featured-list-item-"]').first()
```

### Phase 3: Formal Test Generation

After exploratory testing identifies the correct selectors and flows, Claude generates Playwright test files:

```bash
# Ask Claude to generate tests based on what it observed:
"Generate a Playwright test for the studio list creation flow based on what you see in the app"
```

Tests go in `e2e/` directory and run via:
```bash
npx playwright test
npx playwright test --ui  # interactive UI mode
```

## Page Coverage Map

### Landing Page (`/`)

| Area | TestId | What to Verify |
|------|--------|---------------|
| Page container | `landing-layout` | Renders, no hydration errors |
| Hero section | `landing-main` | Category cards visible, animations run |
| Category cards | `landing-category-card-{name}` | Click navigates to category |
| Create button | `list-create-btn` | Opens composition modal or navigates to studio |
| Search bar | `search-filter-input`, `search-filter-container` | Input accepts text, filters update |
| Featured lists | `featured-lists-section` | Section loads, cards render |
| Featured items | `featured-list-item-{id}` | Click navigates to `/goat?list={id}` |
| User lists | `user-lists-section` | Shows user's lists or empty state |
| User list cards | `user-list-play-btn-{id}` | Play button navigates correctly |
| Saved lists | `saved-lists-section` | Bookmarked lists show |
| Continue bar | `continue-ranking-bar` | Shows in-progress ranking |
| Command palette | `command-palette-trigger-*` | Opens on click or Cmd+K |
| Floating showcase | `floating-showcase` | Ambient showcase cards render |
| Auth header | `auth-header` | Sign in / user menu visible |

### Studio Page (`/studio`)

| Area | TestId | What to Verify |
|------|--------|---------------|
| Page container | `studio-page` | Renders correctly |
| Layout | `studio-layout` | NeonArena theme active |
| Header | `studio-header` | Logo, back navigation |
| Back button | `studio-back-btn` | Navigates to landing |
| Topic input | `studio-topic-input` | Accepts text input |
| Generate button | `studio-generate-btn` | Triggers AI generation |
| Mode selector | `mode-ai`, `mode-template` | Switches between AI and template |
| Template gallery | `template-gallery` | Shows template options |
| Item cards | `studio-item-card-{index}` | Generated items display |
| Item edit | `studio-item-edit-btn-{index}` | Opens item editor |
| Item delete | `studio-item-delete-btn-{index}` | Removes item |
| Publish button | `studio-publish-btn` | Creates the list |
| Sidebar | `studio-sidebar` | Metadata and settings |

### Goat/Match Page (`/goat?list={id}`)

| Area | TestId | What to Verify |
|------|--------|---------------|
| Grid container | `match-grid-container` | Renders with correct slot count |
| Grid header | `match-grid-header` | List title, controls visible |
| View switcher | `view-switcher` | Mode buttons work |
| View buttons | `view-mode-{mode}` | Podium/Grid/Tier/Mount Rushmore/Bracket |
| Grid slots | `grid-slot-{position}` | Empty slots accept drops |
| Occupied slots | `grid-item-{position}` | Shows item with rank badge |
| Collection panel | `collection-panel` | Sidebar with backlog items |
| Collection search | `collection-search-input` | Filters backlog |
| Collection items | `collection-item-{id}` | Draggable backlog items |
| Share button | `share-results-btn` | Opens share modal |
| Share modal | `share-modal` | Share options render |
| Comparison drawer | `comparison-drawer` | Side-by-side item comparison |
| Completion modal | `completion-modal` | Shows when all slots filled |
| Position badges | `position-badge` | Rank numbers display |
| Drag overlay | `drag-overlay-item` | Visual feedback during drag |
| Screen reader | `sr-announcer-polite` | ARIA announcements work |

### Auth Components (Global)

| Area | TestId | What to Verify |
|------|--------|---------------|
| Auth header | `auth-header` | Present on all pages |
| Sign in button | `auth-sign-in-btn` | Opens auth modal |
| User menu | `auth-user-menu` | Shows when authenticated |
| Auth modal | `auth-modal` | Login/signup form |

### Command Palette (Global, Cmd+K)

| Area | TestId | What to Verify |
|------|--------|---------------|
| Backdrop | `command-palette-backdrop` | Closes on click |
| Container | `command-palette-container` | Renders centered |
| Input | `command-palette-input` | Accepts search text |
| Results | `command-palette-result-{index}` | Keyboard navigable |
| Create button | `command-palette-create-btn` | Opens studio |

## Running Exploratory Tests with Claude Code

### Landing Page Exploration

```
Prompt to Claude Code:
"Use playwright mcp to open http://localhost:3000. Take a screenshot, then:
1. Verify the landing page loads with no console errors
2. Check that the featured lists section renders with cards
3. Try clicking a featured list and verify it navigates to /goat
4. Go back, check the search bar filters lists correctly
5. Open the command palette with Cmd+K and verify it works
6. Report any visual issues or broken interactions"
```

### Studio Page Exploration

```
Prompt to Claude Code:
"Use playwright mcp to navigate to http://localhost:3000/studio. Then:
1. Verify the studio form renders with the topic input
2. Type 'Top 10 Movies' in the topic input
3. Check that the generate button becomes active
4. Click generate and wait for items to appear
5. Verify item cards render with edit/delete actions
6. Report any issues found"
```

### Goat/Match Page Exploration

```
Prompt to Claude Code:
"Use playwright mcp to:
1. Go to http://localhost:3000
2. Click the first featured list to navigate to /goat
3. Verify the match grid loads with the correct number of slots
4. Check that the collection panel shows backlog items
5. Try the view switcher between Podium, Grid, and Tier modes
6. Verify the share button is accessible
7. Report any issues"
```

## TestId Naming Convention

### Pattern
```
{feature}-{element}-{qualifier?}
```

### Rules
1. **Feature prefix**: Match the feature directory name (`landing-`, `studio-`, `match-`, `collection-`, `auth-`, `share-`)
2. **Element type**: Use semantic names (`btn`, `input`, `section`, `card`, `modal`, `panel`)
3. **Dynamic qualifier**: Append IDs for lists of items (`featured-list-item-{id}`)
4. **State variants**: Use suffixes for states (`-skeleton`, `-error`, `-empty`)
5. **No nested prefixes**: Keep flat (`match-grid-header` not `match-sub-match-grid-header`)

### Adding New TestIds
```tsx
// Static element
<div data-testid="feature-element">

// Dynamic element in a list
<div data-testid={`feature-item-${item.id}`}>

// Element with state
<div data-testid="feature-skeleton">
```

## Existing E2E Tests

> ### Correction — 2026-08-24
>
> The table below used to list six spec files with a behavioural description
> each. Three of them — `session-persistence`, `ranking-completion` and
> `list-search` — contained **10 tests, all `test.skip()`, with zero
> assertions between them**, and had since the day they were written. Reading
> this table, anyone would have concluded that reload persistence, the
> completion modal and search were covered. Nothing about them was.
>
> Those three files are **deleted**. A quarantine nobody reviews is worse than
> an honest gap, and an honest gap is what the "Not covered" table below is.
> Deleting them does not reduce coverage — there was none to reduce — it
> reduces the claim to match it.

| Test File | Coverage |
|-----------|----------|
| `e2e/list-play-journey.spec.ts` | Landing → featured list click → /goat navigation |
| `e2e/drag-drop-ranking.spec.ts` | Drag items from backlog to grid slots; swap between occupied slots |
| `e2e/backlog-items-loading.spec.ts` | Backlog groups load on match page |
| `e2e/exploratory-smoke.spec.ts` | Landing render, list navigation, collection panel |

### Not covered — known gaps, not silent ones

These were previously *listed as covered*. They are real gaps, recorded here so
the absence is visible rather than implied by a file that exists and does
nothing.

| Behaviour | Status |
|---|---|
| Grid state survives page reload | **no test** (was `session-persistence.spec.ts`, 3 empty stubs) |
| Grid state survives browser close/reopen | **no test** |
| LRU eviction keeps at most 15 cached lists | **no test** |
| Fill all slots → completion modal, and its 4 actions | **no test** (was `ranking-completion.spec.ts`, 4 empty stubs) |
| Search/filter on the landing page | **no test** (was `list-search.spec.ts`, 3 empty stubs) |
| Keyboard drag (Space/arrows/Escape) on the grid | **no e2e test**; the arrow-stepping logic has 25 unit tests in `src/lib/dnd/keyboard-coordinates.test.ts` |

## Environment preconditions

`e2e/global-setup.ts` runs once before any worker and refuses the run if the
lists API answers with zero lists.

This exists because the suite previously called `test.skip()` inside individual
specs when fixture data was missing. Against an empty database the whole suite
therefore ran, executed almost nothing, and **reported green** — a run that
could not do its job spelled its outcome identically to one that did it
perfectly. The precondition now belongs to the launcher, fails once, and names
itself `E2E_PRECONDITION_FAILED` so it is greppable.

To run deliberately against an empty database, set `E2E_ALLOW_EMPTY_DB=1`. The
setup then warns, in the run output, that a green result does not mean the
fixtures existed.

The setup does **not** seed. A setup that silently populated a database it
found empty would hide the condition it exists to report.

## CI Integration

Playwright config (`playwright.config.ts`) is already set up:
- Tests in `e2e/` directory
- Chromium browser
- Base URL: `http://localhost:3000`
- Auto-starts dev server (`npm run dev` — note this suite has never run against
  a production bundle; see backlog #13 in `.ai/registry-conformance.md`)
- Screenshots on failure
- Traces on retry
- `globalSetup` asserts fixtures exist before any test runs

```bash
# Run all e2e tests
npx playwright test

# Run specific test
npx playwright test e2e/list-play-journey.spec.ts

# Run with headed browser (visible)
npx playwright test --headed

# Run with Playwright UI
npx playwright test --ui

# Generate HTML report
npx playwright show-report
```

## Troubleshooting

### Common Issues

1. **"No MCP tools available"**: Re-run `claude mcp add playwright npx @playwright/mcp@latest`
2. **Browser not launching**: Run `npx playwright install chromium`
3. **Dev server not ready**: Ensure `npm run dev` is running on port 3000
4. **Hydration errors**: Check browser console via `browser_console_messages` tool
5. **Flaky selectors**: Always prefer `data-testid` over CSS class or text selectors

### References

- [Playwright MCP + Claude Code (Builder.io)](https://www.builder.io/blog/playwright-mcp-server-claude-code)
- [Simon Willison's TIL on Playwright MCP](https://til.simonwillison.net/claude-code/playwright-mcp-claude-code)
- [Playwright Skill for Claude Code](https://github.com/lackeyjb/playwright-skill)
- [Playwright MCP Server Docs](https://executeautomation.github.io/mcp-playwright/docs/intro)
