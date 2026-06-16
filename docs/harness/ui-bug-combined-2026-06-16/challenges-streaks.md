# Challenges & Streaks — Combined UI+Bug Scan
> Context: Social ranking challenges with invitations, share chains, leaderboards, submissions, and daily streak tracking.
> Files scanned: 13
> Total: 5 (Critical: 1, High: 3, Medium: 1, Low: 0)

## 1. Streak day math uses UTC dates, breaking/double-counting streaks across timezones
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: timezone / date-math edge case
- **File**: src/lib/challenges/StreakTracker.ts:198 (`getDateString`), used at :132, :148, :261, :365
- **Scenario**: A user in a negative-UTC-offset zone (e.g. US Pacific, UTC-7/8) plays every evening. At 9pm Monday local it is already Tuesday in UTC; at 9pm Tuesday local it is Wednesday UTC. Their `lastActivityDate` (UTC) and the computed `today`/`yesterday` (UTC) stay aligned only by luck. The reverse case: a user playing late one night and early the next morning local time can land on the *same* UTC day twice (no increment) or skip a UTC day they were actually active on, breaking the streak.
- **Root cause**: `date.toISOString().split('T')[0]` always yields the **UTC** calendar day. "Daily streak" is an inherently local-time concept, but the code never accounts for the user's timezone offset, and the server has no per-user timezone. The `yesterday` calc at :148 (`now - 24h`) compounds this around DST transitions (a 23h or 25h local day).
- **Impact**: Streaks silently break for legitimate daily users, or count twice in one local day — directly undermining the engagement feature and the bonus multiplier it feeds. Hard to reproduce in-office (UTC-ish), trivial for real users abroad.
- **Fix sketch**: Pass the client's timezone (or UTC offset) with each activity and compute the day string in that zone (`Intl.DateTimeFormat` with `timeZone`), or store activity as full timestamps and derive day boundaries from a stored per-user timezone. Compute "yesterday" as the calendar day before `today` in that zone rather than subtracting a fixed 24h.

## 2. Streak bonus is returned to the client but never applied to the leaderboard score
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: data inconsistency / logic mismatch
- **File**: src/app/api/challenges/[id]/submit/route.ts:118-143
- **Scenario**: User with a 30-day streak (2.0x multiplier) submits. `submission.score` = 80 (base). The route computes `finalScore = 160` via `applyStreakBonus` and returns it in the `submission.finalScore` field. But the leaderboard fetched at :129 and the `userRank` derived at :132 are built from `ChallengeManager`'s stored submission, whose `score` is the **un-bonused 80**. The user sees "your score: 160" yet is ranked as if they scored 80.
- **Root cause**: `applyStreakBonus` is a pure read-only calculation (StreakTracker.ts:334) that returns a value but never writes it back. `ChallengeManager.submitRanking` (ChallengeManager.ts:194/208) stores only the base `calculateScore` result and `getLeaderboard` (:379) sorts on that stored base score. The bonus lives only in the HTTP response payload.
- **Impact**: Leaderboard rank, `stats.highScore`, and the rank shown to the user are mutually inconsistent. The streak-bonus feature is effectively cosmetic and misleads users about their standing — a major UX/correctness failure for a competitive ranking app.
- **Fix sketch**: Either persist the bonused score back into the submission before computing the leaderboard (e.g. pass the multiplier into `submitRanking` so the stored `score` includes it), or stop returning `finalScore` and surface the bonus as a separate display-only field clearly labeled as not affecting rank. Pick one and make leaderboard + response agree.

