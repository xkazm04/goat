# G.O.A.T.

**G.O.A.T. (Greatest Of All Time)** is a Next.js application for creating and
ranking custom Top-N lists (Top 10, Top 50, etc.) through an interactive
drag-and-drop match system: items from a backlog are matched against each
other on a grid-based interface to build a ranked list.

## Stack

- Next.js 16, React 19
- Supabase (`@supabase/ssr`, `@supabase/supabase-js`) for data and auth
- `@dnd-kit` for the drag-and-drop match grid
- Tailwind CSS v4
- TanStack Query, Zustand-style stores (see `docs/STORE_DEPENDENCY_GRAPH.md`)
- Sentry (`@sentry/nextjs`) for error monitoring
- Storybook, Vitest, Playwright for components, unit and e2e tests

## Develop

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
npm start
```

## Quality gates

Everything the CI workflow (`.github/workflows/gates.yml`) runs is also
runnable locally — lint, typecheck, unit tests (`vitest`), e2e tests
(`playwright`), and a set of repo-specific checks (dead-export scanning,
doc-coupling, a findings ledger, a structural-backlog ledger). See
`CLAUDE.md` for the full command list and what each gate actually catches.

## Docs

Deeper reference material lives under `docs/`:

- `docs/STORE_DEPENDENCY_GRAPH.md` — the state-store dependency graph
- `docs/E2E_BROWSER_TESTING.md` — end-to-end browser test setup
- `docs/features/`, `docs/components/` — per-feature and per-component notes
