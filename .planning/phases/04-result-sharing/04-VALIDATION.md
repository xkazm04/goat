---
phase: 04
slug: result-sharing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (if installed) / manual verification |
| **Config file** | vitest.config.ts or "none — Wave 0 installs" |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run && npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | SHAR-01, SHAR-02, SHAR-05 | integration | `grep -q "snapdom" src/app/features/Match/components/ResultImageGenerator.tsx` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | SHAR-03 | integration | `grep -q "share_code" src/app/features/Match/ShareModal/ShareModal.tsx` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | SHAR-04 | manual+build | `npm run build` (verifies OG route compiles) | ✅ | ⬜ pending |
| 04-02-02 | 02 | 1 | SHAR-03, SHAR-04 | manual | curl share URL, check OG tags | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 2 | MOBL-01 | manual | Mobile viewport test in browser | ❌ W0 | ⬜ pending |
| 04-03-02 | 03 | 2 | MOBL-02 | manual | Share page mobile render check | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Verify vitest is installed and configured
- [ ] Verify `@zumer/snapdom` can be installed

*Existing infrastructure covers most phase requirements. Sharing and mobile are primarily manual verification.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PNG download works in browser | SHAR-01 | Requires browser DOM + download trigger | Generate image, click download, verify PNG file |
| Image sized for Instagram/Twitter | SHAR-02 | Visual verification of dimensions | Check downloaded image dimensions match 1080x1080 / 1200x630 |
| OG preview in social media | SHAR-04 | Requires deployed URL + external platform | Share URL in Twitter/Slack, verify preview card renders |
| Grid usable on mobile | MOBL-01 | Requires touch interaction testing | Test on mobile device or Chrome DevTools mobile emulation |
| Share page renders on mobile | MOBL-02 | Visual layout verification | Open share page in mobile viewport |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
