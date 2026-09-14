# English copy style (goat)

The house delta over the registry's `english` subject (localization bundle). Rules are cited by
ID and never restated. Contract: `docs/i18n/copy-contract.json`. Checker: `npm run copy:check`
(native-copy skill).

## Where the copy lives

No i18n: English is hardcoded TSX, written in English (a source, not a translation, so EN-FIDELITY
does not apply). Gated sources: `src/app/features/Landing/**/*.tsx`, `src/app/layout.tsx`
metadata, `src/app/api/share/og-image/route.tsx`, `src/app/page.tsx`. Not gated yet: every other
route (studio, collections, share pages, not-found, offline). Widen `sources` before relying on
the gate outside the landing.

## Declared mechanics (counted 2026-09-14: 156 strings, 32 files)

| mechanic | declared | rule | count at adoption |
| --- | --- | --- | --- |
| variant | US | EN-SPELLING | US 1, UK 0 |
| em dash | banned | EN-DASH | 0 |
| double quotes | straight | EN-QUOTES | straight 14, curly 0 |
| ellipsis | three dots | EN-ELLIPSIS | dots 6, character 0 |
| heading/button case | sentence (EN-CASE at warn) | EN-CASE | 41 Title Case strings - debt |

## House rulings

- **2026-09-14 - US English** (operator, fleet-wide).
- **2026-09-14 - em dash banned in product copy** (operator, fleet-wide; EN-DASH). A standalone
  no-data glyph and code comments are not copy. The metadata title uses a spaced hyphen
  (`G.O.A.T. - Greatest of All Time`); keep it or use a colon, never an em dash.
- **2026-09-14 - sentence case declared, Title Case kept as debt** (operator fleet standard).
  Section headers use Title Case consistently today (Browse by Category, My Collections, Featured
  Rankings, Saved Lists, My Rankings, Continue Ranking, Start from Template), as do toast titles and
  several buttons. EN-CASE stays a warning; convert a surface as a whole when it is redesigned,
  never one header at a time (mixing is the defect). The checker judges only JSX `h1`-`h6`, so
  most of this debt is invisible to it: `SectionHeader title` props are not heading-class.
- Brand names in `terms.accept`: G.O.A.T., GOAT, Greatest of All Time.
- **2026-09-14 - the tagline is `Greatest of All Time`** (operator delegated the choice; EN-ONE-TERM).
  Title style lowercases a short preposition even when a phrase spells out an acronym, and the
  lowercase form already rendered in `CardHeader.tsx` and the tier presets. Converted the same day
  from `Greatest Of All Time` in the site metadata, PWA manifest, share and achievement pages, the
  OG image routes and the landing showcase header. Lowercase running-text uses ("discover the
  greatest of all time") are ordinary prose, not the tagline.

## Voice today

Short, energetic imperatives ("Rank anything. Debate everything. Crown the G.O.A.T."). Success
toasts lean on exclamation marks (12 in the gated copy; EN-EXCLAIM warns 8); keep at most one per
surface on new copy.

## Gate and escape hatch

- `.githooks/pre-push` runs the full check against `.ai/copy-baseline.json`: new error findings
  block, warnings print. **The hook is local config**: after a fresh clone run
  `git config core.hooksPath .githooks`. It skips loudly when the gitignored skill link is absent
  (run `ai-registry/scripts/link-registry.mjs`). There is no CI copy step.
- Baseline at adoption: 0 error findings. A deliberate exception is made visible, never bypassed:
  re-baseline in its own commit whose message says why (`copy-check.mjs --baseline write`), or turn
  a rule `off` in the contract with the reason recorded here. Agents never use `--no-verify`.
