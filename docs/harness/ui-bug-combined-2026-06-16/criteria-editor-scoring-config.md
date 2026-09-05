# Criteria Editor & Scoring Config — Combined UI+Bug Scan
> Context: Define/weight scoring criteria for a list and capture per-item criterion scores that feed weighted ranking.
> Files scanned: 16
> Total: 5 (Critical: 1, High: 2, Medium: 2, Low: 0)

## 1. Custom criteria are silently dropped at publish (selectedProfileId never set in custom mode)
- **Severity**: critical
- **Lens**: bug-hunter
- **Category**: data-loss / state-sync
- **File**: src/stores/studio-store.ts:552
- **Scenario**: User picks the "Custom" mode in `CriteriaEditor`, builds/edits criteria (which calls `setCustomProfile`, populating `customProfile`), then clicks Publish in `MetadataPanel`. `MetadataPanel.handlePublish` calls `getCriteriaConfig()` to attach `criteria_config` to the create-list request.
- **Root cause**: `getCriteriaConfig()` guards with `if (criteriaMode === 'none' || !selectedProfileId) return null;`. But `selectedProfileId` is **only** ever set by the preset auto-apply effect in `CriteriaEditor.tsx:65-66` (`if (criteriaMode === 'preset' …) setSelectedProfileId(...)`). In custom mode it stays `null`, so the early return fires before the `criteriaMode === 'custom' && customProfile` branch on line 557 can run. The custom branch is therefore dead code.
- **Impact**: Every user who authors custom criteria loses all of it on publish — the list is created with `criteria_config: null`, so per-item criteria scoring is permanently unavailable for that list. Silent: no error, no warning.
- **Fix sketch**: Drop `selectedProfileId` from the guard or special-case custom: `if (criteriaMode === 'none') return null;` then handle custom via `customProfile` and preset via `selectedProfileId` independently. Add a unit test for `getCriteriaConfig()` in custom mode returning a non-null config.

## 2. Optimistic weighted score ignores weights and hardcodes a 1–10 scale, causing a visible score jump/flash
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: incorrect-calculation / state-divergence
- **File**: src/hooks/use-criteria-queries.ts:482
- **Scenario**: User adjusts a criterion score via `CriteriaScoreInput`; `useSaveItemScores.onMutate` writes an optimistic `weightedScore` into the TanStack cache, then `onSettled` invalidates and the server (`scores/route.ts:84`) recomputes via the real `calculateWeightedScore`.
- **Root cause**: `calculateOptimisticWeightedScore` does a flat unweighted average `sum / scores.length`, then normalizes with a hardcoded `(avg / 10) * 100`. It ignores criterion weights entirely and assumes every criterion is on a 1–10 scale. For weighted criteria (e.g. Movies template: 25/20/20/15/10/10) or any non-1–10 range, the optimistic number differs from the authoritative server value. For a 0–100 criterion a score of 80 yields `(80/10)*100 = 800`.
- **Impact**: The displayed weighted score visibly jumps/corrects after each save (optimistic value → server value), undermining trust in the ranking number; with wide ranges the optimistic value can exceed 100 and render nonsense before correction.
- **Fix sketch**: Pass the active profile's `criteria` into the mutation and reuse the shared `calculateWeightedScore(scores, criteria)` for the optimistic value, or compute optimistically in the caller where criteria are already in scope. Remove the hardcoded `/10` assumption.

## 3. Editing a preset auto-clones to Custom on every keystroke, spawning orphan profiles and losing focus
- **Severity**: high
- **Lens**: ui-perfectionist
- **Category**: interaction / state-architecture
- **File**: src/app/features/Studio/components/CriteriaEditor.tsx:114
- **Scenario**: In preset mode the left column renders `CriteriaDisplayConfigurator` with `readOnly={true}`, so names can't be edited — but any display-type/position change calls `handleCriteriaChange` → `onProfileChange`, which in `PresetView` (line 123-135) clones to a brand-new custom profile (`id: custom-${Date.now()}`) and flips `criteriaMode` to `'custom'` on the *first* change. The intent (clone-on-edit) is reasonable, but it mints a new `Date.now()` id each invocation and there is no dedupe.
- **Root cause**: Clone-to-custom is triggered inside the change handler rather than via an explicit "Customize" affordance (the explicit `Customize` button already exists on line 333). Because the timestamped id changes every call and presets are read-only mid-stream, the mode-switch remounts the configurator, dropping any in-progress input focus.
- **Impact**: Confusing UX (a single tweak silently leaves the preset and re-titles it "(Custom)"), focus loss on the remount, and accumulation of throwaway `custom-*` profiles in the persisted store (`partialize` keeps non-template profiles).
- **Fix sketch**: Make preset display-config edits route only through the explicit `Customize` button, or guard the clone so it happens once (reuse the same custom id if already cloned). Keep the configurator mounted across the mode switch to preserve focus.

## 4. Profile editor allows saving criteria whose weights don't sum to 100 with no enforcement, normalization, or zero-total guard
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: edge-case / validation
- **File**: src/app/features/Match/components/CriteriaProfileSelector.tsx:477
- **Scenario**: In `CriteriaProfileEditor` the user sets all weights to 0 (or any total ≠ 100). The footer only colors the total orange (line 547-553) but `handleSave` validates merely `name.trim() && criteria.length > 0`. The profile saves with `totalWeight === 0`.
- **Root cause**: Weight total is treated as advisory, not validated. Downstream `calculateWeightedScore` (calculateWeightedScore.ts:143) returns `0` when `totalWeight === 0`, and `getCriterionImportance` (line 390) also returns 0 — so every item scores 0 and ranking by weighted score becomes meaningless (all tied at 0).
- **Impact**: A perfectly "valid" profile produces an all-zero ranking with no feedback to the user about why; weights that sum to, say, 40 still "work" but the importance percentages shown elsewhere are misleading.
- **Fix sketch**: Block save (disable the Create/Save button) when `totalWeight === 0`, and either auto-normalize weights to 100 on save or surface an inline error when the total ≠ 100. The 0-1 empty-range/zero-weight math in `calculateWeightedScore` is already defensive; the gap is purely the authoring UI.

## 5. Star input mode is silently disabled for criteria whose range < 1 and mislabels score granularity
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: edge-case / input-affordance
- **File**: src/app/features/Match/components/CriteriaScoreInput.tsx:404
- **Scenario**: A criterion with `minScore === maxScore` (range 0) or a small range is scored with `inputMode === 'stars'`. `StarInput` computes `starCount = Math.min(10, range)` and `starValue = ((value - min) / range) * starCount`.
- **Root cause**: When `range === 0`, division by zero yields `NaN`/`Infinity` for `starValue` and `starCount` is `0`, so `Array.from({ length: 0 })` renders **zero stars** — the user sees an empty control with no way to score and no explanation. Even for valid small ranges (e.g. 1–3), `starCount` is just 2 stars, which silently re-buckets a 3-point scale into 2 stars and feeds rounded values back through `onChange`. The sibling `SliderInput`/`CriteriaScoreInput` percentage math (line 72) has the same `range`-as-denominator exposure but at least renders a track.
- **Impact**: Stars mode is unusable/empty for degenerate ranges and quietly distorts scoring granularity for narrow ranges; combined with the zero-range path elsewhere it's an unhandled empty/error state.
- **Fix sketch**: Guard `range <= 0` in `StarInput` (and the percentage calc in `CriteriaScoreInput`) — fall back to numeric input or render a disabled "single value" state with a tooltip, and clamp `starCount` to at least cover the integer steps in the range rather than capping at the raw range.
