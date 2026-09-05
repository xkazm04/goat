# Templates & Blueprints — Combined UI+Bug Scan
> Context: Reusable list templates and community blueprints users browse, clone, rate, and publish.
> Files scanned: 14
> Total: 5 (Critical: 0, High: 3, Medium: 2, Low: 0)

## 1. Rating a card also opens the composition modal (event bubbles to card onClick)
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: event-handling / interaction conflict
- **File**: src/app/features/Templates/CommunityTemplateCard.tsx:130 (and src/components/ui/star-rating.tsx:72)
- **Scenario**: On a community template card, a user clicks a star to rate it. The whole card has `onClick={() => onUseTemplate(template)}` (line 50). `StarRating.handleClick` (star-rating.tsx:72) calls `onChange(starValue)` but never calls `e.stopPropagation()`, so the click bubbles up to the card.
- **Root cause**: The card treats its entire surface as a single "use template" hit target, but nests an independently-interactive control (the rating stars) inside it. Only the copy-link button defends with `e.stopPropagation()` (line 27); the rating control does not.
- **Impact**: Every rating click also fires `onUseTemplate`, which calls `openWithBlueprint` and yanks the user into the creation modal mid-rating. Rating is effectively unusable from the grid — the user is navigated away on every star tap.
- **Fix sketch**: Wrap the `StarRating` in a `<div onClick={(e) => e.stopPropagation()}>` in CommunityTemplateCard, or have `StarRating.handleClick` accept the event and call `e.stopPropagation()`. Same guard should cover the "Your rating" footer region.

## 2. Failed/blocked ratings fail silently — no error, no auth gate in the UI
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: silent-failure / error-state
- **File**: src/app/features/Templates/CommunityTemplateCard.tsx:38 (handleRate); src/hooks/use-blueprints.ts:312 (useRateTemplate)
- **Scenario**: An unauthenticated user clicks a star. `handleRate` calls `rateTemplate.mutate(...)`; the POST `/rate` route returns `badRequest('You must be signed in to rate templates')` (rate/route.ts:35-37). The mutation rejects, but the card has no `onError`, no toast, and the optimistic star UI (driven by `StarRating` hover only) shows nothing.
- **Root cause**: The rating mutation has no error surface anywhere in the chain — `useRateTemplate` defines only `onSuccess`, and the card ignores `rateTemplate.error`/`isPending`. The component assumes ratings always succeed.
- **Impact**: Signed-out (or rate-limited / network-failed) users tap stars and nothing happens — no feedback, no "sign in to rate" prompt. The interaction appears broken; users repeatedly retry. Also no `isPending` disables the control, allowing rapid double-submits.
- **Fix sketch**: Add `onError` handling (toast / inline "Sign in to rate") and gate the stars behind auth state; disable the rating control while `rateTemplate.isPending` and reflect `userRatingData.userRating` as the current value instead of only `avgRating`.

## 3. usage_count increment on GET is a non-atomic read-modify-write race + double counts
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: race-condition / data-integrity
- **File**: src/app/api/blueprints/[slugOrId]/route.ts:54-58
- **Scenario**: Every GET of a blueprint reads `data.usage_count`, then writes `usage_count: (data.usage_count || 0) + 1`. Two concurrent views both read N and both write N+1, losing one increment. Separately, `BlueprintPage` (blueprint/[slug]/page.tsx:18) fetches via `useBlueprint`, and the highlighted-template/clone flows also hit this route, so a single user interaction can inflate views.
- **Root cause**: View tracking uses an application-level read-then-write instead of an atomic DB increment, and is attached to the generic detail GET (which also runs on cache refetch / React Query remounts under `staleTime`).
- **Impact**: View counts are inaccurate (undercounted under concurrency, overcounted on refetch), and the displayed "{usageCount} views" stat (CommunityTemplateCard.tsx:120, blueprint page:148) misleads the popularity/`sort=popular` ordering that ranks on `usage_count`.
- **Fix sketch**: Replace with an atomic RPC/`increment` (e.g. a Postgres function or `update ... set usage_count = usage_count + 1`) and consider decoupling view tracking from the data-fetch GET (a dedicated fire-once analytics call) to avoid refetch inflation.

## 4. Clone endpoint never invoked from the Templates UI; "uses"/clone_count is dead, and clone has no auth/ownership guard
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: feature-wiring / missing-validation
- **File**: src/app/templates/page.tsx:68 (handleUseTemplate); src/app/api/blueprints/[slugOrId]/clone/route.ts:51-79
- **Scenario**: "Use template" calls `openWithBlueprint(template)` (page.tsx:69) which only opens the composition modal — it never calls `useCloneBlueprint`/the `/clone` route. So `clone_count` is never incremented from the browse flow, yet the card shows "{cloneCount}" (CommunityTemplateCard.tsx:116) and the blueprint page shows "{cloneCount} uses" (blueprint page:151-156). Independently, the clone route trusts `body.userId` with no auth check and writes `user_id: body.userId` directly (clone/route.ts:58), so any caller can create a list owned by an arbitrary user id.
- **Root cause**: The clone API exists but the UI "use" path was wired to the modal pre-fill instead, leaving the clone counter perpetually 0 and the endpoint reachable but unguarded.
- **Impact**: Clone/"uses" stats are always 0 (or stale), undermining the `trending` sort that orders by `clone_count` (route.ts:57-58). The unguarded clone endpoint allows spoofed `user_id` list creation and unauthenticated clones.
- **Fix sketch**: Either call the clone mutation on "Use template" (and rely on `onSuccess` invalidation to bump the count) or hide the clone stat until wired; in the clone route, derive `user_id` from `supabase.auth.getUser()` rather than `body.userId`.

## 5. Index-keyed item chips + missing empty/loading affordances on the published card
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: component-architecture / empty-state / list-keys
- **File**: src/app/features/Templates/CommunityTemplateCard.tsx:95-108, 122-127
- **Scenario**: Item preview chips render with `key={i}` (index) over `itemSnapshot.slice(0,4)` (line 97). When a template has zero snapshot items (publish requires items, but legacy/system blueprints surfaced here may have none) the entire chips block is hidden, leaving a noticeably emptier card than its siblings with no placeholder. `completionRate` only renders when `> 0` (line 122), so freshly published templates (publish/route.ts:110 sets `completion_rate: 0`) silently drop that stat, making card heights/stat-rows inconsistent across the grid.
- **Root cause**: Card composition assumes every community template has a rich snapshot and non-zero completion; it uses positional keys and conditional-omit rather than reserving consistent layout slots.
- **Impact**: Visual inconsistency across the responsive grid (uneven card heights, missing-stat gaps), and index keys cause subtle reconciliation glitches if `itemSnapshot` order/content changes between refetches. New publishes look "barer" than older ones, reading as lower quality.
- **Fix sketch**: Key chips by a stable field (`item.title` or `title+index`), render a subtle placeholder row when `itemCount === 0`, and show completion as a muted "—" rather than omitting it so every card's stat row keeps a consistent footprint.
