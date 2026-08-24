# Achievements & Awards — Combined UI+Bug Scan
> Context: Unlockable achievements, award badges, reveal animations, showcases, and shareable embed pages.
> Files scanned: 14
> Total: 5 (Critical: 0, High: 2, Medium: 2, Low: 1)

## 1. Award "Share" button is dead — `onShare` never wired through, so winners can never be shared
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: broken behavior / built-but-unwired
- **File**: src/app/features/Awards/AwardList.tsx:390
- **Scenario**: User assigns a winner to an award category and hovers the winner podium expecting the prominent Share button (designed at AwardItem.tsx:256-270, with hover reveal, tooltip, and `onShare(list.id, winnerTitle)` callback). It never appears.
- **Root cause**: `AwardItem` declares `onShare?: (listId, winnerTitle) => void` and conditionally renders the share button (`{onShare && (...)}`). But `AwardList` renders `<AwardItem ... />` (line 390-401) and never passes an `onShare` prop. Because the prop is optional, TypeScript never flags it, so the entire share affordance is silently disabled. The Awards feature has no sharing path at all despite the UI being fully built.
- **Impact**: A core showcase/sharing feature for awards is completely inert — every award winner's Share button is unreachable. This is the "built-but-unwired" theme flagged in prior scans.
- **Fix sketch**: Pass an `onShare` handler from `AwardList` to `AwardItem` (e.g. open a share modal or copy a link for the award category). At minimum, if sharing is intentionally not yet supported, remove the dead button + prop to avoid future confusion.

## 2. Reveal animation race: rapid reopen leaves confetti/card desynced and auto-close fires for the wrong achievement
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: race condition / timing
- **File**: src/app/features/Achievement/components/AchievementReveal.tsx:42-54
- **Scenario**: Two achievements unlock in quick succession (common — e.g. a milestone that also trips a category achievement). The reveal opens for #1, then the parent swaps `achievement` and re-fires `isOpen`. The 600ms `cardTimer` and the 5000ms auto-close timer from the first reveal can still be pending.
- **Root cause**: The "animation sequence" effect (line 42) keys only on `[isOpen]`, not on `achievement.id`. If `achievement` changes while `isOpen` stays true, the effect does not re-run, so `showCard`/`showConfetti` are never re-sequenced for the new achievement (card may show instantly with no burst, or confetti uses the previous tier color). Separately, the auto-close effect (line 32) cleans up only on dependency change; back-to-back opens can leave the first 5s timer alive, closing the modal mid-reveal of the second. The cleanup at line 48-52 also calls `setShowCard(false)` synchronously on unmount/re-run, which can blank the card for one frame during the AnimatePresence exit.
- **Impact**: Visually broken reveals (missing confetti, wrong tier colors, premature dismissal) precisely in the high-value "you earned multiple things" moment.
- **Fix sketch**: Add `achievement?.id` to both effects' dependency arrays so the sequence restarts per achievement, and reset `showCard`/`showConfetti` to false at the *start* of the open branch rather than only in cleanup. Consider a `key={achievement?.id}` on the reveal container to force a clean remount.

## 3. Entire Achievement feature ignores `prefers-reduced-motion` — infinite confetti, pulsing rings, looping scale
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: accessibility / reduced-motion handling
- **File**: src/app/features/Achievement/components/AchievementReveal.tsx:78-194
- **Scenario**: A user with `prefers-reduced-motion: reduce` unlocks an achievement. They get 24 burst particles, 40 falling confetti pieces, 8 star bursts, 3 infinitely-pulsing rings (line 270-287), and an infinitely looping trophy scale (line 252-259) — none gated on motion preference. The same applies to `AchievementCard` looping sparkles (line 144-165) and the toast (line 465).
- **Root cause**: The project ships a `useReducedMotion()` hook (`src/hooks/use-reduced-motion.ts`) used across many features, but no file under `features/Achievement` imports it. The card exposes a manual `config.animated` flag instead of honoring the system/user preference, and the reveal/toast have no opt-out at all.
- **Impact**: WCAG 2.3.3 (Animation from Interactions) failure on the most motion-heavy surface in the app; can trigger vestibular discomfort. Accessibility-affecting, not merely cosmetic.
- **Fix sketch**: Call `useReducedMotion()` (or the preferred `useMotionPreference()`) in `AchievementReveal`, `AchievementCard`, and `AchievementToast`; when reduced, skip confetti/particle generation and replace looping `repeat: Infinity` animations with static states or a single fade-in.

## 4. Division-by-zero produces `NaN%` completion when a showcase has zero achievements
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: edge-case / silent failure
- **File**: src/app/features/Achievement/components/AchievementShowcase.tsx:110
- **Scenario**: A brand-new user (or any user whose `showcase.achievements` is `[]`) opens their showcase. `completionPercent: Math.round((unlocked.length / showcase.achievements.length) * 100)` evaluates `0 / 0 = NaN`, so the Completion stat card renders "NaN%".
- **Root cause**: No guard for an empty achievements array. The locked-card progress bar at line 546 has the same pattern (`current / target` with no zero-target guard), and the header relies on `showcase.achievements.length` being non-zero. There is also no empty-state for a showcase with zero defined achievements (the empty state at line 472 only covers filtered-to-empty, not source-empty).
- **Impact**: "NaN%" shown to new/empty users — a visible, embarrassing bug on a public, shareable surface.
- **Fix sketch**: Guard the divisor: `total > 0 ? Math.round((unlocked.length / total) * 100) : 0`, and add a `target > 0` guard on the locked-card progress width. Optionally render a dedicated "No achievements defined yet" state when the source list is empty.

## 5. Embed component renders an inner `<html>`/`<head>` that nests inside the route's own document
- **Severity**: low
- **Lens**: ui-perfectionist
- **Category**: component-architecture gap / invalid markup
- **File**: src/app/features/Achievement/components/AchievementEmbed.tsx:240
- **Scenario**: The embed route at `src/app/achievement/[code]/embed/page.tsx` already returns its own `<html><head><style>…</head><body>` document and renders `<AchievementEmbed>` inside the `<body>`. `AchievementEmbed` (non-compact path) renders fine, but the sibling `AchievementEmbedStandalone` (line 217-350) returns a *second* full `<html>`/`<head>`/`<body>` tree, and the default `AchievementEmbed` markup uses `absolute inset-0` glow (line 97) on a non-`relative` `<a>`, so the glow positions against the page, not the card. Additionally `className="text-decoration-none"` (lines 33, 88) is not a Tailwind utility and is a no-op — underline removal only works in the standalone variant's inline CSS.
- **Root cause**: Two parallel embed implementations (component-styled vs. fully-inline `Standalone`) with overlapping responsibilities; the page consumes the component variant, leaving `Standalone` as an unused, document-nesting hazard. The `text-decoration-none` non-class and the unanchored absolute glow are leftovers from porting between the two.
- **Impact**: Risk of invalid nested-document markup if `Standalone` is ever wired up; mispositioned glow and a non-functional class on the active embed path. Low because the active path mostly works.
- **Fix sketch**: Add `relative` to the `AchievementEmbed` `<a>` so the glow anchors correctly, replace `text-decoration-none` with `no-underline`, and either delete `AchievementEmbedStandalone` or strip its `<html>/<head>/<body>` so it returns only the card fragment.
