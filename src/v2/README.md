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
| `ui/` | Design tokens (`tokens.css`) and shell components | M0 |
| `list/`, `modes/`, `covers/`, `dna/`, `ai/`, `enrichment/` | Arrive in M1–M5 | — |

## Database setup (once per Supabase project)

The schema is `supabase/migrations/20261009000000_goat_v2_baseline.sql`.
After applying it:

1. Add `goat_v2` to **Project Settings > API > Exposed schemas**.
2. Enable **Authentication > Providers > Anonymous sign-ins**.

Without step 2 the shell shows "Session unavailable". Without Supabase
settings at all, it shows an offline preview.
