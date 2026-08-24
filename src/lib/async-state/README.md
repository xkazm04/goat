# `src/lib/async-state` — the request state model

The one authority for **request** state in this repo. Added 2026-08-24.

Registry: `async-ui-states/state-model`, `client-state/status-fsms`.

## What this replaces

Request state used to be independent booleans passed down per surface —
`isLoading`, `isError`, `error`, sometimes a hand-kept `hasLoaded` — and no
discriminated union for a request existed anywhere in `src/`. The `'idle' | …`
unions that did exist were **domain** machines, not request state.

Four booleans encode sixteen representable states. The domain has six. The other
ten are each a bug with no name, and the defining property of that arrangement is
that every illegal state must be prevented *at every write site*, of which there
are as many as there are surfaces.

## The states

| status | holds data | meaning |
|---|---|---|
| `idle` | no | never attempted. **Renders identically to `loading`** — from the user's seat, "about to ask" and "asking" are the same thing |
| `loading` | no | first attempt in flight, nothing held |
| `loaded` | yes | a response completed and a result is held. A held **empty array is still `loaded`** — emptiness is a property of the data, not a status. `isRefreshing` marks a background attempt |
| `empty` | no | a response completed and carried nothing. Reachable **only** through the sticky settled bit |
| `failed` | no | an attempt failed and nothing is held. Carries its evidence |
| `stale` | yes | data held, last refresh failed. The data is still real, merely not guaranteed current |

## The forbidden transitions

These are the edges implementations ship by accident. Each has a name, a test in
`async-state.test.ts`, and is structurally unreachable through
`deriveAsyncState`:

| forbidden edge | the defect it ships |
|---|---|
| `loaded -> loading` on refresh | placeholder over rendered content — the refresh blanks the surface |
| anything `-> empty` while unsettled | the empty flash — a false "nothing here" for one round-trip |
| `failed -> empty` | failure dressed as empty success |
| `loaded -> failed` on refresh failure | held data discarded because an update failed |

## Using it

```tsx
import { asyncStateFromQuery } from '@/lib/async-state/from-query';

const q = useUserLists(userId);
<ListGrid state={asyncStateFromQuery(q)} renderItem={…} onRetry={q.refetch} />
```

**Pass the whole query result.** Do not destructure it into flags first, and do
not default `data` to `[]`: `const { data = [] } = useQuery(…)` makes `data`
defined on the very first render, which collapses "asking" and "answered with
nothing" into one rendering. That default was live in two sections of this repo
and is what the conversion removed.

## Adopted at

- `src/components/ui/list-grid.tsx` — the shared region primitive; its render
  order *is* the model
- `src/app/features/Landing/sub_LandingLists/UserListsSection.tsx`
- `src/app/features/Landing/sub_LandingLists/CollectionsSection.tsx`
- `src/hooks/use-bookmarks.ts` — exposes `state` alongside the legacy flags. The
  two cannot disagree: both are derived from the same query object rather than
  maintained side by side
- `src/app/features/Landing/sub_LandingLists/SavedListsSection.tsx` — its
  placeholder is now gated on `hasContent`, which fixed a live
  `loaded -> loading` edge (a background refresh blanked the whole grid)

## Not covered here

Per-entity **operation** status (this row is saving, that row is deleting) is a
different machine — one per independently-running operation instance, keyed by
durable identity, because a single scalar `saving` flag for a list where each row
has its own action corrupts the second operation's lifecycle whenever two
overlap. That machine does not live here yet; `hooks/useOptimisticMutation.ts`
currently takes a whole-query snapshot and restores it unconditionally on error,
which is the same defect at the write end. Tracked as a `deviation` row in
`.ai/registry-conformance.md` (`client-state/optimistic-write-path`).
