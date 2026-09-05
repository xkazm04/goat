# Personalization & Recommendations — Combined UI+Bug Scan
> Context: Tracks user interests/context to personalize the showcase and recommend lists/items, including A/B testing of personalized experiences.
> Files scanned: 11
> Total: 5 (Critical: 1, High: 2, Medium: 2, Low: 0)

## 1. Interest decay silently wipes all interests for returning users, disabling personalization
- **Severity**: critical
- **Lens**: bug-hunter
- **Category**: edge-case / silent failure
- **File**: src/lib/personalization/InterestTracker.ts:181 (decay) + 154-182, applied at :112
- **Scenario**: A user builds up interests, then returns after a gap (e.g. ~4-6 weeks). `initialize()` calls `applyInterestDecay()` once on load. With `halfLifeDays=14` and `minScore=5`, a category that peaked at, say, 40 decays below 5 after ~6 half-lives is not even needed — a 40-score interest after ~42 days (3 half-lives) is ~5 and gets `.filter()`-ed out at line 181. After a long-enough absence, *every* interest drops under `minScore` and the `interests` array becomes empty.
- **Root cause**: Decay is applied as a hard filter with no floor-preservation of the user's single strongest signal, and personalization eligibility (`scoreItems` line 198, `usePersonalization` line 92 `interests.length > 0`, `ShowcaseSelector.determineStrategy` line 107) is gated on `interests.length`. Empty interests ⇒ engine treats a long-time loyal user as brand-new.
- **Impact**: A returning power-user is silently demoted to the generic "popular for new users" path with no interest-based ranking — the exact opposite of the feature's promise — and `usePersonalizedWelcome` reverts to the generic subtitle. The decay also runs only once per session at init, so it never re-applies mid-session, making the behavior inconsistent and hard to reason about.
- **Fix sketch**: Never let decay remove the user's top-1 interest (preserve at least `minScore` for the highest-scoring category), or decouple "show personalization" eligibility from raw score (e.g. keep a sticky `hasEverPersonalized` flag derived from `visitCount`/`interactions` totals rather than current decayed score).

## 2. A/B variant assignment can fall through to the wrong/last variant and is silently re-derived for traffic-excluded users
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: A/B bucket assignment stability
- **File**: src/lib/personalization/useABTesting.ts:83-95 (assign) + 80 (traffic gate) + 143-149 (persist)
- **Scenario**: (a) `variantBucket = hash % 100` yields 0-99, but variant `weight`s are author-maintained and not validated to sum to 100. For `personalization-weight` (33+34+33=100) it works, but any edit that makes weights sum to <100 leaves a dead zone where `variantBucket` exceeds `cumulativeWeight`, silently dumping users into `experiment.variants[0]` (line 94) regardless of intended split. (b) When a user is excluded by `trafficPercentage` (line 80 returns `null`, e.g. `hero-layout` at 50%), `setExperiment` is never called, so the assignment is recomputed from the hash on every mount. That hash is stable *as long as `profile.id` is stable* — but `linkAuthenticatedUser` (InterestTracker.ts:360) rewrites `profile.id` to the auth id, so a user who logs in mid-session gets re-bucketed into a different experiment cohort, contaminating results.
- **Root cause**: No invariant enforcing `sum(weights)===100`; assignment persistence is conditional on being in-traffic; and bucketing keys off a mutable `profile.id`.
- **Impact**: Skewed/invalid experiment data (the core purpose of this context) and inconsistent UX where a logged-in user's hero layout / strategy can flip between page loads.
- **Fix sketch**: Normalize/validate weights (scale `variantBucket` to `sum(weights)` or assert sum===100); persist the assignment (or "excluded") decision even for out-of-traffic users; and bucket on a stable anonymous device id that does not change on auth, not on `profile.id`.

