# G.O.A.T.

**G.O.A.T. (Greatest of All Time)** helps you rank anything and publish the result.
Name a topic, let Claude fill a pool of candidates, then rank them as a poster
wall, a board, an editorial page or a stage. Publish the list to a link, an
embed and a social card, and let your lists build a taste profile.

## Stack

- Next.js 16 (App Router), React 19
- Supabase (`@supabase/ssr`, `@supabase/supabase-js`) for data and anonymous guest sessions
- Anthropic SDK for the AI layer, with a local Claude Code CLI engine for tests
- `@dnd-kit/core`, framer-motion and Zustand for the editor
- Vitest and Playwright

## Develop

```bash
cp .env.example .env     # optional: without it the demo list and fixture AI still work
npm install
npm run dev              # http://localhost:3000, try /l/demo
```

## Checks

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e         # starts its own dev server; no database needed
```

## Docs

- `docs/v2/DIRECTION.md` for the product decisions.
- `docs/v2/TECHNICAL_PACKAGE.md` for the architecture and the milestone log.
- `src/v2/README.md` for the code layout and its rules.
- `CLAUDE.md` for working in this repo with Claude Code.