## 3. Invitation acceptance can hijack another invitee's pending participant slot
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: logic flaw / identity collision
- **File**: src/lib/challenges/InvitationSystem.ts:140-149 (also :179-181)
- **Scenario**: Creator sends two link/email invitations for one challenge to Alice and Bob. Two `pending_xxxx` participant rows exist. Bob clicks his link first and accepts: `acceptInvitation` finds a participant via `p.userId === userId || p.userId.startsWith('pending_')` — the `startsWith` matches the **first** pending row in array order, which may be Alice's. Bob's identity overwrites Alice's placeholder; when Alice later accepts, her token's participant is already gone, so a brand-new row is appended and the invitation/participant linkage is wrong.
- **Root cause**: The placeholder participant created at :84 keys on `pending_${token.substring(0,8)}`, but `acceptInvitation` never narrows the match back to *this invitation's* token — it grabs any pending placeholder. `declineInvitation` (:179) has the identical flaw, so declining one invite can flip an unrelated invitee's status to `declined`.
- **Impact**: Cross-user data corruption in multi-invite challenges: wrong attribution of who joined, miscounted accepted/declined stats, and a legitimate invitee being marked declined. Race-prone under concurrent accepts.
- **Fix sketch**: Match the placeholder precisely, e.g. `p.userId === ('pending_' + invitation.token.substring(0,8))` (or store the invitation id on the participant). Remove the blanket `startsWith('pending_')` fallback in both accept and decline paths.

## 4. Concurrent submissions race on in-memory arrays, losing submissions and corrupting stats
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: race condition / concurrency
- **File**: src/lib/challenges/ChallengeManager.ts:187-227 (`submitRanking`); singletons at :517-527
- **Scenario**: Two users POST to `/api/challenges/[id]/submit` at nearly the same time. Both `await getChallenge` and read `this.submissions.get(challengeId)` getting references to the same array, both compute scores, both `existingSubmissions.push(...)` then `this.submissions.set(...)`. Because there is an `await` (the supabase auth call and JSON parse) between read and write across requests, the second writer can overwrite `challenge.stats.submissions` with a stale count, and `avgCompletionTime` (:222-224) recomputes off whichever array snapshot ran last. The same singleton pattern means all this state is process-global and lost on any redeploy/restart.
- **Root cause**: All challenge/submission/streak/chain state is held in plain in-memory `Map`s on module singletons (no DB, no locking) despite the routes being `async` and the server multi-request/multi-instance. Read-modify-write sequences are non-atomic.
- **Impact**: Under real concurrency: dropped or double-counted submissions, wrong `stats.submissions`/`highScore`/`avgCompletionTime`, and total data loss on restart or across serverless instances (each instance has its own singleton). Leaderboards diverge between users.
- **Fix sketch**: Back challenges/submissions/streaks with the existing Supabase store (the routes already import `@/lib/supabase/server`) and rely on the DB for atomicity/uniqueness, or at minimum gate `submitRanking` behind a per-challenge async mutex and recompute stats from the authoritative array inside the lock.

## 5. "Expired" invitations are silently dropped instead of surfaced to the user
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: silent failure / error UX
- **File**: src/lib/challenges/InvitationSystem.ts:122-131; src/app/api/challenges/join/route.ts:50-55
- **Scenario**: A user clicks an invite link 8 days after it was sent (default expiry 7 days). `acceptInvitation` sets `invitation.status = 'expired'` and returns `null` (:124). The join route maps any `null` to a generic `{ error: 'Invalid or expired invitation' }` with status 400 (:50-55) — identical to the message for a token that never existed or was already accepted. The same conflation hides the "already responded" case (:129).
- **Root cause**: `acceptInvitation` collapses three distinct outcomes (not-found, expired, already-responded) into a single `null` return, so the route cannot tell them apart and the client cannot show a tailored message or a "request a new invite" CTA. (Note the GET path at join/route.ts:129-133 *does* distinguish expiry with `expired: true` — the accept path is inconsistent with it.)
- **Impact**: Users hitting a stale or already-used link get an indistinct error with no recovery path, a common drop-off point for a viral invite flow. Inconsistent with the GET handler's own behavior.
- **Fix sketch**: Have `acceptInvitation` return a discriminated result (e.g. `{ ok: false, reason: 'expired' | 'not_found' | 'already_responded' }`) and map each to a specific HTTP status/message with an actionable CTA, matching the `expired: true` shape the GET handler already uses.
