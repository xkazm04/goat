# E2E Browser Testing with Claude Code + Playwright MCP

## Overview

This document describes the methodology for end-to-end browser testing of G.O.A.T. using **Claude Code CLI** with the **Playwright MCP Server**. This approach combines exploratory testing (Claude navigates the real app) with formal Playwright test generation.

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

| Test File | Coverage |
|-----------|----------|
| `e2e/list-play-journey.spec.ts` | Landing → featured list click → /goat navigation |
| `e2e/drag-drop-ranking.spec.ts` | Drag items from backlog to grid slots |
| `e2e/session-persistence.spec.ts` | Grid state survives page reload |
| `e2e/ranking-completion.spec.ts` | Fill all slots → completion modal |
| `e2e/list-search.spec.ts` | Search/filter on landing page |
| `e2e/backlog-items-loading.spec.ts` | Backlog groups load on match page |

## CI Integration

Playwright config (`playwright.config.ts`) is already set up:
- Tests in `e2e/` directory
- Chromium browser
- Base URL: `http://localhost:3000`
- Auto-starts dev server
- Screenshots on failure
- Traces on retry

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