## 3. Server recommendations re-randomize popularity & trending on every request (non-deterministic ranking)
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: latent failure / data consistency
- **File**: src/app/api/personalization/recommend/route.ts:125-127 (GET) and 180-181 (POST)
- **Scenario**: Both handlers synthesize `popularity: 70 + Math.random()*30` and `trending: Math.random() > 0.7` per request. The same anonymous user refreshing the page (or paginating) gets a different ranking and different "trending" badges each call, because the underlying scores are random, not derived from real data.
- **Root cause**: Placeholder data generation lives inside the request handler instead of being a stable property of `showcaseData`. There is no seeding by item id or by user/session.
- **Impact**: Recommendations visibly reshuffle on every reload, "trending" flags flicker, and `excludeIds`-based pagination (POST) can show duplicates or drop items across pages because scores change between requests — a confusing, untrustworthy discovery experience. Also makes the GET/POST scoring untestable.
- **Fix sketch**: Make popularity/trending deterministic — store them on `showcaseData`, or derive via a stable hash of `item.id` (and optionally the day) so a given item ranks consistently within a session/day.

## 4. Southern-hemisphere season detection misses real IANA timezone names
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: edge-case wilderness
- **File**: src/lib/personalization/ContextAnalyzer.ts:75-88 (region list) + 21-30 (getSeason)
- **Scenario**: `isNorthernHemisphere` substring-matches against entries like `'America/Buenos_Aires'` and `'America/Sao_Paulo'`, but the actual IANA zone IDs are `America/Argentina/Buenos_Aires` and `America/Sao_Paulo` (the latter matches; the former does not). Likewise `'Australia'` matches `Australia/Sydney` (good), but a Chile (`America/Santiago`) or Peru/most-of-South-America user is never in the list at all. Those users are treated as northern hemisphere.
- **Root cause**: Hemisphere inferred from a hand-maintained, incomplete substring list of timezones rather than a robust mapping; `getSeason` then indexes the wrong array.
- **Impact**: Southern-hemisphere users get seasonally-inverted boosts (winter content in their summer, etc.) in `calculateContextScore` / `scoreByContext`, degrading the contextual relevance that is a selling point of the engine. Server route (`recommend/route.ts:36-41`) ignores hemisphere entirely, so client and server disagree on season for the same user.
- **Fix sketch**: Use the timezone UTC offset sign + month, or a vetted hemisphere lookup, and share one season helper between client and the `recommend` route so they stay consistent.

## 5. Personalized welcome message has unreachable branches and derives state from refs, so greeting/subtitle go stale
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: personalized-content surfacing / UX
- **File**: src/lib/personalization/usePersonalization.ts:267-274 (welcome) + 95-101 (ref-derived memos)
- **Scenario**: In `usePersonalizedWelcome`, the `visitCount === 2` and `visitCount > 5` subtitle branches (lines 270-273) are unreachable whenever the user has any interests, because the first `if (!isNewUser && topInterests.length > 0)` wins — and `isNewUser` is true through visit 2 (`isNewUser()` returns true while `visitCount <= 2`), so the "Ready to continue exploring?" line for `visitCount === 2` can essentially never show (at visit 2 the user is still "new", and by visit 3+ the interest branch takes over). Separately, `topInterests` (line 95) and `isNewUser` (line 99) are `useMemo`s that read `trackerRef.current.*` but list `[profile]` as deps; since they read a mutable ref rather than the state value, and `profile` is only re-set on track events, the greeting can render against a stale snapshot (e.g. shows generic subtitle on first paint even after interests exist).
- **Root cause**: Greeting logic ordering doesn't account for the `isNewUser` visit-count overlap, and derived values are pulled from imperative singletons inside memos keyed on a different state object.
- **Impact**: New/returning users frequently see the generic "Discover and rank the greatest of all time" subtitle instead of the intended personalized copy, undercutting the perceived value of personalization on the most visible surface (the hero greeting). The visit-2 nudge never fires.
- **Fix sketch**: Reorder branches (handle visit-count milestones before/independently of the interest branch) and align the `isNewUser` threshold with the welcome copy; derive `topInterests`/`isNewUser` from `profile` state directly (or store them in state on init) instead of reading `trackerRef.current` inside a `[profile]`-keyed memo.
