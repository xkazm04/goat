---
phase: 1
slug: core-ranking-flow
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright ^1.57.0 (E2E) |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npx playwright test e2e/drag-drop-ranking.spec.ts e2e/list-play-journey.spec.ts -x` |
| **Full suite command** | `npx playwright test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test e2e/drag-drop-ranking.spec.ts e2e/list-play-journey.spec.ts -x`
- **After every plan wave:** Run `npx playwright test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | FLOW-01 | E2E | `npx playwright test e2e/list-play-journey.spec.ts -x` | Partial | ⬜ pending |
| 01-02-01 | 02 | 1 | FLOW-02 | E2E | `npx playwright test e2e/drag-drop-ranking.spec.ts -x` | Partial | ⬜ pending |
| 01-02-02 | 02 | 1 | FLOW-04 | manual | N/A | N/A | ⬜ pending |
| 01-02-03 | 02 | 1 | FLOW-05 | E2E | `npx playwright test e2e/session-persistence.spec.ts -x` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 2 | FLOW-03 | E2E | `npx playwright test e2e/ranking-completion.spec.ts -x` | ❌ W0 | ⬜ pending |
| 01-03-02 | 03 | 2 | FLOW-06 | E2E | `npx playwright test e2e/list-play-journey.spec.ts -x` | Partial | ⬜ pending |
| 01-03-03 | 03 | 2 | FLOW-07 | E2E | `npx playwright test e2e/list-search.spec.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `e2e/ranking-completion.spec.ts` — stubs for FLOW-03 (completion modal shows, actions work)
- [ ] `e2e/session-persistence.spec.ts` — stubs for FLOW-05 (save, reload, resume)
- [ ] `e2e/list-search.spec.ts` — stubs for FLOW-07 (search for lists)
- [ ] Update existing `e2e/drag-drop-ranking.spec.ts` and `e2e/list-play-journey.spec.ts` if needed after fixes

*Unit test infrastructure (Vitest) is NOT installed. Staying with E2E tests per established codebase pattern.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag feels smooth (no lag/glitches) | FLOW-04 | Visual/performance — can't meaningfully assert frame rate in E2E | 1. Open a list with 20+ items 2. Drag items to grid positions rapidly 3. Verify no visual lag, flickering, or misplaced elements |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
