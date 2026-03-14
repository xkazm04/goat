---
phase: 2
slug: auth-migration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright ^1.57.0 (E2E) |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npx playwright test --grep "auth" --project=chromium` |
| **Full suite command** | `npx playwright test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test --grep "auth" --project=chromium`
- **After every plan wave:** Run `npx playwright test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | AUTH-01 | E2E | `npx playwright test tests/auth-guest.spec.ts -x` | No W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | AUTH-04 | E2E | `npx playwright test tests/auth-session.spec.ts -x` | No W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | AUTH-02/03 | manual | Manual: Google OAuth in browser | N/A | ⬜ pending |
| 02-02-02 | 02 | 2 | AUTH-05 | E2E | `npx playwright test tests/auth-merge.spec.ts -x` | No W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/auth-guest.spec.ts` — stubs for AUTH-01 (guest completes ranking without account)
- [ ] `tests/auth-session.spec.ts` — stubs for AUTH-04 (session persists across refresh)
- [ ] `tests/auth-merge.spec.ts` — stubs for AUTH-05 (guest data merges on sign-up, mocked auth)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Google OAuth sign-in | AUTH-02/03 | Real OAuth requires Google credentials, cannot be automated in CI | 1. Click "Continue with Google" 2. Complete Google sign-in 3. Verify redirect back to app with session |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
