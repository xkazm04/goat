/**
 * Keyboard arbitration.
 *
 * Window-level key handlers do not nest — when two are registered, both run.
 * This module decides which one owns a given keypress.
 *
 * Only the hook is re-exported here. `ShortcutScopeStack` and the
 * `shortcutScopes` singleton are deliberately NOT surfaced on the barrel:
 * nothing outside this directory should be pushing claims by hand, and a
 * barrel export nobody imports is the exact orphan class knip was added to
 * catch (registry dead-code/instrument-per-orphan-class).
 */

export { useShortcutScope } from './useShortcutScope';
