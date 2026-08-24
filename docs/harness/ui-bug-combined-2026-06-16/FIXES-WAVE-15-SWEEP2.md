# Combined UI+Bug Fix Wave 15 — Scattered sweep #2

> 5 commits, 5 findings closed (4 high + 1 medium) across previously-untouched contexts. All self-contained.
> Baseline preserved: TypeScript 53 → 53 (zero regression). Branch: `vibeman/ui-bug-wave15-sweep2` (off wave 14).

## Commits

| # | Commit | Finding | Severity | Files |
|---|---|---|---|---|
| 1 | `07a697c` | item-inspector #3 — "Add to Grid" no-op | high | `ItemInspectorProvider.tsx` |
| 2 | `e9ca9bd` | top-groups #1 — bulk-items fails >100 groups | high | `goat-api.ts` |
| 3 | `788642a` | achievements #2 — reveal race on rapid reopen | high | `AchievementReveal.tsx` |
| 4 | `bfd9628` | challenges #3 — invitation accept/decline hijack | high | `InvitationSystem.ts` |
| 5 | `85ebe87` | achievements #3 — reveal ignores reduced-motion | medium | `AchievementReveal.tsx` |

## What was fixed

1. **ItemInspector "Add to Grid" no-op (high).** `handleQuickAssign` only logged and returned while the inspector still closed (implying success). It now resolves the backlog item via `getItemById` and routes through the atomic `grid-store.assignToNextOpenSlot` action (added in Wave 3), mirroring ItemDetailPopupProvider.

2. **Bulk-items >100 groups (high).** A category with >100 groups was sent as one `getBulkItems` call; the route caps at 100 and rejects the whole request (400), so the entire backlog came back empty. `getBulkItems` now chunks group ids into ≤100-id batches, fetches in parallel, and merges the per-batch maps.

3. **Achievement reveal race (high).** The sequence + auto-close effects keyed only on `[isOpen]`, so two back-to-back unlocks left the second reveal un-sequenced (wrong tier/no burst) and the first's 5s timer could close it mid-reveal. Added `achievement.id` to both effects' deps and reset the card state at the start of each open.

4. **Invitation hijack (high).** accept/declineInvitation matched the participant via a blanket `startsWith('pending_')` (first pending row in array order), so with multiple invites one invitee could overwrite another's placeholder slot or flip an unrelated invitee to 'declined'. Both now match this invitation's exact placeholder (`pending_${token.substring(0,8)}`).

5. **Achievement reveal reduced-motion (medium).** The reveal fired a 24-particle burst + 40 confetti + 8 star bursts with no reduced-motion gate (WCAG 2.3.3). The burst (driven by `showConfetti`) is now gated on `useMotionCapabilities().allowCelebrations`. (Looping trophy/rings + Card/Toast animations still need gating — remaining follow-up.)

## Verification

| Gate | Before | After | Result |
|---|---|---|---|
| TypeScript | 53 | 53 | ✅ no regression |
| Tests | n/a | n/a | Playwright e2e only |
| Lint | blocked | blocked | ⚠️ pre-existing |

Each fix tsc-checked before commit.

## Patterns established (catalogue item 25)

25. **Stub that "looks done", server-only caps, and blanket placeholder matching.** Three recurring shapes: a handler stubbed to log-and-return while the UI signals success (wire it or hide the affordance); a server-side cap (max 100) with no client chunking (chunk + merge, or the whole call fails); and matching a placeholder by a broad prefix (`startsWith('pending_')`) instead of its exact key, which collides across concurrent entities (match the precise id).

## What remains

- Reduced-motion gating of the achievement looping animations + Card/Toast; the broader deferred/infra items (migrations, decisions, schema-dependent) and a few remaining scattered low-sev report findings (challenges streak timezone math, ai-item gemini schema, etc.).
- Cumulative Waves 1–15: 66 functional findings closed + 4 security mitigated; TS held at 53 throughout; 0 regressions.
