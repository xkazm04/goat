# src/v2: GOAT v2 domain code

GOAT v2 is being rebuilt beside v1 and swapped in when it reaches parity.
The product decisions are in [`docs/v2/DIRECTION.md`](../../docs/v2/DIRECTION.md);
the architecture and milestones are in
[`docs/v2/TECHNICAL_PACKAGE.md`](../../docs/v2/TECHNICAL_PACKAGE.md).
The interactive studies the UI follows are in `docs/v2/prototypes/`.

## Rules

- **Isolation.** Code here and under `src/app/v2/` imports only `@/v2/*` and
  packages. v1 never imports `@/v2/*`. Both directions are lint errors
  (`eslint.config.mjs`, proved by `isolation.test.ts`). To reuse a v1
  module, move or copy it in.
- **Styles.** Every rule in `ui/tokens.css` is scoped under `.goat-v2`, which
  `src/app/v2/layout.tsx` puts on the shell, so nothing leaks into v1 pages.
- **Root layout seam.** `src/app/layout.tsx` still belongs to v1. It skips
  v1's chrome under `/v2` through `src/app/v1-chrome.tsx`. Both go at the swap.

## Layout

| Folder | Holds | Since |
|---|---|---|
| `db/` | Public env parsing (`env.ts`), the browser Supabase client bound to the `goat_v2` schema (`browser.ts`) | M0 |
| `auth/` | Guest sessions via anonymous sign-in (`session.ts`) and the `useSession` hook | M0 |
| `ui/` | Design tokens (`tokens.css`), editor styles (`editor.css`), shell and home components | M0, M1 |
| `list/` | The list document: `types.ts`, the pure `reducer.ts` (every edit is a `Command`), `history.ts` (undo/redo), `projections.ts` (Spread rows, Mosaic bands, Canvas bands and pins), `tournament.ts` (Stage's bracket), `store.ts` (one zustand store per open list), `storage.ts` (IndexedDB autosave), `sync.ts` (goat_v2 rows and push/load/fork), `fixtures.ts` (the demo list) | M1 |
| `covers/` | `art.ts` (ArtDirection and `fallbackArt`) and `Cover.tsx` (real art first, generative fallback) | M1 |
| `editor/` | The editor: `EditorRoute.tsx` (demo, your list, someone else's), `Editor.tsx` (toolbar, drag, keys, modes, face-offs), one file per mode (`Mosaic.tsx`, `Canvas.tsx`, `Spread.tsx`, `Stage.tsx`, the last also holding `FaceOff` and `Tournament`), `Pool.tsx`, `Card.tsx` | M1, M2 |
| `seeds/` | `fromV1.ts`, the pure v1 to goat_v2 transform behind `npm run seed:v2` | M1 |
| `ai/` | The pool (`candidate.ts`, `events.ts`, `pool.ts`, `ids.ts`); the critic and gap spotter (`snapshot.ts`, `critic.ts`, `gaps.ts`, `converse.ts`); batch tagging (`tagging.ts`); the routes' shared parts (`request.ts`, `route-kit.ts`, `quota.ts`, `server.ts`, service-role and server only); the browser side (`client.ts`) | M3, M4 |
| `dna/`, `enrichment/` | Arrive in M3–M5 | — |

## Routes

- `/v2`: home, with the demo, your lists and starter lists.
- `/v2/new`: type a topic, watch the pool stream in, drop what you do not want, start ranking. `POST /api/v2/pool` serves it.
- In the editor, **Challenge me** opens the critic (`POST /api/v2/critic`) and the pool's **Find gaps** calls `POST /api/v2/gaps`. `/api/v2/tag` is the batch tagging API, not yet used by the UI.
- `/v2/l/demo`: the bundled demo list, saved in this browser only. It works
  with no database configured.
- `/v2/l/<id>`: a goat_v2 list. Your own lists are editable and synced.
  Anyone else's published list is read-only with "Make it mine".

## Smoke test

`npx playwright test -c playwright.v2.config.ts` ranks the demo list in all
four modes (`e2e-v2/smoke.spec.ts`). It starts its own dev server and needs
no database; CI runs it as the `v2-smoke` job. Set `PW_CHROMIUM_PATH` to
use a browser that is already installed.

## Database setup (once per Supabase project)

The schema is `supabase/migrations/20261009000000_goat_v2_baseline.sql`.
After applying it:

1. Add `goat_v2` to **Project Settings > API > Exposed schemas**.
2. Enable **Authentication > Providers > Anonymous sign-ins**.

Without step 2 the shell shows "Session unavailable". Without Supabase
settings at all, it shows an offline preview, and only the demo list opens.

To import v1's seeded lists as starters, run `npm run seed:v2` (a dry run
that prints the plan), then `npm run seed:v2 -- --apply`. It needs
`SUPABASE_SERVICE_ROLE_KEY`.
